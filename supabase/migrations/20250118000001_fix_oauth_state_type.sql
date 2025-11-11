-- Migration: Fix OAuth State Type Mismatch
-- The state_value column is UUID but we generate hex strings (64 chars)
-- Change to TEXT to match the actual state generation
-- Date: 2025-01-18

-- Drop existing constraint if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'oauth_states_state_value_unique'
    ) THEN
        ALTER TABLE oauth_states 
        DROP CONSTRAINT oauth_states_state_value_unique;
    END IF;
END $$;

-- Change state_value from UUID to TEXT
-- This will automatically drop any UUID-specific constraints
ALTER TABLE oauth_states 
ALTER COLUMN state_value TYPE TEXT;

-- Recreate the unique constraint for TEXT type
ALTER TABLE oauth_states 
ADD CONSTRAINT oauth_states_state_value_unique UNIQUE(state_value);

-- Add comment
COMMENT ON COLUMN oauth_states.state_value IS 'OAuth state parameter (hex string, 64 characters) for CSRF protection';

