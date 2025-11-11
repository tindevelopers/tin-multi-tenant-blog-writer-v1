-- Migration: Fix OAuth State Type Mismatch
-- The state_value column is UUID but we generate hex strings (64 chars)
-- Change to TEXT to match the actual state generation
-- Date: 2025-01-18

-- Change state_value from UUID to TEXT
ALTER TABLE oauth_states 
ALTER COLUMN state_value TYPE TEXT;

-- Update the unique constraint to work with TEXT
-- (UUID constraint will be automatically dropped)
ALTER TABLE oauth_states 
ADD CONSTRAINT oauth_states_state_value_unique UNIQUE(state_value);

-- Add comment
COMMENT ON COLUMN oauth_states.state_value IS 'OAuth state parameter (hex string, 64 characters) for CSRF protection';

