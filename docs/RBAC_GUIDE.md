# 🔐 Role-Based Access Control (RBAC) Guide

This guide explains the comprehensive RBAC system implemented in the TIN Multi-Tenant Blog Writer platform.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Role Hierarchy](#role-hierarchy)
3. [Permissions System](#permissions-system)
4. [Implementation](#implementation)
5. [Usage Examples](#usage-examples)
6. [Best Practices](#best-practices)

## Overview

The RBAC system provides granular access control with six distinct roles, each with specific permissions and capabilities. The system is built on:

- **Role Hierarchy**: Levels from 20 (Writer) to 100 (System Admin)
- **Granular Permissions**: 28+ specific permissions across 7 resource categories
- **Audit Logging**: Automatic tracking of role changes
- **Row Level Security**: Database-level enforcement via Supabase RLS

## Role Hierarchy

### 🔴 System Administrator (Level 100)

**Purpose**: Complete system control and oversight

**Capabilities**:
- ✅ Manage all system integrations (APIs, webhooks, external services)
- ✅ View and manage API keys and configurations
- ✅ Access all usage logs across all organizations
- ✅ View system-wide analytics and metrics
- ✅ Full access to all organizations
- ✅ All permissions of lower roles

**Use Cases**:
- Platform administrators
- Technical support staff
- System maintenance

**Access Level**: Everything

---

### 🟣 Super Administrator (Level 90)

**Purpose**: Multi-organization management

**Capabilities**:
- ✅ Create new organizations
- ✅ Delete organizations
- ✅ Manage multiple organizations
- ✅ Full user management across organizations
- ✅ Access all content and workflows
- ❌ Cannot access system-level integrations/API keys

**Use Cases**:
- White-label solution managers
- Enterprise account managers
- Agency owners managing multiple clients

**Access Level**: Multiple organizations, no system-level access

---

### 🔵 Administrator (Level 80)

**Purpose**: Organization owner with full organizational control

**Capabilities**:
- ✅ Update organization settings and details
- ✅ Invite and remove organization members
- ✅ Assign and modify user roles (except promoting to Super Admin)
- ✅ Full content management (create, edit, delete, publish)
- ✅ Manage templates and workflows
- ✅ Access organization usage logs
- ✅ Manage media library
- ❌ Cannot create or delete organizations
- ❌ Cannot access other organizations

**Use Cases**:
- Company owners
- Department heads
- Primary account holders

**Access Level**: Single organization, full access

---

### 🟢 Manager (Level 60)

**Purpose**: Team and content management

**Capabilities**:
- ✅ Invite new team members
- ✅ Assign roles to Writers and Editors
- ✅ Manage all content (create, edit, delete, publish)
- ✅ Moderate and approve content
- ✅ Create and manage workflows
- ✅ Manage templates
- ✅ Full media library access
- ❌ Cannot modify organization settings
- ❌ Cannot assign Admin or Manager roles

**Use Cases**:
- Content managers
- Team leads
- Editorial managers

**Access Level**: Team and content management

---

### 🟡 Editor (Level 40)

**Purpose**: Content creation and moderation

**Capabilities**:
- ✅ Create and edit all content
- ✅ Publish content
- ✅ Moderate and approve submissions
- ✅ Create and edit templates
- ✅ Upload media files
- ✅ View workflows
- ❌ Cannot manage users or roles
- ❌ Cannot delete other users' content
- ❌ Cannot manage workflows

**Use Cases**:
- Senior content creators
- Editorial staff
- Content moderators

**Access Level**: Content creation and publishing

---

### ⚪ Writer (Level 20)

**Purpose**: Basic content creation

**Capabilities**:
- ✅ Create new blog posts
- ✅ Edit own blog posts
- ✅ Delete own blog posts
- ✅ Upload media files
- ✅ View templates
- ✅ View workflows
- ❌ Cannot edit others' content
- ❌ Cannot publish without approval (if workflow requires it)
- ❌ Cannot create or edit templates
- ❌ Cannot manage users

**Use Cases**:
- Blog writers
- Contributing authors
- Content creators

**Access Level**: Own content only

---

## Permissions System

### Permission Categories

#### 🔧 System Permissions
- `system.integrations.manage` - Manage system integrations
- `system.api.manage` - Manage API configurations
- `system.logs.view` - View system logs
- `system.analytics.view` - View system analytics

#### 🏢 Organization Permissions
- `organization.create` - Create organizations
- `organization.delete` - Delete organizations
- `organization.update` - Update organization settings
- `organization.view` - View organization details

#### 👥 User Permissions
- `users.create` - Invite and create users
- `users.delete` - Remove users
- `users.update` - Update user roles
- `users.view` - View user profiles

#### 📝 Content Permissions
- `content.create` - Create blog posts
- `content.delete` - Delete blog posts
- `content.update` - Edit blog posts
- `content.publish` - Publish content
- `content.view` - View content
- `content.moderate` - Moderate submissions

#### 📋 Template Permissions
- `templates.create` - Create templates
- `templates.delete` - Delete templates
- `templates.update` - Edit templates
- `templates.view` - View templates

#### 🔄 Workflow Permissions
- `workflows.manage` - Manage workflows
- `workflows.view` - View workflows

#### 📁 Media Permissions
- `media.upload` - Upload media files
- `media.delete` - Delete media files
- `media.view` - View media library

---

## Implementation

### Database Setup

1. **Run the RBAC SQL script**:
```bash
# Navigate to Supabase SQL Editor
# Copy and paste contents of: supabase/roles-and-permissions.sql
# Execute the script
```

2. **Verify tables created**:
- `roles` - Role definitions
- `permissions` - Permission definitions
- `role_permissions` - Role-to-permission mappings
- `role_audit_log` - Audit trail

### Setting Up First System Admin

```sql
-- Update an existing user to System Admin
UPDATE users 
SET role = 'system_admin' 
WHERE email = 'admin@yourdomain.com';
```

### Creating Organizations with Super Admin

```typescript
import { createServiceClient } from '@/lib/supabase/server';

// Super Admin creates a new organization
const supabase = createServiceClient();

const { data: org } = await supabase
  .from('organizations')
  .insert({
    name: 'New Client Organization',
    slug: 'new-client',
  })
  .select()
  .single();
```

---

## Usage Examples

### Server-Side Permission Checks

```typescript
import { requirePermission, requireMinimumRole } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/rbac/types';

// Check specific permission
export default async function AdminPage() {
  const hasAccess = await requirePermission(PERMISSIONS.USERS_MANAGE);
  
  if (!hasAccess) {
    redirect('/unauthorized');
  }
  
  // ... rest of component
}

// Check minimum role level
export default async function ManagerPage() {
  const hasAccess = await requireMinimumRole('manager');
  
  if (!hasAccess) {
    redirect('/unauthorized');
  }
  
  // ... rest of component
}
```

### Client-Side Permission Checks

```typescript
'use client';

import { useState, useEffect } from 'react';
import { hasPermissionClient } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/rbac/types';

export default function ContentActions() {
  const [canPublish, setCanPublish] = useState(false);
  
  useEffect(() => {
    checkPermissions();
  }, []);
  
  async function checkPermissions() {
    const canPublish = await hasPermissionClient(
      userId, 
      PERMISSIONS.CONTENT_PUBLISH
    );
    setCanPublish(canPublish);
  }
  
  return (
    <>
      {canPublish && (
        <button>Publish</button>
      )}
    </>
  );
}
```

### Role Badge Display

```typescript
import RoleBadge from '@/components/rbac/RoleBadge';

export default function UserProfile({ user }) {
  return (
    <div>
      <h2>{user.name}</h2>
      <RoleBadge role={user.role} showDescription />
    </div>
  );
}
```

### Updating User Roles

```typescript
import { updateUserRole } from '@/lib/rbac';

async function promoteUser(userId: string) {
  const result = await updateUserRole(
    userId,
    'editor',
    'Promoted for excellent work'
  );
  
  if (result.success) {
    console.log('Role updated successfully');
  } else {
    console.error('Failed:', result.error);
  }
}
```

### API Route with Role Check

```typescript
// app/api/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireMinimumRole } from '@/lib/rbac';

export async function GET(request: NextRequest) {
  // Only managers and above can access
  const hasAccess = await requireMinimumRole('manager');
  
  if (!hasAccess) {
    return NextResponse.json(
      { error: 'Insufficient permissions' },
      { status: 403 }
    );
  }
  
  // ... fetch and return users
}
```

---

## Best Practices

### 1. **Principle of Least Privilege**
- Always assign the lowest role necessary for the user's tasks
- Start users as Writers, promote as needed
- Regularly audit role assignments

### 2. **Role Assignment Guidelines**

**System Admin**: Only for platform administrators
- Limit to 1-2 people
- Use only for technical operations

**Super Admin**: For multi-organization management
- Agency owners
- White-label administrators
- Enterprise account managers

**Admin**: One per organization
- Primary point of contact
- Organization owner/founder

**Manager**: For team leadership
- 1 per 10-15 team members
- Department heads
- Team leads

**Editor**: For senior content staff
- Experienced content creators
- Editorial staff
- 1 per 5-8 writers

**Writer**: Default for content creators
- New team members start here
- Freelance contributors
- Guest authors

### 3. **Security Considerations**

✅ **DO**:
- Use RLS policies for database-level security
- Check permissions on both client and server
- Log all role changes for audit trails
- Implement proper session management
- Use environment variables for service keys

❌ **DON'T**:
- Rely only on client-side permission checks
- Grant System Admin access unnecessarily
- Skip permission checks in API routes
- Hard-code role checks (use helper functions)
- Allow users to self-promote roles

### 4. **Testing Role Permissions**

```typescript
// Test file: __tests__/rbac.test.ts
describe('RBAC System', () => {
  it('should allow managers to update users', async () => {
    const result = await hasPermission(managerId, PERMISSIONS.USERS_UPDATE);
    expect(result).toBe(true);
  });
  
  it('should prevent writers from deleting others content', async () => {
    const result = await hasPermission(writerId, PERMISSIONS.CONTENT_DELETE);
    expect(result).toBe(false);
  });
});
```

### 5. **Role Transition Guidelines**

**Writer → Editor**:
- Demonstrated content quality
- 10+ published articles
- 3+ months experience

**Editor → Manager**:
- Leadership skills
- 6+ months as editor
- Team management experience

**Manager → Admin**:
- Business ownership or partnership
- Financial responsibility
- Long-term commitment

**Admin → Super Admin**:
- Managing multiple organizations
- Agency or enterprise need
- Approved by system admin

### 6. **Audit and Compliance**

The system automatically logs:
- Role changes (who, when, old role, new role)
- Permission denials
- User actions on sensitive resources

Access audit logs:
```typescript
import { createClient } from '@/lib/supabase/server';

const supabase = await createClient();
const { data: logs } = await supabase
  .from('role_audit_log')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(100);
```

---

## Common Scenarios

### Scenario 1: New Organization Setup

1. **Super Admin** creates organization
2. **Super Admin** creates first **Admin** user
3. **Admin** invites **Manager**
4. **Manager** invites **Writers** and **Editors**

### Scenario 2: Content Workflow

1. **Writer** creates draft post
2. **Editor** reviews and edits
3. **Manager** or **Editor** publishes
4. **Admin** views analytics

### Scenario 3: Team Expansion

1. **Admin** or **Manager** invites new Writer
2. New user receives invitation email
3. New user signs up (auto-assigned Writer role)
4. **Manager** can later promote to Editor if needed

### Scenario 4: Integration Setup

1. **System Admin** configures API integrations
2. **System Admin** generates organization-specific API keys
3. **Admin** can view their organization's API usage
4. **System Admin** monitors all API usage across system

---

## Troubleshooting

### Issue: Permission Denied

**Check**:
1. User's current role: `SELECT role FROM users WHERE user_id = ?`
2. Required permission level
3. Organization membership
4. RLS policies are active

### Issue: Cannot Update User Role

**Possible causes**:
- Manager trying to promote to their level or above
- Not in same organization
- Target user is higher level
- Missing `users.update` permission

### Issue: System Admin Cannot Access Organization

**Solution**:
System Admins have full access but must explicitly query:
```typescript
const { data } = await supabase
  .from('organizations')
  .select('*');  // Will return all orgs for system_admin
```

---

## API Reference

### Helper Functions

```typescript
// Check permission
await hasPermission(userId, permissionName);

// Check role level
await getUserRoleLevel(userId);

// Check minimum role
hasMinimumRoleLevel(userRole, minimumRole);

// Get all permissions
await getUserPermissions(userId);

// Update role
await updateUserRole(targetUserId, newRole, reason);

// Check if can manage
await canManageUser(managerId, targetUserId);
```

---

## Database Functions

### `user_has_permission(userId, permissionName)`
Returns boolean indicating if user has specific permission.

### `user_role_level(userId)`
Returns integer representing user's role level (20-100).

### `get_user_permissions(userId)`
Returns array of all permissions for the user.

---

## Support

For questions or issues with the RBAC system:

1. Check the audit logs
2. Review RLS policies in Supabase dashboard
3. Verify role assignments
4. Check permission mappings in `role_permissions` table

---

## Version History

- **v1.0.0** - Initial RBAC implementation
  - 6 role levels
  - 28 permissions
  - Audit logging
  - Full RLS policies

