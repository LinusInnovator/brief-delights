-- Analytics Database Schema for Brief Delights
-- Version: 1.0
-- Created: 2026-02-11

-- ============================================================================
-- Table 1: Newsletter Sends
-- Tracks every newsletter sent per segment
-- ============================================================================

CREATE TABLE IF NOT EXISTS newsletter_sends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  send_date DATE NOT NULL,
  segment TEXT NOT NULL CHECK (segment IN ('builders', 'innovators', 'leaders')),
  recipient_count INTEGER NOT NULL CHECK (recipient_count >= 0),
  article_count INTEGER, -- How many articles in this newsletter
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sends_date ON newsletter_sends(send_date);
CREATE INDEX idx_sends_segment ON newsletter_sends(segment);
CREATE INDEX idx_sends_date_segment ON newsletter_sends(send_date, segment);

COMMENT ON TABLE newsletter_sends IS 'Tracks every newsletter sent per segment';
COMMENT ON COLUMN newsletter_sends.recipient_count IS 'Number of subscribers who received this newsletter';

-- ============================================================================
-- Table 2: Email Events
-- Tracks opens/clicks from Resend webhooks
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL CHECK (event_type IN ('email.sent', 'email.delivered', 'email.opened', 'email.clicked', 'email.bounced', 'email.complained')),
  email_id TEXT NOT NULL, -- Resend email ID
  subscriber_email TEXT,
  segment TEXT CHECK (segment IN ('builders', 'innovators', 'leaders', NULL)),
  clicked_url TEXT, -- for click events
  user_agent TEXT, -- browser/device info
  ip_address TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_events_type ON email_events(event_type);
CREATE INDEX idx_events_email ON email_events(email_id);
CREATE INDEX idx_events_created ON email_events(created_at);
CREATE INDEX idx_events_segment ON email_events(segment);
CREATE INDEX idx_events_subscriber ON email_events(subscriber_email);

COMMENT ON TABLE email_events IS 'Email events from Resend webhooks (opens, clicks, bounces)';

-- ============================================================================
-- Table 3: Article Clicks
-- Tracks which articles get clicked (via our tracking URLs)
-- ============================================================================

CREATE TABLE IF NOT EXISTS article_clicks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_url TEXT NOT NULL,
  article_title TEXT,
  segment TEXT NOT NULL CHECK (segment IN ('builders', 'innovators', 'leaders')),
  newsletter_date DATE NOT NULL,
  subscriber_email TEXT,
  source_domain TEXT, -- extracted from article_url (e.g., 'techcrunch.com')
  referrer TEXT, -- where click came from
  clicked_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_clicks_url ON article_clicks(article_url);
CREATE INDEX idx_clicks_date ON article_clicks(newsletter_date);
CREATE INDEX idx_clicks_segment ON article_clicks(segment);
CREATE INDEX idx_clicks_source ON article_clicks(source_domain);
CREATE INDEX idx_clicks_date_segment ON article_clicks(newsletter_date, segment);

COMMENT ON TABLE article_clicks IS 'Tracks clicks on newsletter articles via tracking URLs';

-- ============================================================================
-- Table 4: Subscriber Growth
-- Daily snapshot of subscriber counts per segment
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscriber_growth (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL UNIQUE,
  total_subscribers INTEGER NOT NULL CHECK (total_subscribers >= 0),
  builders_count INTEGER NOT NULL CHECK (builders_count >= 0),
  innovators_count INTEGER NOT NULL CHECK (innovators_count >= 0),
  leaders_count INTEGER NOT NULL CHECK (leaders_count >= 0),
  new_today INTEGER NOT NULL DEFAULT 0,
  unsubscribed_today INTEGER NOT NULL DEFAULT 0,
  net_growth INTEGER GENERATED ALWAYS AS (new_today - unsubscribed_today) STORED,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_growth_date ON subscriber_growth(date DESC);

COMMENT ON TABLE subscriber_growth IS 'Daily snapshot of subscriber counts and growth';
COMMENT ON COLUMN subscriber_growth.net_growth IS 'Calculated as new_today - unsubscribed_today';

-- ============================================================================
-- Table 5: Automation Performance
-- Tracks automation module results (Twitter bot, Reddit bot, etc.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS automation_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_name TEXT NOT NULL, -- 'twitter_bot', 'reddit_bot', etc.
  run_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'skipped')),
  result JSONB, -- module-specific metrics
  error_message TEXT,
  duration_ms INTEGER CHECK (duration_ms >= 0),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_automation_module ON automation_performance(module_name);
CREATE INDEX idx_automation_date ON automation_performance(run_date DESC);
CREATE INDEX idx_automation_status ON automation_performance(status);
CREATE INDEX idx_automation_module_date ON automation_performance(module_name, run_date);

COMMENT ON TABLE automation_performance IS 'Tracks results from automation modules (growth, monetization)';

-- ============================================================================
-- Helper Views
-- ============================================================================

-- View: Recent open rates by segment
CREATE OR REPLACE VIEW v_recent_open_rates AS
SELECT 
  segment,
  COUNT(DISTINCT CASE WHEN event_type = 'email.sent' THEN email_id END) as sent_count,
  COUNT(DISTINCT CASE WHEN event_type = 'email.opened' THEN email_id END) as opened_count,
  ROUND(
    COUNT(DISTINCT CASE WHEN event_type = 'email.opened' THEN email_id END)::NUMERIC / 
    NULLIF(COUNT(DISTINCT CASE WHEN event_type = 'email.sent' THEN email_id END), 0) * 100,
    1
  ) as open_rate_pct
FROM email_events
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
  AND event_type IN ('email.sent', 'email.opened')
  AND segment IS NOT NULL
GROUP BY segment;

COMMENT ON VIEW v_recent_open_rates IS 'Open rates by segment for last 7 days';

-- View: Top clicked articles (last 7 days)
CREATE OR REPLACE VIEW v_top_articles_7d AS
SELECT 
  article_title,
  article_url,
  source_domain,
  segment,
  COUNT(*) as click_count,
  COUNT(DISTINCT newsletter_date) as days_featured
FROM article_clicks
WHERE newsletter_date >= CURRENT_DATE - 7
GROUP BY article_title, article_url, source_domain, segment
ORDER BY click_count DESC
LIMIT 20;

COMMENT ON VIEW v_top_articles_7d IS 'Top 20 clicked articles in last 7 days';

-- View: Daily growth summary
CREATE OR REPLACE VIEW v_growth_summary_30d AS
SELECT 
  date,
  total_subscribers,
  new_today,
  unsubscribed_today,
  net_growth,
  ROUND(
    (new_today::NUMERIC / NULLIF(total_subscribers - new_today, 0)) * 100,
    2
  ) as growth_rate_pct
FROM subscriber_growth
WHERE date >= CURRENT_DATE - 30
ORDER BY date DESC;

COMMENT ON VIEW v_growth_summary_30d IS 'Growth metrics for last 30 days';

-- ============================================================================
-- Sample Data (for testing)
-- ============================================================================

-- Insert sample newsletter send
INSERT INTO newsletter_sends (send_date, segment, recipient_count, article_count)
VALUES 
  (CURRENT_DATE, 'builders', 15, 8),
  (CURRENT_DATE, 'innovators', 12, 8),
  (CURRENT_DATE, 'leaders', 18, 9)
ON CONFLICT DO NOTHING;

-- Insert sample growth data
INSERT INTO subscriber_growth (
  date, total_subscribers, builders_count, innovators_count, leaders_count, new_today, unsubscribed_today
)
VALUES 
  (CURRENT_DATE, 45, 15, 12, 18, 3, 0),
  (CURRENT_DATE - 1, 42, 14, 11, 17, 2, 1),
  (CURRENT_DATE - 2, 41, 14, 11, 16, 1, 0)
ON CONFLICT (date) DO UPDATE SET
  total_subscribers = EXCLUDED.total_subscribers,
  builders_count = EXCLUDED.builders_count,
  innovators_count = EXCLUDED.innovators_count,
  leaders_count = EXCLUDED.leaders_count,
  new_today = EXCLUDED.new_today,
  unsubscribed_today = EXCLUDED.unsubscribed_today;

-- ============================================================================
-- Functions
-- ============================================================================

-- Function to calculate engagement rate
CREATE OR REPLACE FUNCTION calculate_engagement_rate(
  p_segment TEXT,
  p_days INTEGER DEFAULT 7
) RETURNS NUMERIC AS $$
DECLARE
  v_sent INTEGER;
  v_clicked INTEGER;
BEGIN
  SELECT 
    COUNT(DISTINCT CASE WHEN event_type = 'email.sent' THEN email_id END),
    COUNT(DISTINCT CASE WHEN event_type = 'email.clicked' THEN email_id END)
  INTO v_sent, v_clicked
  FROM email_events
  WHERE segment = p_segment
    AND created_at >= CURRENT_DATE - p_days;
  
  IF v_sent = 0 THEN
    RETURN 0;
  END IF;
  
  RETURN ROUND((v_clicked::NUMERIC / v_sent) * 100, 2);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_engagement_rate IS 'Calculate engagement (click) rate for a segment';

-- ============================================================================
-- Grants (adjust based on your Supabase RLS policies)
-- ============================================================================

-- Grant read access to authenticated users for dashboard
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
-- GRANT SELECT ON ALL VIEWS IN SCHEMA public TO authenticated;

-- Service role has full access (for API endpoints)
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
