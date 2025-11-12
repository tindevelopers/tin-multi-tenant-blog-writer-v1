"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { KeyIcon, CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

interface CloudinaryConfigProps {
  orgId: string;
  onSave?: () => void;
}

interface CloudinaryCredentials {
  cloud_name: string;
  api_key: string;
  api_secret: string;
}

export function CloudinaryConfig({ orgId, onSave }: CloudinaryConfigProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showApiSecret, setShowApiSecret] = useState(false);
  const [credentials, setCredentials] = useState<CloudinaryCredentials>({
    cloud_name: "",
    api_key: "",
    api_secret: "",
  });
  const [status, setStatus] = useState<"configured" | "not_configured" | "error">("not_configured");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>("");

  useEffect(() => {
    const supabase = createClient();
    
    // Check user role
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

    // Load existing Cloudinary credentials
    const loadCredentials = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setError("Not authenticated");
          setLoading(false);
          return;
        }

        const { data: org, error: orgError } = await supabase
          .from("organizations")
          .select("settings")
          .eq("org_id", orgId)
          .single();

        if (orgError) {
          console.error("Error loading organization:", orgError);
          setLoading(false);
          return;
        }

        const settings = org.settings as Record<string, unknown> | null;
        if (settings?.cloudinary) {
          const cloudinary = settings.cloudinary as CloudinaryCredentials;
          setCredentials({
            cloud_name: cloudinary.cloud_name || "",
            api_key: cloudinary.api_key || "",
            api_secret: cloudinary.api_secret || "",
          });
          setStatus("configured");
        }
      } catch (err) {
        console.error("Error loading credentials:", err);
        setError(err instanceof Error ? err.message : "Failed to load credentials");
      } finally {
        setLoading(false);
      }
    };

    loadCredentials();
  }, [orgId]);

  const canManage = ["owner", "admin"].includes(userRole);

  const handleSave = async () => {
    if (!canManage) {
      setError("Only organization owners and admins can configure Cloudinary");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Not authenticated");
      }

      // Get current settings
      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .select("settings")
        .eq("org_id", orgId)
        .single();

      if (orgError) {
        throw new Error(`Failed to load organization: ${orgError.message}`);
      }

      const currentSettings = (org.settings as Record<string, unknown>) || {};
      
      // Update settings with Cloudinary credentials
      const updatedSettings = {
        ...currentSettings,
        cloudinary: {
          cloud_name: credentials.cloud_name.trim(),
          api_key: credentials.api_key.trim(),
          api_secret: credentials.api_secret.trim(),
        },
      };

      const { error: updateError } = await supabase
        .from("organizations")
        .update({
          settings: updatedSettings,
          updated_at: new Date().toISOString(),
        })
        .eq("org_id", orgId);

      if (updateError) {
        throw new Error(`Failed to save credentials: ${updateError.message}`);
      }

      setStatus("configured");
      setSuccess("Cloudinary credentials saved successfully!");
      
      if (onSave) {
        onSave();
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error saving credentials:", err);
      setError(err instanceof Error ? err.message : "Failed to save credentials");
      setStatus("error");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!canManage) {
      setError("Only organization owners and admins can test Cloudinary connection");
      return;
    }

    setTesting(true);
    setError(null);

    try {
      const response = await fetch("/api/integrations/cloudinary/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          org_id: orgId,
          credentials: {
            cloud_name: credentials.cloud_name.trim(),
            api_key: credentials.api_key.trim(),
            api_secret: credentials.api_secret.trim(),
          },
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMessage = result.error || result.details || "Connection test failed";
        throw new Error(errorMessage);
      }

      const successMessage = result.message || "Connection test successful! Cloudinary is properly configured.";
      setSuccess(successMessage);
      setStatus("configured");
      // Keep success message visible longer for connection test
      setTimeout(() => setSuccess(null), 8000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection test failed");
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <div className="flex items-start">
          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              Access Restricted
            </h3>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
              Only organization owners and admins can configure Cloudinary credentials.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Cloudinary Configuration
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Configure your Cloudinary account to automatically store generated blog images in your organization&apos;s media library.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start">
            <XCircleIcon className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
            <div className="ml-3">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-start">
            <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
            <div className="ml-3">
              <p className="text-sm text-green-800 dark:text-green-200">{success}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Cloud Name <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <KeyIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={credentials.cloud_name}
              onChange={(e) => setCredentials({ ...credentials, cloud_name: e.target.value })}
              placeholder="your-cloud-name"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Found in your Cloudinary dashboard URL or account details
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            API Key <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <KeyIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={credentials.api_key}
              onChange={(e) => setCredentials({ ...credentials, api_key: e.target.value })}
              placeholder="123456789012345"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Found in Cloudinary Settings → Security
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            API Secret <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <KeyIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type={showApiSecret ? "text" : "password"}
              value={credentials.api_secret}
              onChange={(e) => setCredentials({ ...credentials, api_secret: e.target.value })}
              placeholder="••••••••••••••••"
              className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <button
              type="button"
              onClick={() => setShowApiSecret(!showApiSecret)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              {showApiSecret ? (
                <EyeSlashIcon className="h-5 w-5" />
              ) : (
                <EyeIcon className="h-5 w-5" />
              )}
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Found in Cloudinary Settings → Security (click &quot;Reveal&quot; to show)
          </p>
        </div>

        <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleSave}
            disabled={saving || !credentials.cloud_name || !credentials.api_key || !credentials.api_secret}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                <CheckCircleIcon className="h-5 w-5" />
                Save Credentials
              </>
            )}
          </button>
          <button
            onClick={handleTest}
            disabled={testing || !credentials.cloud_name || !credentials.api_key || !credentials.api_secret}
            className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-gray-900 dark:text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {testing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                Testing...
              </>
            ) : (
              "Test Connection"
            )}
          </button>
        </div>
      </div>

      {status === "configured" && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start">
            <CheckCircleIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Cloudinary Configured
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Your Cloudinary account is connected. Generated blog images will be automatically uploaded to your Cloudinary account.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
          How to get your Cloudinary credentials:
        </h4>
        <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
          <li>Log in to your Cloudinary dashboard at <a href="https://cloudinary.com/console" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">cloudinary.com/console</a></li>
          <li>Navigate to Settings → Security (or Dashboard → Account Details)</li>
          <li>Copy your Cloud Name, API Key, and API Secret</li>
          <li>Paste them into the fields above and click &quot;Save Credentials&quot;</li>
        </ol>
      </div>
    </div>
  );
}

