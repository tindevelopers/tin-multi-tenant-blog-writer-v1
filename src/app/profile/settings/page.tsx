"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import RoleBadge from "@/components/ui/RoleBadge";

interface UserProfile {
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  avatar_url?: string;
  organizations?: {
    name: string;
  };
}

interface UserPermissions {
  resource: string;
  action: string;
  name: string;
}

export default function AccountSettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [permissions, setPermissions] = useState<UserPermissions[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    
    const fetchUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          setUser(user);
          
          // Get user profile
          const { data, error } = await supabase
            .from("users")
            .select("*, organizations(*)")
            .eq("user_id", user.id)
            .single();
            
          if (error) {
            console.error("Error fetching user profile:", error);
            setError("Failed to load account information");
            setLoading(false);
            return;
          }
          
          if (data) {
            setUserProfile(data);
            
            // Get user permissions
            const { data: permissionData, error: permError } = await supabase
              .from("role_permissions")
              .select("*, permissions(*)")
              .eq("role", data.role);
              
            if (permError) {
              console.error("Error fetching permissions:", permError);
            } else if (permissionData) {
              const formattedPermissions = permissionData.map((rp: { permissions: { resource: string; action: string; name: string } }) => ({
                resource: rp.permissions.resource,
                action: rp.permissions.action,
                name: rp.permissions.name,
              }));
              setPermissions(formattedPermissions);
            }
          }
        } else {
          router.push("/auth/login");
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        setError("Failed to load account information");
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [router]);

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'system_admin':
        return 'Full system access with all permissions including system management and user role assignments.';
      case 'super_admin':
        return 'Complete organizational control with user management, content oversight, and system configuration.';
      case 'admin':
        return 'Administrative access to organization settings, user management, and content oversight.';
      case 'manager':
        return 'Team management capabilities with content approval and workflow oversight.';
      case 'editor':
        return 'Content editing and publishing permissions with team collaboration features.';
      case 'writer':
        return 'Basic content creation and editing permissions for blog posts and articles.';
      default:
        return 'Standard user access with basic permissions.';
    }
  };

  const groupPermissionsByResource = () => {
    const grouped: { [key: string]: UserPermissions[] } = {};
    permissions.forEach(permission => {
      if (!grouped[permission.resource]) {
        grouped[permission.resource] = [];
      }
      grouped[permission.resource].push(permission);
    });
    return grouped;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center">
          <div className="text-red-600 dark:text-red-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Error Loading Account</h3>
          <p className="text-gray-600 dark:text-gray-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const groupedPermissions = groupPermissionsByResource();

  return (
    <div className="space-y-6">
      {/* Account Overview */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Account Settings
        </h1>
        
        <div className="flex items-center space-x-4 mb-6">
          <Image
            width={80}
            height={80}
            src={userProfile?.avatar_url || "/images/user/owner.png"}
            alt="Profile"
            className="rounded-full h-20 w-20 object-cover border-4 border-white dark:border-gray-700 shadow-lg"
          />
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {userProfile?.full_name || "User"}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">{user?.email}</p>
            <div className="flex items-center space-x-2 mt-2">
              {userProfile?.role && <RoleBadge role={userProfile.role} size="md" />}
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {userProfile?.organizations?.name}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 dark:text-white mb-2">Role Description</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {getRoleDescription(userProfile?.role || '')}
          </p>
        </div>
      </div>

      {/* Organization Branding access for admins */}
      {["admin", "owner", "system_admin", "super_admin"].includes(userProfile?.role || "") && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Organization Branding
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Manage square and wide logos for your organization. Admins and system admins can upload logos.
              </p>
            </div>
            <button
              onClick={() => router.push("/admin/panel/organizations/settings")}
              className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
            >
              Go to Branding
            </button>
          </div>
        </div>
      )}

      {/* Security Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
          Security & Authentication
        </h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">Email Address</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{user?.email}</p>
            </div>
            <button className="px-4 py-2 text-sm font-medium text-brand-600 hover:text-brand-700">
              Change
            </button>
          </div>

          <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">Password</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Last updated 30 days ago</p>
            </div>
            <button className="px-4 py-2 text-sm font-medium text-brand-600 hover:text-brand-700">
              Change
            </button>
          </div>

          <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">Two-Factor Authentication</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Add an extra layer of security</p>
            </div>
            <button className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-700 border border-gray-300 dark:border-gray-600 rounded-md">
              Enable
            </button>
          </div>
        </div>
      </div>

      {/* Permissions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
          Your Permissions
        </h2>
        
        <div className="space-y-6">
          {Object.entries(groupedPermissions).map(([resource, resourcePermissions]) => (
            <div key={resource} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 dark:text-white mb-3 capitalize">
                {resource.replace('_', ' ')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {resourcePermissions.map((permission, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 rounded-md"
                  >
                    <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-green-800 dark:text-green-200">
                      {permission.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-red-200 dark:border-red-800 p-6">
        <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-6">
          Danger Zone
        </h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-red-200 dark:border-red-800 rounded-lg">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">Delete Account</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Permanently delete your account and all associated data
              </p>
            </div>
            <button className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 border border-red-300 dark:border-red-700 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20">
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
