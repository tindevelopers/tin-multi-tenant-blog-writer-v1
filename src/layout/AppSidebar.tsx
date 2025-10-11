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

  const renderMenuItems = (
    navItems: NavItem[],
    menuType: "main" | "support" | "others" | "templates"
  ) => (
    <ul className="flex flex-col gap-1">
      {navItems.map((nav, index) => (
        <li key={nav.name}>
          {nav.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(index, menuType)}
              className={`menu-item group  ${
                openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? "menu-item-active"
                  : "menu-item-inactive"
              } cursor-pointer ${
                !isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "lg:justify-start"
              }`}
            >
              <span
                className={` ${
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                }`}
              >
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className={`menu-item-text`}>{nav.name}</span>
              )}
              {nav.new && (isExpanded || isHovered || isMobileOpen) && (
                <span
                  className={`ml-auto absolute right-10 ${
                    openSubmenu?.type === menuType &&
                    openSubmenu?.index === index
                      ? "menu-dropdown-badge-active"
                      : "menu-dropdown-badge-inactive"
                  } menu-dropdown-badge`}
                >
                  new
                </span>
              )}
              {(isExpanded || isHovered || isMobileOpen) && nav.subItems && (
                <ChevronDownIcon
                  className={`ml-auto w-5 h-5 transition-transform duration-200  ${
                    openSubmenu?.type === menuType &&
                    openSubmenu?.index === index
                      ? "rotate-180 text-brand-500"
                      : ""
                  }`}
                />
              )}
            </button>
          ) : (
            nav.path && (
              <Link
                href={nav.path}
                className={`menu-item group ${
                  isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                }`}
              >
                <span
                  className={`${
                    isActive(nav.path)
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive"
                  }`}
                >
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className={`menu-item-text`}>{nav.name}</span>
                )}
              </Link>
            )
          )}
          {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
            <div
              ref={(el) => {
                subMenuRefs.current[`${menuType}-${index}`] = el;
              }}
              className="overflow-hidden transition-all duration-300"
              style={{
                height:
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? `${subMenuHeight[`${menuType}-${index}`]}px`
                    : "0px",
              }}
            >
              <ul className="mt-2 space-y-1 ml-9">
                {nav.subItems.map((subItem, subIndex) => (
                  <li key={subItem.name}>
                    {subItem.isAccordionHeader ? (
                      // Accordion header button
                      <button
                        onClick={() => handleNestedSubmenuToggle(subIndex, menuType, index)}
                        className={`menu-dropdown-item group cursor-pointer justify-start ${
                          openNestedSubmenu?.type === menuType && 
                          openNestedSubmenu?.index === index && 
                          openNestedSubmenu?.subIndex === subIndex
                            ? "menu-dropdown-item-active"
                            : "menu-dropdown-item-inactive"
                        }`}
                      >
                        <span className="flex items-center gap-1">
                          {subItem.name}
                          {subItem.new && (
                            <span className="menu-dropdown-badge">new</span>
                          )}
                        </span>
                        <ChevronDownIcon
                          className={`ml-auto w-4 h-4 transition-transform duration-200 ${
                            openNestedSubmenu?.type === menuType && 
                            openNestedSubmenu?.index === index && 
                            openNestedSubmenu?.subIndex === subIndex
                              ? "rotate-180 text-brand-500"
                              : ""
                          }`}
                        />
                      </button>
                    ) : (
                      // Regular link
                      <Link
                        href={subItem.path || '#'}
                        className={`menu-dropdown-item ${
                          isActive(subItem.path || '')
                            ? "menu-dropdown-item-active"
                            : "menu-dropdown-item-inactive"
                        }`}
                      >
                        {subItem.name}
                        <span className="flex items-center gap-1 ml-auto">
                          {subItem.new && (
                            <span
                              className={`ml-auto ${
                                isActive(subItem.path || '')
                                  ? "menu-dropdown-badge-active"
                                  : "menu-dropdown-badge-inactive"
                              } menu-dropdown-badge `}
                            >
                              new
                            </span>
                          )}
                          {subItem.pro && (
                            <span
                              className={`ml-auto ${
                                isActive(subItem.path || '')
                                  ? "menu-dropdown-badge-pro-active"
                                  : "menu-dropdown-badge-pro-inactive"
                              } menu-dropdown-badge-pro `}
                            >
                              pro
                            </span>
                          )}
                        </span>
                      </Link>
                    )}
                    
                    {/* Render nested subItems if this is an accordion header */}
                    {subItem.isAccordionHeader && subItem.subItems && (
                      <div
                        ref={(el) => {
                          nestedSubMenuRefs.current[`${menuType}-${index}-${subIndex}`] = el;
                        }}
                        className="overflow-hidden transition-all duration-300"
                        style={{
                          height:
                            openNestedSubmenu?.type === menuType && 
                            openNestedSubmenu?.index === index && 
                            openNestedSubmenu?.subIndex === subIndex
                              ? `${nestedSubMenuHeight[`${menuType}-${index}-${subIndex}`]}px`
                              : "0px",
                        }}
                      >
                        <ul className="mt-2 space-y-1 ml-6">
                          {subItem.subItems.map((nestedItem) => (
                            <li key={nestedItem.name}>
                              <Link
                                href={nestedItem.path}
                                className={`menu-dropdown-item ${
                                  isActive(nestedItem.path)
                                    ? "menu-dropdown-item-active"
                                    : "menu-dropdown-item-inactive"
                                }`}
                              >
                                {nestedItem.name}
                                <span className="flex items-center gap-1 ml-auto">
                                  {nestedItem.new && (
                                    <span
                                      className={`ml-auto ${
                                        isActive(nestedItem.path)
                                          ? "menu-dropdown-badge-active"
                                          : "menu-dropdown-badge-inactive"
                                      } menu-dropdown-badge `}
                                    >
                                      new
                                    </span>
                                  )}
                                  {nestedItem.pro && (
                                    <span
                                      className={`ml-auto ${
                                        isActive(nestedItem.path)
                                          ? "menu-dropdown-badge-pro-active"
                                          : "menu-dropdown-badge-pro-inactive"
                                      } menu-dropdown-badge-pro `}
                                    >
                                      pro
                                    </span>
                                  )}
                                </span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main" | "support" | "others" | "templates";
    index: number;
  } | null>(null);
  const [openNestedSubmenu, setOpenNestedSubmenu] = useState<{
    type: "main" | "support" | "others" | "templates";
    index: number;
    subIndex: number;
  } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>(
    {}
  );
  const [nestedSubMenuHeight, setNestedSubMenuHeight] = useState<Record<string, number>>(
    {}
  );
  const [userClosedSubmenu, setUserClosedSubmenu] = useState(false);
  const [userClosedNestedSubmenu, setUserClosedNestedSubmenu] = useState(false);
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const nestedSubMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const isActive = useCallback((path: string) => path === pathname, [pathname]);

  useEffect(() => {
    // Only auto-open submenus if user hasn't manually closed one
    if (userClosedSubmenu) {
      return;
    }

    // Check if the current path matches any submenu item
    let submenuMatched = false;
    
    // Check Blog Writer template navigation items
    if (!submenuMatched) {
      blogWriterItems.forEach((nav, index) => {
        if (nav.subItems) {
          nav.subItems.forEach((subItem, subIndex) => {
            // Check direct path matches
            if (subItem.path && isActive(subItem.path)) {
              setOpenSubmenu({
                type: "templates",
                index,
              });
              submenuMatched = true;
            }
            // Check nested subItems for accordion headers
            if (subItem.subItems && subItem.isAccordionHeader) {
              subItem.subItems.forEach((nestedItem) => {
                if (isActive(nestedItem.path)) {
                  setOpenSubmenu({
                    type: "templates",
                    index,
                  });
                  setOpenNestedSubmenu({
                    type: "templates",
                    index,
                    subIndex,
                  });
                  submenuMatched = true;
                }
              });
            }
          });
        }
      });
    }

    // If no submenu item matches, close the open submenu
    if (!submenuMatched) {
      setOpenSubmenu(null);
    }
  }, [pathname, isActive, userClosedSubmenu, userClosedNestedSubmenu]);

  useEffect(() => {
    // Set the height of the submenu items when the submenu is opened
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  useEffect(() => {
    if (openNestedSubmenu !== null) {
      const key = `${openNestedSubmenu.type}-${openNestedSubmenu.index}-${openNestedSubmenu.subIndex}`;
      if (nestedSubMenuRefs.current[key]) {
        setNestedSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: nestedSubMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openNestedSubmenu]);

  const handleSubmenuToggle = (
    index: number,
    menuType: "main" | "support" | "others" | "templates"
  ) => {
    setOpenSubmenu((prevOpenSubmenu) => {
      if (
        prevOpenSubmenu &&
        prevOpenSubmenu.type === menuType &&
        prevOpenSubmenu.index === index
      ) {
        // User is closing the submenu
        setUserClosedSubmenu(true);
        return null;
      }
      // User is opening a submenu
      setUserClosedSubmenu(false);
      return { type: menuType, index };
    });
  };

  const handleNestedSubmenuToggle = (
    subIndex: number,
    menuType: "main" | "support" | "others" | "templates",
    parentIndex: number
  ) => {
    setOpenNestedSubmenu((prevOpenNestedSubmenu) => {
      if (
        prevOpenNestedSubmenu &&
        prevOpenNestedSubmenu.type === menuType &&
        prevOpenNestedSubmenu.index === parentIndex &&
        prevOpenNestedSubmenu.subIndex === subIndex
      ) {
        // User is closing the nested submenu
        setUserClosedNestedSubmenu(true);
        return null;
      }
      // User is opening a nested submenu
      setUserClosedNestedSubmenu(false);
      return { type: menuType, index: parentIndex, subIndex };
    });
  };

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