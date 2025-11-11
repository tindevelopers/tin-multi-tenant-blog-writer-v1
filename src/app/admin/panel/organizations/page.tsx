"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import CreateOrganizationModal from "@/components/admin/CreateOrganizationModal";

interface Organization {
  org_id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
  settings: Record<string, unknown>;
  _count?: {
    users: number;
  };
}

export default function OrganizationsManagementPage() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrgs, setSelectedOrgs] = useState<Set<string>>(new Set());
  const [userRole, setUserRole] = useState<string>("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deletingOrgId, setDeletingOrgId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    
    // Get current user role
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from("users")
          .select("role")
          .eq("user_id", user.id)
          .single()
          .then(({ data }) => {
            if (data) {
              setUserRole(data.role);
            }
          });
      }
    });

    // Fetch organizations
    const fetchOrganizations = async () => {
      try {
        // Fetch organizations
        const { data: orgsData, error: orgsError } = await supabase
          .from("organizations")
          .select("*")
          .order("created_at", { ascending: false });

        if (orgsError) throw orgsError;

        // Fetch user counts per organization
        const { data: usersData, error: usersError } = await supabase
          .from("users")
          .select("org_id");

        if (usersError) {
          console.error("Error fetching user counts:", usersError);
          // Still set organizations even if user count fails
          setOrganizations(orgsData || []);
          setLoading(false);
          return;
        }

        // Count users per organization
        const userCounts: Record<string, number> = {};
        if (usersData) {
          usersData.forEach((user) => {
            if (user.org_id) {
              userCounts[user.org_id] = (userCounts[user.org_id] || 0) + 1;
            }
          });
        }

        // Merge user counts with organizations
        const organizationsWithCounts = (orgsData || []).map((org) => ({
          ...org,
          _count: {
            users: userCounts[org.org_id] || 0,
          },
        }));

        setOrganizations(organizationsWithCounts);
      } catch (error) {
        console.error("Error fetching organizations:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizations();
  }, []);

  const handleOrgSelection = (orgId: string) => {
    setSelectedOrgs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orgId)) {
        newSet.delete(orgId);
      } else {
        newSet.add(orgId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedOrgs.size === filteredOrganizations.length) {
      setSelectedOrgs(new Set());
    } else {
      setSelectedOrgs(new Set(filteredOrganizations.map(org => org.org_id)));
    }
  };

  const filteredOrganizations = organizations.filter(org => 
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const canManageOrgs = ["system_admin", "super_admin"].includes(userRole);

  const handleCreateSuccess = () => {
    // Refresh organizations list
    const fetchOrganizations = async () => {
      try {
        const supabase = createClient();
        
        // Fetch organizations
        const { data: orgsData, error: orgsError } = await supabase
          .from("organizations")
          .select("*")
          .order("created_at", { ascending: false });

        if (orgsError) throw orgsError;

        // Fetch user counts per organization
        const { data: usersData, error: usersError } = await supabase
          .from("users")
          .select("org_id");

        if (!usersError && usersData) {
          // Count users per organization
          const userCounts: Record<string, number> = {};
          usersData.forEach((user) => {
            if (user.org_id) {
              userCounts[user.org_id] = (userCounts[user.org_id] || 0) + 1;
            }
          });

          // Merge user counts with organizations
          const organizationsWithCounts = (orgsData || []).map((org) => ({
            ...org,
            _count: {
              users: userCounts[org.org_id] || 0,
            },
          }));

          setOrganizations(organizationsWithCounts);
        } else {
          // If user count fails, just set organizations without counts
          setOrganizations(orgsData || []);
        }
      } catch (error) {
        console.error("Error fetching organizations:", error);
      }
    };
    fetchOrganizations();
  };

  const handleDeleteClick = (orgId: string) => {
    setDeletingOrgId(orgId);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingOrgId) return;

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        alert("Not authenticated");
        return;
      }

      const response = await fetch(`/api/admin/organizations/${deletingOrgId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete organization");
      }

      // Refresh organizations list
      const { data: orgsData, error: orgsError } = await supabase
        .from("organizations")
        .select("*")
        .order("created_at", { ascending: false });

      if (orgsError) {
        throw new Error(orgsError.message);
      }

      // Fetch user counts per organization
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("org_id");

      if (!usersError && usersData && orgsData) {
        // Count users per organization
        const userCounts: Record<string, number> = {};
        usersData.forEach((user) => {
          if (user.org_id) {
            userCounts[user.org_id] = (userCounts[user.org_id] || 0) + 1;
          }
        });

        // Merge user counts with organizations
        const organizationsWithCounts = orgsData.map((org) => ({
          ...org,
          _count: {
            users: userCounts[org.org_id] || 0,
          },
        }));

        setOrganizations(organizationsWithCounts);
      } else {
        // If user count fails, just set organizations without counts
        setOrganizations(orgsData || []);
      }

      setShowDeleteConfirm(false);
      setDeletingOrgId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete organization");
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
    setDeletingOrgId(null);
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Organization Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage organizations and their settings
            </p>
          </div>
          {canManageOrgs && (
            <button 
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
            >
              Create Organization
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Total Organizations
                </dt>
                <dd className="text-lg font-medium text-gray-900 dark:text-white">
                  {organizations.length}
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
                  {organizations.reduce((sum, org) => sum + (org._count?.users || 0), 0)}
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Active Organizations
                </dt>
                <dd className="text-lg font-medium text-gray-900 dark:text-white">
                  {organizations.filter(org => org._count?.users && org._count.users > 0).length}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search Organizations
            </label>
            <input
              type="text"
              placeholder="Search by name or slug..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="flex items-end">
            <button className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
              Export Organizations
            </button>
          </div>
        </div>
      </div>

      {/* Organizations Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Organizations ({filteredOrganizations.length})
            </h2>
            {selectedOrgs.size > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedOrgs.size} selected
                </span>
                {canManageOrgs && (
                  <button className="px-3 py-1 text-sm text-red-600 hover:text-red-700">
                    Delete Selected
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {canManageOrgs && (
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedOrgs.size === filteredOrganizations.length && filteredOrganizations.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                    />
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Organization
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Users
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Created
                </th>
                {canManageOrgs && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredOrganizations.map((org) => (
                <tr key={org.org_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  {canManageOrgs && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedOrgs.has(org.org_id)}
                        onChange={() => handleOrgSelection(org.org_id)}
                        className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                      />
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {org.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {org.slug}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      {org._count?.users || 0} users
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(org.created_at).toLocaleDateString()}
                  </td>
                  {canManageOrgs && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => router.push(`/admin/panel/organizations/${org.org_id}/edit`)}
                          className="text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => router.push(`/admin/panel/organizations/${org.org_id}/settings`)}
                          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          Settings
                        </button>
                        <button 
                          onClick={() => handleDeleteClick(org.org_id)}
                          className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredOrganizations.length === 0 && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No organizations found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Try adjusting your search criteria.
            </p>
          </div>
        )}
      </div>

      {/* Create Organization Modal */}
      <CreateOrganizationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && deletingOrgId && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={handleDeleteCancel} />
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Delete Organization
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Are you sure you want to delete this organization? This action cannot be undone. 
                The organization must have no users before it can be deleted.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={handleDeleteCancel}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
