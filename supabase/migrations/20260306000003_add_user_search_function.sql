-- Migration: Add user search function for admin
-- Date: 2026-03-06

-- ============================================================================
-- 1. SYNC EMAILS FROM AUTH.USERS TO PROFILES
-- ============================================================================
-- Update profiles table with emails from auth.users where missing
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id 
AND (p.email IS NULL OR p.email = '');

-- ============================================================================
-- 2. CREATE FUNCTION TO SEARCH USERS (ADMIN ONLY)
-- ============================================================================
CREATE OR REPLACE FUNCTION search_users_for_admin(
    search_term TEXT
)
RETURNS TABLE(
    id UUID,
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    phone TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if caller is admin or moderator
    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role IN ('admin', 'moderator')
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required';
    END IF;

    -- Search in profiles table and join with auth.users for email
    -- Use COALESCE to get email from either profiles or auth.users
    RETURN QUERY
    SELECT 
        p.id,
        COALESCE(p.email, u.email, '') as email,
        COALESCE(p.first_name, '') as first_name,
        COALESCE(p.last_name, '') as last_name,
        COALESCE(p.phone, '') as phone
    FROM public.profiles p
    INNER JOIN auth.users u ON p.id = u.id
    WHERE 
        COALESCE(p.email, u.email, '') ILIKE '%' || search_term || '%'
        OR COALESCE(p.first_name, '') ILIKE '%' || search_term || '%'
        OR COALESCE(p.last_name, '') ILIKE '%' || search_term || '%'
        OR COALESCE(p.phone, '') ILIKE '%' || search_term || '%'
        OR u.email ILIKE '%' || search_term || '%'
    ORDER BY p.first_name, p.last_name
    LIMIT 20;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION search_users_for_admin TO authenticated;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
