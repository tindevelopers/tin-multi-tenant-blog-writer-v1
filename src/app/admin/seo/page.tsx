"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Temporary compatibility route: redirect old /admin/seo URL to /seo.
 * Admin namespace should be reserved for system administration only.
 */
export default function AdminSeoRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/seo");
  }, [router]);

  return null;
}

