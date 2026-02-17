-- Add discovery pipeline columns to sponsor_leads
-- These columns support the automated sponsor discovery engine

ALTER TABLE sponsor_leads ADD COLUMN IF NOT EXISTS competitor_mentioned TEXT;
ALTER TABLE sponsor_leads ADD COLUMN IF NOT EXISTS eagerness_score INTEGER;
ALTER TABLE sponsor_leads ADD COLUMN IF NOT EXISTS discovery_method TEXT DEFAULT 'manual';
ALTER TABLE sponsor_leads ADD COLUMN IF NOT EXISTS competitive_context JSONB;
ALTER TABLE sponsor_leads ADD COLUMN IF NOT EXISTS match_reason TEXT;
ALTER TABLE sponsor_leads ADD COLUMN IF NOT EXISTS pricing_tier TEXT;
ALTER TABLE sponsor_leads ADD COLUMN IF NOT EXISTS suggested_price_cents INTEGER;
ALTER TABLE sponsor_leads ADD COLUMN IF NOT EXISTS guaranteed_clicks INTEGER;
ALTER TABLE sponsor_leads ADD COLUMN IF NOT EXISTS email_draft JSONB;
ALTER TABLE sponsor_leads ADD COLUMN IF NOT EXISTS content_examples JSONB;

CREATE INDEX IF NOT EXISTS idx_sponsor_competitor ON sponsor_leads(competitor_mentioned);
CREATE INDEX IF NOT EXISTS idx_sponsor_discovery ON sponsor_leads(discovery_method);

COMMENT ON COLUMN sponsor_leads.competitor_mentioned IS 'Incumbent company that triggered this challenger discovery (e.g. Docker, AWS)';
COMMENT ON COLUMN sponsor_leads.eagerness_score IS 'How eager/fast this company will move (0-100) based on funding, age, team size';
COMMENT ON COLUMN sponsor_leads.discovery_method IS 'How this lead was discovered: manual, content_analysis, competitive_challenger';
COMMENT ON COLUMN sponsor_leads.competitive_context IS 'JSON with incumbent_name, incumbent_domain, pitch_angle for competitive leads';
