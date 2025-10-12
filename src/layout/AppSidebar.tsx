"use client";
import React, { useEffect, useRef, useCallback, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import { createClient } from "@/lib/supabase/client";
import {
  ChevronDownIcon,
  // GridIcon, // Unused import
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

  // State management for menus - allow multiple open menus with persistence
  const [openSubmenus, setOpenSubmenus] = useState<Set<string>>(new Set());
  const [openNestedSubmenus, setOpenNestedSubmenus] = useState<Set<string>>(new Set());
  const [subMenuHeights, setSubMenuHeights] = useState<Record<string, number>>({});
  const [nestedSubMenuHeights, setNestedSubMenuHeights] = useState<Record<string, number>>({});
  // const [userRole, setUserRole] = useState<string>(""); // Unused variable
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  // Load persisted accordion state from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedSubmenus = localStorage.getItem('sidebar-open-submenus');
        const savedNestedSubmenus = localStorage.getItem('sidebar-open-nested-submenus');
        
        if (savedSubmenus) {
          const parsedSubmenus = JSON.parse(savedSubmenus);
          setOpenSubmenus(new Set(parsedSubmenus));
        }
        
        if (savedNestedSubmenus) {
          const parsedNestedSubmenus = JSON.parse(savedNestedSubmenus);
          setOpenNestedSubmenus(new Set(parsedNestedSubmenus));
        }
      } catch (error) {
        console.warn('Failed to load sidebar state from localStorage:', error);
      }
    }
  }, []);

  // Persist accordion state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('sidebar-open-submenus', JSON.stringify([...openSubmenus]));
      } catch (error) {
        console.warn('Failed to save submenu state to localStorage:', error);
      }
    }
  }, [openSubmenus]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('sidebar-open-nested-submenus', JSON.stringify([...openNestedSubmenus]));
      } catch (error) {
        console.warn('Failed to save nested submenu state to localStorage:', error);
      }
    }
  }, [openNestedSubmenus]);
  
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const nestedSubMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const isActive = useCallback((path: string) => path === pathname, [pathname]);

  // Check user role to determine if admin panel should be shown
  useEffect(() => {
    const supabase = createClient();
    
    supabase.auth.getUser().then(({ data: { user }, error: authError }) => {
      console.log("🔍 AppSidebar: Auth check - User:", user?.email, "Auth Error:", authError);
      
      if (user) {
        console.log("🔍 AppSidebar: User ID:", user.id);
        console.log("🔍 AppSidebar: User email:", user.email);
        
        // Try to fetch user profile with more detailed debugging
        // First, try with the service role client to bypass RLS
        // const serviceSupabase = createClient(); // Unused variable
        
        // Try regular client first
        console.log("🔍 AppSidebar: Attempting to fetch user with ID:", user.id);
        supabase
          .from("users")
          .select("*") // Get all fields for debugging
          .eq("user_id", user.id)
          .single()
          .then(({ data, error }) => {
            console.log("🔍 AppSidebar: Raw response - Data:", data);
            console.log("🔍 AppSidebar: Raw response - Error:", error);
            console.log("🔍 AppSidebar: Error details:", JSON.stringify(error, null, 2));
            
            // Additional debugging for common issues
            if (error) {
              if (error.code === 'PGRST116') {
                console.log("❌ AppSidebar: No rows returned - user not found in users table");
              } else if (error.code === '42501') {
                console.log("❌ AppSidebar: Permission denied - RLS policy issue");
              } else {
                console.log("❌ AppSidebar: Other error:", error.message);
              }
            }
            
            if (error) {
              console.error("❌ AppSidebar: Error fetching user role:", error);
              console.error("❌ AppSidebar: Error code:", error.code);
              console.error("❌ AppSidebar: Error message:", error.message);
              console.error("❌ AppSidebar: Error details:", error.details);
              console.error("❌ AppSidebar: Error hint:", error.hint);
            } else if (data) {
              console.log("✅ AppSidebar: User role fetched:", data.role);
              console.log("✅ AppSidebar: Full user data:", data);
              // setUserRole(data.role); // Commented out unused variable
              // Show admin panel for these roles
              const adminRoles = ["system_admin", "super_admin", "admin", "manager"];
              const shouldShow = adminRoles.includes(data.role);
              console.log("🎯 AppSidebar: Should show admin panel:", shouldShow);
              setShowAdminPanel(shouldShow);
            } else {
              console.log("⚠️ AppSidebar: No user data found - trying fallback by email");
              
              // Fallback: try to fetch by email instead of user_id
              supabase
                .from("users")
                .select("*")
                .eq("email", user.email)
                .single()
                .then(({ data: emailData, error: emailError }) => {
                  console.log("🔍 AppSidebar: Email fallback - Data:", emailData);
                  console.log("🔍 AppSidebar: Email fallback - Error:", emailError);
                  
                  if (emailData) {
                    console.log("✅ AppSidebar: User found by email:", emailData.role);
                    // setUserRole(emailData.role); // Commented out unused variable
                    const adminRoles = ["system_admin", "super_admin", "admin", "manager"];
                    const shouldShow = adminRoles.includes(emailData.role);
                    console.log("🎯 AppSidebar: Should show admin panel:", shouldShow);
                    setShowAdminPanel(shouldShow);
                  } else {
                    console.log("❌ AppSidebar: User not found by email either");
                  }
                });
            }
          });
      } else {
        console.log("❌ AppSidebar: No user found - not authenticated");
      }
    });
  }, []);

  // Auto-open menus based on current path with improved logic
  useEffect(() => {
    const newOpenSubmenus = new Set<string>();
    const newOpenNestedSubmenus = new Set<string>();
    
    // Check Blog Writer template navigation items
    blogWriterItems.forEach((nav, index) => {
      if (nav.subItems) {
        // Always keep the main Blog Writer menu open if any submenu is active
        let shouldKeepMainOpen = false;
        
        nav.subItems.forEach((subItem, subIndex) => {
          // Check direct path matches
          if (subItem.path && isActive(subItem.path)) {
            newOpenSubmenus.add(`templates-${index}`);
            shouldKeepMainOpen = true;
          }
          // Check nested subItems for accordion headers
          if (subItem.subItems && subItem.isAccordionHeader) {
            subItem.subItems.forEach((nestedItem) => {
              if (isActive(nestedItem.path)) {
                newOpenSubmenus.add(`templates-${index}`);
                newOpenNestedSubmenus.add(`templates-${index}-${subIndex}`);
                shouldKeepMainOpen = true;
              }
            });
          }
        });
        
        // If any submenu is active, ensure main menu stays open
        if (shouldKeepMainOpen) {
          newOpenSubmenus.add(`templates-${index}`);
        }
      }
    });

    // Check Admin Panel navigation items
    if (showAdminPanel) {
      adminPanelItems.forEach((nav, index) => {
        if (nav.subItems) {
          nav.subItems.forEach((subItem) => {
            if (subItem.path && isActive(subItem.path)) {
              newOpenSubmenus.add(`admin-${index}`);
            }
          });
        }
      });
    }

    // Preserve existing open states while adding new ones
    setOpenSubmenus((prev) => {
      const combined = new Set([...prev, ...newOpenSubmenus]);
      return combined;
    });
    setOpenNestedSubmenus((prev) => {
      const combined = new Set([...prev, ...newOpenNestedSubmenus]);
      return combined;
    });
  }, [pathname, isActive, showAdminPanel]);

  // Update heights when menus open/close with improved calculation
  useEffect(() => {
    const newHeights: Record<string, number> = {};
    
    // Use a small delay to ensure DOM is fully updated
    const timeoutId = setTimeout(() => {
      openSubmenus.forEach((key) => {
        if (subMenuRefs.current[key]) {
          const element = subMenuRefs.current[key];
          if (element) {
            // Temporarily set max-height to auto to get true height
            const originalMaxHeight = element.style.maxHeight;
            element.style.maxHeight = 'none';
            const height = element.scrollHeight;
            element.style.maxHeight = originalMaxHeight;
            newHeights[key] = height;
          }
        }
      });
      setSubMenuHeights(newHeights);
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [openSubmenus]);

  useEffect(() => {
    const newHeights: Record<string, number> = {};
    
    // Use a small delay to ensure DOM is fully updated
    const timeoutId = setTimeout(() => {
      openNestedSubmenus.forEach((key) => {
        if (nestedSubMenuRefs.current[key]) {
          const element = nestedSubMenuRefs.current[key];
          if (element) {
            // Temporarily set max-height to auto to get true height
            const originalMaxHeight = element.style.maxHeight;
            element.style.maxHeight = 'none';
            const height = element.scrollHeight;
            element.style.maxHeight = originalMaxHeight;
            newHeights[key] = height;
          }
        }
      });
      setNestedSubMenuHeights(newHeights);
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [openNestedSubmenus]);

  const handleSubmenuToggle = (
    index: number,
    menuType: "main" | "support" | "others" | "templates"
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
    menuType: "main" | "support" | "others" | "templates",
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

  const renderMenuItems = (
    navItems: NavItem[],
    menuType: "main" | "support" | "others" | "templates"
  ) => (
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
                ref={(el) => {
                  subMenuRefs.current[submenuKey] = el;
                }}
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  isSubmenuOpen ? "opacity-100" : "opacity-0"
                }`}
                style={{
                  maxHeight: isSubmenuOpen ? `${subMenuHeights[submenuKey] || 200}px` : "0px",
                  transition: "max-height 0.3s ease-in-out, opacity 0.2s ease-in-out",
                }}
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
                                ref={(el) => {
                                  nestedSubMenuRefs.current[nestedSubmenuKey] = el;
                                }}
                                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                                  isNestedSubmenuOpen ? "opacity-100" : "opacity-0"
                                }`}
                                style={{
                                  maxHeight: isNestedSubmenuOpen ? `${nestedSubMenuHeights[nestedSubmenuKey] || 150}px` : "0px",
                                  transition: "max-height 0.3s ease-in-out, opacity 0.2s ease-in-out",
                                }}
                              >
                                <ul className="ml-4 mt-1 space-y-1">
                                  {subItem.subItems.map((nestedItem) => (
                                    <li key={nestedItem.name}>
                                      <Link
                                        href={nestedItem.path}
                                        className={`flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ${
                                          isActive(nestedItem.path)
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
                            className={`flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ${
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

  return (
    <aside
      className={`fixed flex flex-col xl:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-full transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
        ${
          isExpanded || isMobileOpen
            ? "w-[290px]"
            : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        xl:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-8 flex  ${
          !isExpanded && !isHovered ? "xl:justify-center" : "justify-start"
        }`}
      >
        <Link href="/admin">
          {isExpanded || isHovered || isMobileOpen ? (
            <div className="flex items-center gap-2">
              <Image
                src="/images/logo/logo-icon.svg"
                alt="Logo"
                width={32}
                height={32}
              />
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                Blog Writer:
              </span>
            </div>
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
                {renderMenuItems(adminPanelItems, "main")}
              </div>
            )}
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;