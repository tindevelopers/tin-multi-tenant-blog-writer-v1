-- Migration: Add Brand Voice, Internal Link Graph, and Content Presets
-- Created: 2025-01-20
-- Purpose: Add brand voice settings, internal link graph, and expanded content presets

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Brand Settings Table (Organization-level brand voice)
CREATE TABLE IF NOT EXISTS brand_settings (
  brand_setting_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  tone TEXT NOT NULL DEFAULT 'professional', -- professional, casual, friendly, authoritative, etc.
  style_guidelines TEXT,
  vocabulary JSONB DEFAULT '[]', -- Array of preferred terms/phrases
  target_audience TEXT,
  industry_specific_terms JSONB DEFAULT '[]', -- Array of industry-specific terminology
  brand_voice_description TEXT, -- Overall description of brand voice
  examples JSONB DEFAULT '[]', -- Example content snippets that exemplify the brand voice
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_org_brand_setting UNIQUE (org_id, brand_setting_id)
);

-- Internal Link Graph Table (Tracks relationships between blog posts)
CREATE TABLE IF NOT EXISTS internal_link_graph (
  link_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
  source_post_id UUID NOT NULL REFERENCES blog_posts(post_id) ON DELETE CASCADE,
  target_post_id UUID NOT NULL REFERENCES blog_posts(post_id) ON DELETE CASCADE,
  anchor_text TEXT NOT NULL,
  link_context TEXT, -- The section/context where the link appears
  link_type TEXT NOT NULL DEFAULT 'related', -- related, reference, category, series, etc.
  link_position INTEGER, -- Position in the content (character offset or section number)
  is_auto_generated BOOLEAN DEFAULT false, -- Whether link was auto-suggested or manually added
  created_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT no_self_links CHECK (source_post_id != target_post_id),
  CONSTRAINT unique_link UNIQUE (source_post_id, target_post_id, anchor_text)
);

-- Content Presets Table (Organization-level content templates)
CREATE TABLE IF NOT EXISTS content_presets (
  preset_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  word_count INTEGER, -- Target word count
  content_format TEXT, -- how-to, listicle, guide, tutorial, review, etc.
  seo_template JSONB DEFAULT '{}', -- SEO structure template
  publishing_schedule JSONB DEFAULT '{}', -- Schedule preferences
  integration_field_mappings JSONB DEFAULT '{}', -- Field mappings for different integrations
  quality_level TEXT DEFAULT 'standard', -- standard, premium, enterprise
  preset_config JSONB DEFAULT '{}', -- Additional preset configuration
  is_default BOOLEAN DEFAULT false, -- Whether this is the default preset for the org
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_org_preset_name UNIQUE (org_id, name)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_brand_settings_org_id ON brand_settings(org_id);
CREATE INDEX IF NOT EXISTS idx_brand_settings_active ON brand_settings(org_id, is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_internal_link_graph_org_id ON internal_link_graph(org_id);
CREATE INDEX IF NOT EXISTS idx_internal_link_graph_source ON internal_link_graph(source_post_id);
CREATE INDEX IF NOT EXISTS idx_internal_link_graph_target ON internal_link_graph(target_post_id);
CREATE INDEX IF NOT EXISTS idx_internal_link_graph_type ON internal_link_graph(link_type);
CREATE INDEX IF NOT EXISTS idx_internal_link_graph_source_target ON internal_link_graph(source_post_id, target_post_id);

CREATE INDEX IF NOT EXISTS idx_content_presets_org_id ON content_presets(org_id);
CREATE INDEX IF NOT EXISTS idx_content_presets_active ON content_presets(org_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_content_presets_default ON content_presets(org_id, is_default) WHERE is_default = true;

-- Enable Row Level Security
ALTER TABLE brand_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_link_graph ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_presets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their organization's brand settings" ON brand_settings;
DROP POLICY IF EXISTS "Users can create brand settings in their organization" ON brand_settings;
DROP POLICY IF EXISTS "Users can update their organization's brand settings" ON brand_settings;
DROP POLICY IF EXISTS "Users can delete their organization's brand settings" ON brand_settings;

DROP POLICY IF EXISTS "Users can view their organization's internal links" ON internal_link_graph;
DROP POLICY IF EXISTS "Users can create internal links in their organization" ON internal_link_graph;
DROP POLICY IF EXISTS "Users can update internal links in their organization" ON internal_link_graph;
DROP POLICY IF EXISTS "Users can delete internal links in their organization" ON internal_link_graph;

DROP POLICY IF EXISTS "Users can view their organization's content presets" ON content_presets;
DROP POLICY IF EXISTS "Users can create content presets in their organization" ON content_presets;
DROP POLICY IF EXISTS "Users can update content presets in their organization" ON content_presets;
DROP POLICY IF EXISTS "Users can delete content presets in their organization" ON content_presets;

-- RLS Policies for brand_settings
CREATE POLICY "Users can view their organization's brand settings"
  ON brand_settings FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create brand settings in their organization"
  ON brand_settings FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM users WHERE user_id = auth.uid()
    )
    AND (
      created_by = auth.uid()
      OR created_by IS NULL
    )
  );

CREATE POLICY "Users can update their organization's brand settings"
  ON brand_settings FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM users 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'manager', 'editor')
    )
  );

CREATE POLICY "Users can delete their organization's brand settings"
  ON brand_settings FOR DELETE
  USING (
    org_id IN (
      SELECT org_id FROM users 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

-- RLS Policies for internal_link_graph
CREATE POLICY "Users can view their organization's internal links"
  ON internal_link_graph FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create internal links in their organization"
  ON internal_link_graph FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM users WHERE user_id = auth.uid()
    )
    AND (
      created_by = auth.uid()
      OR created_by IS NULL
    )
  );

CREATE POLICY "Users can update internal links in their organization"
  ON internal_link_graph FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete internal links in their organization"
  ON internal_link_graph FOR DELETE
  USING (
    org_id IN (
      SELECT org_id FROM users WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for content_presets
CREATE POLICY "Users can view their organization's content presets"
  ON content_presets FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create content presets in their organization"
  ON content_presets FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM users WHERE user_id = auth.uid()
    )
    AND (
      created_by = auth.uid()
      OR created_by IS NULL
    )
  );

CREATE POLICY "Users can update content presets in their organization"
  ON content_presets FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM users 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'manager', 'editor')
    )
  );

CREATE POLICY "Users can delete content presets in their organization"
  ON content_presets FOR DELETE
  USING (
    org_id IN (
      SELECT org_id FROM users 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON brand_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON internal_link_graph TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON content_presets TO authenticated;

-- Update trigger for updated_at (reuse existing function)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_brand_settings_updated_at ON brand_settings;
DROP TRIGGER IF EXISTS update_internal_link_graph_updated_at ON internal_link_graph;
DROP TRIGGER IF EXISTS update_content_presets_updated_at ON content_presets;

-- Create triggers
CREATE TRIGGER update_brand_settings_updated_at
  BEFORE UPDATE ON brand_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_internal_link_graph_updated_at
  BEFORE UPDATE ON internal_link_graph
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_presets_updated_at
  BEFORE UPDATE ON content_presets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE brand_settings IS 'Stores organization-level brand voice settings for consistent content generation';
COMMENT ON TABLE internal_link_graph IS 'Tracks relationships and internal links between blog posts for SEO optimization';
COMMENT ON TABLE content_presets IS 'Stores organization-level content presets with templates, formats, and publishing schedules';

COMMENT ON COLUMN brand_settings.tone IS 'Overall tone of voice (professional, casual, friendly, authoritative, etc.)';
COMMENT ON COLUMN brand_settings.vocabulary IS 'Preferred terms and phrases to use in content';
COMMENT ON COLUMN brand_settings.industry_specific_terms IS 'Industry-specific terminology that should be used';
COMMENT ON COLUMN brand_settings.examples IS 'Example content snippets that exemplify the brand voice';

COMMENT ON COLUMN internal_link_graph.anchor_text IS 'The clickable text used for the internal link';
COMMENT ON COLUMN internal_link_graph.link_context IS 'The section or context where the link appears in the content';
COMMENT ON COLUMN internal_link_graph.link_type IS 'Type of link: related, reference, category, series, etc.';
COMMENT ON COLUMN internal_link_graph.link_position IS 'Position in the content (character offset or section number)';
COMMENT ON COLUMN internal_link_graph.is_auto_generated IS 'Whether the link was auto-suggested by the system or manually added';

COMMENT ON COLUMN content_presets.content_format IS 'Content format type: how-to, listicle, guide, tutorial, review, etc.';
COMMENT ON COLUMN content_presets.seo_template IS 'SEO structure template with headings, meta tags, etc.';
COMMENT ON COLUMN content_presets.publishing_schedule IS 'Publishing schedule preferences and rules';
COMMENT ON COLUMN content_presets.integration_field_mappings IS 'Field mappings for different publishing integrations';

