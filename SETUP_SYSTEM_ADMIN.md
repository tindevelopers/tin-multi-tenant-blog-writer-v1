# Setup System Admin User

This guide will help you create a system admin user with full access to all system settings.

## Step 1: Create Auth User in Supabase Dashboard

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** > **Users**
3. Click **"Add User"** or **"Invite User"**
4. Enter the following details:
   - **Email**: `systemadmin@tin.info`
   - **Password**: Choose a secure password
   - **Auto Confirm User**: ✅ Check this box (or handle email confirmation separately)
5. Click **"Create User"** or **"Invite"**
6. **IMPORTANT**: Copy the **User UUID** that appears after creation

## Step 2: Add User to Database

Once you have the User UUID from Step 1, you have two options:

### Option A: Using Supabase SQL Editor (Recommended)

1. Go to **Supabase Dashboard** > **SQL Editor**
2. Create a new query and paste the following (replace `YOUR_USER_UUID` with the actual UUID):

```sql
-- Replace YOUR_USER_UUID with the actual UUID from Step 1
DO $$
DECLARE
  v_org_id uuid;
  v_user_id uuid := 'YOUR_USER_UUID'; -- <-- REPLACE THIS!
BEGIN
  -- Get or create system organization
  INSERT INTO organizations (name, slug, settings)
  VALUES ('System Organization', 'system-org', '{}')
  ON CONFLICT (slug) DO UPDATE SET name = 'System Organization'
  RETURNING id INTO v_org_id;

  -- Insert system admin user
  INSERT INTO users (user_id, email, full_name, role, organization_id)
  VALUES (
    v_user_id,
    'systemadmin@tin.info',
    'System Administrator',
    'system_admin',
    v_org_id
  )
  ON CONFLICT (user_id) DO UPDATE 
  SET 
    role = 'system_admin',
    full_name = 'System Administrator',
    organization_id = v_org_id;

  RAISE NOTICE 'System admin user created successfully!';
END $$;

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
```

3. Click **"Run"**
4. Verify the output shows your system admin user

### Option B: Update Existing User

If you have an existing user and want to promote them to system_admin:

```sql
UPDATE users 
SET role = 'system_admin', 
    full_name = 'System Administrator'
WHERE email = 'systemadmin@tin.info';
```

## Step 3: Verify Access

1. Go to your application: `http://localhost:3010`
2. Log in with:
   - **Email**: `systemadmin@tin.info`
   - **Password**: (the password you set in Step 1)
3. After login, you should see:
   - ✅ **Admin Panel** section in the sidebar (purple icon with "A")
   - ✅ Access to all admin routes:
     - `/admin/panel` - Admin Dashboard
     - `/admin/panel/users` - User Management
     - `/admin/panel/organizations` - Organization Management
     - `/admin/panel/integrations` - Integrations
     - `/admin/panel/usage-logs` - Usage Logs
     - `/admin/panel/system-settings` - System Settings

## System Admin Permissions

The `system_admin` role has the following permissions:

### ✅ Full Access To:
- **User Management**: Create, read, update, delete all users
- **Organization Management**: Manage all organizations
- **System Settings**: Configure global system settings
- **Usage Logs**: View all API usage and activity logs
- **Integrations**: Configure all integrations
- **Permissions**: Manage all roles and permissions

### 🎯 Role Hierarchy:
1. **System Admin** (👑 highest access)
   - Full system access
   - Can manage all organizations
   - Can configure system-wide settings

2. **Super Admin** (⭐)
   - Organization-level management
   - Can manage users in their organization
   - Cannot access system settings

3. **Admin** (🛡️)
   - Administrative access within organization
   - Can manage team members
   - Limited to organization scope

4. **Manager** (👔)
   - Team management
   - Content oversight
   - Limited administrative functions

5. **Editor** (✏️)
   - Content editing
   - Publishing capabilities

6. **Writer** (✍️)
   - Content creation
   - Basic access

## Troubleshooting

### Issue: "Access Denied" when accessing admin panel

**Solution**: Verify the user's role in the database:

```sql
SELECT email, role FROM users WHERE email = 'systemadmin@tin.info';
```

If the role is not `system_admin`, update it:

```sql
UPDATE users SET role = 'system_admin' WHERE email = 'systemadmin@tin.info';
```

### Issue: Admin Panel not showing in sidebar

**Solution**: 
1. Clear your browser cache
2. Log out and log back in
3. Verify in browser console that the role is being fetched correctly
4. Check browser console for any errors

### Issue: RLS Policy Errors

**Solution**: Ensure RLS policies are applied:

```bash
cd /Users/foo/projects/adminpanel-template-blog-writer-next-js
psql <your_database_url> -f supabase/roles-and-permissions.sql
```

## Security Best Practices

1. ✅ Use a strong, unique password for system admin
2. ✅ Enable 2FA (Two-Factor Authentication) in Supabase for this account
3. ✅ Limit the number of system admin users
4. ✅ Regularly audit system admin activity in usage logs
5. ✅ Use environment-specific system admins (dev, staging, prod)
6. ⚠️ Never share system admin credentials
7. ⚠️ Never commit system admin credentials to version control

## Next Steps

Once your system admin is set up:

1. 📊 Access the Admin Panel: `/admin/panel`
2. 👥 Create additional users with appropriate roles
3. 🏢 Set up organizations
4. 🔌 Configure integrations
5. ⚙️ Configure system settings
6. 📈 Monitor usage logs

---

**Need Help?** Check the main README.md or documentation for more details.


