-- Create function to assign roles (bypasses RLS)
-- This function allows admins to assign roles to users
CREATE OR REPLACE FUNCTION public.assign_role(
  _target_user_id UUID,
  _role app_role,
  _created_by UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_admin BOOLEAN;
  _caller_id UUID;
BEGIN
  -- Get the current authenticated user ID
  _caller_id := auth.uid();
  
  -- Check if the caller is an admin
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _caller_id
      AND role = 'admin'
  ) INTO _is_admin;
  
  IF NOT _is_admin THEN
    RAISE EXCEPTION 'Only admins can assign roles';
  END IF;
  
  -- Use provided created_by or default to caller
  IF _created_by IS NULL THEN
    _created_by := _caller_id;
  END IF;
  
  -- Insert or update the role (using INSERT with ON CONFLICT)
  INSERT INTO public.user_roles (user_id, role, created_by)
  VALUES (_target_user_id, _role, _created_by)
  ON CONFLICT (user_id, role) 
  DO UPDATE SET created_by = EXCLUDED.created_by;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.assign_role(UUID, app_role, UUID) TO authenticated;

