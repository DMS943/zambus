-- Create function to check if user is an operator
-- This is in a separate migration to ensure the enum value from the previous migration is committed
-- We use dynamic SQL to avoid the "unsafe enum value" error during function creation
CREATE OR REPLACE FUNCTION public.is_operator(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  role_count INTEGER;
  query_text TEXT;
BEGIN
  -- Use dynamic SQL to avoid enum validation at function creation time
  query_text := format(
    'SELECT COUNT(*) FROM public.user_roles WHERE user_id = $1 AND role::text = %L',
    'operator'
  );
  
  EXECUTE query_text USING _user_id INTO role_count;
  
  RETURN COALESCE(role_count, 0) > 0;
END;
$$;

