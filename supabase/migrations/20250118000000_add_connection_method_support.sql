-- Migration: Add Connection Method Support to Integration Tables
-- This migration adds support for API Key vs OAuth connection methods
-- Date: 2025-01-18
-- Phase: 1 - Database Schema Updates

-- Enable required extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========== CREATE UPDATED_AT TRIGGER FUNCTION ==========
-- This function will be used to automatically update the updated_at timestamp

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========== UPDATE INTEGRATIONS_DEV TABLE ==========

-- Add org_id column if it doesn't exist (migrate from tenant_id)
DO $$
BEGIN
  -- Check if org_id column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'integrations_dev' AND column_name = 'org_id'
  ) THEN
    -- Add org_id column
    ALTER TABLE integrations_dev ADD COLUMN org_id UUID;
    
    -- Migrate data from tenant_id to org_id
    UPDATE integrations_dev SET org_id = tenant_id WHERE tenant_id IS NOT NULL;
    
    -- Make org_id NOT NULL after migration
    ALTER TABLE integrations_dev ALTER COLUMN org_id SET NOT NULL;
    
    -- Add foreign key constraint
    ALTER TABLE integrations_dev 
    ADD CONSTRAINT fk_integrations_dev_org 
    FOREIGN KEY (org_id) REFERENCES organizations(org_id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add connection_method column
ALTER TABLE integrations_dev 
ADD COLUMN IF NOT EXISTS connection_method TEXT CHECK (connection_method IN ('api_key', 'oauth', NULL));

-- Add status column
ALTER TABLE integrations_dev 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'expired', 'error'));

-- Add last_tested_at column
ALTER TABLE integrations_dev 
ADD COLUMN IF NOT EXISTS last_tested_at TIMESTAMPTZ;

-- Add last_sync_at column
ALTER TABLE integrations_dev 
ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ;

-- Add error_message column
ALTER TABLE integrations_dev 
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Add metadata column
ALTER TABLE integrations_dev 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add updated_at column
ALTER TABLE integrations_dev 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add provider check constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'integrations_dev_provider_check'
  ) THEN
    ALTER TABLE integrations_dev 
    ADD CONSTRAINT integrations_dev_provider_check 
    CHECK (provider IN ('webflow', 'wordpress', 'shopify'));
  END IF;
END $$;

-- Add UNIQUE constraint on (org_id, provider) to ensure one integration per provider per org
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'integrations_dev_org_provider_unique'
  ) THEN
    ALTER TABLE integrations_dev 
    ADD CONSTRAINT integrations_dev_org_provider_unique 
    UNIQUE(org_id, provider);
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_integrations_dev_org_id ON integrations_dev(org_id);
CREATE INDEX IF NOT EXISTS idx_integrations_dev_provider ON integrations_dev(provider);
CREATE INDEX IF NOT EXISTS idx_integrations_dev_status ON integrations_dev(status);
CREATE INDEX IF NOT EXISTS idx_integrations_dev_connection_method ON integrations_dev(connection_method);
CREATE INDEX IF NOT EXISTS idx_integrations_dev_last_tested ON integrations_dev(last_tested_at DESC);

-- Create updated_at trigger
DROP TRIGGER IF EXISTS update_integrations_dev_updated_at ON integrations_dev;
CREATE TRIGGER update_integrations_dev_updated_at
  BEFORE UPDATE ON integrations_dev
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========== UPDATE INTEGRATIONS_STAGING TABLE ==========

-- Add org_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'integrations_staging' AND column_name = 'org_id'
  ) THEN
    ALTER TABLE integrations_staging ADD COLUMN org_id UUID;
    UPDATE integrations_staging SET org_id = tenant_id WHERE tenant_id IS NOT NULL;
    ALTER TABLE integrations_staging ALTER COLUMN org_id SET NOT NULL;
    ALTER TABLE integrations_staging 
    ADD CONSTRAINT fk_integrations_staging_org 
    FOREIGN KEY (org_id) REFERENCES organizations(org_id) ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE integrations_staging 
ADD COLUMN IF NOT EXISTS connection_method TEXT CHECK (connection_method IN ('api_key', 'oauth', NULL));

ALTER TABLE integrations_staging 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'expired', 'error'));

ALTER TABLE integrations_staging 
ADD COLUMN IF NOT EXISTS last_tested_at TIMESTAMPTZ;

ALTER TABLE integrations_staging 
ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ;

ALTER TABLE integrations_staging 
ADD COLUMN IF NOT EXISTS error_message TEXT;

ALTER TABLE integrations_staging 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

ALTER TABLE integrations_staging 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'integrations_staging_provider_check'
  ) THEN
    ALTER TABLE integrations_staging 
    ADD CONSTRAINT integrations_staging_provider_check 
    CHECK (provider IN ('webflow', 'wordpress', 'shopify'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'integrations_staging_org_provider_unique'
  ) THEN
    ALTER TABLE integrations_staging 
    ADD CONSTRAINT integrations_staging_org_provider_unique 
    UNIQUE(org_id, provider);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_integrations_staging_org_id ON integrations_staging(org_id);
CREATE INDEX IF NOT EXISTS idx_integrations_staging_provider ON integrations_staging(provider);
CREATE INDEX IF NOT EXISTS idx_integrations_staging_status ON integrations_staging(status);
CREATE INDEX IF NOT EXISTS idx_integrations_staging_connection_method ON integrations_staging(connection_method);
CREATE INDEX IF NOT EXISTS idx_integrations_staging_last_tested ON integrations_staging(last_tested_at DESC);

DROP TRIGGER IF EXISTS update_integrations_staging_updated_at ON integrations_staging;
CREATE TRIGGER update_integrations_staging_updated_at
  BEFORE UPDATE ON integrations_staging
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========== UPDATE INTEGRATIONS_PROD TABLE ==========

-- Add org_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'integrations_prod' AND column_name = 'org_id'
  ) THEN
    ALTER TABLE integrations_prod ADD COLUMN org_id UUID;
    UPDATE integrations_prod SET org_id = tenant_id WHERE tenant_id IS NOT NULL;
    ALTER TABLE integrations_prod ALTER COLUMN org_id SET NOT NULL;
    ALTER TABLE integrations_prod 
    ADD CONSTRAINT fk_integrations_prod_org 
    FOREIGN KEY (org_id) REFERENCES organizations(org_id) ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE integrations_prod 
ADD COLUMN IF NOT EXISTS connection_method TEXT CHECK (connection_method IN ('api_key', 'oauth', NULL));

ALTER TABLE integrations_prod 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'expired', 'error'));

ALTER TABLE integrations_prod 
ADD COLUMN IF NOT EXISTS last_tested_at TIMESTAMPTZ;

ALTER TABLE integrations_prod 
ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ;

ALTER TABLE integrations_prod 
ADD COLUMN IF NOT EXISTS error_message TEXT;

ALTER TABLE integrations_prod 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

ALTER TABLE integrations_prod 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'integrations_prod_provider_check'
  ) THEN
    ALTER TABLE integrations_prod 
    ADD CONSTRAINT integrations_prod_provider_check 
    CHECK (provider IN ('webflow', 'wordpress', 'shopify'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'integrations_prod_org_provider_unique'
  ) THEN
    ALTER TABLE integrations_prod 
    ADD CONSTRAINT integrations_prod_org_provider_unique 
    UNIQUE(org_id, provider);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_integrations_prod_org_id ON integrations_prod(org_id);
CREATE INDEX IF NOT EXISTS idx_integrations_prod_provider ON integrations_prod(provider);
CREATE INDEX IF NOT EXISTS idx_integrations_prod_status ON integrations_prod(status);
CREATE INDEX IF NOT EXISTS idx_integrations_prod_connection_method ON integrations_prod(connection_method);
CREATE INDEX IF NOT EXISTS idx_integrations_prod_last_tested ON integrations_prod(last_tested_at DESC);

DROP TRIGGER IF EXISTS update_integrations_prod_updated_at ON integrations_prod;
CREATE TRIGGER update_integrations_prod_updated_at
  BEFORE UPDATE ON integrations_prod
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========== MIGRATE EXISTING DATA ==========
-- Determine connection_method and status from existing connection JSONB

-- Migrate integrations_dev
UPDATE integrations_dev
SET 
  connection_method = CASE
    WHEN connection->>'access_token' IS NOT NULL THEN 'oauth'
    WHEN connection->>'api_key' IS NOT NULL OR connection->>'api_token' IS NOT NULL THEN 'api_key'
    ELSE NULL
  END,
  status = CASE
    WHEN connection->>'access_token' IS NOT NULL 
      OR connection->>'api_key' IS NOT NULL 
      OR connection->>'api_token' IS NOT NULL 
    THEN 'active'
    ELSE 'inactive'
  END
WHERE connection_method IS NULL;

-- Migrate integrations_staging
UPDATE integrations_staging
SET 
  connection_method = CASE
    WHEN connection->>'access_token' IS NOT NULL THEN 'oauth'
    WHEN connection->>'api_key' IS NOT NULL OR connection->>'api_token' IS NOT NULL THEN 'api_key'
    ELSE NULL
  END,
  status = CASE
    WHEN connection->>'access_token' IS NOT NULL 
      OR connection->>'api_key' IS NOT NULL 
      OR connection->>'api_token' IS NOT NULL 
    THEN 'active'
    ELSE 'inactive'
  END
WHERE connection_method IS NULL;

-- Migrate integrations_prod
UPDATE integrations_prod
SET 
  connection_method = CASE
    WHEN connection->>'access_token' IS NOT NULL THEN 'oauth'
    WHEN connection->>'api_key' IS NOT NULL OR connection->>'api_token' IS NOT NULL THEN 'api_key'
    ELSE NULL
  END,
  status = CASE
    WHEN connection->>'access_token' IS NOT NULL 
      OR connection->>'api_key' IS NOT NULL 
      OR connection->>'api_token' IS NOT NULL 
    THEN 'active'
    ELSE 'inactive'
  END
WHERE connection_method IS NULL;

-- ========== ADD COMMENTS FOR DOCUMENTATION ==========

COMMENT ON COLUMN integrations_dev.connection_method IS 'Connection method: api_key or oauth. NULL if not yet configured.';
COMMENT ON COLUMN integrations_dev.status IS 'Connection status: active, inactive, expired, or error';
COMMENT ON COLUMN integrations_dev.last_tested_at IS 'Timestamp of last successful connection test';
COMMENT ON COLUMN integrations_dev.last_sync_at IS 'Timestamp of last successful sync/publish operation';
COMMENT ON COLUMN integrations_dev.error_message IS 'Error message if status is error';
COMMENT ON COLUMN integrations_dev.metadata IS 'Additional provider-specific metadata';
COMMENT ON COLUMN integrations_dev.org_id IS 'Organization ID (replaces tenant_id). Foreign key to organizations table.';

COMMENT ON COLUMN integrations_staging.connection_method IS 'Connection method: api_key or oauth. NULL if not yet configured.';
COMMENT ON COLUMN integrations_staging.status IS 'Connection status: active, inactive, expired, or error';
COMMENT ON COLUMN integrations_staging.org_id IS 'Organization ID (replaces tenant_id). Foreign key to organizations table.';

COMMENT ON COLUMN integrations_prod.connection_method IS 'Connection method: api_key or oauth. NULL if not yet configured.';
COMMENT ON COLUMN integrations_prod.status IS 'Connection status: active, inactive, expired, or error';
COMMENT ON COLUMN integrations_prod.org_id IS 'Organization ID (replaces tenant_id). Foreign key to organizations table.';

