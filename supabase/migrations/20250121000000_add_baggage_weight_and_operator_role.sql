-- Add baggage_weight_kg field to bookings table
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS baggage_weight_kg NUMERIC DEFAULT 0;

-- Note: The 'operator' enum value is added in a separate migration file
-- (20250121000001_add_operator_enum_value.sql) because enum values must be
-- committed before they can be used in subsequent statements

-- Create operator_users table to link users to bus operators
CREATE TABLE IF NOT EXISTS public.operator_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    operator_id UUID REFERENCES public.bus_operators(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, operator_id)
);

-- Enable RLS for operator_users
ALTER TABLE public.operator_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for operator_users
CREATE POLICY "Users can view their own operator assignments"
ON public.operator_users FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage operator assignments"
ON public.operator_users FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Create function to get operator_id for a user
CREATE OR REPLACE FUNCTION public.get_user_operator_id(_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result UUID;
BEGIN
  SELECT operator_id INTO result
  FROM public.operator_users
  WHERE user_id = _user_id
  LIMIT 1;
  
  RETURN result;
END;
$$;

-- Update bookings RLS to allow operators to view their bookings
-- First, drop existing policy if it exists (we'll recreate it)
DROP POLICY IF EXISTS "Operators can view their bookings" ON public.bookings;

CREATE POLICY "Operators can view their bookings"
ON public.bookings FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.schedules
    JOIN public.buses ON schedules.bus_id = buses.id
    JOIN public.operator_users ON buses.operator_id = operator_users.operator_id
    WHERE schedules.id = bookings.schedule_id
      AND operator_users.user_id = auth.uid()
  )
);

