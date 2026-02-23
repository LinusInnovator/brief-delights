-- A/B Testing Schema
-- Autonomous experiment tracking with Bayesian statistics

-- Experiments table
CREATE TABLE IF NOT EXISTS ab_experiments (
    id TEXT PRIMARY KEY DEFAULT 'exp_' || substr(md5(random()::text), 1, 8),
    element TEXT NOT NULL DEFAULT 'hero',  -- what's being tested: hero, cta, banner, value_props
    status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'archived')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Variants table
CREATE TABLE IF NOT EXISTS ab_variants (
    id TEXT PRIMARY KEY DEFAULT 'var_' || substr(md5(random()::text), 1, 8),
    experiment_id TEXT NOT NULL REFERENCES ab_experiments(id) ON DELETE CASCADE,
    slot TEXT NOT NULL DEFAULT 'champion' CHECK (slot IN ('champion', 'challenger', 'explorer')),
    weight INTEGER NOT NULL DEFAULT 10,  -- traffic percentage
    content JSONB NOT NULL DEFAULT '{}',
    -- Stats
    impressions INTEGER NOT NULL DEFAULT 0,
    conversions INTEGER NOT NULL DEFAULT 0,
    conversion_rate REAL GENERATED ALWAYS AS (
        CASE WHEN impressions > 0 THEN conversions::real / impressions::real ELSE 0 END
    ) STORED,
    confidence REAL DEFAULT 0,  -- Bayesian probability of beating champion (0-1)
    -- Lifecycle
    promoted_at TIMESTAMPTZ,
    killed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- A/B event log (promotions, kills, generations)
CREATE TABLE IF NOT EXISTS ab_events (
    id SERIAL PRIMARY KEY,
    experiment_id TEXT REFERENCES ab_experiments(id) ON DELETE CASCADE,
    variant_id TEXT REFERENCES ab_variants(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('promoted', 'killed', 'generated', 'started', 'completed')),
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ab_variants_experiment ON ab_variants(experiment_id);
CREATE INDEX IF NOT EXISTS idx_ab_variants_slot ON ab_variants(slot);
CREATE INDEX IF NOT EXISTS idx_ab_events_experiment ON ab_events(experiment_id);
CREATE INDEX IF NOT EXISTS idx_ab_experiments_status ON ab_experiments(status);

-- Enable RLS
ALTER TABLE ab_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_events ENABLE ROW LEVEL SECURITY;

-- Allow read access for the service role (API routes)
CREATE POLICY "Service role full access on ab_experiments" ON ab_experiments
    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on ab_variants" ON ab_variants
    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on ab_events" ON ab_events
    FOR ALL USING (true) WITH CHECK (true);

-- Atomic increment functions for tracking
CREATE OR REPLACE FUNCTION increment_ab_impressions(p_variant_id TEXT)
RETURNS void AS $$
BEGIN
    UPDATE ab_variants SET impressions = impressions + 1 WHERE id = p_variant_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_ab_conversions(p_variant_id TEXT)
RETURNS void AS $$
BEGIN
    UPDATE ab_variants SET conversions = conversions + 1 WHERE id = p_variant_id;
END;
$$ LANGUAGE plpgsql;
