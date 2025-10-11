export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          org_id: string;
          name: string;
          slug: string;
          subscription_tier: string;
          api_quota_monthly: number;
          api_quota_used: number;
          settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          org_id?: string;
          name: string;
          slug: string;
          subscription_tier?: string;
          api_quota_monthly?: number;
          api_quota_used?: number;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          org_id?: string;
          name?: string;
          slug?: string;
          subscription_tier?: string;
          api_quota_monthly?: number;
          api_quota_used?: number;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      users: {
        Row: {
          user_id: string;
          org_id: string;
          email: string;
          full_name: string | null;
          role: "owner" | "admin" | "editor" | "writer";
          permissions: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          org_id: string;
          email: string;
          full_name?: string | null;
          role?: "owner" | "admin" | "editor" | "writer";
          permissions?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          org_id?: string;
          email?: string;
          full_name?: string | null;
          role?: "owner" | "admin" | "editor" | "writer";
          permissions?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      blog_posts: {
        Row: {
          post_id: string;
          org_id: string;
          created_by: string | null;
          title: string;
          content: string | null;
          excerpt: string | null;
          status: "draft" | "published" | "scheduled" | "archived";
          seo_data: Json;
          scheduled_at: string | null;
          published_at: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          post_id?: string;
          org_id: string;
          created_by?: string | null;
          title: string;
          content?: string | null;
          excerpt?: string | null;
          status?: "draft" | "published" | "scheduled" | "archived";
          seo_data?: Json;
          scheduled_at?: string | null;
          published_at?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          post_id?: string;
          org_id?: string;
          created_by?: string | null;
          title?: string;
          content?: string | null;
          excerpt?: string | null;
          status?: "draft" | "published" | "scheduled" | "archived";
          seo_data?: Json;
          scheduled_at?: string | null;
          published_at?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      content_templates: {
        Row: {
          template_id: string;
          org_id: string;
          created_by: string | null;
          name: string;
          description: string | null;
          template_content: Json;
          category: string | null;
          is_shared: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          template_id?: string;
          org_id: string;
          created_by?: string | null;
          name: string;
          description?: string | null;
          template_content: Json;
          category?: string | null;
          is_shared?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          template_id?: string;
          org_id?: string;
          created_by?: string | null;
          name?: string;
          description?: string | null;
          template_content?: Json;
          category?: string | null;
          is_shared?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      api_usage_logs: {
        Row: {
          log_id: string;
          org_id: string;
          user_id: string | null;
          endpoint: string;
          tokens_consumed: number;
          cost_cents: number;
          request_metadata: Json;
          created_at: string;
        };
        Insert: {
          log_id?: string;
          org_id: string;
          user_id?: string | null;
          endpoint: string;
          tokens_consumed?: number;
          cost_cents?: number;
          request_metadata?: Json;
          created_at?: string;
        };
        Update: {
          log_id?: string;
          org_id?: string;
          user_id?: string | null;
          endpoint?: string;
          tokens_consumed?: number;
          cost_cents?: number;
          request_metadata?: Json;
          created_at?: string;
        };
      };
      media_assets: {
        Row: {
          asset_id: string;
          org_id: string;
          uploaded_by: string | null;
          file_name: string;
          file_url: string;
          file_type: string;
          file_size: number;
          provider: "cloudinary" | "cloudflare";
          metadata: Json;
          created_at: string;
        };
        Insert: {
          asset_id?: string;
          org_id: string;
          uploaded_by?: string | null;
          file_name: string;
          file_url: string;
          file_type: string;
          file_size: number;
          provider: "cloudinary" | "cloudflare";
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          asset_id?: string;
          org_id?: string;
          uploaded_by?: string | null;
          file_name?: string;
          file_url?: string;
          file_type?: string;
          file_size?: number;
          provider?: "cloudinary" | "cloudflare";
          metadata?: Json;
          created_at?: string;
        };
      };
    };
  };
}

export type Organization = Database["public"]["Tables"]["organizations"]["Row"];
export type User = Database["public"]["Tables"]["users"]["Row"];
export type BlogPost = Database["public"]["Tables"]["blog_posts"]["Row"];
export type ContentTemplate =
  Database["public"]["Tables"]["content_templates"]["Row"];
export type ApiUsageLog = Database["public"]["Tables"]["api_usage_logs"]["Row"];
export type MediaAsset = Database["public"]["Tables"]["media_assets"]["Row"];

