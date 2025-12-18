"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ROLE_INFO, ROLE_LEVELS, PERMISSIONS, UserRole } from "@/lib/rbac/types";
import { ShieldCheckIcon, UsersIcon, ChevronDownIcon, ChevronUpIcon, CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface RoleStats {
  role: UserRole;
  count: number;
  percentage: number;
}

interface RolePermissionMap {
  [role: string]: string[];
}

// Default role-to-permissions mapping
const DEFAULT_ROLE_PERMISSIONS: RolePermissionMap = {
  system_admin: Object.values(PERMISSIONS),
  super_admin: [
    PERMISSIONS.SYSTEM_ANALYTICS_VIEW,
    PERMISSIONS.SYSTEM_LOGS_VIEW,
    PERMISSIONS.ORGANIZATION_CREATE,
    PERMISSIONS.ORGANIZATION_DELETE,
    PERMISSIONS.ORGANIZATION_UPDATE,
    PERMISSIONS.ORGANIZATION_VIEW,
    PERMISSIONS.USERS_CREATE,
    PERMISSIONS.USERS_DELETE,
    PERMISSIONS.USERS_UPDATE,
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.CONTENT_CREATE,
    PERMISSIONS.CONTENT_DELETE,
    PERMISSIONS.CONTENT_UPDATE,
    PERMISSIONS.CONTENT_PUBLISH,
    PERMISSIONS.CONTENT_VIEW,
    PERMISSIONS.CONTENT_MODERATE,
    PERMISSIONS.TEMPLATES_CREATE,
    PERMISSIONS.TEMPLATES_DELETE,
    PERMISSIONS.TEMPLATES_UPDATE,
    PERMISSIONS.TEMPLATES_VIEW,
    PERMISSIONS.WORKFLOWS_MANAGE,
    PERMISSIONS.WORKFLOWS_VIEW,
    PERMISSIONS.MEDIA_UPLOAD,
    PERMISSIONS.MEDIA_DELETE,
    PERMISSIONS.MEDIA_VIEW,
  ],
  admin: [
    PERMISSIONS.ORGANIZATION_UPDATE,
    PERMISSIONS.ORGANIZATION_VIEW,
    PERMISSIONS.USERS_CREATE,
    PERMISSIONS.USERS_UPDATE,
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.CONTENT_CREATE,
    PERMISSIONS.CONTENT_DELETE,
    PERMISSIONS.CONTENT_UPDATE,
    PERMISSIONS.CONTENT_PUBLISH,
    PERMISSIONS.CONTENT_VIEW,
    PERMISSIONS.CONTENT_MODERATE,
    PERMISSIONS.TEMPLATES_CREATE,
    PERMISSIONS.TEMPLATES_DELETE,
    PERMISSIONS.TEMPLATES_UPDATE,
    PERMISSIONS.TEMPLATES_VIEW,
    PERMISSIONS.WORKFLOWS_MANAGE,
    PERMISSIONS.WORKFLOWS_VIEW,
    PERMISSIONS.MEDIA_UPLOAD,
    PERMISSIONS.MEDIA_DELETE,
    PERMISSIONS.MEDIA_VIEW,
  ],
  manager: [
    PERMISSIONS.ORGANIZATION_VIEW,
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.CONTENT_CREATE,
    PERMISSIONS.CONTENT_UPDATE,
    PERMISSIONS.CONTENT_PUBLISH,
    PERMISSIONS.CONTENT_VIEW,
    PERMISSIONS.CONTENT_MODERATE,
    PERMISSIONS.TEMPLATES_VIEW,
    PERMISSIONS.WORKFLOWS_MANAGE,
    PERMISSIONS.WORKFLOWS_VIEW,
    PERMISSIONS.MEDIA_UPLOAD,
    PERMISSIONS.MEDIA_VIEW,
  ],
  editor: [
    PERMISSIONS.CONTENT_CREATE,
    PERMISSIONS.CONTENT_UPDATE,
    PERMISSIONS.CONTENT_PUBLISH,
    PERMISSIONS.CONTENT_VIEW,
    PERMISSIONS.TEMPLATES_VIEW,
    PERMISSIONS.WORKFLOWS_VIEW,
    PERMISSIONS.MEDIA_UPLOAD,
    PERMISSIONS.MEDIA_VIEW,
  ],
  writer: [
    PERMISSIONS.CONTENT_CREATE,
    PERMISSIONS.CONTENT_UPDATE,
    PERMISSIONS.CONTENT_VIEW,
    PERMISSIONS.TEMPLATES_VIEW,
    PERMISSIONS.MEDIA_UPLOAD,
    PERMISSIONS.MEDIA_VIEW,
  ],
};

// Permission categories for display
const PERMISSION_CATEGORIES = {
  System: [
    PERMISSIONS.SYSTEM_INTEGRATIONS_MANAGE,
    PERMISSIONS.SYSTEM_API_MANAGE,
    PERMISSIONS.SYSTEM_LOGS_VIEW,
    PERMISSIONS.SYSTEM_ANALYTICS_VIEW,
  ],
  Organization: [
    PERMISSIONS.ORGANIZATION_CREATE,
    PERMISSIONS.ORGANIZATION_DELETE,
    PERMISSIONS.ORGANIZATION_UPDATE,
    PERMISSIONS.ORGANIZATION_VIEW,
  ],
  Users: [
    PERMISSIONS.USERS_CREATE,
    PERMISSIONS.USERS_DELETE,
    PERMISSIONS.USERS_UPDATE,
    PERMISSIONS.USERS_VIEW,
  ],
  Content: [
    PERMISSIONS.CONTENT_CREATE,
    PERMISSIONS.CONTENT_DELETE,
    PERMISSIONS.CONTENT_UPDATE,
    PERMISSIONS.CONTENT_PUBLISH,
    PERMISSIONS.CONTENT_VIEW,
    PERMISSIONS.CONTENT_MODERATE,
  ],
  Templates: [
    PERMISSIONS.TEMPLATES_CREATE,
    PERMISSIONS.TEMPLATES_DELETE,
    PERMISSIONS.TEMPLATES_UPDATE,
    PERMISSIONS.TEMPLATES_VIEW,
  ],
  Workflows: [
    PERMISSIONS.WORKFLOWS_MANAGE,
    PERMISSIONS.WORKFLOWS_VIEW,
  ],
  Media: [
    PERMISSIONS.MEDIA_UPLOAD,
    PERMISSIONS.MEDIA_DELETE,
    PERMISSIONS.MEDIA_VIEW,
  ],
};

export default function UserRolesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("");
  const [roleStats, setRoleStats] = useState<RoleStats[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set());
  const [showPermissionMatrix, setShowPermissionMatrix] = useState(false);

  const allRoles: UserRole[] = ["system_admin", "super_admin", "admin", "manager", "editor", "writer"];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const supabase = createClient();
        
        // Get current user role
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/signin");
          return;
        }

        const { data: profile } = await supabase
          .from("users")
          .select("role, org_id")
          .eq("user_id", user.id)
          .single();

        if (!profile) {
          router.push("/signin");
          return;
        }

        setUserRole(profile.role);

        // Check access
        if (!["system_admin", "super_admin"].includes(profile.role)) {
          router.push("/admin/panel");
          return;
        }

        // Fetch user counts by role
        let query = supabase.from("users").select("role");
        
        // Super admins only see their organization's users
        if (profile.role === "super_admin") {
          query = query.eq("org_id", profile.org_id);
        }

        const { data: users, error } = await query;
        
        if (error) throw error;

        // Calculate role statistics
        const roleCounts: Record<string, number> = {};
        allRoles.forEach(role => roleCounts[role] = 0);
        
        users?.forEach(u => {
          if (roleCounts.hasOwnProperty(u.role)) {
            roleCounts[u.role]++;
          }
        });

        const total = users?.length || 0;
        setTotalUsers(total);

        const stats: RoleStats[] = allRoles.map(role => ({
          role,
          count: roleCounts[role],
          percentage: total > 0 ? (roleCounts[role] / total) * 100 : 0,
        }));

        setRoleStats(stats);
      } catch (error) {
        console.error("Error fetching role data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  const toggleRoleExpand = (role: string) => {
    setExpandedRoles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(role)) {
        newSet.delete(role);
      } else {
        newSet.add(role);
      }
      return newSet;
    });
  };

  const hasPermission = (role: string, permission: string): boolean => {
    return DEFAULT_ROLE_PERMISSIONS[role]?.includes(permission) || false;
  };

  const formatPermissionName = (permission: string): string => {
    // Convert "system.integrations.manage" to "Manage Integrations"
    const parts = permission.split(".");
    const action = parts[parts.length - 1];
    const resource = parts.slice(0, -1).join(" ");
    
    const actionMap: Record<string, string> = {
      manage: "Manage",
      create: "Create",
      delete: "Delete",
      update: "Update",
      view: "View",
      publish: "Publish",
      moderate: "Moderate",
      upload: "Upload",
    };

    return `${actionMap[action] || action} ${resource.charAt(0).toUpperCase() + resource.slice(1)}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <ShieldCheckIcon className="w-8 h-8 text-brand-600" />
              User Roles & Permissions
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage role hierarchy and permission assignments across the platform
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPermissionMatrix(!showPermissionMatrix)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                showPermissionMatrix
                  ? "bg-brand-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {showPermissionMatrix ? "Hide Matrix" : "Permission Matrix"}
            </button>
          </div>
        </div>
      </div>

      {/* Role Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {roleStats.map((stat) => {
          const roleInfo = ROLE_INFO[stat.role];
          const roleLevel = ROLE_LEVELS[stat.role];
          
          return (
            <div
              key={stat.role}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleInfo.color}`}>
                    Level {roleLevel}
                  </span>
                  <h3 className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
                    {roleInfo.label}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {roleInfo.description}
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-2xl font-bold text-gray-900 dark:text-white">
                    <UsersIcon className="w-5 h-5 text-gray-400" />
                    {stat.count}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {stat.percentage.toFixed(1)}% of users
                  </div>
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="mt-4">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-brand-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(stat.percentage, 100)}%` }}
                  />
                </div>
              </div>

              {/* Expand button */}
              <button
                onClick={() => toggleRoleExpand(stat.role)}
                className="mt-4 w-full flex items-center justify-center gap-1 text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
              >
                {expandedRoles.has(stat.role) ? (
                  <>
                    <ChevronUpIcon className="w-4 h-4" />
                    Hide Permissions
                  </>
                ) : (
                  <>
                    <ChevronDownIcon className="w-4 h-4" />
                    View Permissions ({DEFAULT_ROLE_PERMISSIONS[stat.role]?.length || 0})
                  </>
                )}
              </button>

              {/* Expanded permissions list */}
              {expandedRoles.has(stat.role) && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto">
                    {DEFAULT_ROLE_PERMISSIONS[stat.role]?.map((permission) => (
                      <div
                        key={permission}
                        className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
                      >
                        <CheckIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span className="truncate">{formatPermissionName(permission)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Role Hierarchy Visualization */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Role Hierarchy
        </h2>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {allRoles.map((role, index) => {
            const roleInfo = ROLE_INFO[role];
            const roleLevel = ROLE_LEVELS[role];
            const stat = roleStats.find(s => s.role === role);
            
            return (
              <div key={role} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`px-4 py-3 rounded-lg ${roleInfo.color} text-center min-w-[120px]`}>
                    <div className="font-semibold text-sm">{roleInfo.label}</div>
                    <div className="text-xs opacity-75 mt-1">Level {roleLevel}</div>
                    <div className="text-xs mt-1 font-medium">{stat?.count || 0} users</div>
                  </div>
                </div>
                {index < allRoles.length - 1 && (
                  <div className="mx-2 text-gray-400">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
          Higher level roles inherit permissions from lower level roles
        </p>
      </div>

      {/* Permission Matrix */}
      {showPermissionMatrix && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Permission Matrix
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Detailed view of which permissions are assigned to each role
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="sticky left-0 bg-gray-50 dark:bg-gray-700 px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[200px]">
                    Permission
                  </th>
                  {allRoles.map((role) => (
                    <th
                      key={role}
                      className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[100px]"
                    >
                      <span className={`inline-block px-2 py-1 rounded text-xs ${ROLE_INFO[role].color}`}>
                        {ROLE_INFO[role].label.replace(" Administrator", "").replace(" Admin", "")}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {Object.entries(PERMISSION_CATEGORIES).map(([category, permissions]) => (
                  <>
                    {/* Category header row */}
                    <tr key={`category-${category}`} className="bg-gray-100 dark:bg-gray-750">
                      <td
                        colSpan={allRoles.length + 1}
                        className="px-6 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300"
                      >
                        {category}
                      </td>
                    </tr>
                    {/* Permission rows */}
                    {permissions.map((permission) => (
                      <tr key={permission} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="sticky left-0 bg-white dark:bg-gray-800 px-6 py-3 text-sm text-gray-700 dark:text-gray-300">
                          {formatPermissionName(permission)}
                        </td>
                        {allRoles.map((role) => (
                          <td key={`${role}-${permission}`} className="px-4 py-3 text-center">
                            {hasPermission(role, permission) ? (
                              <CheckIcon className="w-5 h-5 text-green-500 mx-auto" />
                            ) : (
                              <XMarkIcon className="w-5 h-5 text-gray-300 dark:text-gray-600 mx-auto" />
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Summary
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-3xl font-bold text-brand-600">{totalUsers}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Users</div>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-3xl font-bold text-brand-600">{allRoles.length}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Available Roles</div>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-3xl font-bold text-brand-600">{Object.values(PERMISSIONS).length}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Permissions</div>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-3xl font-bold text-brand-600">
              {roleStats.filter(s => s.count > 0).length}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Roles in Use</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      {userRole === "system_admin" && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Quick Actions
          </h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => router.push("/admin/panel/users")}
              className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
            >
              Manage Users
            </button>
            <button
              onClick={() => router.push("/admin/panel/users/permissions")}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Advanced Permissions
            </button>
            <button
              onClick={() => router.push("/admin/panel/usage-logs")}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              View Audit Logs
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
