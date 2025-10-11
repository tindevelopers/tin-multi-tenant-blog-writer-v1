-- Assign System Admin Role to Existing User
-- This script will assign the system_admin role to the user with email: systemadmin@tin.info

-- Step 1: Check if user exists
SELECT 
  u.user_id,
  u.email,
  u.full_name,
  u.role AS current_role,
  o.name as organization_name
FROM users u
LEFT JOIN organizations o ON u.org_id = o.org_id
WHERE u.email = 'systemadmin@tin.info';

-- Step 2: Create or update system organization
DO $$
DECLARE
  v_org_id uuid;
BEGIN
  -- Get or create system organization
  INSERT INTO organizations (name, slug, settings)
  VALUES ('System Organization', 'system-org', '{"description": "System-level administrative organization"}')
  ON CONFLICT (slug) DO UPDATE 
  SET name = 'System Organization',
      settings = '{"description": "System-level administrative organization"}'
  RETURNING org_id INTO v_org_id;

  RAISE NOTICE 'System organization ID: %', v_org_id;
END $$;

-- Step 3: Update existing user to system_admin role
UPDATE users 
SET 
  role = 'system_admin',
  full_name = COALESCE(full_name, 'System Administrator'),
  org_id = (SELECT org_id FROM organizations WHERE slug = 'system-org'),
  updated_at = NOW()
WHERE email = 'systemadmin@tin.info';

-- Step 4: Verify the update
SELECT 
  u.user_id,
  u.email,
  u.full_name,
  u.role AS new_role,
  o.name as organization_name,
  u.created_at,
  u.updated_at
FROM users u
LEFT JOIN organizations o ON u.org_id = o.org_id
WHERE u.email = 'systemadmin@tin.info';

-- Step 5: Check permissions for system_admin role
SELECT 
  rp.role,
  p.name as permission_name,
  p.description,
  p.resource,
  p.action
FROM role_permissions rp
JOIN permissions p ON rp.permission_id = p.id
WHERE rp.role = 'system_admin'
ORDER BY p.resource, p.action;

-- Script complete: Assigns system_admin role to existing user systemadmin@tin.info

