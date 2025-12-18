"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { PhotoIcon, XMarkIcon, ArrowLeftIcon, CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";

interface Organization {
  org_id: string;
  name: string;
  slug: string;
  settings?: {
    company_name?: string;
    logo_url?: string;
    logo_square_url?: string;
    logo_wide_url?: string;
  };
}

export default function OrganizationSettingsAdminPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params?.id as string;
  
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>("");
  
  const [companyName, setCompanyName] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const checkUserRole = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data: userData } = await supabase
        .from("users")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (userData) {
        setUserRole(userData.role);
      }
    } catch (err) {
      console.error("Error checking user role:", err);
    }
  };

  const fetchOrganization = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError("Not authenticated");
        setLoading(false);
        return;
      }

      // Check if user has permission (system_admin, super_admin)
      const { data: userData } = await supabase
        .from("users")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (!userData || !["system_admin", "super_admin"].includes(userData.role)) {
        setError("You don&apos;t have permission to access this page");
        setLoading(false);
        return;
      }

      // Fetch the organization by ID
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .select("*")
        .eq("org_id", orgId)
        .single();

      if (orgError) throw orgError;

      if (orgData) {
        setOrganization(orgData as Organization);
        
        // Set form values
        const companyNameValue = (orgData.settings as any)?.company_name || orgData.name || "";
        setCompanyName(companyNameValue);
        
        const settings = (orgData.settings as any) || {};
        const logoUrl = settings.logo_url || settings.logo_square_url || settings.logo_wide_url || null;
        setLogoPreview(logoUrl);
      } else {
        setError("Organization not found.");
      }
    } catch (err) {
      console.error("Error fetching organization:", err);
      setError(err instanceof Error ? err.message : "Failed to load organization");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (orgId) {
      fetchOrganization();
      checkUserRole();
    }
  }, [orgId, fetchOrganization]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError("Only image files are allowed.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError("File size cannot exceed 5MB.");
        return;
      }
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
  };

  const uploadLogo = async (file: File): Promise<string | null> => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user || !organization) {
        throw new Error("User or organization not found");
      }

      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${organization.org_id}/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { error } = await supabase.storage
        .from('organization-logos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        if (error.message?.includes('Bucket not found') || error.message?.includes('not found')) {
          throw new Error(
            "Storage bucket 'organization-logos' not found. " +
            "Please create it in Supabase Dashboard > Storage with public access enabled."
          );
        }
        console.error("Storage upload error:", error);
        throw new Error(`Failed to upload logo: ${error.message}`);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('organization-logos')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (err: any) {
      console.error("Error uploading logo:", err);
      throw err;
    }
  };

  const handleSave = async () => {
    if (!organization) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const supabase = createClient();
      let logoUrl = logoPreview;

      // Upload new logo if selected
      if (logoFile) {
        setUploading(true);
        try {
          const uploadedUrl = await uploadLogo(logoFile);
          if (uploadedUrl) {
            logoUrl = uploadedUrl;
          }
        } catch (uploadError: any) {
          console.error("Logo upload failed:", uploadError);
          setError(uploadError.message || "Failed to upload logo.");
          setUploading(false);
          setSaving(false);
          return;
        } finally {
          setUploading(false);
        }
      }

      // Update organization settings (logo stored in settings JSON, not as column)
      const updatedSettings = {
        ...organization.settings,
        company_name: companyName,
        logo_url: logoUrl,
      };

      const { error: updateError } = await supabase
        .from("organizations")
        .update({ 
          name: companyName,
          settings: updatedSettings,
        })
        .eq("org_id", organization.org_id);

      if (updateError) throw updateError;

      setSuccess("Organization settings updated successfully!");
      fetchOrganization(); // Re-fetch to ensure UI is in sync
    } catch (err: any) {
      console.error("Error saving organization settings:", err);
      setError(err.message || "Failed to save organization settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  if (error && error !== "You don&apos;t have permission to access this page") {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">Error</h3>
          <p className="text-red-700 dark:text-red-300">{error}</p>
          <button
            onClick={() => router.push('/admin/panel/organizations')}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Back to Organizations
          </button>
        </div>
      </div>
    );
  }

  if (!organization || error === "You don&apos;t have permission to access this page") {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">Access Denied</h3>
          <p className="text-yellow-700 dark:text-yellow-300">
            You do not have the necessary permissions to view or edit organization settings.
            Please contact your system administrator.
          </p>
          <button
            onClick={() => router.push('/admin/panel/organizations')}
            className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
          >
            Back to Organizations
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/admin/panel/organizations')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Organization Settings
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Manage {organization.name}&apos;s logo and company information
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center">
            <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400 mr-2" />
            <p className="text-green-700 dark:text-green-300">{success}</p>
          </div>
          <button onClick={() => setSuccess(null)} className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && error !== "You don&apos;t have permission to access this page" && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center">
            <XCircleIcon className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">General Settings</h2>
        <div className="space-y-6">
          {/* Company Name */}
          <div>
            <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Company Name
            </label>
            <input
              type="text"
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white"
              placeholder="Enter your company name"
            />
          </div>

          {/* Organization Slug (Read-only) */}
          <div>
            <label htmlFor="organizationSlug" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Organization Slug
            </label>
            <input
              type="text"
              id="organizationSlug"
              value={organization.slug}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
            />
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              The organization slug is a unique identifier and cannot be changed.
            </p>
          </div>

          {/* Logo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Organization Logo
            </label>
            <div className="mt-1 flex items-center space-x-4">
              {logoPreview ? (
                <div className="relative w-24 h-24 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700">
                  <Image
                    src={logoPreview}
                    alt="Organization Logo Preview"
                    width={96}
                    height={96}
                    className="object-cover"
                  />
                  <button
                    onClick={handleRemoveLogo}
                    className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 text-xs hover:bg-red-600"
                    aria-label="Remove logo"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 dark:text-gray-500">
                  <PhotoIcon className="w-12 h-12" />
                </div>
              )}
              <label htmlFor="logo-upload" className="cursor-pointer bg-white dark:bg-gray-700 py-2 px-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-brand-500">
                <span>{logoFile ? "Change logo" : "Upload logo"}</span>
                <input
                  id="logo-upload"
                  name="logo-upload"
                  type="file"
                  className="sr-only"
                  accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                  onChange={handleLogoChange}
                />
              </label>
            </div>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              PNG, JPG, GIF, WEBP, SVG up to 5MB.
            </p>
          </div>

          {/* Save Button */}
          <div className="pt-4">
            <button
              onClick={handleSave}
              disabled={saving || uploading}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving || uploading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

