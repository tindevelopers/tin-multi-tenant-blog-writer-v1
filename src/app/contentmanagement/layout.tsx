"use client";

import { useSidebar } from "@/context/SidebarContext";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import React from "react";
import { usePathname } from "next/navigation";

export default function ContentManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const pathname = usePathname();

  // Route-specific styles for the main content container
  const getRouteSpecificStyles = () => {
    switch (pathname) {
      case "/contentmanagement/drafts":
        return "p-4 mx-auto max-w-7xl md:p-6";
      default:
        return "p-4 mx-auto max-w-7xl md:p-6";
    }
  };

  // Dynamic class for main content margin based on sidebar state
  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
    ? "xl:ml-[290px]"
    : "xl:ml-[90px]";

  return (
    <div className="min-h-screen xl:flex bg-gray-50 dark:bg-gray-900">
      {/* Sidebar and Backdrop */}
      <AppSidebar />
      <Backdrop />
      {/* Main Content Area - needs relative positioning and z-index for proper stacking */}
      <div
        className={`flex-1 transition-all duration-300 ease-in-out bg-gray-50 dark:bg-gray-900 relative z-0 ${mainContentMargin}`}
      >
        {/* Header */}
        <AppHeader />
        {/* Page Content - isolated stacking context */}
        <div className={`${getRouteSpecificStyles()} bg-gray-50 dark:bg-gray-900 relative`}>{children}</div>
      </div>
    </div>
  );
}

