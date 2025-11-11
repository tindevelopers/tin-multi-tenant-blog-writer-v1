-- Migration: Fix Migration Conflicts
-- Handles cases where constraints or columns already exist
-- Date: 2025-01-18
-- Run this if previous migrations failed due to existing objects

-- Fix oauth_states table
DO $$
BEGIN
    -- Drop constraint if exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'oauth_states_state_value_unique'
    ) THEN
        ALTER TABLE oauth_states 
        DROP CONSTRAINT oauth_states_state_value_unique;
    END IF;
    
    -- Change column type if not already TEXT
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'oauth_states' 
        AND column_name = 'state_value'
        AND data_type != 'text'
    ) THEN
        ALTER TABLE oauth_states 
        ALTER COLUMN state_value TYPE TEXT;
    END IF;
    
    -- Recreate constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'oauth_states_state_value_unique'
    ) THEN
        ALTER TABLE oauth_states 
        ADD CONSTRAINT oauth_states_state_value_unique UNIQUE(state_value);
    END IF;
END $$;

-- Fix integration_connection_logs table
DO $$
BEGIN
    -- Drop old constraint if exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'integration_connection_logs_status_check'
    ) THEN
        ALTER TABLE integration_connection_logs 
        DROP CONSTRAINT integration_connection_logs_status_check;
    END IF;
    
    -- Add new constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'integration_connection_logs_status_check'
    ) THEN
        ALTER TABLE integration_connection_logs 
        ADD CONSTRAINT integration_connection_logs_status_check 
        CHECK (status IN (
          'initiated',
          'oauth_initiated',
          'oauth_callback_received',
          'oauth_redirected',
          'oauth_success',
          'oauth_failed',
          'validating_credentials',
          'api_called',
          'api_success',
          'api_error',
          'saving_to_db',
          'saved',
          'failed',
          'cancelled',
          'connection_test_initiated',
          'connection_test_success',
          'connection_test_failed',
          'updated'
        ));
    END IF;
    
    -- Fix oauth_state column type if needed
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'integration_connection_logs' 
        AND column_name = 'oauth_state'
        AND data_type != 'text'
    ) THEN
        ALTER TABLE integration_connection_logs 
        ALTER COLUMN oauth_state TYPE TEXT;
    END IF;
END $$;

-- Add comments
COMMENT ON COLUMN oauth_states.state_value IS 'OAuth state parameter (hex string, 64 characters) for CSRF protection';
COMMENT ON COLUMN integration_connection_logs.status IS 'Status of the integration connection attempt or operation';
COMMENT ON COLUMN integration_connection_logs.oauth_state IS 'OAuth state parameter (hex string) for CSRF protection';

