-- Create System Admin User
-- This script creates a system admin user with full access to all system settings

-- First, let's check if the user already exists in auth.users
-- Note: You'll need to create the auth user first through Supabase Auth UI or API
-- This script assumes the auth user already exists

-- Create or update the system admin user in our users table
DO $$
DECLARE
  v_auth_user_id uuid;
  v_org_id uuid;
BEGIN
  -- Get or create a system organization
  INSERT INTO organizations (name, slug, settings)
  VALUES ('System Organization', 'system-org', '{}')
  ON CONFLICT (slug) DO UPDATE SET name = 'System Organization'
  RETURNING id INTO v_org_id;

  -- Check if auth user exists with this email
  -- Note: In production, create the auth user first via Supabase Dashboard or API
  -- For now, we'll use a placeholder UUID that you'll need to replace
  
  -- You need to get the actual UUID from Supabase Auth after creating the user
  -- Go to: Supabase Dashboard > Authentication > Users > Create User
  -- Email: systemadmin@tin.info
  -- Password: (choose a secure password)
  -- Copy the UUID and run this script with the actual UUID
  
  -- For demonstration, we'll create a record that will work once you have the auth user
  -- Replace 'YOUR_AUTH_USER_UUID_HERE' with the actual UUID from Supabase Auth
  
  -- Example: v_auth_user_id := '123e4567-e89b-12d3-a456-426614174000'::uuid;
  
  RAISE NOTICE 'Please create the auth user first in Supabase Dashboard with email: systemadmin@tin.info';
  RAISE NOTICE 'Then run the following INSERT with the actual user_id:';
  RAISE NOTICE 'INSERT INTO users (user_id, email, full_name, role, organization_id) VALUES (''YOUR_UUID_HERE'', ''systemadmin@tin.info'', ''System Administrator'', ''system_admin'', ''%'') ON CONFLICT (user_id) DO UPDATE SET role = ''system_admin'', full_name = ''System Administrator'';', v_org_id;
  
END $$;

-- Alternative: If you want to update an existing user to system_admin role
-- UPDATE users 
-- SET role = 'system_admin', 
--     full_name = 'System Administrator'
-- WHERE email = 'systemadmin@tin.info';

-- Verify the system admin user
SELECT 
  u.user_id,
  u.email,
  u.full_name,
  u.role,
  o.name as organization_name
FROM users u
LEFT JOIN organizations o ON u.organization_id = o.id
WHERE u.email = 'systemadmin@tin.info';

-- Grant necessary permissions
-- The system_admin role should have access to all permissions
-- This is already handled by the RLS policies in roles-and-permissions.sql

COMMENT ON SCRIPT IS 'Creates or updates the system admin user with full access to system settings';


