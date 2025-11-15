-- Keyword search history to persist raw API payloads
CREATE TABLE IF NOT EXISTS keyword_search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT 'United States',
  language TEXT NOT NULL DEFAULT 'en',
  search_type TEXT NOT NULL DEFAULT 'general',
  search_mode TEXT NOT NULL DEFAULT 'keywords',
  filters JSONB,
  results JSONB,
  total_keywords INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_keyword_search_history_user_id
  ON keyword_search_history(user_id);

CREATE INDEX IF NOT EXISTS idx_keyword_search_history_created_at
  ON keyword_search_history(created_at DESC);

ALTER TABLE keyword_search_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their keyword searches"
  ON keyword_search_history
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their keyword searches"
  ON keyword_search_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their keyword searches"
  ON keyword_search_history
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their keyword searches"
  ON keyword_search_history
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_keyword_search_history_updated_at
  BEFORE UPDATE ON keyword_search_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

