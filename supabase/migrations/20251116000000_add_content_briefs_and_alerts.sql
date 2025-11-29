-- Migration: Add content_briefs and keyword_alerts tables
-- Created: 2025-11-16
-- Purpose: Support Phase 4-6 features (content briefs and keyword alerts)

-- Create content_briefs table for storing generated content briefs
CREATE TABLE IF NOT EXISTS content_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  primary_keyword TEXT NOT NULL,
  brief_data JSONB NOT NULL,
  search_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for content_briefs
CREATE INDEX IF NOT EXISTS idx_content_briefs_user_id ON content_briefs(user_id);
CREATE INDEX IF NOT EXISTS idx_content_briefs_primary_keyword ON content_briefs(primary_keyword);
CREATE INDEX IF NOT EXISTS idx_content_briefs_created_at ON content_briefs(created_at DESC);

-- Create keyword_alerts table for keyword monitoring
CREATE TABLE IF NOT EXISTS keyword_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('volume_spike', 'difficulty_change', 'new_competitor', 'trend_reversal')),
  threshold NUMERIC NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  last_triggered TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for keyword_alerts
CREATE INDEX IF NOT EXISTS idx_keyword_alerts_user_id ON keyword_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_keyword_alerts_keyword ON keyword_alerts(keyword);
CREATE INDEX IF NOT EXISTS idx_keyword_alerts_enabled ON keyword_alerts(enabled) WHERE enabled = TRUE;
CREATE INDEX IF NOT EXISTS idx_keyword_alerts_alert_type ON keyword_alerts(alert_type);

-- Enable Row Level Security
ALTER TABLE content_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for content_briefs
CREATE POLICY "Users can view their own content briefs"
  ON content_briefs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own content briefs"
  ON content_briefs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own content briefs"
  ON content_briefs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own content briefs"
  ON content_briefs FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for keyword_alerts
CREATE POLICY "Users can view their own keyword alerts"
  ON keyword_alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own keyword alerts"
  ON keyword_alerts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own keyword alerts"
  ON keyword_alerts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own keyword alerts"
  ON keyword_alerts FOR DELETE
  USING (auth.uid() = user_id);

-- Add comments for documentation
COMMENT ON TABLE content_briefs IS 'Stores generated content briefs from keyword clusters';
COMMENT ON TABLE keyword_alerts IS 'Stores keyword monitoring alerts for volume spikes, difficulty changes, etc.';
COMMENT ON COLUMN content_briefs.brief_data IS 'Complete content brief JSON including outline, keyword distribution, SEO recommendations';
COMMENT ON COLUMN keyword_alerts.alert_type IS 'Type of alert: volume_spike, difficulty_change, new_competitor, trend_reversal';
COMMENT ON COLUMN keyword_alerts.threshold IS 'Threshold value for triggering the alert (e.g., 50 for 50% volume increase)';

