-- Partnership Manager Schema
-- Manual sponsored content scheduling for newsletters
-- Created: 2026-02-15

CREATE TABLE IF NOT EXISTS sponsored_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Sponsor Info
  sponsor_name TEXT NOT NULL,
  sponsor_domain TEXT,
  sponsor_logo_url TEXT,
  
  -- Content
  headline TEXT NOT NULL,
  body TEXT NOT NULL,  -- Supports markdown
  cta_text TEXT,
  cta_url TEXT,
  
  -- Scheduling
  scheduled_date DATE,
  segment TEXT CHECK (segment IN ('builders', 'innovators', 'leaders', 'all')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent', 'cancelled')),
  
  -- Performance Tracking
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  
  -- Business Details
  deal_value_cents INTEGER,
  partnership_type TEXT CHECK (partnership_type IN ('paid', 'barter', 'affiliate', 'other')),
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  sent_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_sponsored_date ON sponsored_content(scheduled_date);
CREATE INDEX idx_sponsored_status ON sponsored_content(status);
CREATE INDEX idx_sponsored_date_status ON sponsored_content(scheduled_date, status);

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_sponsored_content_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sponsored_content_updated_at
  BEFORE UPDATE ON sponsored_content
  FOR EACH ROW
  EXECUTE FUNCTION update_sponsored_content_updated_at();

COMMENT ON TABLE sponsored_content IS 'Manual partnerships and sponsored content for newsletters';
COMMENT ON COLUMN sponsored_content.segment IS 'Target segment (or "all" for all segments)';
COMMENT ON COLUMN sponsored_content.status IS 'draft=being edited, scheduled=ready to send, sent=already sent';
COMMENT ON COLUMN sponsored_content.partnership_type IS 'Business relationship type';
