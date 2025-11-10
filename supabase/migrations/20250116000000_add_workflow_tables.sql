-- Migration: Add workflow tables for horizontal blog creation workflow
-- Created: 2025-01-16

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
-- Create table only if it doesn't exist, handling foreign key dependencies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'keyword_collections'
  ) THEN
    CREATE TABLE keyword_collections (
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
  END IF;
END $$;

-- Keyword Clusters Table (Parent Topics)
-- Create table only if it doesn't exist, handling foreign key dependencies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'keyword_clusters'
  ) THEN
    CREATE TABLE keyword_clusters (
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
  END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_workflow_sessions_org_id ON workflow_sessions(org_id);
CREATE INDEX IF NOT EXISTS idx_workflow_sessions_created_by ON workflow_sessions(created_by);
CREATE INDEX IF NOT EXISTS idx_keyword_collections_session_id ON keyword_collections(session_id);
CREATE INDEX IF NOT EXISTS idx_keyword_collections_org_id ON keyword_collections(org_id);
CREATE INDEX IF NOT EXISTS idx_keyword_clusters_session_id ON keyword_clusters(session_id);
CREATE INDEX IF NOT EXISTS idx_keyword_clusters_collection_id ON keyword_clusters(collection_id);
CREATE INDEX IF NOT EXISTS idx_keyword_clusters_org_id ON keyword_clusters(org_id);

-- RLS Policies for workflow_sessions
ALTER TABLE workflow_sessions ENABLE ROW LEVEL SECURITY;

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
ALTER TABLE keyword_collections ENABLE ROW LEVEL SECURITY;

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
ALTER TABLE keyword_clusters ENABLE ROW LEVEL SECURITY;

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

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

