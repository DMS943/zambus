-- Create travel_updates table for displaying travel alerts and updates on the homepage
CREATE TABLE IF NOT EXISTS public.travel_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('alert', 'info', 'announcement', 'warning')),
    icon_color TEXT DEFAULT 'bg-blue-500',
    priority INTEGER DEFAULT 0, -- Higher number = higher priority (shows first)
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMPTZ, -- Optional: auto-hide after expiration
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- Enable Row Level Security
ALTER TABLE public.travel_updates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Everyone can view active travel updates
CREATE POLICY "Anyone can view active travel updates"
ON public.travel_updates
FOR SELECT
TO public
USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- Admins can view all travel updates
CREATE POLICY "Admins can view all travel updates"
ON public.travel_updates
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'moderator')
  )
);

-- Admins can insert travel updates
CREATE POLICY "Admins can insert travel updates"
ON public.travel_updates
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'moderator')
  )
);

-- Admins can update travel updates
CREATE POLICY "Admins can update travel updates"
ON public.travel_updates
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'moderator')
  )
);

-- Admins can delete travel updates
CREATE POLICY "Admins can delete travel updates"
ON public.travel_updates
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'moderator')
  )
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_travel_updates_active ON public.travel_updates(is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_travel_updates_priority ON public.travel_updates(priority DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_travel_updates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_travel_updates_timestamp
BEFORE UPDATE ON public.travel_updates
FOR EACH ROW
EXECUTE FUNCTION public.update_travel_updates_updated_at();

-- Insert some sample data (optional - for testing)
INSERT INTO public.travel_updates (title, description, type, icon_color, priority, created_at)
VALUES 
  ('Road Closure Alert', 'Great East Road partially closed between Chipata and Lundazi. Expect 30min delays.', 'alert', 'bg-red-500', 3, now() - interval '2 hours'),
  ('New Route: Lusaka to Livingstone', 'Express service now available daily at 6:00 AM and 2:00 PM.', 'info', 'bg-blue-500', 2, now() - interval '1 day'),
  ('Holiday Schedule Update', 'Extra buses added for Christmas season. Book early to secure your seat.', 'announcement', 'bg-green-500', 1, now() - interval '3 days')
ON CONFLICT DO NOTHING;

