-- Integration Abstraction Layer - Database Schema
-- This migration creates the unified schema for all integrations

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Integrations Table
-- Stores all integration connections (Webflow, WordPress, Shopify, etc.)
CREATE TABLE IF NOT EXISTS integrations (
  integration_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(org_id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('webflow', 'wordpress', 'shopify', 'medium', 'google-analytics', 'slack', 'zapier', 'hubspot')),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'error', 'pending')),
  
  -- Encrypted configuration (API tokens, keys, site IDs, etc.)
  -- Should be encrypted at application level before storing
  config JSONB NOT NULL DEFAULT '{}',
  
  -- Field mappings: Maps blog post fields to integration-specific fields
  -- Example: {"title": "post-title", "content": "post-body", "excerpt": "post-summary"}
  field_mappings JSONB DEFAULT '{}',
  
  -- Health and sync status
  health_status TEXT DEFAULT 'unknown' CHECK (health_status IN ('healthy', 'warning', 'error', 'unknown')),
  last_sync TIMESTAMPTZ,
  
  -- Metadata for provider-specific data
  metadata JSONB DEFAULT '{}',
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(user_id),
  
  -- Constraints
  CONSTRAINT unique_org_integration_type UNIQUE (org_id, type, name)
);

-- Integration Publishing Logs
-- Tracks all publishing attempts and their status
CREATE TABLE IF NOT EXISTS integration_publish_logs (
  log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(org_id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES blog_posts(post_id) ON DELETE CASCADE NOT NULL,
  integration_id UUID REFERENCES integrations(integration_id) ON DELETE CASCADE NOT NULL,
  
  -- Publishing status
  status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'failed', 'synced', 'syncing')),
  
  -- External system identifiers
  external_id TEXT, -- Item ID in the external system (e.g., Webflow item ID)
  external_url TEXT, -- Published URL in the external system
  
  -- Error tracking
  error_message TEXT,
  error_code TEXT,
  
  -- Request and response metadata
  request_metadata JSONB DEFAULT '{}',
  response_metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Index for finding latest publish attempt for a post+integration
  CONSTRAINT unique_post_integration_latest UNIQUE NULLS NOT DISTINCT (post_id, integration_id, created_at DESC)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_integrations_org_id ON integrations(org_id);
CREATE INDEX IF NOT EXISTS idx_integrations_type ON integrations(type);
CREATE INDEX IF NOT EXISTS idx_integrations_status ON integrations(status);
CREATE INDEX IF NOT EXISTS idx_integrations_health_status ON integrations(health_status);
CREATE INDEX IF NOT EXISTS idx_integrations_org_type ON integrations(org_id, type);

CREATE INDEX IF NOT EXISTS idx_publish_logs_post_id ON integration_publish_logs(post_id);
CREATE INDEX IF NOT EXISTS idx_publish_logs_integration_id ON integration_publish_logs(integration_id);
CREATE INDEX IF NOT EXISTS idx_publish_logs_status ON integration_publish_logs(status);
CREATE INDEX IF NOT EXISTS idx_publish_logs_org_id ON integration_publish_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_publish_logs_created_at ON integration_publish_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_publish_logs_post_integration ON integration_publish_logs(post_id, integration_id);

-- Enable Row Level Security
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_publish_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Integrations

-- Users can view integrations for their organization
CREATE POLICY "Users can view org integrations"
  ON integrations FOR SELECT
  USING (org_id IN (
    SELECT org_id FROM users WHERE user_id = auth.uid()
  ));

-- Owners and admins can create integrations
CREATE POLICY "Admins can create integrations"
  ON integrations FOR INSERT
  WITH CHECK (
    org_id IN (SELECT org_id FROM users WHERE user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM users
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Owners and admins can update integrations
CREATE POLICY "Admins can update integrations"
  ON integrations FOR UPDATE
  USING (
    org_id IN (SELECT org_id FROM users WHERE user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM users
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Owners and admins can delete integrations
CREATE POLICY "Admins can delete integrations"
  ON integrations FOR DELETE
  USING (
    org_id IN (SELECT org_id FROM users WHERE user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM users
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- RLS Policies for Integration Publish Logs

-- Users can view publish logs for their organization
CREATE POLICY "Users can view org publish logs"
  ON integration_publish_logs FOR SELECT
  USING (org_id IN (
    SELECT org_id FROM users WHERE user_id = auth.uid()
  ));

-- System can insert publish logs (API routes will handle auth)
CREATE POLICY "System can insert publish logs"
  ON integration_publish_logs FOR INSERT
  WITH CHECK (true);

-- System can update publish logs
CREATE POLICY "System can update publish logs"
  ON integration_publish_logs FOR UPDATE
  USING (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_integrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION update_publish_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_integrations_updated_at 
  BEFORE UPDATE ON integrations
  FOR EACH ROW 
  EXECUTE FUNCTION update_integrations_updated_at();

CREATE TRIGGER update_publish_logs_updated_at 
  BEFORE UPDATE ON integration_publish_logs
  FOR EACH ROW 
  EXECUTE FUNCTION update_publish_logs_updated_at();

-- Add comment for documentation
COMMENT ON TABLE integrations IS 'Stores integration connections for all providers (Webflow, WordPress, etc.)';
COMMENT ON TABLE integration_publish_logs IS 'Tracks publishing attempts and status for blog posts to external integrations';
COMMENT ON COLUMN integrations.config IS 'Encrypted configuration including API tokens, site IDs, etc.';
COMMENT ON COLUMN integrations.field_mappings IS 'Maps blog post fields to integration-specific field names/slugs';

