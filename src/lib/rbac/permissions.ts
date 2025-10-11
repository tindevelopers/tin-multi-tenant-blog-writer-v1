// =====================================================
// ROLE-BASED ACCESS CONTROL (RBAC) HELPERS
// =====================================================

import { createClient } from '@/lib/supabase/server';
import { createClient as createClientClient } from '@/lib/supabase/client';
import { UserRole, PermissionName, ROLE_LEVELS } from './types';

/**
 * Check if a user has a specific permission (server-side)
 */
export async function hasPermission(
  userId: string,
  permission: PermissionName
): Promise<boolean> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .rpc('user_has_permission', {
        p_user_id: userId,
        p_permission_name: permission
      });
    
    if (error) {
      console.error('Error checking permission:', error);
      return false;
    }
    
    return data === true;
  } catch (error) {
    console.error('Error in hasPermission:', error);
    return false;
  }
}

/**
 * Check if a user has a specific permission (client-side)
 */
export async function hasPermissionClient(
  userId: string,
  permission: PermissionName
): Promise<boolean> {
  try {
    const supabase = createClientClient();
    
    const { data, error } = await supabase
      .rpc('user_has_permission', {
        p_user_id: userId,
        p_permission_name: permission
      });
    
    if (error) {
      console.error('Error checking permission:', error);
      return false;
    }
    
    return data === true;
  } catch (error) {
    console.error('Error in hasPermissionClient:', error);
    return false;
  }
}

/**
 * Get user's role level (server-side)
 */
export async function getUserRoleLevel(userId: string): Promise<number> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .rpc('user_role_level', {
        p_user_id: userId
      });
    
    if (error) {
      console.error('Error getting role level:', error);
      return 0;
    }
    
    return data || 0;
  } catch (error) {
    console.error('Error in getUserRoleLevel:', error);
    return 0;
  }
}

/**
 * Get user's role level (client-side)
 */
export async function getUserRoleLevelClient(userId: string): Promise<number> {
  try {
    const supabase = createClientClient();
    
    const { data, error } = await supabase
      .rpc('user_role_level', {
        p_user_id: userId
      });
    
    if (error) {
      console.error('Error getting role level:', error);
      return 0;
    }
    
    return data || 0;
  } catch (error) {
    console.error('Error in getUserRoleLevelClient:', error);
    return 0;
  }
}

/**
 * Check if user's role level meets minimum requirement
 */
export function hasMinimumRoleLevel(
  userRole: UserRole,
  minimumRole: UserRole
): boolean {
  return ROLE_LEVELS[userRole] >= ROLE_LEVELS[minimumRole];
}

/**
 * Get all permissions for a user (server-side)
 */
export async function getUserPermissions(userId: string): Promise<{
  permission_name: string;
  resource: string;
  action: string;
}[]> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .rpc('get_user_permissions', {
        p_user_id: userId
      });
    
    if (error) {
      console.error('Error getting user permissions:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getUserPermissions:', error);
    return [];
  }
}

/**
 * Get all permissions for a user (client-side)
 */
export async function getUserPermissionsClient(userId: string): Promise<{
  permission_name: string;
  resource: string;
  action: string;
}[]> {
  try {
    const supabase = createClientClient();
    
    const { data, error } = await supabase
      .rpc('get_user_permissions', {
        p_user_id: userId
      });
    
    if (error) {
      console.error('Error getting user permissions:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getUserPermissionsClient:', error);
    return [];
  }
}

/**
 * Check if current user has permission (server-side helper)
 */
export async function requirePermission(permission: PermissionName): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return false;
  }
  
  return await hasPermission(user.id, permission);
}

/**
 * Check if current user has minimum role level (server-side helper)
 */
export async function requireMinimumRole(minimumRole: UserRole): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return false;
  }
  
  // Get user's role
  const { data: userProfile } = await supabase
    .from('users')
    .select('role')
    .eq('user_id', user.id)
    .single();
  
  if (!userProfile?.role) {
    return false;
  }
  
  return hasMinimumRoleLevel(userProfile.role as UserRole, minimumRole);
}

/**
 * Get current user's role (server-side)
 */
export async function getCurrentUserRole(): Promise<UserRole | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return null;
    }
    
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('user_id', user.id)
      .single();
    
    return userProfile?.role as UserRole || null;
  } catch (error) {
    console.error('Error getting current user role:', error);
    return null;
  }
}

/**
 * Check if user can manage another user (based on role hierarchy)
 */
export async function canManageUser(
  managerId: string,
  targetUserId: string
): Promise<boolean> {
  try {
    const supabase = await createClient();
    
    // Get both users' roles
    const { data: users } = await supabase
      .from('users')
      .select('user_id, role, organization_id')
      .in('user_id', [managerId, targetUserId]);
    
    if (!users || users.length !== 2) {
      return false;
    }
    
    const manager = users.find(u => u.user_id === managerId);
    const target = users.find(u => u.user_id === targetUserId);
    
    if (!manager || !target) {
      return false;
    }
    
    // Must be in same organization
    if (manager.organization_id !== target.organization_id) {
      return false;
    }
    
    // Manager's role must be higher than target's role
    const managerLevel = ROLE_LEVELS[manager.role as UserRole];
    const targetLevel = ROLE_LEVELS[target.role as UserRole];
    
    return managerLevel > targetLevel;
  } catch (error) {
    console.error('Error in canManageUser:', error);
    return false;
  }
}

/**
 * Update user role with audit trail
 */
export async function updateUserRole(
  targetUserId: string,
  newRole: UserRole,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }
    
    // Check if current user can manage target user
    const canManage = await canManageUser(user.id, targetUserId);
    if (!canManage) {
      return { success: false, error: 'Insufficient permissions to manage this user' };
    }
    
    // Update role
    const { error } = await supabase
      .from('users')
      .update({ role: newRole })
      .eq('user_id', targetUserId);
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error updating user role:', error);
    return { success: false, error: 'Failed to update user role' };
  }
}

