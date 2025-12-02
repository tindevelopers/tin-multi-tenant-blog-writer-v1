export const NEW_BADGE_STORAGE_KEY = "sidebar-new-badge-overrides";
export const DEFAULT_RELEASE_DATE = "2025-11-25";
export const NEW_BADGE_DURATION_DAYS = 30;

export const getMenuItemKey = (path?: string, name?: string) => {
  if (path) return path;
  if (!name) return "";
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

export type MenuNewControlItem = {
  key: string;
  label: string;
  group: string;
  description?: string;
};

export const MENU_NEW_CONTROL_ITEMS: MenuNewControlItem[] = [
  { key: getMenuItemKey(undefined, "Blog Writer"), label: "Blog Writer (section)", group: "Sections" },
  { key: getMenuItemKey("/admin", "Dashboard"), label: "Dashboard", group: "Blog Writer" },
  { key: getMenuItemKey(undefined, "SEO Tools"), label: "SEO Tools (section)", group: "Blog Writer" },
  { key: getMenuItemKey("/seo", "Keyword Research"), label: "Keyword Research", group: "SEO Tools" },
  { key: getMenuItemKey("/seo?tab=keyword-results", "Keyword Results"), label: "Keyword Results", group: "SEO Tools" },
  { key: getMenuItemKey("/seo/saved-searches", "Saved Searches"), label: "Saved Searches", group: "SEO Tools" },
  { key: getMenuItemKey("/seo/content-clusters", "Content Clusters"), label: "Content Clusters", group: "SEO Tools" },
  { key: getMenuItemKey(undefined, "Content Management"), label: "Content Management (section)", group: "Blog Writer" },
  { key: getMenuItemKey("/contentmanagement/drafts", "Drafts"), label: "Drafts", group: "Content Management" },
  { key: getMenuItemKey("/contentmanagement/content-ideas", "Content Ideas"), label: "Content Ideas", group: "Content Management" },
  { key: getMenuItemKey("/contentmanagement/templates", "Templates"), label: "Templates", group: "Content Management" },
  { key: getMenuItemKey("/contentmanagement/publishing", "Publishing"), label: "Publishing", group: "Content Management" },
  { key: getMenuItemKey("/contentmanagement/blog-queue", "Blog Queue"), label: "Blog Queue", group: "Content Management" },
  { key: getMenuItemKey(undefined, "Team & Collaboration"), label: "Team & Collaboration (section)", group: "Blog Writer" },
  { key: getMenuItemKey("/admin/team", "Team"), label: "Team", group: "Team & Collaboration" },
  { key: getMenuItemKey("/contentmanagement/media", "Media"), label: "Media", group: "Team & Collaboration" },
  { key: getMenuItemKey(undefined, "Settings"), label: "Settings (section)", group: "Blog Writer" },
  { key: getMenuItemKey("/admin/settings/content-prompts", "Content Prompts"), label: "Content Prompts", group: "Settings" },
  { key: getMenuItemKey(undefined, "Analytics & Insights"), label: "Analytics & Insights (section)", group: "Blog Writer" },
  { key: getMenuItemKey(undefined, "Admin Panel"), label: "Admin Panel (section)", group: "Sections" },
  { key: getMenuItemKey("/admin/panel", "Admin Dashboard"), label: "Admin Dashboard", group: "Admin Panel" },
  { key: getMenuItemKey("/admin/panel/users", "User Management"), label: "User Management", group: "Admin Panel" },
  { key: getMenuItemKey("/admin/panel/organizations", "Organizations"), label: "Organizations", group: "Admin Panel" },
  { key: getMenuItemKey("/admin/panel/integrations", "Integrations"), label: "Integrations", group: "Admin Panel" },
  { key: getMenuItemKey("/admin/panel/usage-logs", "Usage Logs"), label: "Usage Logs", group: "Admin Panel" },
  { key: getMenuItemKey("/admin/panel/system-settings", "System Settings"), label: "System Settings", group: "Admin Panel" },
];

