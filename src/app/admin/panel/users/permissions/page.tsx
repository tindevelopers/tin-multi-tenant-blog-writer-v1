"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PERMISSIONS, ROLE_INFO, UserRole } from "@/lib/rbac/types";
import { ShieldExclamationIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";

interface PermissionCategory {
  name: string;
  permissions: { key: string; name: string; description: string }[];
}

const PERMISSION_DETAILS: Record<string, { name: string; description: string }> = {
  [PERMISSIONS.SYSTEM_INTEGRATIONS_MANAGE]: {
    name: "Manage Integrations",
    description: "Connect and configure third-party integrations like Webflow, Cloudinary, etc.",
  },
  [PERMISSIONS.SYSTEM_API_MANAGE]: {
    name: "Manage API",
    description: "Create and manage API keys, webhooks, and external access.",
  },
  [PERMISSIONS.SYSTEM_LOGS_VIEW]: {
    name: "View System Logs",
    description: "Access audit logs, error logs, and system activity records.",
  },
  [PERMISSIONS.SYSTEM_ANALYTICS_VIEW]: {
    name: "View Analytics",
    description: "Access platform-wide analytics and usage statistics.",
  },
  [PERMISSIONS.ORGANIZATION_CREATE]: {
    name: "Create Organizations",
    description: "Create new organizations/tenants in the system.",
  },
  [PERMISSIONS.ORGANIZATION_DELETE]: {
    name: "Delete Organizations",
    description: "Permanently delete organizations and all associated data.",
  },
  [PERMISSIONS.ORGANIZATION_UPDATE]: {
    name: "Update Organizations",
    description: "Modify organization settings, branding, and configuration.",
  },
  [PERMISSIONS.ORGANIZATION_VIEW]: {
    name: "View Organizations",
    description: "View organization details and member lists.",
  },
  [PERMISSIONS.USERS_CREATE]: {
    name: "Create Users",
    description: "Invite new users and create user accounts.",
  },
  [PERMISSIONS.USERS_DELETE]: {
    name: "Delete Users",
    description: "Remove users from the organization.",
  },
  [PERMISSIONS.USERS_UPDATE]: {
    name: "Update Users",
    description: "Modify user profiles, roles, and permissions.",
  },
  [PERMISSIONS.USERS_VIEW]: {
    name: "View Users",
    description: "View user profiles and activity.",
  },
  [PERMISSIONS.CONTENT_CREATE]: {
    name: "Create Content",
    description: "Create new blog posts, drafts, and content items.",
  },
  [PERMISSIONS.CONTENT_DELETE]: {
    name: "Delete Content",
    description: "Delete blog posts and content items.",
  },
  [PERMISSIONS.CONTENT_UPDATE]: {
    name: "Update Content",
    description: "Edit and modify existing content.",
  },
  [PERMISSIONS.CONTENT_PUBLISH]: {
    name: "Publish Content",
    description: "Publish content to connected platforms.",
  },
  [PERMISSIONS.CONTENT_VIEW]: {
    name: "View Content",
    description: "View all content including drafts.",
  },
  [PERMISSIONS.CONTENT_MODERATE]: {
    name: "Moderate Content",
    description: "Approve, reject, or flag content for review.",
  },
  [PERMISSIONS.TEMPLATES_CREATE]: {
    name: "Create Templates",
    description: "Create new content templates and prompts.",
  },
  [PERMISSIONS.TEMPLATES_DELETE]: {
    name: "Delete Templates",
    description: "Remove content templates.",
  },
  [PERMISSIONS.TEMPLATES_UPDATE]: {
    name: "Update Templates",
    description: "Modify existing templates.",
  },
  [PERMISSIONS.TEMPLATES_VIEW]: {
    name: "View Templates",
    description: "Access and use content templates.",
  },
  [PERMISSIONS.WORKFLOWS_MANAGE]: {
    name: "Manage Workflows",
    description: "Create and configure content workflows and approval processes.",
  },
  [PERMISSIONS.WORKFLOWS_VIEW]: {
    name: "View Workflows",
    description: "View workflow status and pipeline.",
  },
  [PERMISSIONS.MEDIA_UPLOAD]: {
    name: "Upload Media",
    description: "Upload images, videos, and other media files.",
  },
  [PERMISSIONS.MEDIA_DELETE]: {
    name: "Delete Media",
    description: "Remove media files from the library.",
  },
  [PERMISSIONS.MEDIA_VIEW]: {
    name: "View Media",
    description: "Access and browse the media library.",
  },
};

const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    name: "System",
    permissions: [
      { key: PERMISSIONS.SYSTEM_INTEGRATIONS_MANAGE, ...PERMISSION_DETAILS[PERMISSIONS.SYSTEM_INTEGRATIONS_MANAGE] },
      { key: PERMISSIONS.SYSTEM_API_MANAGE, ...PERMISSION_DETAILS[PERMISSIONS.SYSTEM_API_MANAGE] },
      { key: PERMISSIONS.SYSTEM_LOGS_VIEW, ...PERMISSION_DETAILS[PERMISSIONS.SYSTEM_LOGS_VIEW] },
      { key: PERMISSIONS.SYSTEM_ANALYTICS_VIEW, ...PERMISSION_DETAILS[PERMISSIONS.SYSTEM_ANALYTICS_VIEW] },
    ],
  },
  {
    name: "Organization",
    permissions: [
      { key: PERMISSIONS.ORGANIZATION_CREATE, ...PERMISSION_DETAILS[PERMISSIONS.ORGANIZATION_CREATE] },
      { key: PERMISSIONS.ORGANIZATION_DELETE, ...PERMISSION_DETAILS[PERMISSIONS.ORGANIZATION_DELETE] },
      { key: PERMISSIONS.ORGANIZATION_UPDATE, ...PERMISSION_DETAILS[PERMISSIONS.ORGANIZATION_UPDATE] },
      { key: PERMISSIONS.ORGANIZATION_VIEW, ...PERMISSION_DETAILS[PERMISSIONS.ORGANIZATION_VIEW] },
    ],
  },
  {
    name: "Users",
    permissions: [
      { key: PERMISSIONS.USERS_CREATE, ...PERMISSION_DETAILS[PERMISSIONS.USERS_CREATE] },
      { key: PERMISSIONS.USERS_DELETE, ...PERMISSION_DETAILS[PERMISSIONS.USERS_DELETE] },
      { key: PERMISSIONS.USERS_UPDATE, ...PERMISSION_DETAILS[PERMISSIONS.USERS_UPDATE] },
      { key: PERMISSIONS.USERS_VIEW, ...PERMISSION_DETAILS[PERMISSIONS.USERS_VIEW] },
    ],
  },
  {
    name: "Content",
    permissions: [
      { key: PERMISSIONS.CONTENT_CREATE, ...PERMISSION_DETAILS[PERMISSIONS.CONTENT_CREATE] },
      { key: PERMISSIONS.CONTENT_DELETE, ...PERMISSION_DETAILS[PERMISSIONS.CONTENT_DELETE] },
      { key: PERMISSIONS.CONTENT_UPDATE, ...PERMISSION_DETAILS[PERMISSIONS.CONTENT_UPDATE] },
      { key: PERMISSIONS.CONTENT_PUBLISH, ...PERMISSION_DETAILS[PERMISSIONS.CONTENT_PUBLISH] },
      { key: PERMISSIONS.CONTENT_VIEW, ...PERMISSION_DETAILS[PERMISSIONS.CONTENT_VIEW] },
      { key: PERMISSIONS.CONTENT_MODERATE, ...PERMISSION_DETAILS[PERMISSIONS.CONTENT_MODERATE] },
    ],
  },
  {
    name: "Templates",
    permissions: [
      { key: PERMISSIONS.TEMPLATES_CREATE, ...PERMISSION_DETAILS[PERMISSIONS.TEMPLATES_CREATE] },
      { key: PERMISSIONS.TEMPLATES_DELETE, ...PERMISSION_DETAILS[PERMISSIONS.TEMPLATES_DELETE] },
      { key: PERMISSIONS.TEMPLATES_UPDATE, ...PERMISSION_DETAILS[PERMISSIONS.TEMPLATES_UPDATE] },
      { key: PERMISSIONS.TEMPLATES_VIEW, ...PERMISSION_DETAILS[PERMISSIONS.TEMPLATES_VIEW] },
    ],
  },
  {
    name: "Workflows",
    permissions: [
      { key: PERMISSIONS.WORKFLOWS_MANAGE, ...PERMISSION_DETAILS[PERMISSIONS.WORKFLOWS_MANAGE] },
      { key: PERMISSIONS.WORKFLOWS_VIEW, ...PERMISSION_DETAILS[PERMISSIONS.WORKFLOWS_VIEW] },
    ],
  },
  {
    name: "Media",
    permissions: [
      { key: PERMISSIONS.MEDIA_UPLOAD, ...PERMISSION_DETAILS[PERMISSIONS.MEDIA_UPLOAD] },
      { key: PERMISSIONS.MEDIA_DELETE, ...PERMISSION_DETAILS[PERMISSIONS.MEDIA_DELETE] },
      { key: PERMISSIONS.MEDIA_VIEW, ...PERMISSION_DETAILS[PERMISSIONS.MEDIA_VIEW] },
    ],
  },
];

export default function PermissionsManagementPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.push("/signin");
          return;
        }

        const { data: profile } = await supabase
          .from("users")
          .select("role")
          .eq("user_id", user.id)
          .single();

        if (!profile || profile.role !== "system_admin") {
          router.push("/admin/panel");
          return;
        }

        setUserRole(profile.role);
      } catch (error) {
        console.error("Error checking access:", error);
        router.push("/admin/panel");
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [router]);

  const filteredCategories = PERMISSION_CATEGORIES.filter((category) => {
    if (selectedCategory !== "all" && category.name.toLowerCase() !== selectedCategory) {
      return false;
    }
    if (searchTerm) {
      return category.permissions.some(
        (p) =>
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.key.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return true;
  }).map((category) => ({
    ...category,
    permissions: searchTerm
      ? category.permissions.filter(
          (p) =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.key.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : category.permissions,
  }));

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
              <ShieldExclamationIcon className="w-8 h-8 text-brand-600" />
              Advanced Permissions
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              View and understand all available permissions in the system
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/admin/panel/users/roles")}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              View Roles
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search permissions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Categories</option>
              {PERMISSION_CATEGORIES.map((cat) => (
                <option key={cat.name} value={cat.name.toLowerCase()}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Permissions by Category */}
      {filteredCategories.map((category) => (
        <div
          key={category.name}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {category.name} Permissions
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {category.permissions.length} permission{category.permissions.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {category.permissions.map((permission) => (
              <div
                key={permission.key}
                className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                      {permission.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {permission.description}
                    </p>
                    <code className="text-xs text-gray-400 dark:text-gray-500 mt-2 block font-mono">
                      {permission.key}
                    </code>
                  </div>
                  <div className="flex flex-wrap gap-1 max-w-xs">
                    {(Object.keys(ROLE_INFO) as UserRole[]).map((role) => {
                      // Simple check - in real app this would come from database
                      const hasPermission = 
                        role === "system_admin" ||
                        (role === "super_admin" && !permission.key.includes("system.integrations") && !permission.key.includes("system.api")) ||
                        (role === "admin" && !permission.key.includes("system.") && !permission.key.includes("organization.create") && !permission.key.includes("organization.delete")) ||
                        (role === "manager" && (permission.key.includes("content.") || permission.key.includes("workflows.") || permission.key.includes("media.") || permission.key === "organization.view" || permission.key === "users.view")) ||
                        (role === "editor" && (permission.key.includes("content.") || permission.key === "templates.view" || permission.key === "workflows.view" || permission.key.includes("media."))) ||
                        (role === "writer" && (permission.key === "content.create" || permission.key === "content.update" || permission.key === "content.view" || permission.key === "templates.view" || permission.key === "media.upload" || permission.key === "media.view"));
                      
                      if (!hasPermission) return null;
                      
                      return (
                        <span
                          key={role}
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ROLE_INFO[role].color}`}
                        >
                          {ROLE_INFO[role].label.replace(" Administrator", "").replace(" Admin", "")}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Permission Statistics
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-3xl font-bold text-brand-600">
              {Object.values(PERMISSIONS).length}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Permissions</div>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-3xl font-bold text-brand-600">
              {PERMISSION_CATEGORIES.length}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Categories</div>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-3xl font-bold text-brand-600">
              {PERMISSION_CATEGORIES.find(c => c.name === "Content")?.permissions.length || 0}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Content Permissions</div>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-3xl font-bold text-brand-600">
              {PERMISSION_CATEGORIES.find(c => c.name === "System")?.permissions.length || 0}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">System Permissions</div>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
          About Permissions
        </h3>
        <p className="text-sm text-blue-800 dark:text-blue-200">
          Permissions are assigned to roles, not directly to users. To change a user&apos;s permissions,
          you need to change their role. Higher-level roles inherit all permissions from lower-level roles.
          System administrators have access to all permissions.
        </p>
      </div>
    </div>
  );
}
