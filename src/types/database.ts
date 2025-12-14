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
          phone: string | null;
          bio: string | null;
          role: "system_admin" | "super_admin" | "admin" | "manager" | "editor" | "writer";
          permissions: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          org_id: string;
          email: string;
          full_name?: string | null;
          phone?: string | null;
          bio?: string | null;
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
          phone?: string | null;
          bio?: string | null;
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
      integrations: {
        Row: {
          integration_id: string;
          org_id: string;
          type: string;
          name: string;
          status: "active" | "inactive" | "error" | "pending";
          config: Json;
          field_mappings: Json;
          health_status: "healthy" | "warning" | "error" | "unknown";
          last_sync: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          integration_id?: string;
          org_id: string;
          type: string;
          name: string;
          status?: "active" | "inactive" | "error" | "pending";
          config?: Json;
          field_mappings?: Json;
          health_status?: "healthy" | "warning" | "error" | "unknown";
          last_sync?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          integration_id?: string;
          org_id?: string;
          type?: string;
          name?: string;
          status?: "active" | "inactive" | "error" | "pending";
          config?: Json;
          field_mappings?: Json;
          health_status?: "healthy" | "warning" | "error" | "unknown";
          last_sync?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
      };
      publishing_targets: {
        Row: {
          target_id: string;
          org_id: string;
          integration_id: string;
          provider: string;
          site_id: string;
          site_name: string | null;
          collection_id: string | null;
          is_default: boolean;
          metadata: Json;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          target_id?: string;
          org_id: string;
          integration_id: string;
          provider: string;
          site_id: string;
          site_name?: string | null;
          collection_id?: string | null;
          is_default?: boolean;
          metadata?: Json;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          target_id?: string;
          org_id?: string;
          integration_id?: string;
          provider?: string;
          site_id?: string;
          site_name?: string | null;
          collection_id?: string | null;
          is_default?: boolean;
          metadata?: Json;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      integration_publish_logs: {
        Row: {
          log_id: string;
          org_id: string;
          post_id: string;
          integration_id: string;
          status: "pending" | "success" | "failed" | "synced" | "syncing";
          external_id: string | null;
          external_url: string | null;
          error_message: string | null;
          error_code: string | null;
          request_metadata: Json;
          response_metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          log_id?: string;
          org_id: string;
          post_id: string;
          integration_id: string;
          status?: "pending" | "success" | "failed" | "synced" | "syncing";
          external_id?: string | null;
          external_url?: string | null;
          error_message?: string | null;
          error_code?: string | null;
          request_metadata?: Json;
          response_metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          log_id?: string;
          org_id?: string;
          post_id?: string;
          integration_id?: string;
          status?: "pending" | "success" | "failed" | "synced" | "syncing";
          external_id?: string | null;
          external_url?: string | null;
          error_message?: string | null;
          error_code?: string | null;
          request_metadata?: Json;
          response_metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      brand_settings: {
        Row: {
          brand_setting_id: string;
          org_id: string;
          created_by: string | null;
          tone: string;
          style_guidelines: string | null;
          vocabulary: Json;
          target_audience: string | null;
          industry_specific_terms: Json;
          brand_voice_description: string | null;
          examples: Json;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          brand_setting_id?: string;
          org_id: string;
          created_by?: string | null;
          tone?: string;
          style_guidelines?: string | null;
          vocabulary?: Json;
          target_audience?: string | null;
          industry_specific_terms?: Json;
          brand_voice_description?: string | null;
          examples?: Json;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          brand_setting_id?: string;
          org_id?: string;
          created_by?: string | null;
          tone?: string;
          style_guidelines?: string | null;
          vocabulary?: Json;
          target_audience?: string | null;
          industry_specific_terms?: Json;
          brand_voice_description?: string | null;
          examples?: Json;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      internal_link_graph: {
        Row: {
          link_id: string;
          org_id: string;
          source_post_id: string;
          target_post_id: string;
          anchor_text: string;
          link_context: string | null;
          link_type: string;
          link_position: number | null;
          is_auto_generated: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          link_id?: string;
          org_id: string;
          source_post_id: string;
          target_post_id: string;
          anchor_text: string;
          link_context?: string | null;
          link_type?: string;
          link_position?: number | null;
          is_auto_generated?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          link_id?: string;
          org_id?: string;
          source_post_id?: string;
          target_post_id?: string;
          anchor_text?: string;
          link_context?: string | null;
          link_type?: string;
          link_position?: number | null;
          is_auto_generated?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      content_presets: {
        Row: {
          preset_id: string;
          org_id: string;
          created_by: string | null;
          name: string;
          description: string | null;
          word_count: number | null;
          content_format: string | null;
          seo_template: Json;
          publishing_schedule: Json;
          integration_field_mappings: Json;
          quality_level: string;
          preset_config: Json;
          is_default: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          preset_id?: string;
          org_id: string;
          created_by?: string | null;
          name: string;
          description?: string | null;
          word_count?: number | null;
          content_format?: string | null;
          seo_template?: Json;
          publishing_schedule?: Json;
          integration_field_mappings?: Json;
          quality_level?: string;
          preset_config?: Json;
          is_default?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          preset_id?: string;
          org_id?: string;
          created_by?: string | null;
          name?: string;
          description?: string | null;
          word_count?: number | null;
          content_format?: string | null;
          seo_template?: Json;
          publishing_schedule?: Json;
          integration_field_mappings?: Json;
          quality_level?: string;
          preset_config?: Json;
          is_default?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
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
export type Integration = Database["public"]["Tables"]["integrations"]["Row"];
export type IntegrationPublishLog = Database["public"]["Tables"]["integration_publish_logs"]["Row"];
export type BrandSetting = Database["public"]["Tables"]["brand_settings"]["Row"];
export type InternalLink = Database["public"]["Tables"]["internal_link_graph"]["Row"];
export type ContentPreset = Database["public"]["Tables"]["content_presets"]["Row"];

