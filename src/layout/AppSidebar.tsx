"use client";
import React, { useEffect, useRef, useCallback, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import { createClient } from "@/lib/supabase/client";
import {
  ChevronDownIcon,
  HorizontaLDots,
} from "../icons";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  new?: boolean;
  subItems?: { 
    name: string; 
    path?: string; 
    pro?: boolean; 
    new?: boolean;
    isAccordionHeader?: boolean;
    subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
  }[];
};

// Blog Writer specific navigation items
const blogWriterItems: NavItem[] = [
  {
    name: "Blog Writer",
    icon: <span className="w-5 h-5 flex items-center justify-center text-xs font-bold bg-blue-500 text-white rounded">B</span>,
    new: true,
    subItems: [
      { name: "Dashboard", path: "/admin" },
      { 
        name: "Content Management", 
        isAccordionHeader: true,
        new: true,
        subItems: [
          { name: "Drafts", path: "/admin/drafts", new: true },
          { name: "Templates", path: "/admin/templates", new: true },
          { name: "Publishing", path: "/admin/publishing", new: true },
          { name: "Workflows", path: "/admin/workflows", new: true },
        ]
      },
      { 
        name: "Team & Collaboration", 
        isAccordionHeader: true,
        new: true,
        subItems: [
          { name: "Team", path: "/admin/team", new: true },
          { name: "Media", path: "/admin/media", new: true },
          { name: "Integrations", path: "/admin/integrations", new: true },
        ]
      },
      { 
        name: "Analytics & SEO", 
        isAccordionHeader: true,
        pro: true,
        subItems: [
          { name: "Analytics", path: "/admin/analytics", pro: true },
          { name: "SEO", path: "/admin/seo", pro: true },
        ]
      },
    ],
  },
];

// Admin Panel navigation items (only for system_admin, super_admin, admin, manager roles)
const adminPanelItems: NavItem[] = [
  {
    name: "Admin Panel",
    icon: <span className="w-5 h-5 flex items-center justify-center text-xs font-bold bg-purple-600 text-white rounded">A</span>,
    new: true,
    subItems: [
      { name: "Admin Dashboard", path: "/admin/panel" },
      { name: "User Management", path: "/admin/panel/users" },
      { name: "Organizations", path: "/admin/panel/organizations" },
      { name: "Integrations", path: "/admin/panel/integrations" },
      { name: "Usage Logs", path: "/admin/panel/usage-logs" },
      { name: "System Settings", path: "/admin/panel/system-settings" },
    ],
  },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();

  // Simple state management - just track what's open
  const [openSubmenus, setOpenSubmenus] = useState<Set<string>>(new Set());
  const [openNestedSubmenus, setOpenNestedSubmenus] = useState<Set<string>>(new Set());
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  // Check if user is admin on mount
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from("users")
          .select("*")
          .eq("user_id", user.id)
          .single()
          .then(({ data }) => {
            if (data) {
              const adminRoles = ["system_admin", "super_admin", "admin", "manager"];
              setShowAdminPanel(adminRoles.includes(data.role));
            } else {
              // Fallback: try to fetch by email
              supabase
                .from("users")
                .select("*")
                .eq("email", user.email)
                .single()
                .then(({ data: emailData }) => {
                  if (emailData) {
                    const adminRoles = ["system_admin", "super_admin", "admin", "manager"];
                    setShowAdminPanel(adminRoles.includes(emailData.role));
                  }
                });
            }
          });
      }
    });
  }, []);

  // Simple toggle functions - no complex logic
  const handleSubmenuToggle = (
    index: number,
    menuType: "main" | "support" | "others" | "templates" | "admin"
  ) => {
    const key = `${menuType}-${index}`;
    setOpenSubmenus((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const handleNestedSubmenuToggle = (
    subIndex: number,
    menuType: "main" | "support" | "others" | "templates" | "admin",
    parentIndex: number
  ) => {
    const key = `${menuType}-${parentIndex}-${subIndex}`;
    setOpenNestedSubmenus((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const isActive = useCallback((path: string) => {
    return pathname === path;
  }, [pathname]);

  const renderMenuItems = (
    navItems: NavItem[],
    menuType: "main" | "support" | "others" | "templates" | "admin"
  ) => {
    return (
      <ul className="flex flex-col gap-1">
        {navItems.map((nav, index) => {
          const submenuKey = `${menuType}-${index}`;
          const isSubmenuOpen = openSubmenus.has(submenuKey);
          
          return (
            <li key={nav.name}>
              {nav.subItems ? (
                <button
                  onClick={() => handleSubmenuToggle(index, menuType)}
                  className={`menu-item group w-full text-left ${
                    isSubmenuOpen
                      ? "menu-item-active"
                      : "menu-item-inactive"
                  } cursor-pointer ${
                    !isExpanded && !isHovered
                      ? "lg:justify-center"
                      : "lg:justify-start"
                  }`}
                >
                  <span
                    className={`${
                      isSubmenuOpen
                        ? "menu-item-icon-active"
                        : "menu-item-icon-inactive"
                    }`}
                  >
                    {nav.icon}
                  </span>
                  <span
                    className={`${
                      isSubmenuOpen
                        ? "menu-item-text-active"
                        : "menu-item-text-inactive"
                    }`}
                  >
                    {nav.name}
                  </span>
                  {nav.new && (
                    <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full dark:bg-green-900 dark:text-green-300">
                      NEW
                    </span>
                  )}
                  <ChevronDownIcon
                    className={`${
                      isSubmenuOpen ? "rotate-180" : ""
                    } transition-transform duration-200`}
                  />
                </button>
              ) : (
                <Link
                  href={nav.path || "#"}
                  className={`menu-item group ${
                    isActive(nav.path || "")
                      ? "menu-item-active"
                      : "menu-item-inactive"
                  } ${
                    !isExpanded && !isHovered
                      ? "lg:justify-center"
                      : "lg:justify-start"
                  }`}
                >
                  <span
                    className={`${
                      isActive(nav.path || "")
                        ? "menu-item-icon-active"
                        : "menu-item-icon-inactive"
                    }`}
                  >
                    {nav.icon}
                  </span>
                  <span
                    className={`${
                      isActive(nav.path || "")
                        ? "menu-item-text-active"
                        : "menu-item-text-inactive"
                    }`}
                  >
                    {nav.name}
                  </span>
                  {nav.new && (
                    <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full dark:bg-green-900 dark:text-green-300">
                      NEW
                    </span>
                  )}
                </Link>
              )}
              {nav.subItems && (
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isSubmenuOpen ? "opacity-100 max-h-screen" : "opacity-0 max-h-0"
                  }`}
                >
                  <ul className="ml-4 mt-1 space-y-1">
                    {nav.subItems.map((subItem, subIndex) => {
                      const nestedSubmenuKey = `${menuType}-${index}-${subIndex}`;
                      const isNestedSubmenuOpen = openNestedSubmenus.has(nestedSubmenuKey);
                      
                      return (
                        <li key={subItem.name}>
                          {subItem.isAccordionHeader ? (
                            <div>
                              <button
                                onClick={() => handleNestedSubmenuToggle(subIndex, menuType, index)}
                                className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ${
                                  isNestedSubmenuOpen
                                    ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                                    : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                                } ${
                                  !isExpanded && !isHovered
                                    ? "lg:justify-center"
                                    : "lg:justify-start"
                                }`}
                              >
                                <span className="flex items-center gap-2">
                                  {subItem.name}
                                  {subItem.new && (
                                    <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full dark:bg-green-900 dark:text-green-300">
                                      NEW
                                    </span>
                                  )}
                                </span>
                                <ChevronDownIcon
                                  className={`w-4 h-4 transition-transform duration-200 ${
                                    isNestedSubmenuOpen ? "rotate-180" : ""
                                  }`}
                                />
                              </button>
                              {subItem.subItems && (
                                <div
                                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                                    isNestedSubmenuOpen ? "opacity-100 max-h-screen" : "opacity-0 max-h-0"
                                  }`}
                                >
                                  <ul className="ml-4 mt-1 space-y-1">
                                    {subItem.subItems.map((nestedItem) => (
                                      <li key={nestedItem.name}>
                                        <Link
                                          href={nestedItem.path || "#"}
                                          className={`flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                                            isActive(nestedItem.path || "")
                                              ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                                              : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                                          } ${
                                            !isExpanded && !isHovered
                                              ? "lg:justify-center"
                                              : "lg:justify-start"
                                          }`}
                                        >
                                          <span className="flex items-center gap-2">
                                            {nestedItem.name}
                                            {nestedItem.new && (
                                              <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full dark:bg-green-900 dark:text-green-300">
                                                NEW
                                              </span>
                                            )}
                                            {nestedItem.pro && (
                                              <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2 py-1 rounded-full dark:bg-purple-900 dark:text-purple-300">
                                                PRO
                                              </span>
                                            )}
                                          </span>
                                        </Link>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          ) : (
                            <Link
                              href={subItem.path || "#"}
                              className={`flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                                isActive(subItem.path || "")
                                  ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                                  : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                              } ${
                                !isExpanded && !isHovered
                                  ? "lg:justify-center"
                                  : "lg:justify-start"
                              }`}
                            >
                              <span className="flex items-center gap-2">
                                {subItem.name}
                                {subItem.new && (
                                  <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full dark:bg-green-900 dark:text-green-300">
                                    NEW
                                  </span>
                                )}
                                {subItem.pro && (
                                  <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2 py-1 rounded-full dark:bg-purple-900 dark:text-purple-300">
                                    PRO
                                  </span>
                                )}
                              </span>
                            </Link>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <aside
      className={`sidebar group fixed z-50 h-screen w-72 overflow-hidden bg-white shadow-lg transition-all duration-300 ease-in-out dark:bg-gray-900 lg:left-0 ${
        isExpanded || isHovered || isMobileOpen
          ? "left-0"
          : "-left-72 lg:left-0 lg:w-20"
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between px-4 py-4">
          <Link
            href="/admin"
            className="flex items-center gap-3"
          >
            {isExpanded || isHovered || isMobileOpen ? (
              <Image
                src="/images/logo/logo.svg"
                alt="Logo"
                width={32}
                height={32}
              />
            ) : (
              <Image
                src="/images/logo/logo-icon.svg"
                alt="Logo"
                width={32}
                height={32}
              />
            )}
          </Link>
        </div>
        <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
          <nav className="mb-6">
            <div className="flex flex-col gap-4">
              <div>
                <h2
                  className={`mb-4 text-xs uppercase flex leading-5 text-gray-400 ${
                    !isExpanded && !isHovered
                      ? "xl:justify-center"
                      : "justify-start"
                  }`}
                >
                  {isExpanded || isHovered || isMobileOpen ? (
                    "Blog Writer"
                  ) : (
                    <HorizontaLDots />
                  )}
                </h2>
                {renderMenuItems(blogWriterItems, "templates")}
              </div>

              {/* Admin Panel Section - Only visible to admins */}
              {showAdminPanel && (
                <div className="mt-6">
                  <h2
                    className={`mb-4 text-xs uppercase flex leading-5 text-purple-400 ${
                      !isExpanded && !isHovered
                        ? "xl:justify-center"
                        : "justify-start"
                    }`}
                  >
                    {isExpanded || isHovered || isMobileOpen ? (
                      "Administration"
                    ) : (
                      <HorizontaLDots />
                    )}
                  </h2>
                  {renderMenuItems(adminPanelItems, "admin")}
                </div>
              )}
            </div>
          </nav>
        </div>
      </div>
    </aside>
  );
};

export default AppSidebar;