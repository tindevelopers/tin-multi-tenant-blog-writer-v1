-- Content Goal Prompts Table - Fixed Version
-- Allows system admins to configure AI prompts for each content goal type

CREATE TABLE IF NOT EXISTS content_goal_prompts (
  prompt_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(org_id) ON DELETE CASCADE,
  content_goal TEXT NOT NULL CHECK (content_goal IN ('seo', 'engagement', 'conversions', 'brand_awareness')),
  prompt_title TEXT NOT NULL,
  system_prompt TEXT NOT NULL, -- The main instruction prompt for the AI
  user_prompt_template TEXT, -- Template for user-facing instructions (optional)
  instructions JSONB DEFAULT '{}', -- Additional structured instructions
  is_active BOOLEAN DEFAULT true,
  is_system_default BOOLEAN DEFAULT false, -- System-wide defaults (org_id is null)
  priority INTEGER DEFAULT 0, -- Higher priority prompts override lower ones
  created_by UUID REFERENCES users(user_id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_content_goal_prompts_org_goal 
  ON content_goal_prompts(org_id, content_goal, is_active);

CREATE INDEX IF NOT EXISTS idx_content_goal_prompts_system_defaults 
  ON content_goal_prompts(content_goal, is_system_default, is_active) 
  WHERE is_system_default = true;

-- Unique constraint: Only one active prompt per content goal per org (or system default)
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_prompt_per_goal_org 
  ON content_goal_prompts(org_id, content_goal) 
  WHERE is_active = true AND is_system_default = false;

CREATE UNIQUE INDEX IF NOT EXISTS unique_active_system_prompt_per_goal 
  ON content_goal_prompts(content_goal) 
  WHERE is_active = true AND is_system_default = true;

-- Enable RLS
ALTER TABLE content_goal_prompts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (safe to run multiple times)
DROP POLICY IF EXISTS "System admins can view all prompts" ON content_goal_prompts;
DROP POLICY IF EXISTS "System admins can insert prompts" ON content_goal_prompts;
DROP POLICY IF EXISTS "System admins can update prompts" ON content_goal_prompts;
DROP POLICY IF EXISTS "System admins can delete prompts" ON content_goal_prompts;

-- RLS Policies
-- System admins can view all prompts
CREATE POLICY "System admins can view all prompts"
  ON content_goal_prompts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE user_id = auth.uid() 
      AND role IN ('system_admin', 'super_admin', 'admin', 'manager')
    )
    OR org_id IN (
      SELECT org_id FROM users WHERE user_id = auth.uid()
    )
    OR is_system_default = true
  );

-- System admins can insert prompts
CREATE POLICY "System admins can insert prompts"
  ON content_goal_prompts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE user_id = auth.uid() 
      AND role IN ('system_admin', 'super_admin', 'admin', 'manager')
    )
    OR (
      org_id IN (
        SELECT org_id FROM users 
        WHERE user_id = auth.uid() 
        AND role IN ('system_admin', 'super_admin', 'admin', 'manager')
      )
    )
  );

-- System admins can update prompts
CREATE POLICY "System admins can update prompts"
  ON content_goal_prompts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE user_id = auth.uid() 
      AND role IN ('system_admin', 'super_admin', 'admin', 'manager')
    )
    OR (
      org_id IN (
        SELECT org_id FROM users 
        WHERE user_id = auth.uid() 
        AND role IN ('system_admin', 'super_admin', 'admin', 'manager')
      )
    )
  );

-- System admins can delete prompts
CREATE POLICY "System admins can delete prompts"
  ON content_goal_prompts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE user_id = auth.uid() 
      AND role IN ('system_admin', 'super_admin', 'admin', 'manager')
    )
    OR (
      org_id IN (
        SELECT org_id FROM users 
        WHERE user_id = auth.uid() 
        AND role IN ('system_admin', 'super_admin', 'admin', 'manager')
      )
    )
  );

-- Insert default system prompts for each content goal
INSERT INTO content_goal_prompts (content_goal, prompt_title, system_prompt, is_system_default, is_active, priority) VALUES
(
  'seo',
  'SEO & Rankings - Default',
  'You are an expert SEO content writer. Your primary goal is to create content that ranks highly in search engines. Focus on:
- Comprehensive keyword optimization throughout the content
- Proper heading hierarchy (H1, H2, H3) with target keywords
- Long-form, in-depth content (2000+ words) that thoroughly covers the topic
- Internal linking opportunities
- Featured snippet optimization with clear, concise answers
- E-E-A-T signals (Experience, Expertise, Authoritativeness, Trustworthiness)
- Schema markup opportunities
- Meta descriptions and title tag optimization
- Natural keyword placement without keyword stuffing
- Answer user intent completely and comprehensively',
  true,
  true,
  100
),
(
  'engagement',
  'Engagement - Default',
  'You are an expert content writer focused on maximizing reader engagement. Your primary goal is to create content that encourages shares, comments, and social interaction. Focus on:
- Compelling, attention-grabbing headlines
- Storytelling and narrative elements
- Interactive elements (questions, polls, calls-to-action)
- Visual content suggestions (images, infographics, videos)
- Relatable examples and case studies
- Emotional connection with the audience
- Controversial or thought-provoking angles (when appropriate)
- Social sharing optimization
- Comment-worthy sections that invite discussion
- Personal anecdotes and experiences
- Conversational, accessible tone
- Clear calls-to-action for engagement',
  true,
  true,
  100
),
(
  'conversions',
  'Conversions - Default',
  'You are an expert conversion-focused content writer. Your primary goal is to create content that drives sales, sign-ups, and other desired actions. Focus on:
- Clear value propositions and benefits
- Problem-solution framework
- Social proof and testimonials
- Urgency and scarcity elements (when appropriate)
- Multiple strategic call-to-action placements
- Objection handling and FAQ sections
- Trust signals and credibility indicators
- Step-by-step guides and tutorials
- Comparison tables and decision frameworks
- Risk-reversal elements (guarantees, free trials)
- Lead magnet opportunities
- Email capture and newsletter signup prompts
- Product/service recommendations with clear CTAs
- Conversion-optimized formatting (scannable, easy to read)',
  true,
  true,
  100
),
(
  'brand_awareness',
  'Brand Awareness - Default',
  'You are an expert brand storyteller. Your primary goal is to create content that builds brand recognition and establishes thought leadership. Focus on:
- Brand voice and personality consistency
- Thought leadership and industry insights
- Unique perspectives and original ideas
- Brand values and mission alignment
- Educational content that positions the brand as an authority
- Consistent messaging and brand elements
- Visual brand identity suggestions
- Shareable, memorable content
- Industry trend analysis and commentary
- Behind-the-scenes content
- Brand story integration
- Community building elements
- Long-term brand positioning
- Content that reflects brand values and culture',
  true,
  true,
  100
)
ON CONFLICT DO NOTHING;

-- Function to get the best prompt for a content goal (org-specific or system default)
CREATE OR REPLACE FUNCTION get_content_goal_prompt(
  p_org_id UUID,
  p_content_goal TEXT
)
RETURNS TABLE (
  prompt_id UUID,
  system_prompt TEXT,
  user_prompt_template TEXT,
  instructions JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cgp.prompt_id,
    cgp.system_prompt,
    cgp.user_prompt_template,
    cgp.instructions
  FROM content_goal_prompts cgp
  WHERE 
    cgp.content_goal = p_content_goal
    AND cgp.is_active = true
    AND (
      (cgp.org_id = p_org_id AND cgp.is_system_default = false)
      OR (cgp.is_system_default = true AND cgp.org_id IS NULL)
    )
  ORDER BY 
    CASE WHEN cgp.org_id = p_org_id THEN 1 ELSE 2 END, -- Org-specific first
    cgp.priority DESC,
    cgp.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
