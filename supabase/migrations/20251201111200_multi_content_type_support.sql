-- =====================================================
-- Multi-Content-Type Support Migration
-- Enables multiple sites and content type profiles per integration
-- Date: 2025-12-01
-- =====================================================
--
-- This migration implements:
-- 1. Support for multiple sites per integration (e.g., multiple Webflow sites)
-- 2. Content type profiles (e.g., Article, Product Review, Case Study)
-- 3. Field mappings per content type profile
-- 4. Backward compatibility with existing integrations
--
-- Migration Strategy:
-- - Phase 1: Create new tables
-- - Phase 2: Migrate existing data
-- - Phase 3: Add indexes and constraints
-- - Phase 4: Add RLS policies
-- - Phase 5: Add migration flags for backward compatibility

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- PHASE 0: ENSURE PREREQUISITE TABLES EXIST
-- =====================================================

-- Ensure integrations table exists (create if it doesn't)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'integrations'
  ) THEN
    -- Create basic integrations table if it doesn't exist
    CREATE TABLE integrations (
      integration_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      org_id UUID NOT NULL,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'inactive',
      config JSONB NOT NULL DEFAULT '{}',
      field_mappings JSONB DEFAULT '{}',
      health_status TEXT DEFAULT 'unknown',
      last_sync TIMESTAMPTZ,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      created_by UUID
    );
    
    -- Add foreign key constraint if organizations table exists
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'organizations'
    ) THEN
      ALTER TABLE integrations 
      ADD CONSTRAINT fk_integrations_org 
      FOREIGN KEY (org_id) REFERENCES organizations(org_id) ON DELETE CASCADE;
    END IF;
    
    -- Add foreign key constraint if users table exists
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'users'
    ) THEN
      ALTER TABLE integrations 
      ADD CONSTRAINT fk_integrations_created_by 
      FOREIGN KEY (created_by) REFERENCES users(user_id);
    END IF;
  END IF;
END $$;

-- =====================================================
-- PHASE 1: CREATE NEW TABLES
-- =====================================================

-- Table: integration_sites
-- Purpose: Store multiple sites per integration
-- Example: Multiple Webflow sites under one organization
CREATE TABLE IF NOT EXISTS integration_sites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  integration_id UUID NOT NULL,
  org_id UUID NOT NULL,
  
  -- Site identification
  site_name VARCHAR(255) NOT NULL,
  site_id VARCHAR(255) NOT NULL, -- Webflow site_id, WordPress site URL, Shopify shop domain
  site_url VARCHAR(500),
  
  -- Site configuration
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  -- Provider-specific metadata
  metadata JSONB DEFAULT '{}',
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  
  -- Constraints
  CONSTRAINT unique_integration_site UNIQUE (integration_id, site_id),
  CONSTRAINT check_site_name_not_empty CHECK (LENGTH(TRIM(site_name)) > 0),
  CONSTRAINT check_site_id_not_empty CHECK (LENGTH(TRIM(site_id)) > 0)
);

-- Add foreign key constraints if referenced tables exist
DO $$
BEGIN
  -- Add foreign key to integrations table
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'integrations'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'fk_integration_sites_integration_id'
    ) THEN
      ALTER TABLE integration_sites 
      ADD CONSTRAINT fk_integration_sites_integration_id 
      FOREIGN KEY (integration_id) REFERENCES integrations(integration_id) ON DELETE CASCADE;
    END IF;
  END IF;
  
  -- Add foreign key to organizations table
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'organizations'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'fk_integration_sites_org_id'
    ) THEN
      ALTER TABLE integration_sites 
      ADD CONSTRAINT fk_integration_sites_org_id 
      FOREIGN KEY (org_id) REFERENCES organizations(org_id) ON DELETE CASCADE;
    END IF;
  END IF;
  
  -- Add foreign key to users table
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'users'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'fk_integration_sites_created_by'
    ) THEN
      ALTER TABLE integration_sites 
      ADD CONSTRAINT fk_integration_sites_created_by 
      FOREIGN KEY (created_by) REFERENCES users(user_id);
    END IF;
  END IF;
END $$;

-- Table: content_type_profiles
-- Purpose: Define reusable content type templates
-- Example: "Article", "Product Review", "Case Study" profiles
CREATE TABLE IF NOT EXISTS content_type_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL,
  integration_id UUID NOT NULL,
  site_id UUID, -- Optional: site-specific profiles
  
  -- Profile identification
  profile_name VARCHAR(255) NOT NULL, -- "Article", "Product Review", "Case Study"
  content_type VARCHAR(100) NOT NULL, -- "webflow_collection", "wordpress_post_type", "shopify_product"
  
  -- Target collection/post type
  target_collection_id VARCHAR(255), -- Webflow collection_id, WordPress post_type, Shopify product_type
  target_collection_name VARCHAR(255),
  
  -- Profile configuration
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false, -- Default profile for this integration
  
  -- Collection schema metadata (stores field definitions from CMS)
  metadata JSONB DEFAULT '{}',
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  
  -- Constraints
  CONSTRAINT unique_profile_per_integration UNIQUE (org_id, integration_id, profile_name, site_id),
  CONSTRAINT check_profile_name_not_empty CHECK (LENGTH(TRIM(profile_name)) > 0),
  CONSTRAINT check_content_type_valid CHECK (content_type IN (
    'webflow_collection',
    'wordpress_post_type',
    'wordpress_page',
    'shopify_product',
    'shopify_article',
    'medium_post',
    'custom'
  ))
);

-- Add foreign key constraints for content_type_profiles if referenced tables exist
DO $$
BEGIN
  -- Add foreign key to organizations table
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'organizations'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'fk_content_type_profiles_org_id'
    ) THEN
      ALTER TABLE content_type_profiles 
      ADD CONSTRAINT fk_content_type_profiles_org_id 
      FOREIGN KEY (org_id) REFERENCES organizations(org_id) ON DELETE CASCADE;
    END IF;
  END IF;
  
  -- Add foreign key to integrations table
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'integrations'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'fk_content_type_profiles_integration_id'
    ) THEN
      ALTER TABLE content_type_profiles 
      ADD CONSTRAINT fk_content_type_profiles_integration_id 
      FOREIGN KEY (integration_id) REFERENCES integrations(integration_id) ON DELETE CASCADE;
    END IF;
  END IF;
  
  -- Add foreign key to integration_sites table
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'integration_sites'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'fk_content_type_profiles_site_id'
    ) THEN
      ALTER TABLE content_type_profiles 
      ADD CONSTRAINT fk_content_type_profiles_site_id 
      FOREIGN KEY (site_id) REFERENCES integration_sites(id) ON DELETE CASCADE;
    END IF;
  END IF;
  
  -- Add foreign key to users table
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'users'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'fk_content_type_profiles_created_by'
    ) THEN
      ALTER TABLE content_type_profiles 
      ADD CONSTRAINT fk_content_type_profiles_created_by 
      FOREIGN KEY (created_by) REFERENCES users(user_id);
    END IF;
  END IF;
END $$;

-- Table: content_type_field_mappings
-- Purpose: Store field mappings per content type profile
CREATE TABLE IF NOT EXISTS content_type_field_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL,
  
  -- Field mapping
  blog_field VARCHAR(100) NOT NULL, -- "title", "content", "author", "tags", "categories"
  target_field VARCHAR(255) NOT NULL, -- Webflow field slug, WordPress field name, Shopify field
  
  -- Field configuration
  is_required BOOLEAN DEFAULT false,
  is_visible BOOLEAN DEFAULT true,
  
  -- Transformation rules
  transform_config JSONB DEFAULT '{}', -- Transformation rules (date format, HTML conversion, etc.)
  default_value TEXT,
  validation_rules JSONB DEFAULT '{}',
  
  -- Display configuration
  display_order INTEGER DEFAULT 0,
  display_label VARCHAR(255),
  help_text TEXT,
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_field_per_profile UNIQUE (profile_id, blog_field),
  CONSTRAINT check_blog_field_not_empty CHECK (LENGTH(TRIM(blog_field)) > 0),
  CONSTRAINT check_target_field_not_empty CHECK (LENGTH(TRIM(target_field)) > 0)
);

-- Add foreign key constraint for content_type_field_mappings if referenced table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'content_type_profiles'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'fk_field_mappings_profile_id'
    ) THEN
      ALTER TABLE content_type_field_mappings 
      ADD CONSTRAINT fk_field_mappings_profile_id 
      FOREIGN KEY (profile_id) REFERENCES content_type_profiles(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- =====================================================
-- PHASE 2: MIGRATE EXISTING DATA
-- =====================================================

-- Step 1: Migrate existing site_id from integrations.config to integration_sites
-- Extract site_id from config JSONB and create integration_sites entries
-- Only run if integrations table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'integrations'
  ) THEN
    INSERT INTO integration_sites (
  integration_id,
  org_id,
  site_name,
  site_id,
  site_url,
  is_default,
  is_active,
  metadata,
  created_at,
  updated_at
)
SELECT 
  i.integration_id,
  i.org_id,
  COALESCE(
    i.name || ' - Default Site',
    'Default Site'
  ) as site_name,
  COALESCE(
    (i.config->>'site_id')::VARCHAR,
    (i.config->>'siteId')::VARCHAR,
    (i.config->>'site_url')::VARCHAR,
    'default-' || i.integration_id::TEXT
  ) as site_id,
  (i.config->>'site_url')::VARCHAR as site_url,
  true as is_default,
  (i.status = 'active') as is_active,
  jsonb_build_object(
    'migrated_from_config', true,
    'original_config', i.config
  ) as metadata,
  i.created_at,
  i.updated_at
FROM integrations i
WHERE NOT EXISTS (
  SELECT 1 FROM integration_sites 
  WHERE integration_id = i.integration_id
)
AND (
  (i.config->>'site_id') IS NOT NULL 
  OR (i.config->>'siteId') IS NOT NULL
  OR (i.config->>'site_url') IS NOT NULL
  OR i.type IN ('webflow', 'wordpress', 'shopify')
);
  END IF;
END $$;

-- Step 2: Migrate existing field_mappings to content_type_profiles
-- Create a default "Blog Post" profile for each integration with field mappings
-- Only run if integrations table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'integrations'
  ) THEN
    INSERT INTO content_type_profiles (
  org_id,
  integration_id,
  site_id,
  profile_name,
  content_type,
  target_collection_id,
  target_collection_name,
  description,
  is_default,
  is_active,
  metadata,
  created_at,
  updated_at
)
SELECT 
  i.org_id,
  i.integration_id,
  ins_site.id as site_id,
  'Blog Post' as profile_name,
  CASE 
    WHEN i.type = 'webflow' THEN 'webflow_collection'
    WHEN i.type = 'wordpress' THEN 'wordpress_post_type'
    WHEN i.type = 'shopify' THEN 'shopify_article'
    ELSE 'custom'
  END as content_type,
  COALESCE(
    (i.config->>'collection_id')::VARCHAR,
    (i.config->>'collectionId')::VARCHAR,
    (i.config->>'post_type')::VARCHAR
  ) as target_collection_id,
  COALESCE(
    (i.config->>'collection_name')::VARCHAR,
    'Blog Post'
  ) as target_collection_name,
  'Default blog post content type (migrated from legacy field mappings)' as description,
  true as is_default,
  (i.status = 'active') as is_active,
  jsonb_build_object(
    'migrated_from_field_mappings', true,
    'original_collection_id', COALESCE(
      (i.config->>'collection_id')::VARCHAR,
      (i.config->>'collectionId')::VARCHAR
    )
  ) as metadata,
  i.created_at,
  i.updated_at
FROM integrations i
LEFT JOIN integration_sites ins_site ON ins_site.integration_id = i.integration_id AND ins_site.is_default = true
WHERE NOT EXISTS (
  SELECT 1 FROM content_type_profiles 
  WHERE integration_id = i.integration_id AND is_default = true
)
AND (
  i.field_mappings IS NOT NULL 
  AND i.field_mappings != '{}'::jsonb
  OR (i.config->>'collection_id') IS NOT NULL
  OR (i.config->>'collectionId') IS NOT NULL
);
  END IF;
END $$;

-- Step 3: Migrate field mappings from integrations.field_mappings to content_type_field_mappings
-- Only run if integrations table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'integrations'
  ) THEN
    INSERT INTO content_type_field_mappings (
  profile_id,
  blog_field,
  target_field,
  is_required,
  is_visible,
  transform_config,
  display_order,
  created_at,
  updated_at
)
SELECT 
  ctp.id as profile_id,
  key as blog_field,
  value::TEXT as target_field,
  CASE 
    WHEN key IN ('title', 'content', 'slug') THEN true
    ELSE false
  END as is_required,
  true as is_visible,
  '{}'::jsonb as transform_config,
  ROW_NUMBER() OVER (PARTITION BY ctp.id ORDER BY key) - 1 as display_order,
  NOW() as created_at,
  NOW() as updated_at
FROM integrations i
INNER JOIN content_type_profiles ctp ON ctp.integration_id = i.integration_id AND ctp.is_default = true
CROSS JOIN LATERAL jsonb_each_text(i.field_mappings) as mappings(key, value)
WHERE i.field_mappings IS NOT NULL 
AND i.field_mappings != '{}'::jsonb
AND NOT EXISTS (
  SELECT 1 FROM content_type_field_mappings 
  WHERE profile_id = ctp.id AND blog_field = mappings.key
);
  END IF;
END $$;

-- =====================================================
-- PHASE 3: ADD INDEXES AND CONSTRAINTS
-- =====================================================

-- Indexes for integration_sites
CREATE INDEX IF NOT EXISTS idx_integration_sites_integration_id ON integration_sites(integration_id);
CREATE INDEX IF NOT EXISTS idx_integration_sites_org_id ON integration_sites(org_id);
CREATE INDEX IF NOT EXISTS idx_integration_sites_site_id ON integration_sites(site_id);
CREATE INDEX IF NOT EXISTS idx_integration_sites_is_default ON integration_sites(integration_id, is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_integration_sites_is_active ON integration_sites(integration_id, is_active) WHERE is_active = true;

-- Indexes for content_type_profiles
CREATE INDEX IF NOT EXISTS idx_content_type_profiles_integration_id ON content_type_profiles(integration_id);
CREATE INDEX IF NOT EXISTS idx_content_type_profiles_org_id ON content_type_profiles(org_id);
CREATE INDEX IF NOT EXISTS idx_content_type_profiles_site_id ON content_type_profiles(site_id);
CREATE INDEX IF NOT EXISTS idx_content_type_profiles_content_type ON content_type_profiles(content_type);
CREATE INDEX IF NOT EXISTS idx_content_type_profiles_is_default ON content_type_profiles(integration_id, is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_content_type_profiles_is_active ON content_type_profiles(integration_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_content_type_profiles_target_collection ON content_type_profiles(target_collection_id) WHERE target_collection_id IS NOT NULL;

-- Indexes for content_type_field_mappings
CREATE INDEX IF NOT EXISTS idx_field_mappings_profile_id ON content_type_field_mappings(profile_id);
CREATE INDEX IF NOT EXISTS idx_field_mappings_blog_field ON content_type_field_mappings(blog_field);
CREATE INDEX IF NOT EXISTS idx_field_mappings_target_field ON content_type_field_mappings(target_field);
CREATE INDEX IF NOT EXISTS idx_field_mappings_is_required ON content_type_field_mappings(profile_id, is_required) WHERE is_required = true;
CREATE INDEX IF NOT EXISTS idx_field_mappings_display_order ON content_type_field_mappings(profile_id, display_order);

-- =====================================================
-- PHASE 4: ADD RLS POLICIES
-- =====================================================

-- Enable Row Level Security
ALTER TABLE integration_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_type_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_type_field_mappings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for integration_sites

-- Users can view sites for their organization's integrations
CREATE POLICY "Users can view org integration sites"
  ON integration_sites FOR SELECT
  USING (org_id IN (
    SELECT org_id FROM users WHERE user_id = auth.uid()
  ));

-- Admins can create sites for their organization's integrations
CREATE POLICY "Admins can create integration sites"
  ON integration_sites FOR INSERT
  WITH CHECK (
    org_id IN (SELECT org_id FROM users WHERE user_id = auth.uid())
      AND EXISTS (
      SELECT 1 FROM users
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager', 'editor', 'system_admin', 'super_admin')
    )
    AND EXISTS (
      SELECT 1 FROM integrations
      WHERE integration_id = integration_sites.integration_id
      AND org_id = integration_sites.org_id
    )
  );

-- Admins can update sites for their organization's integrations
CREATE POLICY "Admins can update integration sites"
  ON integration_sites FOR UPDATE
  USING (
    org_id IN (SELECT org_id FROM users WHERE user_id = auth.uid())
      AND EXISTS (
      SELECT 1 FROM users
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager', 'editor', 'system_admin', 'super_admin')
    )
  );

-- Admins can delete sites for their organization's integrations
CREATE POLICY "Admins can delete integration sites"
  ON integration_sites FOR DELETE
  USING (
    org_id IN (SELECT org_id FROM users WHERE user_id = auth.uid())
      AND EXISTS (
      SELECT 1 FROM users
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager', 'editor', 'system_admin', 'super_admin')
    )
  );

-- RLS Policies for content_type_profiles

-- Users can view content type profiles for their organization's integrations
CREATE POLICY "Users can view org content type profiles"
  ON content_type_profiles FOR SELECT
  USING (org_id IN (
    SELECT org_id FROM users WHERE user_id = auth.uid()
  ));

-- Admins can create content type profiles for their organization's integrations
CREATE POLICY "Admins can create content type profiles"
  ON content_type_profiles FOR INSERT
  WITH CHECK (
    org_id IN (SELECT org_id FROM users WHERE user_id = auth.uid())
      AND EXISTS (
      SELECT 1 FROM users
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager', 'editor', 'system_admin', 'super_admin')
    )
    AND EXISTS (
      SELECT 1 FROM integrations
      WHERE integration_id = content_type_profiles.integration_id
      AND org_id = content_type_profiles.org_id
    )
  );

-- Admins can update content type profiles for their organization's integrations
CREATE POLICY "Admins can update content type profiles"
  ON content_type_profiles FOR UPDATE
  USING (
    org_id IN (SELECT org_id FROM users WHERE user_id = auth.uid())
      AND EXISTS (
      SELECT 1 FROM users
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager', 'editor', 'system_admin', 'super_admin')
    )
  );

-- Admins can delete content type profiles for their organization's integrations
CREATE POLICY "Admins can delete content type profiles"
  ON content_type_profiles FOR DELETE
  USING (
    org_id IN (SELECT org_id FROM users WHERE user_id = auth.uid())
      AND EXISTS (
      SELECT 1 FROM users
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager', 'editor', 'system_admin', 'super_admin')
    )
  );

-- RLS Policies for content_type_field_mappings

-- Users can view field mappings for profiles they have access to
CREATE POLICY "Users can view field mappings"
  ON content_type_field_mappings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM content_type_profiles ctp
      WHERE ctp.id = content_type_field_mappings.profile_id
      AND ctp.org_id IN (
        SELECT org_id FROM users WHERE user_id = auth.uid()
      )
    )
  );

-- Admins can create field mappings for profiles they have access to
CREATE POLICY "Admins can create field mappings"
  ON content_type_field_mappings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM content_type_profiles ctp
      WHERE ctp.id = content_type_field_mappings.profile_id
      AND ctp.org_id IN (
        SELECT org_id FROM users WHERE user_id = auth.uid()
      )
      AND EXISTS (
      SELECT 1 FROM users
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager', 'editor', 'system_admin', 'super_admin')
    )
    )
  );

-- Admins can update field mappings for profiles they have access to
CREATE POLICY "Admins can update field mappings"
  ON content_type_field_mappings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM content_type_profiles ctp
      WHERE ctp.id = content_type_field_mappings.profile_id
      AND ctp.org_id IN (
        SELECT org_id FROM users WHERE user_id = auth.uid()
      )
      AND EXISTS (
      SELECT 1 FROM users
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager', 'editor', 'system_admin', 'super_admin')
    )
    )
  );

-- Admins can delete field mappings for profiles they have access to
CREATE POLICY "Admins can delete field mappings"
  ON content_type_field_mappings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM content_type_profiles ctp
      WHERE ctp.id = content_type_field_mappings.profile_id
      AND ctp.org_id IN (
        SELECT org_id FROM users WHERE user_id = auth.uid()
      )
      AND EXISTS (
      SELECT 1 FROM users
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager', 'editor', 'system_admin', 'super_admin')
    )
    )
  );

-- =====================================================
-- PHASE 5: ADD HELPER FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_integration_sites_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_content_type_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_field_mappings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_integration_sites_updated_at 
  BEFORE UPDATE ON integration_sites
  FOR EACH ROW 
  EXECUTE FUNCTION update_integration_sites_updated_at();

CREATE TRIGGER update_content_type_profiles_updated_at 
  BEFORE UPDATE ON content_type_profiles
  FOR EACH ROW 
  EXECUTE FUNCTION update_content_type_profiles_updated_at();

CREATE TRIGGER update_field_mappings_updated_at 
  BEFORE UPDATE ON content_type_field_mappings
  FOR EACH ROW 
  EXECUTE FUNCTION update_field_mappings_updated_at();

-- Function to ensure only one default site per integration
CREATE OR REPLACE FUNCTION ensure_single_default_site()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE integration_sites
    SET is_default = false
    WHERE integration_id = NEW.integration_id
    AND id != NEW.id
    AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_default_site_trigger
  BEFORE INSERT OR UPDATE ON integration_sites
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_default_site();

-- Function to ensure only one default profile per integration
CREATE OR REPLACE FUNCTION ensure_single_default_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE content_type_profiles
    SET is_default = false
    WHERE integration_id = NEW.integration_id
    AND (site_id = NEW.site_id OR (site_id IS NULL AND NEW.site_id IS NULL))
    AND id != NEW.id
    AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_default_profile_trigger
  BEFORE INSERT OR UPDATE ON content_type_profiles
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_default_profile();

-- =====================================================
-- PHASE 6: ADD COLUMNS TO EXISTING TABLES (BACKWARD COMPATIBILITY)
-- =====================================================

-- Add columns to blog_posts table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'blog_posts') THEN
    -- Add content_type_profile_id if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'blog_posts' 
      AND column_name = 'content_type_profile_id'
    ) THEN
      ALTER TABLE blog_posts 
      ADD COLUMN content_type_profile_id UUID REFERENCES content_type_profiles(id) ON DELETE SET NULL;
      
      CREATE INDEX IF NOT EXISTS idx_blog_posts_content_type_profile 
      ON blog_posts(content_type_profile_id);
    END IF;
    
    -- Add target_site_id if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'blog_posts' 
      AND column_name = 'target_site_id'
    ) THEN
      ALTER TABLE blog_posts 
      ADD COLUMN target_site_id UUID REFERENCES integration_sites(id) ON DELETE SET NULL;
      
      CREATE INDEX IF NOT EXISTS idx_blog_posts_target_site 
      ON blog_posts(target_site_id);
    END IF;
  END IF;
END $$;

-- Add migration flags to integrations table for backward compatibility
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'integrations') THEN
    -- Add supports_multiple_sites flag
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'integrations' 
      AND column_name = 'supports_multiple_sites'
    ) THEN
      ALTER TABLE integrations 
      ADD COLUMN supports_multiple_sites BOOLEAN DEFAULT false;
      
      -- Set to true for providers that support multiple sites
      UPDATE integrations 
      SET supports_multiple_sites = true 
      WHERE type IN ('webflow', 'wordpress', 'shopify');
    END IF;
    
    -- Add migration_completed flag
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'integrations' 
      AND column_name = 'migration_completed'
    ) THEN
      ALTER TABLE integrations 
      ADD COLUMN migration_completed BOOLEAN DEFAULT false;
      
      -- Mark integrations as migrated if they have sites or profiles
      UPDATE integrations i
      SET migration_completed = true
      WHERE EXISTS (
        SELECT 1 FROM integration_sites 
        WHERE integration_id = i.integration_id
      )
      OR EXISTS (
        SELECT 1 FROM content_type_profiles 
        WHERE integration_id = i.integration_id
      );
    END IF;
  END IF;
END $$;

-- =====================================================
-- PHASE 7: ADD COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE integration_sites IS 'Stores multiple sites per integration. Enables managing multiple Webflow sites, WordPress sites, or Shopify shops under one integration.';
COMMENT ON TABLE content_type_profiles IS 'Defines reusable content type templates (e.g., Article, Product Review, Case Study) with their own field mappings and collection configurations.';
COMMENT ON TABLE content_type_field_mappings IS 'Stores field mappings per content type profile. Maps blog post fields to CMS-specific field names/slugs.';

COMMENT ON COLUMN integration_sites.site_id IS 'Platform-specific site identifier: Webflow site_id, WordPress site URL, Shopify shop domain';
COMMENT ON COLUMN integration_sites.is_default IS 'Indicates if this is the default site for the integration. Only one default per integration.';
COMMENT ON COLUMN content_type_profiles.profile_name IS 'Human-readable name for the content type (e.g., "Article", "Product Review", "Case Study")';
COMMENT ON COLUMN content_type_profiles.content_type IS 'Type of content: webflow_collection, wordpress_post_type, shopify_product, etc.';
COMMENT ON COLUMN content_type_profiles.target_collection_id IS 'Platform-specific collection/post type identifier: Webflow collection_id, WordPress post_type, Shopify product_type';
COMMENT ON COLUMN content_type_profiles.is_default IS 'Indicates if this is the default profile for the integration. Only one default per integration/site combination.';
COMMENT ON COLUMN content_type_field_mappings.blog_field IS 'Blog post field name (e.g., "title", "content", "author", "tags")';
COMMENT ON COLUMN content_type_field_mappings.target_field IS 'Target CMS field name/slug (e.g., Webflow field slug, WordPress field name)';
COMMENT ON COLUMN content_type_field_mappings.transform_config IS 'JSONB object containing transformation rules (date format, HTML conversion, etc.)';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
--
-- Summary:
-- ✅ Created 3 new tables: integration_sites, content_type_profiles, content_type_field_mappings
-- ✅ Migrated existing site_id from integrations.config to integration_sites
-- ✅ Migrated existing field_mappings to content_type_profiles and content_type_field_mappings
-- ✅ Added indexes for performance
-- ✅ Added RLS policies for security
-- ✅ Added helper functions and triggers
-- ✅ Added backward compatibility columns to blog_posts and integrations
-- ✅ Maintained data integrity with constraints and unique indexes
--
-- Next Steps:
-- 1. Update API endpoints to use new tables
-- 2. Update frontend components to support multi-site and multi-content-type selection
-- 3. Test migration with existing integrations
-- 4. Deprecate old field_mappings column after full migration (future migration)

