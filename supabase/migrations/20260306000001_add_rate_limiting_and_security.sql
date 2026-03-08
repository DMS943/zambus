-- Migration: Add rate limiting and security measures
-- Date: 2026-03-06

-- ============================================================================
-- 1. CREATE RATE LIMITING TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    ip_address INET,
    action TEXT NOT NULL, -- 'booking_create', 'login', 'api_call', etc.
    attempt_count INTEGER NOT NULL DEFAULT 1,
    window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
    blocked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for rate limiting
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_action 
ON public.rate_limits(user_id, action, window_start);

CREATE INDEX IF NOT EXISTS idx_rate_limits_ip_action 
ON public.rate_limits(ip_address, action, window_start);

CREATE INDEX IF NOT EXISTS idx_rate_limits_blocked 
ON public.rate_limits(blocked_until) 
WHERE blocked_until IS NOT NULL;

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own rate limits"
ON public.rate_limits FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Service role can manage all rate limits"
ON public.rate_limits FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 2. CREATE AUDIT LOG TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- 'booking_created', 'booking_cancelled', 'role_assigned', etc.
    resource_type TEXT NOT NULL, -- 'booking', 'user', 'schedule', etc.
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id 
ON public.audit_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action 
ON public.audit_logs(action);

CREATE INDEX IF NOT EXISTS idx_audit_logs_resource 
ON public.audit_logs(resource_type, resource_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at 
ON public.audit_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can view all audit logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role IN ('admin', 'moderator')
    )
);

CREATE POLICY "Service role can manage all audit logs"
ON public.audit_logs FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 3. CREATE RATE LIMITING FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_user_id UUID,
    p_ip_address INET,
    p_action TEXT,
    p_max_attempts INTEGER DEFAULT 10,
    p_window_minutes INTEGER DEFAULT 60
)
RETURNS TABLE(
    allowed BOOLEAN,
    message TEXT,
    retry_after INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_window_start TIMESTAMPTZ;
    v_attempt_count INTEGER;
    v_blocked_until TIMESTAMPTZ;
    v_rate_limit_id UUID;
BEGIN
    v_window_start := now() - (p_window_minutes || ' minutes')::INTERVAL;
    
    -- Check if user is currently blocked
    SELECT blocked_until, id INTO v_blocked_until, v_rate_limit_id
    FROM public.rate_limits
    WHERE (user_id = p_user_id OR ip_address = p_ip_address)
    AND action = p_action
    AND blocked_until > now()
    ORDER BY blocked_until DESC
    LIMIT 1;
    
    IF v_blocked_until IS NOT NULL THEN
        RETURN QUERY SELECT 
            false,
            'Too many attempts. Please try again later.',
            EXTRACT(EPOCH FROM (v_blocked_until - now()))::INTEGER;
        RETURN;
    END IF;
    
    -- Get or create rate limit record
    SELECT attempt_count, id INTO v_attempt_count, v_rate_limit_id
    FROM public.rate_limits
    WHERE (user_id = p_user_id OR ip_address = p_ip_address)
    AND action = p_action
    AND window_start > v_window_start
    ORDER BY window_start DESC
    LIMIT 1;
    
    IF v_rate_limit_id IS NULL THEN
        -- Create new rate limit record
        INSERT INTO public.rate_limits (user_id, ip_address, action, attempt_count, window_start)
        VALUES (p_user_id, p_ip_address, p_action, 1, now())
        RETURNING id INTO v_rate_limit_id;
        
        RETURN QUERY SELECT true, 'Request allowed', 0;
        RETURN;
    END IF;
    
    -- Check if limit exceeded
    IF v_attempt_count >= p_max_attempts THEN
        -- Block user for 1 hour
        UPDATE public.rate_limits
        SET blocked_until = now() + interval '1 hour',
            updated_at = now()
        WHERE id = v_rate_limit_id;
        
        RETURN QUERY SELECT 
            false,
            'Rate limit exceeded. Please try again later.',
            3600;
        RETURN;
    END IF;
    
    -- Increment attempt count
    UPDATE public.rate_limits
    SET attempt_count = attempt_count + 1,
        updated_at = now()
    WHERE id = v_rate_limit_id;
    
    RETURN QUERY SELECT true, 'Request allowed', 0;
END;
$$;

-- ============================================================================
-- 4. CREATE AUDIT LOG FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION log_audit(
    p_user_id UUID,
    p_action TEXT,
    p_resource_type TEXT,
    p_resource_id UUID,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_audit_id UUID;
BEGIN
    INSERT INTO public.audit_logs (
        user_id,
        action,
        resource_type,
        resource_id,
        old_values,
        new_values,
        metadata
    ) VALUES (
        p_user_id,
        p_action,
        p_resource_type,
        p_resource_id,
        p_old_values,
        p_new_values,
        p_metadata
    )
    RETURNING id INTO v_audit_id;
    
    RETURN v_audit_id;
END;
$$;

-- ============================================================================
-- 5. CREATE TRIGGER FOR BOOKING STATUS CHANGES
-- ============================================================================
CREATE OR REPLACE FUNCTION audit_booking_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM log_audit(
            NEW.user_id,
            'booking_created',
            'booking',
            NEW.id,
            NULL,
            to_jsonb(NEW),
            jsonb_build_object('booking_reference', NEW.booking_reference)
        );
    ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        PERFORM log_audit(
            NEW.user_id,
            'booking_status_changed',
            'booking',
            NEW.id,
            jsonb_build_object('status', OLD.status),
            jsonb_build_object('status', NEW.status),
            jsonb_build_object('booking_reference', NEW.booking_reference)
        );
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM log_audit(
            OLD.user_id,
            'booking_deleted',
            'booking',
            OLD.id,
            to_jsonb(OLD),
            NULL,
            jsonb_build_object('booking_reference', OLD.booking_reference)
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_bookings_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION audit_booking_changes();

-- ============================================================================
-- 6. CREATE TRIGGER FOR ROLE ASSIGNMENTS
-- ============================================================================
CREATE OR REPLACE FUNCTION audit_role_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM log_audit(
            NEW.created_by,
            'role_assigned',
            'user_role',
            NEW.id,
            NULL,
            to_jsonb(NEW),
            jsonb_build_object('target_user_id', NEW.user_id, 'role', NEW.role)
        );
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM log_audit(
            auth.uid(),
            'role_removed',
            'user_role',
            OLD.id,
            to_jsonb(OLD),
            NULL,
            jsonb_build_object('target_user_id', OLD.user_id, 'role', OLD.role)
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_user_roles_trigger
    AFTER INSERT OR DELETE ON public.user_roles
    FOR EACH ROW
    EXECUTE FUNCTION audit_role_changes();

-- ============================================================================
-- 7. CREATE FUNCTION TO CLEAN UP OLD RATE LIMITS
-- ============================================================================
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Delete rate limit records older than 7 days
    DELETE FROM public.rate_limits
    WHERE window_start < now() - interval '7 days'
    AND (blocked_until IS NULL OR blocked_until < now());
END;
$$;

-- ============================================================================
-- 8. CREATE FUNCTION TO SANITIZE INPUT
-- ============================================================================
CREATE OR REPLACE FUNCTION sanitize_text(input_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    -- Remove potentially dangerous characters
    RETURN regexp_replace(
        regexp_replace(input_text, '[<>]', '', 'g'),
        E'[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F]',
        '',
        'g'
    );
END;
$$;

-- ============================================================================
-- 9. ADD SECURITY CONSTRAINTS TO BOOKINGS
-- ============================================================================

-- First, update existing booking references to match the new format
UPDATE public.bookings
SET booking_reference = 'BK-' || upper(substring(md5(id::text || created_at::text) from 1 for 8))
WHERE booking_reference !~ '^[A-Z0-9]{2,3}-[A-Z0-9]{8,}$';

-- Ensure booking reference follows pattern
DO $$ BEGIN
    ALTER TABLE public.bookings
    ADD CONSTRAINT check_booking_reference_format
    CHECK (booking_reference ~ '^[A-Z0-9]{2,3}-[A-Z0-9]{8,}$');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Update invalid phone numbers to a placeholder format
UPDATE public.bookings
SET contact_phone = '+260000000000'
WHERE contact_phone !~ '^\+?[0-9]{9,15}$';

-- Ensure contact phone is valid format
DO $$ BEGIN
    ALTER TABLE public.bookings
    ADD CONSTRAINT check_contact_phone_format
    CHECK (contact_phone ~ '^\+?[0-9]{9,15}$');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Fix invalid email addresses
UPDATE public.bookings
SET contact_email = NULL
WHERE contact_email IS NOT NULL 
AND contact_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';

-- Ensure email is valid format (if provided)
DO $$ BEGIN
    ALTER TABLE public.bookings
    ADD CONSTRAINT check_contact_email_format
    CHECK (contact_email IS NULL OR contact_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 10. GRANT PERMISSIONS
-- ============================================================================
GRANT EXECUTE ON FUNCTION check_rate_limit TO authenticated, anon;
GRANT EXECUTE ON FUNCTION log_audit TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_rate_limits TO service_role;
GRANT EXECUTE ON FUNCTION sanitize_text TO authenticated, anon;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
