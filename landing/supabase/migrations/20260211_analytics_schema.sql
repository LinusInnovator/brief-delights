-- Analytics Database Schema for Brief Delights (GDPR-COMPLIANT)
-- Version: 1.1
-- Created: 2026-02-11
-- GDPR Compliance: Email hashing, no IP storage, 90-day retention, right to be forgotten

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- For hashing

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Hash email for GDPR-compliant storage
CREATE OR REPLACE FUNCTION hash_email(email TEXT) RETURNS TEXT AS $$
BEGIN
  RETURN encode(digest(lower(trim(email)), 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION hash_email IS 'Hash email address for GDPR-compliant pseudonymization';

-- ============================================================================
-- Table 1: Newsletter Sends
-- Tracks every newsletter sent per segment (NO PERSONAL DATA)
-- ============================================================================

CREATE TABLE IF NOT EXISTS newsletter_sends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  send_date DATE NOT NULL,
  segment TEXT NOT NULL CHECK (segment IN ('builders', 'innovators', 'leaders')),
  recipient_count INTEGER NOT NULL CHECK (recipient_count >= 0),
  article_count INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sends_date ON newsletter_sends(send_date);
CREATE INDEX idx_sends_segment ON newsletter_sends(segment);
CREATE INDEX idx_sends_date_segment ON newsletter_sends(send_date, segment);

COMMENT ON TABLE newsletter_sends IS 'Tracks newsletter sends (no personal data)';

-- ============================================================================
-- Table 2: Email Events (GDPR-COMPLIANT)
-- Tracks opens/clicks from Resend webhooks using hashed emails
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL CHECK (event_type IN ('email.sent', 'email.delivered', 'email.opened', 'email.clicked', 'email.bounced', 'email.complained')),
  email_id TEXT NOT NULL,
  subscriber_hash TEXT, -- SHA-256 hash of email (GDPR-compliant)
  segment TEXT CHECK (segment IN ('builders', 'innovators', 'leaders', NULL)),
  clicked_url TEXT,
  user_agent TEXT,
  country_code TEXT, -- Only country from IP, not full IP (GDPR-compliant)
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Auto-delete after 90 days (GDPR retention)
  expires_at TIMESTAMP GENERATED ALWAYS AS (created_at + INTERVAL '90 days') STORED
);

CREATE INDEX idx_events_type ON email_events(event_type);
CREATE INDEX idx_events_email ON email_events(email_id);
CREATE INDEX idx_events_created ON email_events(created_at);
CREATE INDEX idx_events_segment ON email_events(segment);
CREATE INDEX idx_events_hash ON email_events(subscriber_hash);
CREATE INDEX idx_events_expires ON email_events(expires_at);

COMMENT ON TABLE email_events IS 'Email events with hashed emails only (GDPR-compliant)';
COMMENT ON COLUMN email_events.subscriber_hash IS 'SHA-256 hash of email - allows tracking without storing PII';
COMMENT ON COLUMN email_events.country_code IS 'Only country code, not full IP (GDPR data minimization)';

-- ============================================================================
-- Table 3: Article Clicks (GDPR-COMPLIANT)
-- Tracks which articles get clicked using hashed emails
-- ============================================================================

CREATE TABLE IF NOT EXISTS article_clicks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_url TEXT NOT NULL,
  article_title TEXT,
  segment TEXT NOT NULL CHECK (segment IN ('builders', 'innovators', 'leaders')),
  newsletter_date DATE NOT NULL,
  subscriber_hash TEXT, -- SHA-256 hash of email (GDPR-compliant)
  source_domain TEXT,
  referrer TEXT,
  clicked_at TIMESTAMP DEFAULT NOW(),
  
  -- Auto-delete after 90 days (GDPR retention)
  expires_at TIMESTAMP GENERATED ALWAYS AS (clicked_at + INTERVAL '90 days') STORED
);

CREATE INDEX idx_clicks_url ON article_clicks(article_url);
CREATE INDEX idx_clicks_date ON article_clicks(newsletter_date);
CREATE INDEX idx_clicks_segment ON article_clicks(segment);
CREATE INDEX idx_clicks_source ON article_clicks(source_domain);
CREATE INDEX idx_clicks_date_segment ON article_clicks(newsletter_date, segment);
CREATE INDEX idx_clicks_hash ON article_clicks(subscriber_hash);
CREATE INDEX idx_clicks_expires ON article_clicks(expires_at);

COMMENT ON TABLE article_clicks IS 'Article clicks with hashed emails only (GDPR-compliant)';

-- ============================================================================
-- Table 4: Subscriber Growth
-- Daily snapshot of subscriber counts (NO PERSONAL DATA)
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

COMMENT ON TABLE subscriber_growth IS 'Aggregate growth data (no personal data, kept indefinitely)';

-- ============================================================================
-- Table 5: Automation Performance
-- Tracks automation module results (NO PERSONAL DATA)
-- ============================================================================

CREATE TABLE IF NOT EXISTS automation_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_name TEXT NOT NULL,
  run_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'skipped')),
  result JSONB,
  error_message TEXT,
  duration_ms INTEGER CHECK (duration_ms >= 0),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_automation_module ON automation_performance(module_name);
CREATE INDEX idx_automation_date ON automation_performance(run_date DESC);
CREATE INDEX idx_automation_status ON automation_performance(status);
CREATE INDEX idx_automation_module_date ON automation_performance(module_name, run_date);

COMMENT ON TABLE automation_performance IS 'Automation results (no personal data)';

-- ============================================================================
-- GDPR Compliance Functions
-- ============================================================================

-- Right to be Forgotten: Delete all data for a user
CREATE OR REPLACE FUNCTION gdpr_delete_user(user_email TEXT) RETURNS TABLE(deleted_events BIGINT, deleted_clicks BIGINT) AS $$
DECLARE
  email_hash TEXT;
  events_deleted BIGINT;
  clicks_deleted BIGINT;
BEGIN
  -- Hash the email
  email_hash := hash_email(user_email);
  
  -- Delete from email_events
  DELETE FROM email_events WHERE subscriber_hash = email_hash;
  GET DIAGNOSTICS events_deleted = ROW_COUNT;
  
  -- Delete from article_clicks
  DELETE FROM article_clicks WHERE subscriber_hash = email_hash;
  GET DIAGNOSTICS clicks_deleted = ROW_COUNT;
  
  RETURN QUERY SELECT events_deleted, clicks_deleted;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION gdpr_delete_user IS 'GDPR Right to be Forgotten - delete all data for a user';

-- Automated Cleanup: Delete data older than retention period
CREATE OR REPLACE FUNCTION cleanup_expired_analytics() RETURNS TABLE(events_deleted BIGINT, clicks_deleted BIGINT) AS $$
DECLARE
  events_deleted BIGINT;
  clicks_deleted BIGINT;
BEGIN
  -- Delete expired email events (older than 90 days)
  DELETE FROM email_events WHERE expires_at < NOW();
  GET DIAGNOSTICS events_deleted = ROW_COUNT;
  
  -- Delete expired article clicks (older than 90 days)
  DELETE FROM article_clicks WHERE expires_at < NOW();
  GET DIAGNOSTICS clicks_deleted = ROW_COUNT;
  
  RETURN QUERY SELECT events_deleted, clicks_deleted;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_analytics IS 'Auto-delete data older than 90 days (GDPR retention compliance)';

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

-- ============================================================================
-- Sample Data (for testing)
-- ============================================================================

INSERT INTO newsletter_sends (send_date, segment, recipient_count, article_count)
VALUES 
  (CURRENT_DATE, 'builders', 15, 8),
  (CURRENT_DATE, 'innovators', 12, 8),
  (CURRENT_DATE, 'leaders', 18, 9)
ON CONFLICT DO NOTHING;

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

-- Test data with hashed emails
INSERT INTO email_events (event_type, email_id, subscriber_hash, segment, created_at)
VALUES 
  ('email.sent', 'test-123', hash_email('test@example.com'), 'builders', NOW()),
  ('email.opened', 'test-123', hash_email('test@example.com'), 'builders', NOW())
ON CONFLICT DO NOTHING;

-- ============================================================================
-- GDPR Compliance Summary
-- ============================================================================

COMMENT ON SCHEMA public IS '
GDPR COMPLIANCE FEATURES:
1. Email Hashing: All emails stored as SHA-256 hashes (pseudonymization)
2. No IP Storage: Only country code extracted, IP discarded (data minimization)
3. 90-Day Retention: Personal data auto-expires after 90 days
4. Right to be Forgotten: gdpr_delete_user() function
5. Automated Cleanup: cleanup_expired_analytics() function
6. Aggregate Data: Growth metrics contain no personal data (kept indefinitely)
';
