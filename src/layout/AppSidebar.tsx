"use client";
import React, { useEffect, useRef, useCallback, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import {
  ChevronDownIcon,
  GridIcon,
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

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();

  // State management for menus - allow multiple open menus
  const [openSubmenus, setOpenSubmenus] = useState<Set<string>>(new Set());
  const [openNestedSubmenus, setOpenNestedSubmenus] = useState<Set<string>>(new Set());
  const [subMenuHeights, setSubMenuHeights] = useState<Record<string, number>>({});
  const [nestedSubMenuHeights, setNestedSubMenuHeights] = useState<Record<string, number>>({});
  
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const nestedSubMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const isActive = useCallback((path: string) => path === pathname, [pathname]);

  // Auto-open menus based on current path
  useEffect(() => {
    const newOpenSubmenus = new Set<string>();
    const newOpenNestedSubmenus = new Set<string>();
    
    // Check Blog Writer template navigation items
    blogWriterItems.forEach((nav, index) => {
      if (nav.subItems) {
        nav.subItems.forEach((subItem, subIndex) => {
          // Check direct path matches
          if (subItem.path && isActive(subItem.path)) {
            newOpenSubmenus.add(`templates-${index}`);
          }
          // Check nested subItems for accordion headers
          if (subItem.subItems && subItem.isAccordionHeader) {
            subItem.subItems.forEach((nestedItem) => {
              if (isActive(nestedItem.path)) {
                newOpenSubmenus.add(`templates-${index}`);
                newOpenNestedSubmenus.add(`templates-${index}-${subIndex}`);
              }
            });
          }
        });
      }
    });

    setOpenSubmenus(newOpenSubmenus);
    setOpenNestedSubmenus(newOpenNestedSubmenus);
  }, [pathname, isActive]);

  // Update heights when menus open/close
  useEffect(() => {
    const newHeights: Record<string, number> = {};
    openSubmenus.forEach((key) => {
      if (subMenuRefs.current[key]) {
        newHeights[key] = subMenuRefs.current[key]?.scrollHeight || 0;
      }
    });
    setSubMenuHeights(newHeights);
  }, [openSubmenus]);

  useEffect(() => {
    const newHeights: Record<string, number> = {};
    openNestedSubmenus.forEach((key) => {
      if (nestedSubMenuRefs.current[key]) {
        newHeights[key] = nestedSubMenuRefs.current[key]?.scrollHeight || 0;
      }
    });
    setNestedSubMenuHeights(newHeights);
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
                  isSubmenuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                }`}
                style={{
                  maxHeight: isSubmenuOpen ? `${subMenuHeights[submenuKey] || 200}px` : "0px",
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
                                  isNestedSubmenuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                                }`}
                                style={{
                                  maxHeight: isNestedSubmenuOpen ? `${nestedSubMenuHeights[nestedSubmenuKey] || 150}px` : "0px",
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
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;