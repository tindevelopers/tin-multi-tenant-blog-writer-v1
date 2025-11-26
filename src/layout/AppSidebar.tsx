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
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  BarChart, 
  FolderOpen, 
  Globe, 
  CalendarDays, 
  Image as ImageIcon, 
  TrendingUp, 
  Target,
  Settings,
  ListOrdered,
  CheckCircle,
  Building2,
  Plug,
  FileClock,
  Shield,
  History,
  Layers2,
  Search
} from "lucide-react";

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
    icon?: React.ReactNode;
    subItems?: { 
      name: string; 
      path?: string; 
      pro?: boolean; 
      new?: boolean; 
      icon?: React.ReactNode;
      isAccordionHeader?: boolean;
      subItems?: { name: string; path: string; pro?: boolean; new?: boolean; icon?: React.ReactNode }[];
    }[];
  }[];
};

// Blog Writer specific navigation items
const blogWriterItems: NavItem[] = [
  {
    name: "Blog Writer",
    icon: <span className="w-5 h-5 flex items-center justify-center text-xs font-bold bg-blue-500 text-white rounded">B</span>,
    new: true,
    subItems: [
      { 
        name: "Dashboard", 
        path: "/admin",
        icon: <LayoutDashboard className="w-4 h-4" />
      },
      { 
        name: "SEO Tools", 
        icon: <Target className="w-4 h-4" />,
        pro: true,
        new: true,
        isAccordionHeader: true,
        subItems: [
          { name: "Keyword Research", path: "/seo", icon: <Search className="w-4 h-4" />, new: true },
          { name: "Saved Searches", path: "/seo/saved-searches", icon: <History className="w-4 h-4" />, new: true },
          { name: "Content Clusters", path: "/seo/content-clusters", icon: <Layers2 className="w-4 h-4" />, new: true },
        ]
      },
      { 
        name: "Content Management", 
        icon: <FileText className="w-4 h-4" />,
        isAccordionHeader: true,
        new: true,
        subItems: [
          { name: "Drafts", path: "/admin/drafts", icon: <FolderOpen className="w-4 h-4" />, new: true },
          { name: "Templates", path: "/admin/templates", icon: <FileText className="w-4 h-4" />, new: true },
          { name: "Publishing", path: "/admin/publishing", icon: <Globe className="w-4 h-4" />, new: true },
          { name: "Blog Queue", path: "/admin/blog-queue", icon: <FileClock className="w-4 h-4" />, new: true },
        ]
      },
      { 
        name: "Team & Collaboration", 
        icon: <Users className="w-4 h-4" />,
        isAccordionHeader: true,
        new: true,
        subItems: [
          { name: "Team", path: "/admin/team", icon: <Users className="w-4 h-4" />, new: true },
          { name: "Media", path: "/admin/media", icon: <ImageIcon className="w-4 h-4" />, new: true },
        ]
      },
      { 
        name: "Settings", 
        icon: <Settings className="w-4 h-4" />,
        isAccordionHeader: true,
        new: true,
        subItems: [
          { name: "Content Prompts", path: "/admin/settings/content-prompts", icon: <Target className="w-4 h-4" />, new: true },
        ]
      },
      { 
        name: "Analytics & Insights", 
        icon: <BarChart className="w-4 h-4" />,
        isAccordionHeader: true,
        pro: true,
        subItems: [
          { name: "Analytics", path: "/admin/analytics", icon: <TrendingUp className="w-4 h-4" />, pro: true },
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
      { name: "Admin Dashboard", path: "/admin/panel", icon: <LayoutDashboard className="w-4 h-4" /> },
      { name: "User Management", path: "/admin/panel/users", icon: <Users className="w-4 h-4" /> },
      { name: "Organizations", path: "/admin/panel/organizations", icon: <Building2 className="w-4 h-4" /> },
      { name: "Integrations", path: "/admin/panel/integrations", icon: <Plug className="w-4 h-4" /> },
      { name: "Usage Logs", path: "/admin/panel/usage-logs", icon: <FileClock className="w-4 h-4" /> },
      { name: "System Settings", path: "/admin/panel/system-settings", icon: <Settings className="w-4 h-4" /> },
    ],
  },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();

  // Smart state management with auto-expand and persistence
  // Default Blog Writer menu to open
  const [openSubmenus, setOpenSubmenus] = useState<Set<string>>(new Set(['templates-0']));
  const [openNestedSubmenus, setOpenNestedSubmenus] = useState<Set<string>>(new Set());
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  // Load persisted state from localStorage, default Blog Writer menu to open
  useEffect(() => {
    const savedOpenSubmenus = localStorage.getItem('sidebar-open-submenus');
    const savedOpenNestedSubmenus = localStorage.getItem('sidebar-open-nested-submenus');
    
    if (savedOpenSubmenus) {
      try {
        const parsed = new Set<string>(JSON.parse(savedOpenSubmenus) as string[]);
        // Ensure Blog Writer menu (templates-0) is always open
        parsed.add('templates-0');
        setOpenSubmenus(parsed);
      } catch (e) {
        console.warn('Failed to parse saved open submenus:', e);
        // Default Blog Writer menu to open
        setOpenSubmenus(new Set(['templates-0']));
      }
    } else {
      // Default Blog Writer menu to open if no saved state
      setOpenSubmenus(new Set(['templates-0']));
    }
    
    if (savedOpenNestedSubmenus) {
      try {
        setOpenNestedSubmenus(new Set(JSON.parse(savedOpenNestedSubmenus)));
      } catch (e) {
        console.warn('Failed to parse saved open nested submenus:', e);
      }
    }
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('sidebar-open-submenus', JSON.stringify(Array.from(openSubmenus)));
  }, [openSubmenus]);

  useEffect(() => {
    localStorage.setItem('sidebar-open-nested-submenus', JSON.stringify(Array.from(openNestedSubmenus)));
  }, [openNestedSubmenus]);

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

  // Smart auto-expand logic - automatically open accordions for active routes
  useEffect(() => {
    const newOpenSubmenus = new Set(openSubmenus);
    const newOpenNestedSubmenus = new Set(openNestedSubmenus);
    let hasChanges = false;

    // Check Blog Writer items for active routes
    blogWriterItems.forEach((nav, index) => {
      if (nav.subItems) {
        let shouldOpenMain = false;
        
        nav.subItems.forEach((subItem, subIndex) => {
          // Check direct path matches
          if (subItem.path && isActive(subItem.path)) {
            newOpenSubmenus.add(`templates-${index}`);
            shouldOpenMain = true;
          }
          
          // Check nested accordion headers
          if (subItem.isAccordionHeader && subItem.subItems) {
            const accordionKey = `templates-${index}-${subIndex}`;
            
            subItem.subItems.forEach((nestedItem) => {
              if (nestedItem.path && isActive(nestedItem.path)) {
                // Open the main Blog Writer menu
                newOpenSubmenus.add(`templates-${index}`);
                // Open the specific accordion (Analytics & SEO, Content Management, etc.)
                newOpenNestedSubmenus.add(accordionKey);
                shouldOpenMain = true;
              }
            });
          }
        });
        
        // If any submenu is active, ensure main menu stays open
        if (shouldOpenMain) {
          newOpenSubmenus.add(`templates-${index}`);
        }
      }
    });

    // Check Admin Panel items for active routes
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

    // Update state only if there are changes
    if (newOpenSubmenus.size !== openSubmenus.size || 
        !Array.from(newOpenSubmenus).every(item => openSubmenus.has(item))) {
      setOpenSubmenus(newOpenSubmenus);
      hasChanges = true;
    }

    if (newOpenNestedSubmenus.size !== openNestedSubmenus.size || 
        !Array.from(newOpenNestedSubmenus).every(item => openNestedSubmenus.has(item))) {
      setOpenNestedSubmenus(newOpenNestedSubmenus);
      hasChanges = true;
    }

    if (hasChanges) {
      console.log('🎯 Auto-expanded menus for pathname:', pathname, {
        openSubmenus: Array.from(newOpenSubmenus),
        openNestedSubmenus: Array.from(newOpenNestedSubmenus)
      });
    }
  }, [pathname, showAdminPanel]);

  // Smart toggle functions that work with auto-expand
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
                    } ${!isExpanded && !isHovered ? "lg:hidden" : ""}`}
                  >
                    {nav.name}
                  </span>
                  {nav.new && (
                    <span className={`bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full dark:bg-green-900 dark:text-green-300 ${!isExpanded && !isHovered ? "lg:hidden" : ""}`}>
                      NEW
                    </span>
                  )}
                  <ChevronDownIcon
                    className={`transition-transform duration-200 ${
                      isSubmenuOpen ? "rotate-180" : ""
                    } ${!isExpanded && !isHovered ? "lg:hidden" : ""}`}
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
                    } ${!isExpanded && !isHovered ? "lg:hidden" : ""}`}
                  >
                    {nav.name}
                  </span>
                  {nav.new && (
                    <span className={`bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full dark:bg-green-900 dark:text-green-300 ${!isExpanded && !isHovered ? "lg:hidden" : ""}`}>
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
                                  {subItem.icon && (
                                    <span className={`${isNestedSubmenuOpen ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"}`}>
                                      {subItem.icon}
                                    </span>
                                  )}
                                  <span className={!isExpanded && !isHovered ? "lg:hidden" : ""}>
                                    {subItem.name}
                                  </span>
                                  {subItem.new && (
                                    <span className={`bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full dark:bg-green-900 dark:text-green-300 ${!isExpanded && !isHovered ? "lg:hidden" : ""}`}>
                                      NEW
                                    </span>
                                  )}
                                </span>
                                <ChevronDownIcon
                                  className={`w-4 h-4 transition-transform duration-200 ${
                                    isNestedSubmenuOpen ? "rotate-180" : ""
                                  } ${!isExpanded && !isHovered ? "lg:hidden" : ""}`}
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
                                            {nestedItem.icon && (
                                              <span className={`${isActive(nestedItem.path || "") ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"}`}>
                                                {nestedItem.icon}
                                              </span>
                                            )}
                                            <span className={!isExpanded && !isHovered ? "lg:hidden" : ""}>
                                              {nestedItem.name}
                                            </span>
                                            {nestedItem.new && (
                                              <span className={`bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full dark:bg-green-900 dark:text-green-300 ${!isExpanded && !isHovered ? "lg:hidden" : ""}`}>
                                                NEW
                                              </span>
                                            )}
                                            {nestedItem.pro && (
                                              <span className={`bg-purple-100 text-purple-800 text-xs font-medium px-2 py-1 rounded-full dark:bg-purple-900 dark:text-purple-300 ${!isExpanded && !isHovered ? "lg:hidden" : ""}`}>
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
                                {subItem.icon && (
                                  <span className={`${isActive(subItem.path || "") ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"}`}>
                                    {subItem.icon}
                                  </span>
                                )}
                                <span className={!isExpanded && !isHovered ? "lg:hidden" : ""}>
                                  {subItem.name}
                                </span>
                                {subItem.new && (
                                  <span className={`bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full dark:bg-green-900 dark:text-green-300 ${!isExpanded && !isHovered ? "lg:hidden" : ""}`}>
                                    NEW
                                  </span>
                                )}
                                {subItem.pro && (
                                  <span className={`bg-purple-100 text-purple-800 text-xs font-medium px-2 py-1 rounded-full dark:bg-purple-900 dark:text-purple-300 ${!isExpanded && !isHovered ? "lg:hidden" : ""}`}>
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
                      ? "xl:justify-center lg:hidden"
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
                        ? "xl:justify-center lg:hidden"
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