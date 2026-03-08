-- Migration: Fix schema issues and add seat reservation system
-- Date: 2026-03-06

-- ============================================================================
-- 1. FIX PROFILES TABLE - Add missing email column
-- ============================================================================
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Update email from auth.users for existing profiles
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

-- ============================================================================
-- 2. FIX BOOKINGS TABLE - Add missing baggage_weight_kg column
-- ============================================================================
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS baggage_weight_kg NUMERIC(5,2) DEFAULT 0;

-- Add check constraint for positive baggage weight
DO $$ BEGIN
    ALTER TABLE public.bookings
    ADD CONSTRAINT check_baggage_weight_positive 
    CHECK (baggage_weight_kg >= 0);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Add check constraint for positive price
DO $$ BEGIN
    ALTER TABLE public.bookings
    ADD CONSTRAINT check_total_price_positive 
    CHECK (total_price_zmw >= 0);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Add check constraint for positive passengers
DO $$ BEGIN
    ALTER TABLE public.bookings
    ADD CONSTRAINT check_total_passengers_positive 
    CHECK (total_passengers > 0);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 3. CREATE SEAT RESERVATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.seat_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
    booking_date DATE NOT NULL,
    seat_number TEXT NOT NULL,
    reserved_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL, -- Browser session ID for anonymous users
    reserved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '10 minutes'),
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'confirmed', 'expired', 'released')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add unique constraint to prevent double booking
CREATE UNIQUE INDEX IF NOT EXISTS idx_seat_reservations_unique_active 
ON public.seat_reservations(schedule_id, booking_date, seat_number, status)
WHERE status IN ('reserved', 'confirmed');

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_seat_reservations_schedule_date 
ON public.seat_reservations(schedule_id, booking_date);

CREATE INDEX IF NOT EXISTS idx_seat_reservations_expires_at 
ON public.seat_reservations(expires_at) 
WHERE status = 'reserved';

CREATE INDEX IF NOT EXISTS idx_seat_reservations_session 
ON public.seat_reservations(session_id, status);

-- Enable RLS
ALTER TABLE public.seat_reservations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for seat_reservations
CREATE POLICY "Users can view their own reservations"
ON public.seat_reservations FOR SELECT
TO authenticated
USING (reserved_by = auth.uid() OR status = 'confirmed');

CREATE POLICY "Users can create reservations"
ON public.seat_reservations FOR INSERT
TO authenticated
WITH CHECK (reserved_by = auth.uid());

CREATE POLICY "Users can update their own reservations"
ON public.seat_reservations FOR UPDATE
TO authenticated
USING (reserved_by = auth.uid())
WITH CHECK (reserved_by = auth.uid());

CREATE POLICY "Service role can manage all reservations"
ON public.seat_reservations FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 4. ADD INDEXES TO EXISTING TABLES
-- ============================================================================

-- Bookings table indexes
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_schedule_id ON public.bookings(schedule_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_date ON public.bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON public.bookings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_reference ON public.bookings(booking_reference);

-- Passengers table indexes
CREATE INDEX IF NOT EXISTS idx_passengers_booking_id ON public.passengers(booking_id);
CREATE INDEX IF NOT EXISTS idx_passengers_seat_number ON public.passengers(seat_number);

-- Schedules table indexes
CREATE INDEX IF NOT EXISTS idx_schedules_route_id ON public.schedules(route_id);
CREATE INDEX IF NOT EXISTS idx_schedules_bus_id ON public.schedules(bus_id);
CREATE INDEX IF NOT EXISTS idx_schedules_departure_time ON public.schedules(departure_time);
CREATE INDEX IF NOT EXISTS idx_schedules_is_active ON public.schedules(is_active) WHERE is_active = true;

-- Buses table indexes
CREATE INDEX IF NOT EXISTS idx_buses_operator_id ON public.buses(operator_id);
CREATE INDEX IF NOT EXISTS idx_buses_is_active ON public.buses(is_active) WHERE is_active = true;

-- Routes table indexes
CREATE INDEX IF NOT EXISTS idx_routes_origin ON public.routes(origin);
CREATE INDEX IF NOT EXISTS idx_routes_destination ON public.routes(destination);
CREATE INDEX IF NOT EXISTS idx_routes_is_active ON public.routes(is_active) WHERE is_active = true;

-- User roles table indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- Operator users table indexes
CREATE INDEX IF NOT EXISTS idx_operator_users_user_id ON public.operator_users(user_id);
CREATE INDEX IF NOT EXISTS idx_operator_users_operator_id ON public.operator_users(operator_id);

-- ============================================================================
-- 5. ADD UNIQUE CONSTRAINTS
-- ============================================================================

-- Prevent duplicate operator assignments
CREATE UNIQUE INDEX IF NOT EXISTS idx_operator_users_unique 
ON public.operator_users(user_id, operator_id);

-- Ensure booking references are unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_reference_unique 
ON public.bookings(booking_reference);

-- ============================================================================
-- 6. ADD CHECK CONSTRAINTS TO EXISTING TABLES
-- ============================================================================

-- Schedules table constraints
DO $$ BEGIN
    ALTER TABLE public.schedules
    ADD CONSTRAINT check_price_positive 
    CHECK (price_zmw >= 0);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Buses table constraints
DO $$ BEGIN
    ALTER TABLE public.buses
    ADD CONSTRAINT check_total_seats_positive 
    CHECK (total_seats > 0);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Routes table constraints
DO $$ BEGIN
    ALTER TABLE public.routes
    ADD CONSTRAINT check_distance_positive 
    CHECK (distance_km IS NULL OR distance_km >= 0);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE public.routes
    ADD CONSTRAINT check_duration_positive 
    CHECK (estimated_duration_hours IS NULL OR estimated_duration_hours >= 0);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 7. CREATE FUNCTION TO CLEAN UP EXPIRED RESERVATIONS
-- ============================================================================
CREATE OR REPLACE FUNCTION cleanup_expired_reservations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.seat_reservations
    SET status = 'expired',
        updated_at = now()
    WHERE status = 'reserved'
    AND expires_at < now();
END;
$$;

-- ============================================================================
-- 8. CREATE FUNCTION TO RESERVE SEATS
-- ============================================================================
CREATE OR REPLACE FUNCTION reserve_seats(
    p_schedule_id UUID,
    p_booking_date DATE,
    p_seat_numbers TEXT[],
    p_session_id TEXT,
    p_user_id UUID DEFAULT NULL
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    reserved_seats TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_seat TEXT;
    v_reserved_seats TEXT[] := ARRAY[]::TEXT[];
    v_user_id UUID;
BEGIN
    -- Use provided user_id or auth.uid()
    v_user_id := COALESCE(p_user_id, auth.uid());
    
    -- Clean up expired reservations first
    PERFORM cleanup_expired_reservations();
    
    -- Check each seat
    FOREACH v_seat IN ARRAY p_seat_numbers
    LOOP
        -- Check if seat is already reserved or confirmed
        IF EXISTS (
            SELECT 1 FROM public.seat_reservations
            WHERE schedule_id = p_schedule_id
            AND booking_date = p_booking_date
            AND seat_number = v_seat
            AND status IN ('reserved', 'confirmed')
            AND expires_at > now()
        ) THEN
            -- Seat is taken
            RETURN QUERY SELECT false, 'Seat ' || v_seat || ' is already taken', v_reserved_seats;
            RETURN;
        END IF;
    END LOOP;
    
    -- All seats available, reserve them
    FOREACH v_seat IN ARRAY p_seat_numbers
    LOOP
        INSERT INTO public.seat_reservations (
            schedule_id,
            booking_date,
            seat_number,
            reserved_by,
            session_id,
            expires_at,
            status
        ) VALUES (
            p_schedule_id,
            p_booking_date,
            v_seat,
            v_user_id,
            p_session_id,
            now() + interval '10 minutes',
            'reserved'
        )
        ON CONFLICT (schedule_id, booking_date, seat_number, status)
        WHERE status IN ('reserved', 'confirmed')
        DO NOTHING;
        
        v_reserved_seats := array_append(v_reserved_seats, v_seat);
    END LOOP;
    
    RETURN QUERY SELECT true, 'Seats reserved successfully', v_reserved_seats;
END;
$$;

-- ============================================================================
-- 9. CREATE FUNCTION TO CONFIRM SEAT RESERVATIONS
-- ============================================================================
CREATE OR REPLACE FUNCTION confirm_seat_reservations(
    p_session_id TEXT,
    p_booking_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.seat_reservations
    SET status = 'confirmed',
        booking_id = p_booking_id,
        updated_at = now()
    WHERE session_id = p_session_id
    AND status = 'reserved'
    AND expires_at > now();
    
    RETURN FOUND;
END;
$$;

-- ============================================================================
-- 10. CREATE FUNCTION TO RELEASE SEAT RESERVATIONS
-- ============================================================================
CREATE OR REPLACE FUNCTION release_seat_reservations(
    p_session_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.seat_reservations
    SET status = 'released',
        updated_at = now()
    WHERE session_id = p_session_id
    AND status = 'reserved';
    
    RETURN FOUND;
END;
$$;

-- ============================================================================
-- 11. CREATE FUNCTION TO GET AVAILABLE SEATS
-- ============================================================================
CREATE OR REPLACE FUNCTION get_available_seats(
    p_schedule_id UUID,
    p_booking_date DATE
)
RETURNS TABLE(
    seat_number TEXT,
    is_available BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Clean up expired reservations first
    PERFORM cleanup_expired_reservations();
    
    -- Get bus total seats
    RETURN QUERY
    WITH bus_seats AS (
        SELECT b.total_seats
        FROM public.schedules s
        JOIN public.buses b ON s.bus_id = b.id
        WHERE s.id = p_schedule_id
    ),
    all_seats AS (
        SELECT 
            (row_number() OVER ())::TEXT || 
            CASE (row_number() OVER () - 1) % 4
                WHEN 0 THEN 'A'
                WHEN 1 THEN 'B'
                WHEN 2 THEN 'C'
                ELSE 'D'
            END AS seat_num
        FROM generate_series(1, (SELECT total_seats FROM bus_seats) / 4) AS row_num
    ),
    reserved_seats AS (
        SELECT seat_number
        FROM public.seat_reservations
        WHERE schedule_id = p_schedule_id
        AND booking_date = p_booking_date
        AND status IN ('reserved', 'confirmed')
        AND (status = 'confirmed' OR expires_at > now())
    )
    SELECT 
        a.seat_num,
        (r.seat_number IS NULL) AS is_available
    FROM all_seats a
    LEFT JOIN reserved_seats r ON a.seat_num = r.seat_number
    ORDER BY a.seat_num;
END;
$$;

-- ============================================================================
-- 12. CREATE TRIGGER TO UPDATE updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_seat_reservations_updated_at
    BEFORE UPDATE ON public.seat_reservations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 13. GRANT PERMISSIONS
-- ============================================================================
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON public.seat_reservations TO authenticated;
GRANT EXECUTE ON FUNCTION reserve_seats TO authenticated, anon;
GRANT EXECUTE ON FUNCTION confirm_seat_reservations TO authenticated, anon;
GRANT EXECUTE ON FUNCTION release_seat_reservations TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_available_seats TO authenticated, anon;
GRANT EXECUTE ON FUNCTION cleanup_expired_reservations TO authenticated, anon;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
