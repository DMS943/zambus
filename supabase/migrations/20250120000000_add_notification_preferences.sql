-- Add notification preferences to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS sms_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS push_notifications BOOLEAN DEFAULT false;

-- Note: Notifications are sent via Edge Functions called from the application code
-- This migration just adds the preference columns to the profiles table
-- The actual notification sending happens in useBooking.ts and the Edge Functions

