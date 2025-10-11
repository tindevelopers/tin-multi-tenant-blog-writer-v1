import React from 'react';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: "Admin Panel | Blog Writer",
  description: "Administrative panel for managing the blog writing platform.",
};

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Check if user has admin privileges
  const { data: userProfile, error: userError } = await supabase
    .from('users')
    .select('role')
    .eq('user_id', user.id)
    .single();

  console.log("🔍 AdminPanel Layout: User ID:", user.id);
  console.log("🔍 AdminPanel Layout: User Profile:", userProfile);
  console.log("🔍 AdminPanel Layout: User Error:", userError);

  if (!userProfile || !['system_admin', 'super_admin', 'admin', 'manager'].includes(userProfile.role)) {
    console.log("❌ AdminPanel Layout: Redirecting - Role:", userProfile?.role);
    redirect('/admin');
  } else {
    console.log("✅ AdminPanel Layout: Access granted - Role:", userProfile.role);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </div>
    </div>
  );
}