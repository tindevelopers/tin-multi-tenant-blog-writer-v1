# 🚀 RBAC System Setup Guide

## Quick Setup

### 1. Run the SQL Script

Navigate to your Supabase project's SQL Editor and execute:

```sql
-- File: supabase/roles-and-permissions.sql
-- Copy and paste the entire contents and execute
```

This will create:
- ✅ Role definitions (6 roles)
- ✅ Permission definitions (28+ permissions)  
- ✅ Role-to-permission mappings
- ✅ Audit logging tables
- ✅ Helper functions
- ✅ Updated RLS policies

### 2. Verify Setup

Check that these tables were created:
```sql
SELECT * FROM roles;
SELECT * FROM permissions;
SELECT * FROM role_permissions;
SELECT * FROM role_audit_log;
```

### 3. Create Your First System Admin

```sql
-- Update an existing user to system_admin
UPDATE users 
SET role = 'system_admin' 
WHERE email = 'your-admin@email.com';
```

### 4. Test the System

Sign up a new organization - the first user will automatically become an **Admin** for that organization.

## Role Summary

| Role | Level | Purpose | Access |
|------|-------|---------|--------|
| 🔴 **System Admin** | 100 | Platform administration | Everything |
| 🟣 **Super Admin** | 90 | Multi-org management | Multiple orgs |
| 🔵 **Admin** | 80 | Organization owner | Full org access |
| 🟢 **Manager** | 60 | Team & content management | Team + content |
| 🟡 **Editor** | 40 | Content & moderation | Content + publish |
| ⚪ **Writer** | 20 | Basic content creation | Own content |

## Usage in Code

### Server-Side
```typescript
import { requirePermission, requireMinimumRole } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/rbac/types';

// Check permission
const canManage = await requirePermission(PERMISSIONS.USERS_UPDATE);

// Check role level  
const isManager = await requireMinimumRole('manager');
```

### Client-Side
```typescript
import { hasPermissionClient } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/rbac/types';

const canPublish = await hasPermissionClient(userId, PERMISSIONS.CONTENT_PUBLISH);
```

### Display Role Badge
```typescript
import RoleBadge from '@/components/rbac/RoleBadge';

<RoleBadge role="admin" showDescription />
```

## Next Steps

1. Read the full [RBAC Guide](./RBAC_GUIDE.md) for detailed documentation
2. Set up your first System Admin user
3. Test role permissions with different accounts
4. Configure organization-specific settings

## Troubleshooting

**Issue**: Permission denied errors
- Check user's role: `SELECT role FROM users WHERE user_id = ?`
- Verify RLS policies are enabled
- Check role_permissions mappings

**Issue**: Cannot update roles
- Only users with higher role levels can update roles
- Managers cannot promote users to Manager or above
- Must be in the same organization

## Support

For detailed information, see:
- [RBAC Guide](./RBAC_GUIDE.md) - Complete documentation
- [Database Schema](../supabase/roles-and-permissions.sql) - SQL implementation
- [Type Definitions](../src/lib/rbac/types.ts) - TypeScript types

