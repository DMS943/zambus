-- Migration: Add Operator Dashboard Features
-- Description: Adds tables and functions for fleet management, drivers, notifications, analytics, and more

-- =====================================================
-- 1. DRIVERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES public.bus_operators(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  license_number TEXT NOT NULL UNIQUE,
  license_expiry_date DATE NOT NULL,
  date_of_birth DATE NOT NULL,
  address TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave', 'suspended')),
  rating DECIMAL(3,2) DEFAULT 0.00 CHECK (rating >= 0 AND rating <= 5),
  total_trips INTEGER DEFAULT 0,
  profile_photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 2. BUS STATUS & MAINTENANCE
-- =====================================================
-- Add status columns to buses table if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'buses' AND column_name = 'status') THEN
    ALTER TABLE public.buses ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'inactive', 'retired'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'buses' AND column_name = 'last_maintenance_date') THEN
    ALTER TABLE public.buses ADD COLUMN last_maintenance_date DATE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'buses' AND column_name = 'next_maintenance_date') THEN
    ALTER TABLE public.buses ADD COLUMN next_maintenance_date DATE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'buses' AND column_name = 'mileage_km') THEN
    ALTER TABLE public.buses ADD COLUMN mileage_km INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'buses' AND column_name = 'gps_device_id') THEN
    ALTER TABLE public.buses ADD COLUMN gps_device_id TEXT;
  END IF;
END $$;

-- Maintenance records table
CREATE TABLE IF NOT EXISTS public.bus_maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id UUID NOT NULL REFERENCES public.buses(id) ON DELETE CASCADE,
  maintenance_type TEXT NOT NULL CHECK (maintenance_type IN ('routine', 'repair', 'inspection', 'emergency')),
  description TEXT NOT NULL,
  cost_zmw DECIMAL(10,2) DEFAULT 0,
  performed_by TEXT,
  performed_at TIMESTAMPTZ NOT NULL,
  next_maintenance_due DATE,
  parts_replaced TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 3. SCHEDULE ASSIGNMENTS (Driver to Schedule)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.schedule_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  assignment_date DATE NOT NULL,
  status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(schedule_id, assignment_date, driver_id)
);

-- =====================================================
-- 4. NOTIFICATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.operator_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES public.bus_operators(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('booking', 'cancellation', 'payment', 'maintenance', 'system', 'alert')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  related_bus_id UUID REFERENCES public.buses(id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT false,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 5. PASSENGER CHECK-IN TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.passenger_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  passenger_id UUID NOT NULL REFERENCES public.passengers(id) ON DELETE CASCADE,
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  checked_in_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  boarding_pass_scanned BOOLEAN DEFAULT false,
  notes TEXT,
  UNIQUE(booking_id, passenger_id)
);

-- =====================================================
-- 6. BULK MESSAGES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.bulk_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES public.bus_operators(id) ON DELETE CASCADE,
  sent_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL CHECK (message_type IN ('sms', 'email', 'both')),
  subject TEXT,
  message TEXT NOT NULL,
  recipient_filter JSONB, -- Store filter criteria
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sending', 'sent', 'failed')),
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 7. SPECIAL PRICING TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.special_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  price_zmw DECIMAL(10,2) NOT NULL CHECK (price_zmw >= 0),
  discount_percentage DECIMAL(5,2) DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  reason TEXT, -- e.g., 'Holiday Special', 'Off-Peak Discount'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  CHECK (end_date >= start_date)
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_drivers_operator_id ON public.drivers(operator_id);
CREATE INDEX IF NOT EXISTS idx_drivers_status ON public.drivers(status);
CREATE INDEX IF NOT EXISTS idx_bus_maintenance_bus_id ON public.bus_maintenance(bus_id);
CREATE INDEX IF NOT EXISTS idx_bus_maintenance_performed_at ON public.bus_maintenance(performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_schedule_assignments_schedule_id ON public.schedule_assignments(schedule_id);
CREATE INDEX IF NOT EXISTS idx_schedule_assignments_driver_id ON public.schedule_assignments(driver_id);
CREATE INDEX IF NOT EXISTS idx_schedule_assignments_date ON public.schedule_assignments(assignment_date);
CREATE INDEX IF NOT EXISTS idx_operator_notifications_operator_id ON public.operator_notifications(operator_id);
CREATE INDEX IF NOT EXISTS idx_operator_notifications_user_id ON public.operator_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_operator_notifications_is_read ON public.operator_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_operator_notifications_created_at ON public.operator_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_passenger_checkins_booking_id ON public.passenger_checkins(booking_id);
CREATE INDEX IF NOT EXISTS idx_bulk_messages_operator_id ON public.bulk_messages(operator_id);
CREATE INDEX IF NOT EXISTS idx_special_pricing_schedule_id ON public.special_pricing(schedule_id);
CREATE INDEX IF NOT EXISTS idx_special_pricing_dates ON public.special_pricing(start_date, end_date);

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Drivers
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Operators can view their own drivers"
  ON public.drivers FOR SELECT
  USING (
    operator_id IN (
      SELECT operator_id FROM public.operator_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Operators can insert their own drivers"
  ON public.drivers FOR INSERT
  WITH CHECK (
    operator_id IN (
      SELECT operator_id FROM public.operator_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Operators can update their own drivers"
  ON public.drivers FOR UPDATE
  USING (
    operator_id IN (
      SELECT operator_id FROM public.operator_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Operators can delete their own drivers"
  ON public.drivers FOR DELETE
  USING (
    operator_id IN (
      SELECT operator_id FROM public.operator_users WHERE user_id = auth.uid()
    )
  );

-- Bus Maintenance
ALTER TABLE public.bus_maintenance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Operators can view maintenance for their buses"
  ON public.bus_maintenance FOR SELECT
  USING (
    bus_id IN (
      SELECT b.id FROM public.buses b
      INNER JOIN public.operator_users ou ON b.operator_id = ou.operator_id
      WHERE ou.user_id = auth.uid()
    )
  );

CREATE POLICY "Operators can insert maintenance for their buses"
  ON public.bus_maintenance FOR INSERT
  WITH CHECK (
    bus_id IN (
      SELECT b.id FROM public.buses b
      INNER JOIN public.operator_users ou ON b.operator_id = ou.operator_id
      WHERE ou.user_id = auth.uid()
    )
  );

-- Schedule Assignments
ALTER TABLE public.schedule_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Operators can view their schedule assignments"
  ON public.schedule_assignments FOR SELECT
  USING (
    driver_id IN (
      SELECT d.id FROM public.drivers d
      INNER JOIN public.operator_users ou ON d.operator_id = ou.operator_id
      WHERE ou.user_id = auth.uid()
    )
  );

CREATE POLICY "Operators can manage their schedule assignments"
  ON public.schedule_assignments FOR ALL
  USING (
    driver_id IN (
      SELECT d.id FROM public.drivers d
      INNER JOIN public.operator_users ou ON d.operator_id = ou.operator_id
      WHERE ou.user_id = auth.uid()
    )
  );

-- Operator Notifications
ALTER TABLE public.operator_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their operator notifications"
  ON public.operator_notifications FOR SELECT
  USING (
    user_id = auth.uid() OR
    operator_id IN (
      SELECT operator_id FROM public.operator_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert notifications"
  ON public.operator_notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
  ON public.operator_notifications FOR UPDATE
  USING (user_id = auth.uid());

-- Passenger Check-ins
ALTER TABLE public.passenger_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Operators can view checkins for their bookings"
  ON public.passenger_checkins FOR SELECT
  USING (
    booking_id IN (
      SELECT bk.id FROM public.bookings bk
      INNER JOIN public.schedules s ON bk.schedule_id = s.id
      INNER JOIN public.buses b ON s.bus_id = b.id
      INNER JOIN public.operator_users ou ON b.operator_id = ou.operator_id
      WHERE ou.user_id = auth.uid()
    )
  );

CREATE POLICY "Operators can manage checkins"
  ON public.passenger_checkins FOR ALL
  USING (
    booking_id IN (
      SELECT bk.id FROM public.bookings bk
      INNER JOIN public.schedules s ON bk.schedule_id = s.id
      INNER JOIN public.buses b ON s.bus_id = b.id
      INNER JOIN public.operator_users ou ON b.operator_id = ou.operator_id
      WHERE ou.user_id = auth.uid()
    )
  );

-- Bulk Messages
ALTER TABLE public.bulk_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Operators can view their bulk messages"
  ON public.bulk_messages FOR SELECT
  USING (
    operator_id IN (
      SELECT operator_id FROM public.operator_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Operators can create bulk messages"
  ON public.bulk_messages FOR INSERT
  WITH CHECK (
    operator_id IN (
      SELECT operator_id FROM public.operator_users WHERE user_id = auth.uid()
    )
  );

-- Special Pricing
ALTER TABLE public.special_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Operators can view special pricing for their schedules"
  ON public.special_pricing FOR SELECT
  USING (
    schedule_id IN (
      SELECT s.id FROM public.schedules s
      INNER JOIN public.buses b ON s.bus_id = b.id
      INNER JOIN public.operator_users ou ON b.operator_id = ou.operator_id
      WHERE ou.user_id = auth.uid()
    )
  );

CREATE POLICY "Operators can manage special pricing"
  ON public.special_pricing FOR ALL
  USING (
    schedule_id IN (
      SELECT s.id FROM public.schedules s
      INNER JOIN public.buses b ON s.bus_id = b.id
      INNER JOIN public.operator_users ou ON b.operator_id = ou.operator_id
      WHERE ou.user_id = auth.uid()
    )
  );

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function: Get operator analytics
CREATE OR REPLACE FUNCTION get_operator_analytics(
  p_operator_id UUID,
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'total_revenue', COALESCE(SUM(b.total_price_zmw), 0),
    'total_bookings', COUNT(b.id),
    'total_passengers', COALESCE(SUM(b.total_passengers), 0),
    'avg_occupancy_rate', COALESCE(AVG(
      (b.total_passengers::DECIMAL / bus.total_seats) * 100
    ), 0),
    'top_routes', (
      SELECT json_agg(route_stats ORDER BY revenue DESC)
      FROM (
        SELECT 
          r.origin || ' → ' || r.destination as route,
          COUNT(b.id) as bookings,
          SUM(b.total_price_zmw) as revenue,
          SUM(b.total_passengers) as passengers
        FROM bookings b
        INNER JOIN schedules s ON b.schedule_id = s.id
        INNER JOIN routes r ON s.route_id = r.id
        INNER JOIN buses bus ON s.bus_id = bus.id
        WHERE bus.operator_id = p_operator_id
          AND b.booking_date BETWEEN p_start_date AND p_end_date
          AND b.status IN ('confirmed', 'completed')
        GROUP BY r.id, r.origin, r.destination
        ORDER BY revenue DESC
        LIMIT 5
      ) route_stats
    ),
    'daily_revenue', (
      SELECT json_agg(daily_stats ORDER BY date)
      FROM (
        SELECT 
          b.booking_date as date,
          SUM(b.total_price_zmw) as revenue,
          COUNT(b.id) as bookings
        FROM bookings b
        INNER JOIN schedules s ON b.schedule_id = s.id
        INNER JOIN buses bus ON s.bus_id = bus.id
        WHERE bus.operator_id = p_operator_id
          AND b.booking_date BETWEEN p_start_date AND p_end_date
          AND b.status IN ('confirmed', 'completed')
        GROUP BY b.booking_date
        ORDER BY b.booking_date
      ) daily_stats
    )
  ) INTO v_result
  FROM bookings b
  INNER JOIN schedules s ON b.schedule_id = s.id
  INNER JOIN buses bus ON s.bus_id = bus.id
  WHERE bus.operator_id = p_operator_id
    AND b.booking_date BETWEEN p_start_date AND p_end_date
    AND b.status IN ('confirmed', 'completed');

  RETURN v_result;
END;
$$;

-- Function: Mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.operator_notifications
  SET is_read = true
  WHERE id = p_notification_id
    AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$$;

-- Function: Create notification
CREATE OR REPLACE FUNCTION create_operator_notification(
  p_operator_id UUID,
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_related_booking_id UUID DEFAULT NULL,
  p_related_bus_id UUID DEFAULT NULL,
  p_priority TEXT DEFAULT 'normal'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO public.operator_notifications (
    operator_id, user_id, type, title, message,
    related_booking_id, related_bus_id, priority
  ) VALUES (
    p_operator_id, p_user_id, p_type, p_title, p_message,
    p_related_booking_id, p_related_bus_id, p_priority
  )
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

-- Function: Get passenger manifest for a trip
CREATE OR REPLACE FUNCTION get_passenger_manifest(
  p_schedule_id UUID,
  p_booking_date DATE
)
RETURNS TABLE (
  booking_reference TEXT,
  passenger_name TEXT,
  seat_number TEXT,
  phone TEXT,
  email TEXT,
  checked_in BOOLEAN,
  checked_in_at TIMESTAMPTZ,
  special_requirements TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.booking_reference,
    p.first_name || ' ' || p.last_name as passenger_name,
    p.seat_number,
    COALESCE(p.phone, b.contact_phone) as phone,
    COALESCE(p.email, b.contact_email) as email,
    CASE WHEN pc.id IS NOT NULL THEN true ELSE false END as checked_in,
    pc.checked_in_at,
    p.special_requirements
  FROM bookings b
  INNER JOIN passengers p ON b.id = p.booking_id
  LEFT JOIN passenger_checkins pc ON b.id = pc.booking_id AND p.id = pc.passenger_id
  WHERE b.schedule_id = p_schedule_id
    AND b.booking_date = p_booking_date
    AND b.status IN ('confirmed', 'completed')
  ORDER BY p.seat_number;
END;
$$;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger: Create notification on new booking
CREATE OR REPLACE FUNCTION notify_operator_new_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_operator_id UUID;
  v_route_info TEXT;
BEGIN
  -- Get operator_id and route info
  SELECT b.operator_id, r.origin || ' → ' || r.destination
  INTO v_operator_id, v_route_info
  FROM buses b
  INNER JOIN schedules s ON s.bus_id = b.id
  INNER JOIN routes r ON s.route_id = r.id
  WHERE s.id = NEW.schedule_id;

  -- Create notification
  INSERT INTO public.operator_notifications (
    operator_id, type, title, message, related_booking_id, priority
  ) VALUES (
    v_operator_id,
    'booking',
    'New Booking Received',
    'New booking ' || NEW.booking_reference || ' for ' || v_route_info || ' on ' || NEW.booking_date,
    NEW.id,
    'normal'
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_new_booking
  AFTER INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_operator_new_booking();

-- Trigger: Notify on booking cancellation
CREATE OR REPLACE FUNCTION notify_operator_booking_cancelled()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_operator_id UUID;
  v_route_info TEXT;
BEGIN
  IF OLD.status != 'cancelled' AND NEW.status = 'cancelled' THEN
    -- Get operator_id and route info
    SELECT b.operator_id, r.origin || ' → ' || r.destination
    INTO v_operator_id, v_route_info
    FROM buses b
    INNER JOIN schedules s ON s.bus_id = b.id
    INNER JOIN routes r ON s.route_id = r.id
    WHERE s.id = NEW.schedule_id;

    -- Create notification
    INSERT INTO public.operator_notifications (
      operator_id, type, title, message, related_booking_id, priority
    ) VALUES (
      v_operator_id,
      'cancellation',
      'Booking Cancelled',
      'Booking ' || NEW.booking_reference || ' for ' || v_route_info || ' has been cancelled',
      NEW.id,
      'high'
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_booking_cancelled
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_operator_booking_cancelled();

-- Update timestamp trigger for drivers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_drivers_updated_at
  BEFORE UPDATE ON public.drivers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedule_assignments_updated_at
  BEFORE UPDATE ON public.schedule_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.drivers TO authenticated;
GRANT ALL ON public.bus_maintenance TO authenticated;
GRANT ALL ON public.schedule_assignments TO authenticated;
GRANT ALL ON public.operator_notifications TO authenticated;
GRANT ALL ON public.passenger_checkins TO authenticated;
GRANT ALL ON public.bulk_messages TO authenticated;
GRANT ALL ON public.special_pricing TO authenticated;

GRANT EXECUTE ON FUNCTION get_operator_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_read TO authenticated;
GRANT EXECUTE ON FUNCTION create_operator_notification TO authenticated;
GRANT EXECUTE ON FUNCTION get_passenger_manifest TO authenticated;
