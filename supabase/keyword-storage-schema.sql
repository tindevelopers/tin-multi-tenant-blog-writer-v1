-- Keyword Research Sessions Table
CREATE TABLE IF NOT EXISTS keyword_research_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  research_results JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Keywords Table
CREATE TABLE IF NOT EXISTS user_keywords (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  research_session_id UUID REFERENCES keyword_research_sessions(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  search_volume INTEGER,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')) NOT NULL,
  competition DECIMAL(3,2) CHECK (competition >= 0 AND competition <= 1),
  cpc DECIMAL(10,4),
  trend_score DECIMAL(5,2),
  recommended BOOLEAN DEFAULT FALSE,
  reason TEXT,
  related_keywords TEXT[],
  long_tail_keywords TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_keyword_research_sessions_user_id ON keyword_research_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_keyword_research_sessions_created_at ON keyword_research_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_keywords_user_id ON user_keywords(user_id);
CREATE INDEX IF NOT EXISTS idx_user_keywords_session_id ON user_keywords(research_session_id);
CREATE INDEX IF NOT EXISTS idx_user_keywords_keyword ON user_keywords(keyword);
CREATE INDEX IF NOT EXISTS idx_user_keywords_created_at ON user_keywords(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_keywords_difficulty ON user_keywords(difficulty);
CREATE INDEX IF NOT EXISTS idx_user_keywords_recommended ON user_keywords(recommended);

-- RLS Policies
ALTER TABLE keyword_research_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_keywords ENABLE ROW LEVEL SECURITY;

-- Users can only access their own research sessions
CREATE POLICY "Users can view their own research sessions" ON keyword_research_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own research sessions" ON keyword_research_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own research sessions" ON keyword_research_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own research sessions" ON keyword_research_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Users can only access their own keywords
CREATE POLICY "Users can view their own keywords" ON user_keywords
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own keywords" ON user_keywords
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own keywords" ON user_keywords
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own keywords" ON user_keywords
  FOR DELETE USING (auth.uid() = user_id);

-- Functions for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_keyword_research_sessions_updated_at
  BEFORE UPDATE ON keyword_research_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_keywords_updated_at
  BEFORE UPDATE ON user_keywords
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
