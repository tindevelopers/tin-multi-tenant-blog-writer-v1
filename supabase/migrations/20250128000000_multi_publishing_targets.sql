-- Migration: Support Multiple Publishing Targets and Drop Integration Constraint
-- Date: 2025-01-28

BEGIN;

-- Allow multiple integrations of the same type per organization
-- Drop from base table (if exists)
ALTER TABLE integrations
  DROP CONSTRAINT IF EXISTS unique_org_integration_type;

-- Drop from environment-specific tables (dev, staging, prod)
ALTER TABLE IF EXISTS integrations_dev
  DROP CONSTRAINT IF EXISTS integrations_dev_org_provider_unique;

ALTER TABLE IF EXISTS integrations_staging
  DROP CONSTRAINT IF EXISTS integrations_staging_org_provider_unique;

ALTER TABLE IF EXISTS integrations_prod
  DROP CONSTRAINT IF EXISTS integrations_prod_org_provider_unique;

-- Publishing targets table
CREATE TABLE IF NOT EXISTS publishing_targets (
  target_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES integrations(integration_id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  site_id TEXT NOT NULL,
  site_name TEXT,
  collection_id TEXT,
  is_default BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES users(user_id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_publishing_targets_org ON publishing_targets(org_id);
CREATE INDEX IF NOT EXISTS idx_publishing_targets_integration ON publishing_targets(integration_id);
CREATE INDEX IF NOT EXISTS idx_publishing_targets_provider ON publishing_targets(provider);
CREATE INDEX IF NOT EXISTS idx_publishing_targets_default
  ON publishing_targets(org_id)
  WHERE is_default = true;

ALTER TABLE publishing_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_org_publishing_targets" ON publishing_targets;
CREATE POLICY "select_org_publishing_targets"
  ON publishing_targets FOR SELECT
  USING (org_id IN (SELECT org_id FROM users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "insert_org_publishing_targets" ON publishing_targets;
CREATE POLICY "insert_org_publishing_targets"
  ON publishing_targets FOR INSERT
  WITH CHECK (
    org_id IN (SELECT org_id FROM users WHERE user_id = auth.uid())
    AND created_by = auth.uid()
  );

DROP POLICY IF EXISTS "update_org_publishing_targets" ON publishing_targets;
CREATE POLICY "update_org_publishing_targets"
  ON publishing_targets FOR UPDATE
  USING (org_id IN (SELECT org_id FROM users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "delete_org_publishing_targets" ON publishing_targets;
CREATE POLICY "delete_org_publishing_targets"
  ON publishing_targets FOR DELETE
  USING (org_id IN (SELECT org_id FROM users WHERE user_id = auth.uid()));

CREATE OR REPLACE FUNCTION update_publishing_targets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_publishing_targets_updated_at ON publishing_targets;
CREATE TRIGGER trg_publishing_targets_updated_at
  BEFORE UPDATE ON publishing_targets
  FOR EACH ROW
  EXECUTE FUNCTION update_publishing_targets_updated_at();

COMMIT;
