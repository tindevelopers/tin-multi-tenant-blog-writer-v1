-- Migration: Add Environment-Suffixed Integration Tables
-- This migration adds support for environment-specific tables while maintaining backward compatibility
-- Date: 2025-01-15
-- Phase: 3 - Database Migration & Schema Unification

-- Enable required extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========== DEV ENVIRONMENT TABLES ==========

-- Integrations table for dev environment
CREATE TABLE IF NOT EXISTS integrations_dev (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NULL,
  provider TEXT NOT NULL,
  connection JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recommendations table for dev environment
CREATE TABLE IF NOT EXISTS recommendations_dev (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NULL,
  provider TEXT NOT NULL,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  recommended_backlinks INT NOT NULL,
  recommended_interlinks INT NOT NULL,
  per_keyword JSONB NOT NULL DEFAULT '[]',
  notes TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for dev tables
CREATE INDEX IF NOT EXISTS idx_integrations_dev_tenant ON integrations_dev(tenant_id);
CREATE INDEX IF NOT EXISTS idx_integrations_dev_provider ON integrations_dev(provider);
CREATE INDEX IF NOT EXISTS idx_integrations_dev_created ON integrations_dev(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_recs_dev_tenant ON recommendations_dev(tenant_id);
CREATE INDEX IF NOT EXISTS idx_recs_dev_provider ON recommendations_dev(provider);
CREATE INDEX IF NOT EXISTS idx_recs_dev_created ON recommendations_dev(created_at DESC);

-- ========== STAGING ENVIRONMENT TABLES ==========

-- Integrations table for staging environment
CREATE TABLE IF NOT EXISTS integrations_staging (
  LIKE integrations_dev INCLUDING ALL
);

-- Recommendations table for staging environment
CREATE TABLE IF NOT EXISTS recommendations_staging (
  LIKE recommendations_dev INCLUDING ALL
);

-- Indexes for staging tables
CREATE INDEX IF NOT EXISTS idx_integrations_staging_tenant ON integrations_staging(tenant_id);
CREATE INDEX IF NOT EXISTS idx_integrations_staging_provider ON integrations_staging(provider);
CREATE INDEX IF NOT EXISTS idx_integrations_staging_created ON integrations_staging(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_recs_staging_tenant ON recommendations_staging(tenant_id);
CREATE INDEX IF NOT EXISTS idx_recs_staging_provider ON recommendations_staging(provider);
CREATE INDEX IF NOT EXISTS idx_recs_staging_created ON recommendations_staging(created_at DESC);

-- ========== PROD ENVIRONMENT TABLES ==========

-- Integrations table for prod environment
CREATE TABLE IF NOT EXISTS integrations_prod (
  LIKE integrations_dev INCLUDING ALL
);

-- Recommendations table for prod environment
CREATE TABLE IF NOT EXISTS recommendations_prod (
  LIKE recommendations_dev INCLUDING ALL
);

-- Indexes for prod tables
CREATE INDEX IF NOT EXISTS idx_integrations_prod_tenant ON integrations_prod(tenant_id);
CREATE INDEX IF NOT EXISTS idx_integrations_prod_provider ON integrations_prod(provider);
CREATE INDEX IF NOT EXISTS idx_integrations_prod_created ON integrations_prod(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_recs_prod_tenant ON recommendations_prod(tenant_id);
CREATE INDEX IF NOT EXISTS idx_recs_prod_provider ON recommendations_prod(provider);
CREATE INDEX IF NOT EXISTS idx_recs_prod_created ON recommendations_prod(created_at DESC);

-- ========== OPTIONAL RLS POLICIES ==========
-- Uncomment these if you want to enable Row Level Security for environment tables

-- Enable RLS for dev tables
-- ALTER TABLE integrations_dev ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE recommendations_dev ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dev integrations
-- CREATE POLICY "read own integrations dev" ON integrations_dev FOR SELECT 
--   USING (tenant_id IN (SELECT org_id FROM users WHERE user_id = auth.uid()));
-- 
-- CREATE POLICY "insert own integrations dev" ON integrations_dev FOR INSERT 
--   WITH CHECK (tenant_id IN (SELECT org_id FROM users WHERE user_id = auth.uid()));
-- 
-- CREATE POLICY "update own integrations dev" ON integrations_dev FOR UPDATE 
--   USING (tenant_id IN (SELECT org_id FROM users WHERE user_id = auth.uid()));
-- 
-- CREATE POLICY "delete own integrations dev" ON integrations_dev FOR DELETE 
--   USING (tenant_id IN (SELECT org_id FROM users WHERE user_id = auth.uid()));

-- RLS Policies for dev recommendations
-- CREATE POLICY "read own recommendations dev" ON recommendations_dev FOR SELECT 
--   USING (tenant_id IN (SELECT org_id FROM users WHERE user_id = auth.uid()));
-- 
-- CREATE POLICY "insert own recommendations dev" ON recommendations_dev FOR INSERT 
--   WITH CHECK (tenant_id IN (SELECT org_id FROM users WHERE user_id = auth.uid()));

-- Repeat RLS policies for staging and prod (mirror dev policies)
-- ALTER TABLE integrations_staging ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE recommendations_staging ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE integrations_prod ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE recommendations_prod ENABLE ROW LEVEL SECURITY;

-- ========== COMMENTS FOR DOCUMENTATION ==========

COMMENT ON TABLE integrations_dev IS 'Stores integration connections for dev environment. Maps tenant_id (org_id) to provider-specific connection configs.';
COMMENT ON TABLE recommendations_dev IS 'Stores keyword recommendations from Blog Writer API for dev environment.';
COMMENT ON TABLE integrations_staging IS 'Stores integration connections for staging environment.';
COMMENT ON TABLE recommendations_staging IS 'Stores keyword recommendations from Blog Writer API for staging environment.';
COMMENT ON TABLE integrations_prod IS 'Stores integration connections for production environment.';
COMMENT ON TABLE recommendations_prod IS 'Stores keyword recommendations from Blog Writer API for production environment.';

COMMENT ON COLUMN integrations_dev.tenant_id IS 'Organization/tenant ID (maps to org_id in unified schema)';
COMMENT ON COLUMN integrations_dev.provider IS 'Integration provider type (webflow, wordpress, shopify, etc.)';
COMMENT ON COLUMN integrations_dev.connection IS 'Provider-specific connection configuration (API keys, site IDs, etc.)';
COMMENT ON COLUMN recommendations_dev.keywords IS 'Array of keywords for which recommendations were generated';
COMMENT ON COLUMN recommendations_dev.per_keyword IS 'JSONB array with per-keyword recommendations including difficulty, suggested backlinks/interlinks';

