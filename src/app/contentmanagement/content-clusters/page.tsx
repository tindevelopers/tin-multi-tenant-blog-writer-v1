"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Legacy route: redirect /admin/content-clusters → /seo/content-clusters.
 */
export default function AdminContentClustersRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/seo/content-clusters");
  }, [router]);

  return null;
}

