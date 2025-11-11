-- Migration: Ensure workflow tables exist with proper structure and RLS
-- Created: 2025-01-19
-- Purpose: Fix 406 errors by ensuring tables exist and have proper permissions

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Workflow Sessions Table
CREATE TABLE IF NOT EXISTS workflow_sessions (
  session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  objective TEXT,
  target_audience TEXT,
  industry TEXT,
  current_step TEXT DEFAULT 'objective',
  completed_steps TEXT[] DEFAULT ARRAY[]::TEXT[],
  workflow_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Keyword Collections Table
CREATE TABLE IF NOT EXISTS keyword_collections (
  collection_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES workflow_sessions(session_id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  keywords JSONB NOT NULL DEFAULT '[]',
  search_query TEXT,
  niche TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Keyword Clusters Table
CREATE TABLE IF NOT EXISTS keyword_clusters (
  cluster_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES workflow_sessions(session_id) ON DELETE CASCADE,
  collection_id UUID REFERENCES keyword_collections(collection_id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
  parent_topic TEXT NOT NULL,
  keywords JSONB NOT NULL DEFAULT '[]',
  cluster_metrics JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_workflow_sessions_org_id ON workflow_sessions(org_id);
CREATE INDEX IF NOT EXISTS idx_workflow_sessions_created_by ON workflow_sessions(created_by);
CREATE INDEX IF NOT EXISTS idx_workflow_sessions_session_id ON workflow_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_keyword_collections_session_id ON keyword_collections(session_id);
CREATE INDEX IF NOT EXISTS idx_keyword_collections_org_id ON keyword_collections(org_id);
CREATE INDEX IF NOT EXISTS idx_keyword_collections_collection_id ON keyword_collections(collection_id);
CREATE INDEX IF NOT EXISTS idx_keyword_clusters_session_id ON keyword_clusters(session_id);
CREATE INDEX IF NOT EXISTS idx_keyword_clusters_collection_id ON keyword_clusters(collection_id);
CREATE INDEX IF NOT EXISTS idx_keyword_clusters_org_id ON keyword_clusters(org_id);

-- Enable Row Level Security
ALTER TABLE workflow_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_clusters ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their organization's workflow sessions" ON workflow_sessions;
DROP POLICY IF EXISTS "Users can create workflow sessions in their organization" ON workflow_sessions;
DROP POLICY IF EXISTS "Users can update their workflow sessions" ON workflow_sessions;
DROP POLICY IF EXISTS "Users can delete their workflow sessions" ON workflow_sessions;

DROP POLICY IF EXISTS "Users can view their organization's keyword collections" ON keyword_collections;
DROP POLICY IF EXISTS "Users can create keyword collections in their organization" ON keyword_collections;
DROP POLICY IF EXISTS "Users can update their keyword collections" ON keyword_collections;
DROP POLICY IF EXISTS "Users can delete their keyword collections" ON keyword_collections;

DROP POLICY IF EXISTS "Users can view their organization's keyword clusters" ON keyword_clusters;
DROP POLICY IF EXISTS "Users can create keyword clusters in their organization" ON keyword_clusters;
DROP POLICY IF EXISTS "Users can update their keyword clusters" ON keyword_clusters;
DROP POLICY IF EXISTS "Users can delete their keyword clusters" ON keyword_clusters;

-- RLS Policies for workflow_sessions
CREATE POLICY "Users can view their organization's workflow sessions"
  ON workflow_sessions FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create workflow sessions in their organization"
  ON workflow_sessions FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM users WHERE user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update their workflow sessions"
  ON workflow_sessions FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their workflow sessions"
  ON workflow_sessions FOR DELETE
  USING (
    org_id IN (
      SELECT org_id FROM users WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for keyword_collections
CREATE POLICY "Users can view their organization's keyword collections"
  ON keyword_collections FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create keyword collections in their organization"
  ON keyword_collections FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM users WHERE user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update their keyword collections"
  ON keyword_collections FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their keyword collections"
  ON keyword_collections FOR DELETE
  USING (
    org_id IN (
      SELECT org_id FROM users WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for keyword_clusters
CREATE POLICY "Users can view their organization's keyword clusters"
  ON keyword_clusters FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create keyword clusters in their organization"
  ON keyword_clusters FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their keyword clusters"
  ON keyword_clusters FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their keyword clusters"
  ON keyword_clusters FOR DELETE
  USING (
    org_id IN (
      SELECT org_id FROM users WHERE user_id = auth.uid()
    )
  );

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON workflow_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON keyword_collections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON keyword_clusters TO authenticated;

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_workflow_sessions_updated_at ON workflow_sessions;
DROP TRIGGER IF EXISTS update_keyword_collections_updated_at ON keyword_collections;
DROP TRIGGER IF EXISTS update_keyword_clusters_updated_at ON keyword_clusters;

-- Create triggers
CREATE TRIGGER update_workflow_sessions_updated_at
  BEFORE UPDATE ON workflow_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_keyword_collections_updated_at
  BEFORE UPDATE ON keyword_collections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_keyword_clusters_updated_at
  BEFORE UPDATE ON keyword_clusters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE workflow_sessions IS 'Stores workflow session data for the blog creation workflow';
COMMENT ON TABLE keyword_collections IS 'Stores keyword collections saved during keyword research step';
COMMENT ON TABLE keyword_clusters IS 'Stores keyword clusters (parent topics) created during clustering step';

