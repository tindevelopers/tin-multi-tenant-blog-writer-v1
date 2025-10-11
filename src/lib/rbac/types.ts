// =====================================================
// ROLE-BASED ACCESS CONTROL (RBAC) TYPES
// =====================================================

export type UserRole = 
  | 'system_admin'
  | 'super_admin'
  | 'admin'
  | 'manager'
  | 'editor'
  | 'writer';

export interface Role {
  id: string;
  name: UserRole;
  display_name: string;
  description: string;
  level: number;
  created_at: string;
}

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description: string;
  created_at: string;
}

export interface RolePermission {
  id: string;
  role: UserRole;
  permission_id: string;
  created_at: string;
}

export interface RoleAuditLog {
  id: string;
  user_id: string;
  changed_by?: string;
  old_role?: UserRole;
  new_role?: UserRole;
  organization_id?: string;
  reason?: string;
  created_at: string;
}

// Role hierarchy levels
export const ROLE_LEVELS: Record<UserRole, number> = {
  system_admin: 100,
  super_admin: 90,
  admin: 80,
  manager: 60,
  editor: 40,
  writer: 20,
};

// Role display information
export const ROLE_INFO: Record<UserRole, { label: string; description: string; color: string }> = {
  system_admin: {
    label: 'System Administrator',
    description: 'Full system control including integrations, API, and usage logs',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
  },
  super_admin: {
    label: 'Super Administrator',
    description: 'Can create and manage multiple organizations',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
  },
  admin: {
    label: 'Administrator',
    description: 'Organization owner with full access',
    color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400'
  },
  manager: {
    label: 'Manager',
    description: 'Manage team members, content, and workflows',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
  },
  editor: {
    label: 'Editor',
    description: 'Create, edit, and publish content',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
  },
  writer: {
    label: 'Writer',
    description: 'Create and edit own blog posts',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
  },
};

// Permission categories
export const PERMISSION_CATEGORIES = {
  SYSTEM: 'system',
  ORGANIZATION: 'organization',
  USERS: 'users',
  CONTENT: 'content',
  TEMPLATES: 'templates',
  WORKFLOWS: 'workflows',
  MEDIA: 'media',
} as const;

// Standard permissions
export const PERMISSIONS = {
  // System permissions
  SYSTEM_INTEGRATIONS_MANAGE: 'system.integrations.manage',
  SYSTEM_API_MANAGE: 'system.api.manage',
  SYSTEM_LOGS_VIEW: 'system.logs.view',
  SYSTEM_ANALYTICS_VIEW: 'system.analytics.view',
  
  // Organization permissions
  ORGANIZATION_CREATE: 'organization.create',
  ORGANIZATION_DELETE: 'organization.delete',
  ORGANIZATION_UPDATE: 'organization.update',
  ORGANIZATION_VIEW: 'organization.view',
  
  // User permissions
  USERS_CREATE: 'users.create',
  USERS_DELETE: 'users.delete',
  USERS_UPDATE: 'users.update',
  USERS_VIEW: 'users.view',
  
  // Content permissions
  CONTENT_CREATE: 'content.create',
  CONTENT_DELETE: 'content.delete',
  CONTENT_UPDATE: 'content.update',
  CONTENT_PUBLISH: 'content.publish',
  CONTENT_VIEW: 'content.view',
  CONTENT_MODERATE: 'content.moderate',
  
  // Template permissions
  TEMPLATES_CREATE: 'templates.create',
  TEMPLATES_DELETE: 'templates.delete',
  TEMPLATES_UPDATE: 'templates.update',
  TEMPLATES_VIEW: 'templates.view',
  
  // Workflow permissions
  WORKFLOWS_MANAGE: 'workflows.manage',
  WORKFLOWS_VIEW: 'workflows.view',
  
  // Media permissions
  MEDIA_UPLOAD: 'media.upload',
  MEDIA_DELETE: 'media.delete',
  MEDIA_VIEW: 'media.view',
} as const;

// Helper type for permission names
export type PermissionName = typeof PERMISSIONS[keyof typeof PERMISSIONS];

