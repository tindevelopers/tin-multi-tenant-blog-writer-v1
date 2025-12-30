"use client";
import React, { useEffect, useRef, useCallback, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import { createClient } from "@/lib/supabase/client";
import { 
  DEFAULT_RELEASE_DATE, 
  NEW_BADGE_DURATION_DAYS, 
  NEW_BADGE_STORAGE_KEY, 
  getMenuItemKey 
} from "@/utils/sidebarNewBadgeUtils";
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
  Search,
  Zap,
  Code2,
  Sparkles
} from "lucide-react";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  releaseDate?: string;
  subItems?: { 
    name: string; 
    path?: string; 
    pro?: boolean; 
    releaseDate?: string;
    isAccordionHeader?: boolean;
    icon?: React.ReactNode;
    subItems?: { 
      name: string; 
      path?: string; 
      pro?: boolean; 
      releaseDate?: string; 
      icon?: React.ReactNode;
      isAccordionHeader?: boolean;
      subItems?: { name: string; path: string; pro?: boolean; releaseDate?: string; icon?: React.ReactNode }[];
    }[];
  }[];
};

const shouldShowNewBadge = (releaseDate?: string) => {
  if (!releaseDate) return false;
  const parsedDate = new Date(releaseDate);
  if (Number.isNaN(parsedDate.getTime())) return false;
  const now = new Date();
  const diffInMs = now.getTime() - parsedDate.getTime();
  return diffInMs <= NEW_BADGE_DURATION_DAYS * 24 * 60 * 60 * 1000;
};

// Blog Writer specific navigation items
const blogWriterItems: NavItem[] = [
  {
    name: "Blog Writer",
    icon: <span className="w-5 h-5 flex items-center justify-center text-xs font-bold bg-blue-500 text-white rounded">B</span>,
    releaseDate: DEFAULT_RELEASE_DATE,
    subItems: [
      { 
        name: "Dashboard", 
        path: "/admin",
        icon: <LayoutDashboard className="w-4 h-4" />,
        releaseDate: DEFAULT_RELEASE_DATE,
      },
      { 
        name: "SEO Tools", 
        icon: <Target className="w-4 h-4" />,
        pro: true,
        releaseDate: DEFAULT_RELEASE_DATE,
        isAccordionHeader: true,
        subItems: [
          { name: "Keyword Research", path: "/seo", icon: <Search className="w-4 h-4" />, releaseDate: DEFAULT_RELEASE_DATE },
          { name: "Keyword Results", path: "/seo?tab=keyword-results", icon: <TrendingUp className="w-4 h-4" />, releaseDate: DEFAULT_RELEASE_DATE },
          { name: "Saved Searches", path: "/seo/saved-searches", icon: <History className="w-4 h-4" />, releaseDate: DEFAULT_RELEASE_DATE },
          { name: "Content Clusters", path: "/seo/content-clusters", icon: <Layers2 className="w-4 h-4" />, releaseDate: DEFAULT_RELEASE_DATE },
        ]
      },
      { 
        name: "Content Management", 
        icon: <FileText className="w-4 h-4" />,
        isAccordionHeader: true,
        releaseDate: DEFAULT_RELEASE_DATE,
        subItems: [
          { name: "Drafts", path: "/contentmanagement/drafts", icon: <FolderOpen className="w-4 h-4" />, releaseDate: DEFAULT_RELEASE_DATE },
          { name: "Content Ideas", path: "/contentmanagement/content-ideas", icon: <Target className="w-4 h-4" />, releaseDate: DEFAULT_RELEASE_DATE },
          { name: "Templates", path: "/contentmanagement/templates", icon: <FileText className="w-4 h-4" />, releaseDate: DEFAULT_RELEASE_DATE },
          { name: "Publishing", path: "/contentmanagement/publishing", icon: <Globe className="w-4 h-4" />, releaseDate: DEFAULT_RELEASE_DATE },
          { name: "Blog Queue", path: "/contentmanagement/blog-queue", icon: <FileClock className="w-4 h-4" />, releaseDate: DEFAULT_RELEASE_DATE },
        ]
      },
      { 
        name: "Team & Collaboration", 
        icon: <Users className="w-4 h-4" />,
        isAccordionHeader: true,
        releaseDate: DEFAULT_RELEASE_DATE,
        subItems: [
          { name: "Team", path: "/admin/team", icon: <Users className="w-4 h-4" />, releaseDate: DEFAULT_RELEASE_DATE },
          { name: "Media", path: "/contentmanagement/media", icon: <ImageIcon className="w-4 h-4" />, releaseDate: DEFAULT_RELEASE_DATE },
        ]
      },
      { 
        name: "Optimization", 
        icon: <Zap className="w-4 h-4" />,
        isAccordionHeader: true,
        releaseDate: DEFAULT_RELEASE_DATE,
        subItems: [
          { name: "Webflow SEO", path: "/optimization/webflow", icon: <Globe className="w-4 h-4" />, releaseDate: DEFAULT_RELEASE_DATE },
          { name: "WordPress SEO", path: "/optimization/wordpress", icon: <FileText className="w-4 h-4" />, releaseDate: DEFAULT_RELEASE_DATE },
          { name: "Content Quality", path: "/optimization/content-quality", icon: <Sparkles className="w-4 h-4" />, releaseDate: DEFAULT_RELEASE_DATE },
          { name: "Schema Markup", path: "/optimization/schema", icon: <Code2 className="w-4 h-4" />, releaseDate: DEFAULT_RELEASE_DATE },
          { name: "Image Alt Text", path: "/optimization/images", icon: <ImageIcon className="w-4 h-4" />, releaseDate: DEFAULT_RELEASE_DATE },
        ]
      },
      { 
        name: "Settings", 
        icon: <Settings className="w-4 h-4" />,
        isAccordionHeader: true,
        releaseDate: DEFAULT_RELEASE_DATE,
        subItems: [
          { name: "Content Prompts", path: "/admin/settings/content-prompts", icon: <Target className="w-4 h-4" />, releaseDate: DEFAULT_RELEASE_DATE },
          { name: "Workflow Instructions", path: "/contentmanagement/settings/workflow-instructions", icon: <Settings className="w-4 h-4" />, releaseDate: DEFAULT_RELEASE_DATE },
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
    releaseDate: DEFAULT_RELEASE_DATE,
    subItems: [
      { name: "Admin Dashboard", path: "/admin/panel", icon: <LayoutDashboard className="w-4 h-4" />, releaseDate: DEFAULT_RELEASE_DATE },
      { name: "User Management", path: "/admin/panel/users", icon: <Users className="w-4 h-4" />, releaseDate: DEFAULT_RELEASE_DATE },
      { name: "Organizations", path: "/admin/panel/organizations", icon: <Building2 className="w-4 h-4" />, releaseDate: DEFAULT_RELEASE_DATE },
      { name: "Integrations", path: "/admin/panel/integrations", icon: <Plug className="w-4 h-4" />, releaseDate: DEFAULT_RELEASE_DATE },
      { name: "Usage Logs", path: "/admin/panel/usage-logs", icon: <FileClock className="w-4 h-4" />, releaseDate: DEFAULT_RELEASE_DATE },
      { name: "System Settings", path: "/admin/panel/system-settings", icon: <Settings className="w-4 h-4" />, releaseDate: DEFAULT_RELEASE_DATE },
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
  const [newBadgeOverrides, setNewBadgeOverrides] = useState<Record<string, boolean>>({});
  const [logoSquareUrl, setLogoSquareUrl] = useState<string | null>(null);
  const [logoWideUrl, setLogoWideUrl] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string | null>(null);

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

  useEffect(() => {
    const loadOverrides = () => {
      try {
        const stored = localStorage.getItem(NEW_BADGE_STORAGE_KEY);
        setNewBadgeOverrides(stored ? JSON.parse(stored) : {});
      } catch (error) {
        console.warn('Failed to load sidebar new badge overrides:', error);
      }
    };

    if (typeof window !== 'undefined') {
      loadOverrides();
      const handleStorage = (event: StorageEvent) => {
        if (event.key === NEW_BADGE_STORAGE_KEY) {
          loadOverrides();
        }
      };
      const handleCustomUpdate = () => loadOverrides();

      window.addEventListener('storage', handleStorage);
      window.addEventListener('sidebar-new-badge-overrides-updated', handleCustomUpdate);

      return () => {
        window.removeEventListener('storage', handleStorage);
        window.removeEventListener('sidebar-new-badge-overrides-updated', handleCustomUpdate);
      };
    }
  }, []);

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

  // Load tenant branding (logo/wordmark) from Supabase storage via organizations table
  useEffect(() => {
    const loadBranding = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const normalizeLogoUrl = (raw: string | null | undefined) => {
          const trimmed = raw?.trim();
          if (!trimmed) return null;
          if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:")) {
            return trimmed;
          }
          const { data } = supabase.storage.from("organization-logos").getPublicUrl(trimmed);
          return data?.publicUrl || trimmed;
        };

        const { data: profile } = await supabase
          .from("users")
          .select("org_id")
          .eq("user_id", user.id)
          .single();

        const orgId = profile?.org_id;
        if (!orgId) return;

        const { data: org, error: orgError } = await supabase
          .from("organizations")
          .select("name, settings")
          .eq("org_id", orgId)
          .single();

        if (orgError) {
          console.warn("Failed to load organization branding", orgError.message);
          return;
        }

        if (org) {
          const settings = (org.settings as any) || {};
          
          // Load both logo types separately
          const squareRaw = settings.logo_square_url || settings.logo_url || null;
          const wideRaw = settings.logo_wide_url || null;

          setLogoSquareUrl(normalizeLogoUrl(squareRaw));
          setLogoWideUrl(normalizeLogoUrl(wideRaw));
          setOrgName(org.name || null);
        }
      } catch (error) {
        console.warn("Failed to load org branding", error);
      }
    };

    loadBranding();
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
          const navKey = getMenuItemKey(nav.path, nav.name);
          const navIsNew = !newBadgeOverrides[navKey] && shouldShowNewBadge(nav.releaseDate);
          
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
                  style={{ pointerEvents: 'auto' }}
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
                  {navIsNew && (
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
                  style={{ pointerEvents: 'auto' }}
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
                  {navIsNew && (
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
                      const subItemKey = getMenuItemKey(subItem.path, subItem.name);
                      const subItemIsNew = !newBadgeOverrides[subItemKey] && shouldShowNewBadge(subItem.releaseDate);
                      
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
                                style={{ pointerEvents: 'auto' }}
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
                                  {subItemIsNew && (
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
                                    {subItem.subItems.map((nestedItem) => {
                                      const nestedKey = getMenuItemKey(nestedItem.path, nestedItem.name);
                                      const nestedIsNew = !newBadgeOverrides[nestedKey] && shouldShowNewBadge(nestedItem.releaseDate);
                                      return (
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
                                          style={{ pointerEvents: 'auto' }}
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
                                            {nestedIsNew && (
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
                                    )})}
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
                              style={{ pointerEvents: 'auto' }}
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
                                {subItemIsNew && (
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
      className={`sidebar group fixed h-screen w-72 overflow-hidden bg-white shadow-lg transition-all duration-300 ease-in-out dark:bg-gray-900 lg:left-0 isolate ${
        isExpanded || isHovered || isMobileOpen
          ? "left-0"
          : "-left-72 lg:left-0 lg:w-20"
      }`}
      style={{ zIndex: 50 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between px-4 py-4">
          <Link
            href="/admin"
            className="flex items-center gap-2 min-w-0"
          >
            {/* Wide logo (wordmark): show alone, replaces logo + text */}
            {logoWideUrl && (isExpanded || isHovered || isMobileOpen) ? (
              <Image
                src={logoWideUrl}
                alt={orgName || "Logo"}
                width={150}
                height={40}
                className="object-contain max-h-10"
              />
            ) : (
              <>
                {/* Square logo + company name, or defaults */}
                <Image
                  src={logoSquareUrl || "/images/logo/logo-icon.svg"}
                  alt={orgName || "Logo"}
                  width={32}
                  height={32}
                  className="flex-shrink-0"
                />
                {(isExpanded || isHovered || isMobileOpen) && orgName && (
                  <span className="font-semibold text-gray-900 dark:text-white truncate text-sm">
                    {orgName}
                  </span>
                )}
              </>
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