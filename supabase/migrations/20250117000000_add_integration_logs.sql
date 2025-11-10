-- Migration: Add integration connection logs table
-- Created: 2025-01-17
-- Purpose: Comprehensive logging for integration connection attempts and OAuth flows

-- Integration Connection Logs Table
CREATE TABLE IF NOT EXISTS integration_connection_logs (
  log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('webflow', 'wordpress', 'shopify')),
  
  -- Connection attempt details
  connection_attempt_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL CHECK (status IN (
    'initiated',
    'oauth_initiated',
    'oauth_callback_received',
    'validating_credentials',
    'api_called',
    'api_success',
    'api_error',
    'saving_to_db',
    'saved',
    'failed',
    'cancelled'
  )),
  
  -- OAuth flow tracking
  oauth_state UUID,
  oauth_code TEXT,
  oauth_redirect_uri TEXT,
  
  -- Error tracking
  error_message TEXT,
  error_code TEXT,
  error_details JSONB,
  
  -- API interaction details
  api_request_payload JSONB, -- Sanitized (no sensitive credentials)
  api_response JSONB,
  api_duration_ms INTEGER,
  
  -- Database operation details
  saved_integration_id UUID,
  saved_recommendation_id UUID,
  
  -- Connection metadata
  connection_metadata JSONB DEFAULT '{}', -- Store non-sensitive connection info
  ip_address INET,
  user_agent TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_integration_logs_org_id ON integration_connection_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_integration_logs_user_id ON integration_connection_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_integration_logs_provider ON integration_connection_logs(provider);
CREATE INDEX IF NOT EXISTS idx_integration_logs_status ON integration_connection_logs(status);
CREATE INDEX IF NOT EXISTS idx_integration_logs_attempt_at ON integration_connection_logs(connection_attempt_at DESC);
CREATE INDEX IF NOT EXISTS idx_integration_logs_oauth_state ON integration_connection_logs(oauth_state) WHERE oauth_state IS NOT NULL;

-- RLS Policies for integration_connection_logs
ALTER TABLE integration_connection_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's connection logs"
  ON integration_connection_logs FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create connection logs in their organization"
  ON integration_connection_logs FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM users WHERE user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can update connection logs in their organization"
  ON integration_connection_logs FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM users WHERE user_id = auth.uid()
    )
  );

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_integration_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_integration_logs_updated_at
  BEFORE UPDATE ON integration_connection_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_integration_logs_updated_at();

-- OAuth State Management Table (for secure OAuth flow)
CREATE TABLE IF NOT EXISTS oauth_states (
  state_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  state_value UUID NOT NULL UNIQUE,
  org_id UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('webflow', 'wordpress', 'shopify')),
  redirect_uri TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '10 minutes'),
  
  -- Mark as used when OAuth callback is received
  used_at TIMESTAMPTZ,
  used BOOLEAN DEFAULT FALSE
);

-- Indexes for OAuth states
CREATE INDEX IF NOT EXISTS idx_oauth_states_state_value ON oauth_states(state_value);
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires_at ON oauth_states(expires_at);
CREATE INDEX IF NOT EXISTS idx_oauth_states_org_user ON oauth_states(org_id, user_id);

-- RLS Policies for oauth_states
ALTER TABLE oauth_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's OAuth states"
  ON oauth_states FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create OAuth states in their organization"
  ON oauth_states FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM users WHERE user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can update OAuth states in their organization"
  ON oauth_states FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM users WHERE user_id = auth.uid()
    )
  );

-- Function to clean up expired OAuth states (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_states()
RETURNS void AS $$
BEGIN
  DELETE FROM oauth_states
  WHERE expires_at < NOW() AND used = FALSE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE integration_connection_logs IS 'Comprehensive logging for integration connection attempts, OAuth flows, and API interactions';
COMMENT ON TABLE oauth_states IS 'Secure OAuth state management for CSRF protection during OAuth flows';

