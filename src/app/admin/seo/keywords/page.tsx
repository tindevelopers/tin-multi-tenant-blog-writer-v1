"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Legacy route: redirect /admin/seo/keywords → /seo/saved-searches.
 */
export default function AdminSavedSearchesRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/seo/saved-searches");
  }, [router]);

  return null;
}

