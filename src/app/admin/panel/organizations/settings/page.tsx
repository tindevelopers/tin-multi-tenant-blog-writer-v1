"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { PhotoIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface Organization {
  org_id: string;
  name: string;
  slug: string;
  logo_url?: string;
  settings?: {
    company_name?: string;
    logo_url?: string; // legacy
    logo_square_url?: string;
    logo_wide_url?: string;
  };
}

export default function OrganizationSettingsPage() {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [companyName, setCompanyName] = useState("");
  const [squareLogoPreview, setSquareLogoPreview] = useState<string | null>(null);
  const [wideLogoPreview, setWideLogoPreview] = useState<string | null>(null);
  const [squareLogoFile, setSquareLogoFile] = useState<File | null>(null);
  const [wideLogoFile, setWideLogoFile] = useState<File | null>(null);

  useEffect(() => {
    fetchOrganization();
  }, []);

  const fetchOrganization = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError("Not authenticated");
        setLoading(false);
        return;
      }

          // Get user's organization and role
          const { data: userData, error: userError } = await supabase
            .from("users")
            .select("org_id, role, organizations(*)")
            .eq("user_id", user.id)
            .single();

          if (userError) throw userError;

          // Check if user has permission (admin, owner, system_admin, super_admin)
          const allowedRoles = ["admin", "owner", "system_admin", "super_admin"];
          if (userData && !allowedRoles.includes(userData.role)) {
            setError("You don&apos;t have permission to access organization settings");
            setLoading(false);
            return;
          }

          if (userData && userData.organizations) {
            // organizations is an array from Supabase join, get first element
            const orgs = userData.organizations as unknown as Organization[];
            const org = Array.isArray(orgs) && orgs.length > 0 ? orgs[0] : null;
            if (org) {
              setOrganization(org);
              
              // Set form values
              const companyNameValue = org.settings?.company_name || org.name || "";
              setCompanyName(companyNameValue);
              
              const squareUrl = org.settings?.logo_square_url || null;
              const wideUrl = org.settings?.logo_wide_url || org.settings?.logo_url || org.logo_url || null;
              setSquareLogoPreview(squareUrl);
              setWideLogoPreview(wideUrl);
            } else {
              setError("Organization not found for this user.");
            }
          } else {
            setError("Organization not found for this user.");
          }
    } catch (err) {
      console.error("Error fetching organization:", err);
      setError(err instanceof Error ? err.message : "Failed to load organization");
    } finally {
      setLoading(false);
    }
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>, type: "square" | "wide") => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5MB");
      return;
    }

    if (type === "square") {
      setSquareLogoFile(file);
    } else {
      setWideLogoFile(file);
    }
    setError(null);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      if (type === "square") {
        setSquareLogoPreview(reader.result as string);
      } else {
        setWideLogoPreview(reader.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = (type: "square" | "wide") => {
    if (type === "square") {
      setSquareLogoFile(null);
      setSquareLogoPreview(null);
    } else {
      setWideLogoFile(null);
      setWideLogoPreview(null);
    }
  };

  const uploadLogo = async (file: File, type: "square" | "wide"): Promise<string | null> => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user || !organization) {
        throw new Error("User or organization not found");
      }

      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      const folder = type === "square" ? "square" : "wide";
      const fileName = `${organization.org_id}/${folder}/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { error } = await supabase.storage
        .from('organization-logos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        // Check if bucket doesn't exist
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
    } catch (err) {
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
      let squareUrl = squareLogoPreview;
      let wideUrl = wideLogoPreview;

      // Upload square logo if selected
      if (squareLogoFile) {
        setUploading(true);
        try {
          const uploadedUrl = await uploadLogo(squareLogoFile, "square");
          if (uploadedUrl) {
            squareUrl = uploadedUrl;
          }
        } catch (uploadError) {
          console.error("Square logo upload failed:", uploadError);
          // Continue with save even if upload fails
        } finally {
          setUploading(false);
        }
      }

      // Upload wide logo if selected
      if (wideLogoFile) {
        setUploading(true);
        try {
          const uploadedUrl = await uploadLogo(wideLogoFile, "wide");
          if (uploadedUrl) {
            wideUrl = uploadedUrl;
          }
        } catch (uploadError) {
          console.error("Wide logo upload failed:", uploadError);
          // Continue with save even if upload fails
        } finally {
          setUploading(false);
        }
      }

      // Update organization
      const { error: updateError } = await supabase
        .from("organizations")
        .update({
          name: companyName,
          settings: {
            ...organization.settings,
            company_name: companyName,
            logo_square_url: squareUrl || undefined,
            logo_wide_url: wideUrl || undefined,
            logo_url: wideUrl || squareUrl || organization.settings?.logo_url, // backward compat
          },
          updated_at: new Date().toISOString(),
        })
        .eq("org_id", organization.org_id);

      if (updateError) throw updateError;

      // Update local state
      setOrganization(prev => prev ? {
        ...prev,
        name: companyName,
        settings: {
          ...prev.settings,
          company_name: companyName,
          logo_square_url: squareUrl || undefined,
          logo_wide_url: wideUrl || undefined,
          logo_url: wideUrl || squareUrl || prev.settings?.logo_url,
        },
      } : null);

      setSuccess("Organization settings saved successfully!");
      setSquareLogoFile(null);
      setWideLogoFile(null);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error saving organization:", err);
      setError(err instanceof Error ? err.message : "Failed to save settings");
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

  if (!organization) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">Error</h3>
          <p className="text-red-700 dark:text-red-300">{error || "Organization not found"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Organization Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your organization&apos;s logo and company information
          </p>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <p className="text-green-800 dark:text-green-200">{success}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Logo Upload Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-8">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Organization Logos
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Upload a square icon and an optional wide/wordmark logo. Wide logo is shown directly; square icon can be paired with the company name.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Square Logo */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Square Logo (icon)</h3>
            <div className="flex items-start gap-4">
              <div className="relative w-28 h-28 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-700 flex items-center justify-center">
                {squareLogoPreview ? (
                  <>
                    <Image
                      src={squareLogoPreview}
                      alt="Square logo"
                      fill
                      className="object-contain p-2"
                    />
                    <button
                      onClick={() => handleRemoveLogo("square")}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      type="button"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <div className="text-center p-4">
                    <PhotoIcon className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-500 dark:text-gray-400">No square logo</p>
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleLogoSelect(e, "square")}
                  className="block w-full text-sm text-gray-500 dark:text-gray-400
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-sm file:font-semibold
                    file:bg-brand-50 file:text-brand-700
                    hover:file:bg-brand-100
                    dark:file:bg-brand-900 dark:file:text-brand-300
                    dark:hover:file:bg-brand-800
                    cursor-pointer"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Square/near-square icon. Recommended ≥200x200px. Max 5MB.
                </p>
              </div>
            </div>
          </div>

          {/* Wide Logo */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Wide Logo (wordmark)</h3>
            <div className="flex items-start gap-4">
              <div className="relative w-44 h-20 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-700 flex items-center justify-center">
                {wideLogoPreview ? (
                  <>
                    <Image
                      src={wideLogoPreview}
                      alt="Wide logo"
                      fill
                      className="object-contain p-2"
                    />
                    <button
                      onClick={() => handleRemoveLogo("wide")}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      type="button"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <div className="text-center p-4">
                    <PhotoIcon className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-500 dark:text-gray-400">No wide logo</p>
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleLogoSelect(e, "wide")}
                  className="block w-full text-sm text-gray-500 dark:text-gray-400
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-sm file:font-semibold
                    file:bg-brand-50 file:text-brand-700
                    hover:file:bg-brand-100
                    dark:file:bg-brand-900 dark:file:text-brand-300
                    dark:hover:file:bg-brand-800
                    cursor-pointer"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Wide/rectangular wordmark. Recommended width ≥400px. Max 5MB.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Company Name Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Company Information
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Company Name
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Enter your company name"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white"
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              This name will be displayed throughout the application
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Organization Slug
            </label>
            <input
              type="text"
              value={organization.slug}
              disabled
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed"
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Organization slug cannot be changed
            </p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-4">
        <button
          onClick={handleSave}
          disabled={saving || uploading}
          className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {uploading ? "Uploading..." : saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

