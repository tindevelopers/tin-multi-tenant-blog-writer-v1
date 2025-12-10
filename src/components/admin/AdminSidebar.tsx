"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import RoleBadge from "@/components/ui/RoleBadge";

interface AdminSidebarProps {
  userRole: string;
}

interface MenuItem {
  name: string;
  icon: React.ReactNode;
  path: string;
  roles: string[];
  children?: {
    name: string;
    path: string;
    roles: string[];
  }[];
}

const menuItems: MenuItem[] = [
  {
    name: "Dashboard",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
      </svg>
    ),
    path: "/admin/panel",
    roles: ["system_admin", "super_admin", "admin"]
  },
  {
    name: "User Management",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
      </svg>
    ),
    path: "/admin/panel/users",
    roles: ["system_admin", "super_admin", "admin"],
    children: [
      {
        name: "All Users",
        path: "/admin/panel/users",
        roles: ["system_admin", "super_admin", "admin"]
      },
      {
        name: "User Roles",
        path: "/admin/panel/users/roles",
        roles: ["system_admin", "super_admin"]
      },
      {
        name: "Permissions",
        path: "/admin/panel/users/permissions",
        roles: ["system_admin"]
      }
    ]
  },
  {
    name: "Organizations",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    path: "/admin/panel/organizations",
    roles: ["system_admin", "super_admin"],
    children: [
      {
        name: "All Organizations",
        path: "/admin/panel/organizations",
        roles: ["system_admin", "super_admin"]
      },
      {
        name: "Create Organization",
        path: "/admin/panel/organizations/create",
        roles: ["system_admin", "super_admin"]
      },
      {
        name: "Organization Settings",
        path: "/admin/panel/organizations/settings",
        roles: ["system_admin", "super_admin", "admin", "owner"]
      }
    ]
  },
  {
    name: "Integrations",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-5.656-3.555l4-4m0 0l4 4m-4-4v12m-4-4h12" />
      </svg>
    ),
    path: "/admin/panel/integrations",
    roles: ["system_admin", "super_admin", "admin"]
  },
  {
    name: "System Settings",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    path: "/admin/panel/system",
    roles: ["system_admin"],
    children: [
      {
        name: "Global Settings",
        path: "/admin/panel/system/settings",
        roles: ["system_admin"]
      },
      {
        name: "Audit Logs",
        path: "/admin/panel/system/audit",
        roles: ["system_admin"]
      },
      {
        name: "System Health",
        path: "/admin/panel/system/health",
        roles: ["system_admin"]
      }
    ]
  },
  {
    name: "Analytics",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    path: "/admin/panel/analytics",
    roles: ["system_admin", "super_admin", "admin"],
    children: [
      {
        name: "User Analytics",
        path: "/admin/panel/analytics/users",
        roles: ["system_admin", "super_admin", "admin"]
      },
      {
        name: "Content Analytics",
        path: "/admin/panel/analytics/content",
        roles: ["system_admin", "super_admin", "admin"]
      },
      {
        name: "System Analytics",
        path: "/admin/panel/analytics/system",
        roles: ["system_admin"]
      }
    ]
  },
  {
    name: "Content Settings",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
    path: "/admin/settings",
    roles: ["system_admin", "super_admin", "admin", "manager", "editor"],
    children: [
      {
        name: "Brand Voice",
        path: "/admin/settings/brand-voice",
        roles: ["system_admin", "super_admin", "admin", "manager", "editor"]
      },
      {
        name: "Content Presets",
        path: "/admin/settings/content-presets",
        roles: ["system_admin", "super_admin", "admin", "manager", "editor"]
      }
    ]
  }
];

export default function AdminSidebar({ userRole }: AdminSidebarProps) {
  const pathname = usePathname();
  const [openSubmenus, setOpenSubmenus] = useState<Set<string>>(new Set());
  const [userProfile, setUserProfile] = useState<{ 
    role: string; 
    full_name?: string; 
    avatar_url?: string; 
    organizations?: { name: string }[] 
  } | null>(null);
  const [orgLogoUrl, setOrgLogoUrl] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from("users")
          .select("*, organizations(*)")
          .eq("user_id", user.id)
          .single()
          .then(({ data }) => {
            setUserProfile(data);
          });
      }
    });
  }, []);

  // Load tenant logo/wordmark from organizations (stored in Supabase storage)
  useEffect(() => {
    const loadBranding = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from("users")
          .select("org_id")
          .eq("user_id", user.id)
          .single();

        const orgId = profile?.org_id;
        if (!orgId) return;

        const { data: org } = await supabase
          .from("organizations")
          .select("name, logo_url, settings")
          .eq("org_id", orgId)
          .single();

        if (org) {
          const logo =
            (org.settings as any)?.logo_url ||
            org.logo_url ||
            null;
          setOrgLogoUrl(logo);
          setOrgName(org.name || null);
        }
      } catch (error) {
        console.warn("Failed to load org branding (admin sidebar)", error);
      }
    };

    loadBranding();
  }, []);

  const handleSubmenuToggle = (itemName: string) => {
    setOpenSubmenus(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemName)) {
        newSet.delete(itemName);
      } else {
        newSet.add(itemName);
      }
      return newSet;
    });
  };

  const hasPermission = (roles: string[]) => {
    return roles.includes(userRole);
  };

  const isActive = (path: string) => pathname === path;

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 z-50">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <Image
            src={orgLogoUrl || "/images/logo/logo-icon.svg"}
            alt={orgName || "Logo"}
            width={32}
            height={32}
          />
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">
              Admin Panel
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {userProfile?.organizations?.[0]?.name}
            </p>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <Image
            width={40}
            height={40}
            src={userProfile?.avatar_url || "/images/user/owner.png"}
            alt="User"
            className="rounded-full"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {userProfile?.full_name || "Admin User"}
            </p>
            <div className="flex items-center space-x-2">
              {userProfile?.role && <RoleBadge role={userProfile.role} size="sm" />}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          if (!hasPermission(item.roles)) return null;

          const isSubmenuOpen = openSubmenus.has(item.name);
          const hasChildren = item.children && item.children.length > 0;
          const isCurrentPath = isActive(item.path) || (hasChildren && item.children?.some(child => isActive(child.path)));

          return (
            <div key={item.name}>
              {hasChildren ? (
                <button
                  onClick={() => handleSubmenuToggle(item.name)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isCurrentPath
                      ? "bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className={`${isCurrentPath ? "text-brand-600 dark:text-brand-400" : "text-gray-500 dark:text-gray-400"}`}>
                      {item.icon}
                    </span>
                    <span>{item.name}</span>
                  </div>
                  <svg
                    className={`w-4 h-4 transition-transform ${isSubmenuOpen ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              ) : (
                <Link
                  href={item.path}
                  className={`flex items-center space-x-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive(item.path)
                      ? "bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  <span className={`${isActive(item.path) ? "text-brand-600 dark:text-brand-400" : "text-gray-500 dark:text-gray-400"}`}>
                    {item.icon}
                  </span>
                  <span>{item.name}</span>
                </Link>
              )}

              {/* Submenu */}
              {hasChildren && isSubmenuOpen && (
                <div className="ml-6 mt-2 space-y-1">
                  {item.children
                    ?.filter(child => hasPermission(child.roles))
                    .map((child) => (
                      <Link
                        key={child.path}
                        href={child.path}
                        className={`block px-3 py-2 text-sm rounded-lg transition-colors ${
                          isActive(child.path)
                            ? "bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300"
                            : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                        }`}
                      >
                        {child.name}
                      </Link>
                    ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <Link
          href="/admin"
          className="flex items-center space-x-3 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back to Dashboard</span>
        </Link>
      </div>
    </aside>
  );
}

