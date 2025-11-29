"use client";

import AdminLayout from "@/app/admin/layout";

export default function SEOLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayout>{children}</AdminLayout>;
}

