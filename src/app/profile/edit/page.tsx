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
  phone?: string;
  bio?: string;
  organizations?: {
    name: string;
  };
}

export default function EditProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    bio: "",
  });

  useEffect(() => {
    const supabase = createClient();
    
    const fetchUserData = async () => {
      try {
        // Get current user
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
          } else if (data) {
            setUserProfile(data);
            setFormData({
              full_name: data.full_name || "",
              phone: data.phone || "",
              bio: data.bio || "",
            });
          }
        } else {
          router.push("/auth/login");
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    if (!user?.id) {
      setError("User not found. Please log in again.");
      setSaving(false);
      return;
    }

    try {
      const supabase = createClient();
      
      // Build update object
      const updateData: Record<string, unknown> = {
        full_name: formData.full_name?.trim() || null,
        updated_at: new Date().toISOString(),
      };

      // Add phone and bio fields (will be added via migration)
      if (formData.phone !== undefined) {
        updateData.phone = formData.phone?.trim() || null;
      }
      if (formData.bio !== undefined) {
        updateData.bio = formData.bio?.trim() || null;
      }
      
      console.log("Updating profile with data:", { ...updateData, user_id: user.id });
      
      const { error, data } = await supabase
        .from("users")
        .update(updateData)
        .eq("user_id", user.id)
        .select();

      if (error) {
        console.error("Profile update error:", error);
        console.error("Error details:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        
        // Provide user-friendly error messages
        if (error.code === '42703') {
          // Column does not exist
          throw new Error("Some profile fields are not yet available. Please try updating your name only, or contact support.");
        } else if (error.code === '42501') {
          // Insufficient privilege
          throw new Error("You don't have permission to update your profile. Please contact your administrator.");
        } else if (error.message?.includes('column')) {
          throw new Error("Profile update failed: Invalid field. Please try again or contact support.");
        }
        
        throw new Error(error.message || "Failed to update profile. Please try again.");
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      
      // Refresh user profile
      const { data } = await supabase
        .from("users")
        .select("*, organizations(*)")
        .eq("user_id", user?.id)
        .single();
      
      if (data) {
        setUserProfile(data);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Image
              width={80}
              height={80}
              src={userProfile?.avatar_url || "/images/user/owner.png"}
              alt="Profile"
              className="rounded-full h-20 w-20 object-cover border-4 border-white dark:border-gray-700 shadow-lg"
            />
            <button className="absolute -bottom-1 -right-1 bg-brand-600 text-white rounded-full p-2 hover:bg-brand-700 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {userProfile?.full_name || "User"}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">{user?.email}</p>
            <div className="flex items-center space-x-2 mt-2">
              {userProfile?.role && <RoleBadge role={userProfile.role} size="md" />}
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {userProfile?.organizations?.name}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
          Personal Information
        </h2>

        {error && (
          <div className="mb-6 rounded-md bg-red-50 dark:bg-red-900/20 p-4">
            <div className="text-sm text-red-800 dark:text-red-200">
              {error}
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-md bg-green-50 dark:bg-green-900/20 p-4">
            <div className="text-sm text-green-800 dark:text-green-200">
              Profile updated successfully!
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Full Name
              </label>
              <input
                type="text"
                id="full_name"
                name="full_name"
                value={formData.full_name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:text-white"
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:text-white"
                placeholder="Enter your phone number"
              />
            </div>
          </div>

          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Bio
            </label>
            <textarea
              id="bio"
              name="bio"
              rows={4}
              value={formData.bio}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:text-white"
              placeholder="Tell us about yourself..."
            />
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 text-sm font-medium text-white bg-brand-600 border border-transparent rounded-md hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

