-- Proactive Placement: Competitive Insertion Marketing
-- Status: BUILT but NOT DEPLOYED (waiting for 500+ subscribers)
-- Activation: Change feature flag when ready

-- Active sponsors with proactive placement tier
CREATE TABLE IF NOT EXISTS active_sponsors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Company info
  company_name TEXT NOT NULL,
  domain TEXT NOT NULL UNIQUE,
  contact_email TEXT NOT NULL,
  contact_name TEXT,
  
  -- Tier & status
  tier TEXT DEFAULT 'standard' CHECK (tier IN ('proactive_placement', 'standard', 'premium')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled', 'trial')),
  
  -- Competitive tracking (for proactive_placement tier)
  monitored_competitors TEXT[] DEFAULT '{}',
  auto_inject BOOLEAN DEFAULT false, -- Automatic injection (vs manual approval)
  
  -- Pre-written competitive messages by competitor
  -- Format: { "aws.amazon.com": { "message": "...", "cta": "...", "landing_url": "..." } }
  competitive_messages JSONB DEFAULT '{}',
  
  -- Pricing & billing
  monthly_fee NUMERIC NOT NULL DEFAULT 5000,
  per_placement_fee NUMERIC DEFAULT 1500,
  placements_included INTEGER DEFAULT 4,
  placements_used_this_month INTEGER DEFAULT 0,
  placements_reset_at DATE, -- Next billing cycle
  
  -- Contract dates
  active_since TIMESTAMP DEFAULT NOW(),
  active_until TIMESTAMP,
  contract_length_months INTEGER DEFAULT 12,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Track every competitive placement delivered
CREATE TABLE IF NOT EXISTS competitive_placements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Relationship
  sponsor_id UUID REFERENCES active_sponsors(id) ON DELETE CASCADE,
  newsletter_id TEXT NOT NULL, -- e.g., "2026-02-11_builders"
  
  -- Competitor context
  competitor_domain TEXT NOT NULL,
  competitor_name TEXT NOT NULL,
  article_title TEXT,
  article_url TEXT,
  segment TEXT, -- 'builders', 'innovators', 'leaders'
  
  -- Placement content
  message_used TEXT NOT NULL,
  cta_used TEXT NOT NULL,
  landing_url TEXT NOT NULL,
  tracked_url TEXT, -- URL with tracking params
  
  -- Performance metrics
  newsletter_sent_at TIMESTAMP,
  newsletter_opens INTEGER DEFAULT 0,
  placement_clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0, -- Tracked via landing page
  
  -- Billing
  billable BOOLEAN DEFAULT true,
  included_in_monthly BOOLEAN DEFAULT false, -- true if within placements_included
  invoice_id TEXT,
  invoiced_at TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW()
);

-- Notification queue for sponsor alerts
CREATE TABLE IF NOT EXISTS sponsor_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Notification details
  sponsor_id UUID REFERENCES active_sponsors(id) ON DELETE CASCADE,
  notification_type TEXT CHECK (notification_type IN ('competitor_mentioned', 'placement_delivered', 'billing_alert', 'performance_report')),
  
  -- Content
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  action_required BOOLEAN DEFAULT false,
  action_deadline TIMESTAMP,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'dismissed')),
  sent_at TIMESTAMP,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_active_sponsors_status ON active_sponsors(status) WHERE status = 'active';
CREATE INDEX idx_active_sponsors_tier ON active_sponsors(tier) WHERE tier = 'proactive_placement';
CREATE INDEX idx_active_sponsors_competitors ON active_sponsors USING GIN (monitored_competitors);

CREATE INDEX idx_competitive_placements_sponsor ON competitive_placements(sponsor_id);
CREATE INDEX idx_competitive_placements_newsletter ON competitive_placements(newsletter_id);
CREATE INDEX idx_competitive_placements_sent_at ON competitive_placements(newsletter_sent_at DESC);

CREATE INDEX idx_sponsor_notifications_status ON sponsor_notifications(status) WHERE status = 'pending';
CREATE INDEX idx_sponsor_notifications_sponsor ON sponsor_notifications(sponsor_id);

-- Helper function: Increment sponsor placement count
CREATE OR REPLACE FUNCTION increment_sponsor_placements(p_sponsor_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE active_sponsors
  SET 
    placements_used_this_month = placements_used_this_month + 1,
    updated_at = NOW()
  WHERE id = p_sponsor_id;
END;
$$;

-- Helper function: Reset monthly placement counts (run on billing cycle)
CREATE OR REPLACE FUNCTION reset_sponsor_placement_counts()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  reset_count INTEGER;
BEGIN
  UPDATE active_sponsors
  SET 
    placements_used_this_month = 0,
    placements_reset_at = CURRENT_DATE + INTERVAL '1 month',
    updated_at = NOW()
  WHERE 
    status = 'active'
    AND (placements_reset_at IS NULL OR placements_reset_at <= CURRENT_DATE);
  
  GET DIAGNOSTICS reset_count = ROW_COUNT;
  RETURN reset_count;
END;
$$;

-- Helper function: Get sponsors monitoring a specific competitor
CREATE OR REPLACE FUNCTION get_sponsors_monitoring_competitor(p_competitor_domain TEXT)
RETURNS TABLE (
  sponsor_id UUID,
  company_name TEXT,
  contact_email TEXT,
  auto_inject BOOLEAN,
  competitive_message JSONB,
  placements_remaining INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.company_name,
    s.contact_email,
    s.auto_inject,
    s.competitive_messages->p_competitor_domain AS competitive_message,
    (s.placements_included - s.placements_used_this_month) AS placements_remaining
  FROM active_sponsors s
  WHERE 
    s.status = 'active'
    AND s.tier = 'proactive_placement'
    AND p_competitor_domain = ANY(s.monitored_competitors)
    AND s.competitive_messages ? p_competitor_domain
    AND (s.placements_included - s.placements_used_this_month) > 0;
END;
$$;

-- Analytics view: Sponsor performance summary
CREATE OR REPLACE VIEW sponsor_performance_summary AS
SELECT 
  s.id AS sponsor_id,
  s.company_name,
  s.tier,
  s.status,
  s.monthly_fee,
  s.placements_included,
  s.placements_used_this_month,
  COUNT(cp.id) AS total_placements,
  SUM(cp.placement_clicks) AS total_clicks,
  SUM(cp.conversions) AS total_conversions,
  ROUND(AVG(cp.placement_clicks), 2) AS avg_clicks_per_placement,
  CASE 
    WHEN SUM(cp.placement_clicks) > 0 
    THEN ROUND((SUM(cp.conversions)::NUMERIC / SUM(cp.placement_clicks)::NUMERIC) * 100, 2)
    ELSE 0
  END AS conversion_rate_percent,
  MAX(cp.newsletter_sent_at) AS last_placement_date
FROM active_sponsors s
LEFT JOIN competitive_placements cp ON s.id = cp.sponsor_id
GROUP BY s.id, s.company_name, s.tier, s.status, s.monthly_fee, s.placements_included, s.placements_used_this_month;

-- Sample data (for testing - DO NOT DEPLOY TO PRODUCTION)
-- Uncomment when testing locally

/*
INSERT INTO active_sponsors (company_name, domain, contact_email, tier, monitored_competitors, auto_inject, competitive_messages)
VALUES 
  (
    'Railway',
    'railway.app',
    'founder@railway.app',
    'proactive_placement',
    ARRAY['aws.amazon.com', 'heroku.com', 'docker.com'],
    true,
    '{
      "aws.amazon.com": {
        "message": "While AWS moves slow, Railway already shipped this 6 months ago. One command to deploy.",
        "cta": "Try Railway free",
        "landing_url": "https://railway.app/builders"
      },
      "docker.com": {
        "message": "Docker requires complex config. Railway deploys in one click.",
        "cta": "See how easy",
        "landing_url": "https://railway.app/vs-docker"
      }
    }'::JSONB
  ),
  (
    'Anthropic',
    'anthropic.com',
    'growth@anthropic.com',
    'proactive_placement',
    ARRAY['openai.com', 'google.com'],
    false,
    '{
      "openai.com": {
        "message": "While OpenAI focuses on GPT, Claude offers better constitutional AI with longer context windows.",
        "cta": "Try Claude",
        "landing_url": "https://claude.ai/builders"
      }
    }'::JSONB
  );
*/

COMMENT ON TABLE active_sponsors IS 'Sponsors with active agreements, including proactive placement tier';
COMMENT ON TABLE competitive_placements IS 'Log of every competitive placement delivered in newsletters';
COMMENT ON TABLE sponsor_notifications IS 'Queue for sponsor alerts and notifications';
COMMENT ON FUNCTION get_sponsors_monitoring_competitor IS 'Returns active sponsors monitoring a specific competitor domain';
