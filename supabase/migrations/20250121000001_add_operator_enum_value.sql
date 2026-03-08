-- Add operator role to app_role enum
-- This must be in a separate migration because enum values need to be committed
-- before they can be used in subsequent statements

-- First, add the enum value (this will commit automatically)
DO $$ 
BEGIN
  -- Check if 'operator' enum value already exists
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_enum 
    WHERE enumlabel = 'operator' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')
  ) THEN
    -- Add the new enum value
    ALTER TYPE app_role ADD VALUE 'operator';
  END IF;
END $$;

-- Note: The is_operator() function is created in the next migration file
-- (20250121000002_create_operator_functions.sql) to ensure the enum value
-- is fully committed before being used in function definitions

