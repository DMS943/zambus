-- Migration: Add transaction handling for bookings
-- Date: 2026-03-06

-- ============================================================================
-- 1. CREATE ATOMIC BOOKING CREATION FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION create_booking_with_passengers(
    p_user_id UUID,
    p_schedule_id UUID,
    p_booking_date DATE,
    p_total_passengers INTEGER,
    p_total_price_zmw NUMERIC,
    p_contact_phone TEXT,
    p_contact_email TEXT,
    p_baggage_weight_kg NUMERIC,
    p_extra_luggage_count INTEGER,
    p_payment_method TEXT,
    p_passengers JSONB, -- Array of passenger objects
    p_session_id TEXT
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    booking_id UUID,
    booking_reference TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_booking_id UUID;
    v_booking_reference TEXT;
    v_passenger JSONB;
    v_seat_number TEXT;
    v_seats_array TEXT[];
    v_rate_limit_check RECORD;
BEGIN
    -- Start transaction (implicit in function)
    
    -- 1. Check rate limit
    SELECT * INTO v_rate_limit_check
    FROM check_rate_limit(
        p_user_id,
        NULL, -- IP address should be passed from application
        'booking_create',
        5, -- Max 5 bookings
        60 -- Per 60 minutes
    );
    
    IF NOT v_rate_limit_check.allowed THEN
        RETURN QUERY SELECT 
            false,
            v_rate_limit_check.message,
            NULL::UUID,
            NULL::TEXT;
        RETURN;
    END IF;
    
    -- 2. Validate schedule exists and is active
    IF NOT EXISTS (
        SELECT 1 FROM public.schedules
        WHERE id = p_schedule_id
        AND is_active = true
    ) THEN
        RETURN QUERY SELECT 
            false,
            'Schedule not found or inactive',
            NULL::UUID,
            NULL::TEXT;
        RETURN;
    END IF;
    
    -- 3. Validate booking date is not in the past
    IF p_booking_date < CURRENT_DATE THEN
        RETURN QUERY SELECT 
            false,
            'Cannot book for past dates',
            NULL::UUID,
            NULL::TEXT;
        RETURN;
    END IF;
    
    -- 4. Extract seat numbers from passengers
    FOR v_passenger IN SELECT * FROM jsonb_array_elements(p_passengers)
    LOOP
        v_seat_number := v_passenger->>'seatNumber';
        v_seats_array := array_append(v_seats_array, v_seat_number);
    END LOOP;
    
    -- 5. Verify all seats are reserved by this session
    IF NOT EXISTS (
        SELECT 1
        FROM public.seat_reservations
        WHERE schedule_id = p_schedule_id
        AND booking_date = p_booking_date
        AND seat_number = ANY(v_seats_array)
        AND session_id = p_session_id
        AND status = 'reserved'
        AND expires_at > now()
        HAVING COUNT(*) = array_length(v_seats_array, 1)
    ) THEN
        RETURN QUERY SELECT 
            false,
            'Seat reservations expired or invalid. Please select seats again.',
            NULL::UUID,
            NULL::TEXT;
        RETURN;
    END IF;
    
    -- 6. Check seat capacity
    DECLARE
        v_total_seats INTEGER;
        v_occupied_seats INTEGER;
    BEGIN
        SELECT b.total_seats INTO v_total_seats
        FROM public.schedules s
        JOIN public.buses b ON s.bus_id = b.id
        WHERE s.id = p_schedule_id;
        
        SELECT COUNT(*) INTO v_occupied_seats
        FROM public.seat_reservations
        WHERE schedule_id = p_schedule_id
        AND booking_date = p_booking_date
        AND status = 'confirmed';
        
        IF (v_occupied_seats + p_total_passengers) > v_total_seats THEN
            RETURN QUERY SELECT 
                false,
                'Not enough seats available',
                NULL::UUID,
                NULL::TEXT;
            RETURN;
        END IF;
    END;
    
    -- 7. Generate unique booking reference
    v_booking_reference := 'BK-' || upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    
    -- Ensure uniqueness
    WHILE EXISTS (SELECT 1 FROM public.bookings WHERE booking_reference = v_booking_reference) LOOP
        v_booking_reference := 'BK-' || upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    END LOOP;
    
    -- 8. Create booking record
    INSERT INTO public.bookings (
        user_id,
        schedule_id,
        booking_date,
        booking_reference,
        total_passengers,
        total_price_zmw,
        contact_phone,
        contact_email,
        baggage_weight_kg,
        extra_luggage_count,
        payment_method,
        status
    ) VALUES (
        p_user_id,
        p_schedule_id,
        p_booking_date,
        v_booking_reference,
        p_total_passengers,
        p_total_price_zmw,
        sanitize_text(p_contact_phone),
        CASE WHEN p_contact_email IS NOT NULL THEN sanitize_text(p_contact_email) ELSE NULL END,
        p_baggage_weight_kg,
        p_extra_luggage_count,
        p_payment_method,
        'pending'
    )
    RETURNING id INTO v_booking_id;
    
    -- 9. Create passenger records
    FOR v_passenger IN SELECT * FROM jsonb_array_elements(p_passengers)
    LOOP
        INSERT INTO public.passengers (
            booking_id,
            first_name,
            last_name,
            seat_number,
            phone,
            email
        ) VALUES (
            v_booking_id,
            sanitize_text(v_passenger->>'firstName'),
            sanitize_text(v_passenger->>'lastName'),
            v_passenger->>'seatNumber',
            CASE WHEN v_passenger->>'phone' IS NOT NULL THEN sanitize_text(v_passenger->>'phone') ELSE NULL END,
            CASE WHEN v_passenger->>'email' IS NOT NULL THEN sanitize_text(v_passenger->>'email') ELSE NULL END
        );
    END LOOP;
    
    -- 10. Confirm seat reservations
    PERFORM confirm_seat_reservations(p_session_id, v_booking_id);
    
    -- 11. Log audit trail
    PERFORM log_audit(
        p_user_id,
        'booking_created',
        'booking',
        v_booking_id,
        NULL,
        jsonb_build_object(
            'booking_reference', v_booking_reference,
            'schedule_id', p_schedule_id,
            'total_passengers', p_total_passengers,
            'total_price_zmw', p_total_price_zmw
        ),
        jsonb_build_object('session_id', p_session_id)
    );
    
    -- 12. Return success
    RETURN QUERY SELECT 
        true,
        'Booking created successfully',
        v_booking_id,
        v_booking_reference;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Rollback happens automatically
        -- Release seat reservations
        PERFORM release_seat_reservations(p_session_id);
        
        -- Return error
        RETURN QUERY SELECT 
            false,
            'Booking creation failed: ' || SQLERRM,
            NULL::UUID,
            NULL::TEXT;
END;
$$;

-- ============================================================================
-- 2. CREATE FUNCTION TO UPDATE BOOKING PAYMENT
-- ============================================================================
CREATE OR REPLACE FUNCTION update_booking_payment(
    p_booking_id UUID,
    p_payment_reference TEXT,
    p_payment_method TEXT,
    p_user_id UUID
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_old_status TEXT;
    v_booking_user_id UUID;
BEGIN
    -- Verify booking belongs to user
    SELECT user_id, status INTO v_booking_user_id, v_old_status
    FROM public.bookings
    WHERE id = p_booking_id;
    
    IF v_booking_user_id IS NULL THEN
        RETURN QUERY SELECT false, 'Booking not found';
        RETURN;
    END IF;
    
    IF v_booking_user_id != p_user_id THEN
        RETURN QUERY SELECT false, 'Unauthorized';
        RETURN;
    END IF;
    
    IF v_old_status != 'pending' THEN
        RETURN QUERY SELECT false, 'Booking is not in pending status';
        RETURN;
    END IF;
    
    -- Update booking
    UPDATE public.bookings
    SET payment_reference = p_payment_reference,
        payment_method = p_payment_method,
        status = 'confirmed',
        updated_at = now()
    WHERE id = p_booking_id;
    
    -- Log audit trail
    PERFORM log_audit(
        p_user_id,
        'payment_completed',
        'booking',
        p_booking_id,
        jsonb_build_object('status', v_old_status),
        jsonb_build_object('status', 'confirmed', 'payment_reference', p_payment_reference),
        NULL
    );
    
    RETURN QUERY SELECT true, 'Payment updated successfully';
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT false, 'Payment update failed: ' || SQLERRM;
END;
$$;

-- ============================================================================
-- 3. CREATE FUNCTION TO CANCEL BOOKING
-- ============================================================================
CREATE OR REPLACE FUNCTION cancel_booking(
    p_booking_id UUID,
    p_user_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_booking_user_id UUID;
    v_old_status TEXT;
    v_is_admin BOOLEAN;
BEGIN
    -- Check if user is admin/moderator
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = p_user_id
        AND role IN ('admin', 'moderator')
    ) INTO v_is_admin;
    
    -- Get booking details
    SELECT user_id, status INTO v_booking_user_id, v_old_status
    FROM public.bookings
    WHERE id = p_booking_id;
    
    IF v_booking_user_id IS NULL THEN
        RETURN QUERY SELECT false, 'Booking not found';
        RETURN;
    END IF;
    
    -- Check authorization
    IF v_booking_user_id != p_user_id AND NOT v_is_admin THEN
        RETURN QUERY SELECT false, 'Unauthorized';
        RETURN;
    END IF;
    
    -- Check if booking can be cancelled
    IF v_old_status IN ('cancelled', 'completed') THEN
        RETURN QUERY SELECT false, 'Booking cannot be cancelled';
        RETURN;
    END IF;
    
    -- Update booking status
    UPDATE public.bookings
    SET status = 'cancelled',
        updated_at = now()
    WHERE id = p_booking_id;
    
    -- Release seat reservations
    UPDATE public.seat_reservations
    SET status = 'released',
        updated_at = now()
    WHERE booking_id = p_booking_id
    AND status = 'confirmed';
    
    -- Log audit trail
    PERFORM log_audit(
        p_user_id,
        'booking_cancelled',
        'booking',
        p_booking_id,
        jsonb_build_object('status', v_old_status),
        jsonb_build_object('status', 'cancelled'),
        jsonb_build_object('reason', p_reason, 'cancelled_by', p_user_id)
    );
    
    RETURN QUERY SELECT true, 'Booking cancelled successfully';
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT false, 'Cancellation failed: ' || SQLERRM;
END;
$$;

-- ============================================================================
-- 4. GRANT PERMISSIONS
-- ============================================================================
GRANT EXECUTE ON FUNCTION create_booking_with_passengers TO authenticated, anon;
GRANT EXECUTE ON FUNCTION update_booking_payment TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_booking TO authenticated;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
