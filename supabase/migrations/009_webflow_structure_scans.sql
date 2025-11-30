-- Migration: Webflow Structure Scans
-- Description: Store discovered Webflow site structure (CMS items and static pages) for efficient hyperlink insertion
-- Date: 2025-01-16

-- ============================================
-- 1. Webflow Structure Scans Table
-- ============================================

CREATE TABLE IF NOT EXISTS webflow_structure_scans (
  scan_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(org_id) ON DELETE CASCADE NOT NULL,
  integration_id UUID REFERENCES integrations(integration_id) ON DELETE CASCADE,
  site_id TEXT NOT NULL,
  
  -- Scan Metadata
  scan_type TEXT NOT NULL DEFAULT 'full' CHECK (scan_type IN ('full', 'incremental')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scanning', 'completed', 'failed')),
  
  -- Discovered Structure
  collections JSONB DEFAULT '[]', -- Array of WebflowCollection objects
  static_pages JSONB DEFAULT '[]', -- Array of WebflowPage objects
  existing_content JSONB DEFAULT '[]', -- Array of ExistingContent objects (CMS + Static)
  
  -- Statistics
  collections_count INTEGER DEFAULT 0,
  static_pages_count INTEGER DEFAULT 0,
  cms_items_count INTEGER DEFAULT 0,
  total_content_items INTEGER DEFAULT 0,
  
  -- Error Handling
  error_message TEXT,
  error_details JSONB,
  
  -- Timing
  scan_started_at TIMESTAMPTZ,
  scan_completed_at TIMESTAMPTZ,
  next_scan_at TIMESTAMPTZ, -- For scheduled rescans
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_org_site_scan UNIQUE (org_id, site_id, scan_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_webflow_scans_org_id ON webflow_structure_scans(org_id);
CREATE INDEX IF NOT EXISTS idx_webflow_scans_site_id ON webflow_structure_scans(site_id);
CREATE INDEX IF NOT EXISTS idx_webflow_scans_status ON webflow_structure_scans(status);
CREATE INDEX IF NOT EXISTS idx_webflow_scans_integration_id ON webflow_structure_scans(integration_id);
CREATE INDEX IF NOT EXISTS idx_webflow_scans_scan_completed_at ON webflow_structure_scans(scan_completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_webflow_scans_next_scan_at ON webflow_structure_scans(next_scan_at) WHERE next_scan_at IS NOT NULL;

-- ============================================
-- 2. Enable Row Level Security
-- ============================================

ALTER TABLE webflow_structure_scans ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. RLS Policies
-- ============================================

-- Users can view scans for their organization
CREATE POLICY "Users can view org webflow scans"
  ON webflow_structure_scans FOR SELECT
  USING (org_id IN (
    SELECT org_id FROM users WHERE user_id = auth.uid()
  ));

-- Users can create scans for their organization
CREATE POLICY "Users can create org webflow scans"
  ON webflow_structure_scans FOR INSERT
  WITH CHECK (
    org_id IN (SELECT org_id FROM users WHERE user_id = auth.uid())
  );

-- Users can update scans for their organization
CREATE POLICY "Users can update org webflow scans"
  ON webflow_structure_scans FOR UPDATE
  USING (
    org_id IN (SELECT org_id FROM users WHERE user_id = auth.uid())
  );

-- Managers can delete scans
CREATE POLICY "Managers can delete org webflow scans"
  ON webflow_structure_scans FOR DELETE
  USING (
    org_id IN (SELECT org_id FROM users WHERE user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM users
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager', 'editor')
    )
  );

-- ============================================
-- 4. Triggers
-- ============================================

CREATE TRIGGER update_webflow_scans_updated_at 
  BEFORE UPDATE ON webflow_structure_scans
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. Helper Functions
-- ============================================

-- Function to get latest scan for a site
CREATE OR REPLACE FUNCTION get_latest_webflow_scan(p_org_id UUID, p_site_id TEXT)
RETURNS webflow_structure_scans AS $$
BEGIN
  RETURN (
    SELECT *
    FROM webflow_structure_scans
    WHERE org_id = p_org_id
      AND site_id = p_site_id
      AND status = 'completed'
    ORDER BY scan_completed_at DESC
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get existing content from latest scan
CREATE OR REPLACE FUNCTION get_webflow_existing_content(p_org_id UUID, p_site_id TEXT)
RETURNS JSONB AS $$
DECLARE
  v_scan webflow_structure_scans;
BEGIN
  SELECT * INTO v_scan
  FROM webflow_structure_scans
  WHERE org_id = p_org_id
    AND site_id = p_site_id
    AND status = 'completed'
  ORDER BY scan_completed_at DESC
  LIMIT 1;
  
  IF v_scan IS NULL THEN
    RETURN '[]'::JSONB;
  END IF;
  
  RETURN COALESCE(v_scan.existing_content, '[]'::JSONB);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. Comments
-- ============================================

COMMENT ON TABLE webflow_structure_scans IS 'Stores discovered Webflow site structure (CMS collections, items, and static pages) for efficient hyperlink insertion';
COMMENT ON COLUMN webflow_structure_scans.scan_type IS 'full: complete site scan, incremental: only new/changed items';
COMMENT ON COLUMN webflow_structure_scans.status IS 'pending: queued, scanning: in progress, completed: success, failed: error occurred';
COMMENT ON COLUMN webflow_structure_scans.existing_content IS 'Array of ExistingContent objects with id, title, url, slug, keywords, published_at, type (cms|static)';

