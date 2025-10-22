-- =====================================================
-- Create system user for blog post creation
-- This allows the system to create blog posts without authentication
-- =====================================================

-- First, ensure the default organization exists
INSERT INTO organizations (org_id, name, slug, subscription_tier)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Default Organization',
  'default-org',
  'free'
) ON CONFLICT (org_id) DO NOTHING;

-- Create a system user in auth.users first
-- This is required because users table has a foreign key to auth.users
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'system@default.org',
  crypt('system-password', gen_salt('bf')),
  NOW(),
  NULL,
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "System User"}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
) ON CONFLICT (id) DO NOTHING;

-- Now create the user in the users table
INSERT INTO users (user_id, org_id, email, full_name, role)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'system@default.org',
  'System User',
  'admin'
) ON CONFLICT (user_id) DO NOTHING;

-- Show the created user
SELECT * FROM users WHERE user_id = '00000000-0000-0000-0000-000000000002';
