"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface DashboardStats {
  totalUsers: number;
  totalOrganizations: number;
  activeIntegrations: number;
  totalApiCalls: number;
  recentActivity: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
    user?: string;
  }>;
}

export default function AdminPanelDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalOrganizations: 0,
    activeIntegrations: 0,
    totalApiCalls: 0,
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("");

  useEffect(() => {
    const supabase = createClient();
    
    // Get current user role and organization
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from("users")
          .select("role, org_id")
          .eq("user_id", user.id)
          .single()
          .then(({ data }) => {
            if (data) {
              setUserRole(data.role);
              
              // Fetch stats based on role
              fetchStats(data.role, data.org_id, supabase);
            }
          });
      }
    });
  }, []);

  const fetchStats = async (role: string, orgId: string, supabase: ReturnType<typeof createClient>) => {
    try {
      if (["system_admin", "super_admin"].includes(role)) {
        // System admins see all stats
        const [usersResult, orgsResult, integrationsResult] = await Promise.all([
          supabase.from("users").select("user_id", { count: "exact", head: true }),
          supabase.from("organizations").select("org_id", { count: "exact", head: true }),
          supabase.from("integrations_development").select("integration_id", { count: "exact", head: true }),
        ]);

        setStats({
          totalUsers: usersResult.count || 0,
          totalOrganizations: orgsResult.count || 0,
          activeIntegrations: integrationsResult.count || 0,
          totalApiCalls: 12450, // TODO: Fetch from API logs
          recentActivity: [
            {
              id: "1",
              type: "user",
              description: "New user registered: john@example.com",
              timestamp: new Date().toISOString(),
              user: "System"
            },
            {
              id: "2",
              type: "organization",
              description: "Organization 'Tech Corp' created",
              timestamp: new Date(Date.now() - 3600000).toISOString(),
              user: "admin@techcorp.com"
            },
            {
              id: "3",
              type: "integration",
              description: "WordPress integration activated",
              timestamp: new Date(Date.now() - 7200000).toISOString(),
              user: "manager@blogco.com"
            },
            {
              id: "4",
              type: "system",
              description: "System backup completed successfully",
              timestamp: new Date(Date.now() - 10800000).toISOString(),
              user: "System"
            }
          ]
        });
      } else {
        // Organization admins see only their organization's stats
        const [usersResult, integrationsResult] = await Promise.all([
          supabase.from("users").select("user_id", { count: "exact", head: true }).eq("org_id", orgId),
          supabase.from("integrations_development").select("integration_id", { count: "exact", head: true }).eq("org_id", orgId),
        ]);

        setStats({
          totalUsers: usersResult.count || 0,
          totalOrganizations: 1, // They only see their own org
          activeIntegrations: integrationsResult.count || 0,
          totalApiCalls: 0, // TODO: Fetch from API logs filtered by org
          recentActivity: [] // TODO: Fetch org-specific activity
        });
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching stats:", error);
      setLoading(false);
    }
  };

  const getRoleBasedFeatures = () => {
    switch (userRole) {
      case "system_admin":
        return [
          { name: "User Management", href: "/admin/panel/users", icon: "👥", description: "Manage all users and roles" },
          { name: "Organization Management", href: "/admin/panel/organizations", icon: "🏢", description: "Manage organizations" },
          { name: "Integrations", href: "/admin/panel/integrations", icon: "🔌", description: "Configure system integrations" },
          { name: "Usage Logs", href: "/admin/panel/usage-logs", icon: "📊", description: "Monitor API usage and activity" },
          { name: "System Settings", href: "/admin/panel/system-settings", icon: "⚙️", description: "Configure system settings" }
        ];
      case "super_admin":
        return [
          { name: "User Management", href: "/admin/panel/users", icon: "👥", description: "Manage users in your organization" },
          { name: "Organization Management", href: "/admin/panel/organizations", icon: "🏢", description: "Manage organization settings" },
          { name: "Integrations", href: "/admin/panel/integrations", icon: "🔌", description: "Configure integrations" },
          { name: "Usage Logs", href: "/admin/panel/usage-logs", icon: "📊", description: "View usage analytics" }
        ];
      case "admin":
        return [
          { name: "User Management", href: "/admin/panel/users", icon: "👥", description: "Manage team members" },
          { name: "Integrations", href: "/admin/panel/integrations", icon: "🔌", description: "Configure integrations" },
          { name: "Usage Logs", href: "/admin/panel/usage-logs", icon: "📊", description: "View usage statistics" }
        ];
      case "manager":
        return [
          { name: "User Management", href: "/admin/panel/users", icon: "👥", description: "View team members" },
          { name: "Integrations", href: "/admin/panel/integrations", icon: "🔌", description: "Manage integrations" }
        ];
      default:
        return [];
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  const features = getRoleBasedFeatures();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Admin Panel
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Welcome to the administrative dashboard. Manage your platform from here.
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500 dark:text-gray-400">Your Role</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
              {userRole.replace('_', ' ')}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Total Users
                </dt>
                <dd className="text-lg font-medium text-gray-900 dark:text-white">
                  {stats.totalUsers}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Organizations
                </dt>
                <dd className="text-lg font-medium text-gray-900 dark:text-white">
                  {stats.totalOrganizations}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Active Integrations
                </dt>
                <dd className="text-lg font-medium text-gray-900 dark:text-white">
                  {stats.activeIntegrations}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  API Calls (24h)
                </dt>
                <dd className="text-lg font-medium text-gray-900 dark:text-white">
                  {stats.totalApiCalls.toLocaleString()}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Admin Features */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Administrative Functions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {features.map((feature) => (
                <Link
                  key={feature.name}
                  href={feature.href}
                  className="block p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">{feature.icon}</div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                        {feature.name}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Recent Activity
            </h2>
            <div className="space-y-4">
              {stats.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className={`w-2 h-2 rounded-full ${
                      activity.type === 'user' ? 'bg-blue-500' :
                      activity.type === 'organization' ? 'bg-green-500' :
                      activity.type === 'integration' ? 'bg-purple-500' :
                      'bg-gray-500'
                    }`}></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-white">
                      {activity.description}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(activity.timestamp).toLocaleString()}
                      </span>
                      {activity.user && (
                        <>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {activity.user}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Link
                href="/admin/panel/usage-logs"
                className="text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
              >
                View all activity →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center justify-center px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <svg className="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Add User</span>
          </button>
          <button className="flex items-center justify-center px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <svg className="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Export Data</span>
          </button>
          <button className="flex items-center justify-center px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <svg className="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">System Health</span>
          </button>
        </div>
      </div>
    </div>
  );
}