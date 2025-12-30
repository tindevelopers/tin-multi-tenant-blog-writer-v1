-- Workflow Instruction Sets
-- Org-level “dashboard instructions” that apply to all workflows (standard/premium/comparison/etc.)
-- Provides scoped prompts/instructions with priority ordering.

CREATE TABLE IF NOT EXISTS workflow_instruction_sets (
  instruction_set_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT true,
  -- Scope allows selecting which requests this instruction set applies to.
  -- Example:
  -- { "workflow": "all|standard|premium|comparison", "platform": "any|webflow|wordpress", "content_type": "any|comparison|review" }
  scope JSONB NOT NULL DEFAULT '{"workflow":"all","platform":"any","content_type":"any"}',
  -- Optional system prompt (higher-level instruction)
  system_prompt TEXT,
  -- Main instructions body (dashboard editable)
  instructions TEXT NOT NULL,
  -- Higher priority overrides lower priority when multiple match
  priority INTEGER DEFAULT 0,
  created_by UUID REFERENCES users(user_id),
  updated_by UUID REFERENCES users(user_id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_workflow_instruction_sets_org_enabled
  ON workflow_instruction_sets(org_id, enabled, priority);

CREATE INDEX IF NOT EXISTS idx_workflow_instruction_sets_scope_gin
  ON workflow_instruction_sets
  USING GIN (scope);

-- Enable RLS
ALTER TABLE workflow_instruction_sets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (safe to run multiple times)
DROP POLICY IF EXISTS "Org members can view enabled instruction sets" ON workflow_instruction_sets;
DROP POLICY IF EXISTS "Org admins can manage instruction sets" ON workflow_instruction_sets;

-- RLS Policies
-- Org members can view enabled instruction sets for their org
CREATE POLICY "Org members can view enabled instruction sets"
  ON workflow_instruction_sets FOR SELECT
  USING (
    enabled = true
    AND org_id IN (
      SELECT org_id FROM users WHERE user_id = auth.uid()
    )
  );

-- Org admins/managers/system admins can insert/update/delete instruction sets for their org
CREATE POLICY "Org admins can manage instruction sets"
  ON workflow_instruction_sets FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM users
      WHERE user_id = auth.uid()
      AND role IN ('system_admin', 'super_admin', 'admin', 'manager')
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM users
      WHERE user_id = auth.uid()
      AND role IN ('system_admin', 'super_admin', 'admin', 'manager')
    )
  );


