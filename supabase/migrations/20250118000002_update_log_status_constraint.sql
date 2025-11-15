-- Migration: Update integration_connection_logs status constraint
-- Add missing status values used in the application
-- Date: 2025-01-18

-- Drop the old constraint if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'integration_connection_logs_status_check'
    ) THEN
        ALTER TABLE integration_connection_logs 
        DROP CONSTRAINT integration_connection_logs_status_check;
    END IF;
END $$;

-- Add new constraint with all status values
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

-- Also fix oauth_state column type (should be TEXT, not UUID)
-- Only alter if column exists and is not already TEXT
DO $$
BEGIN
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

COMMENT ON COLUMN integration_connection_logs.status IS 'Status of the integration connection attempt or operation';
COMMENT ON COLUMN integration_connection_logs.oauth_state IS 'OAuth state parameter (hex string) for CSRF protection';

