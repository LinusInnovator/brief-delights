-- Sponsor Matcher Database Schema
-- Part of monetization automation system
-- Uses Hormozi $100M Offers framework

-- ============================================================================
-- Table: sponsor_leads
-- Stores potential sponsors matched from content performance
-- ============================================================================

CREATE TABLE IF NOT EXISTS sponsor_leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Company info
  company_name TEXT NOT NULL,
  domain TEXT,
  industry TEXT,
  description TEXT,
  
  -- Matching data
  matched_topic TEXT NOT NULL, -- e.g., "DevOps", "AI/ML", "Leadership"
  matched_segment TEXT NOT NULL CHECK (matched_segment IN ('builders', 'innovators', 'leaders')),
  match_score NUMERIC, -- 0-100 score of fit quality
  
  -- Proof points (from analytics)
  related_article_title TEXT,
  related_article_url TEXT,
  article_clicks INTEGER,
  segment_open_rate NUMERIC,
  segment_click_rate NUMERIC,
  
  -- Contact info
  contact_email TEXT,
  contact_name TEXT,
  contact_role TEXT,
  contact_linkedin TEXT,
  
  -- Offer details (Hormozi framework)
  dream_outcome TEXT, -- Personalized value proposition
  offer_price INTEGER, -- In cents ($500 = 50000)
  offer_stack JSONB, -- Array of value stack items
  proof_points JSONB, -- Array of proof points
  guarantee TEXT,
  scarcity_message TEXT,
  
  -- Outreach status
  status TEXT DEFAULT 'matched' CHECK (status IN ('matched', 'outreach_sent', 'responded', 'booked', 'declined', 'ignored')),
  outreach_sent_at TIMESTAMP,
  last_followed_up_at TIMESTAMP,
  response_received_at TIMESTAMP,
  booking_confirmed_at TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sponsor_status ON sponsor_leads(status);
CREATE INDEX idx_sponsor_segment ON sponsor_leads(matched_segment);
CREATE INDEX idx_sponsor_topic ON sponsor_leads(matched_topic);
CREATE INDEX idx_sponsor_score ON sponsor_leads(match_score DESC);
CREATE INDEX idx_sponsor_created ON sponsor_leads(created_at DESC);

COMMENT ON TABLE sponsor_leads IS 'Potential sponsors matched from content performance using Hormozi framework';

-- ============================================================================
-- Table: sponsor_outreach
-- Tracks outreach attempts and responses
-- ============================================================================

CREATE TABLE IF NOT EXISTS sponsor_outreach (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sponsor_lead_id UUID REFERENCES sponsor_leads(id) ON DELETE CASCADE,
  
  -- Outreach details
  outreach_type TEXT CHECK (outreach_type IN ('initial', 'follow_up_1', 'follow_up_2', 'follow_up_3')),
  subject_line TEXT NOT NULL,
  email_body TEXT NOT NULL,
  
  -- Sending
  sent_at TIMESTAMP,
  sent_via TEXT, -- 'resend', 'manual', etc.
  
  -- Response tracking
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP,
  replied_at TIMESTAMP,
  reply_text TEXT,
  reply_sentiment TEXT, -- 'positive', 'neutral', 'negative'
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_outreach_sponsor ON sponsor_outreach(sponsor_lead_id);
CREATE INDEX idx_outreach_sent ON sponsor_outreach(sent_at);

-- ============================================================================
-- Table: sponsor_bookings
-- Confirmed sponsorship deals
-- ============================================================================

CREATE TABLE IF NOT EXISTS sponsor_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sponsor_lead_id UUID REFERENCES sponsor_leads(id) ON DELETE CASCADE,
  
  -- Booking details
  segment TEXT NOT NULL CHECK (segment IN ('builders', 'innovators', 'leaders')),
  scheduled_date DATE NOT NULL,
  
  -- Deliverables
  article_title TEXT,
  article_content TEXT,
  article_approved BOOLEAN DEFAULT false,
  
  -- Financials
  agreed_price INTEGER NOT NULL, -- In cents
  invoice_sent_at TIMESTAMP,
  payment_received_at TIMESTAMP,
  
  -- Performance
  newsletter_sent_at TIMESTAMP,
  clicks_received INTEGER,
  report_sent_at TIMESTAMP,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'content_draft', 'content_approved', 'published', 'completed', 'cancelled')),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_booking_segment ON sponsor_bookings(segment);
CREATE INDEX idx_booking_date ON sponsor_bookings(scheduled_date);
CREATE INDEX idx_booking_status ON sponsor_bookings(status);

COMMENT ON TABLE sponsor_bookings IS 'Confirmed sponsorship deals with delivery tracking';

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Get available sponsorship slots
CREATE OR REPLACE FUNCTION get_available_sponsor_slots(days_ahead INTEGER DEFAULT 14)
RETURNS TABLE(date DATE, segment TEXT, available BOOLEAN) AS $$
BEGIN
  RETURN QUERY
  WITH date_range AS (
    SELECT generate_series(
      CURRENT_DATE,
      CURRENT_DATE + days_ahead,
      '1 day'::interval
    )::DATE as date
  ),
  segments AS (
    SELECT unnest(ARRAY['builders', 'innovators', 'leaders']) as segment
  ),
  all_slots AS (
    SELECT d.date, s.segment
    FROM date_range d
    CROSS JOIN segments s
  ),
  booked_slots AS (
    SELECT scheduled_date, segment
    FROM sponsor_bookings
    WHERE status IN ('pending', 'content_draft', 'content_approved', 'published')
      AND scheduled_date >= CURRENT_DATE
      AND scheduled_date <= CURRENT_DATE + days_ahead
  )
  SELECT 
    a.date,
    a.segment,
    (b.segment IS NULL) as available
  FROM all_slots a
  LEFT JOIN booked_slots b ON a.date = b.scheduled_date AND a.segment = b.segment
  ORDER BY a.date, a.segment;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_available_sponsor_slots IS 'Get available sponsorship slots (1 per segment per day rule)';

-- Update sponsor lead status based on outreach
CREATE OR REPLACE FUNCTION update_sponsor_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update parent sponsor_lead status based on outreach
  IF NEW.replied_at IS NOT NULL AND OLD.replied_at IS NULL THEN
    UPDATE sponsor_leads 
    SET status = 'responded', 
        response_received_at = NEW.replied_at,
        updated_at = NOW()
    WHERE id = NEW.sponsor_lead_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_sponsor_status
AFTER UPDATE ON sponsor_outreach
FOR EACH ROW
EXECUTE FUNCTION update_sponsor_status();

-- ============================================================================
-- Sample Data
-- ============================================================================

-- Example sponsor lead
INSERT INTO sponsor_leads (
  company_name,
  domain,
  industry,
  matched_topic,
  matched_segment,
  match_score,
  related_article_title,
  article_clicks,
  segment_open_rate,
  dream_outcome,
  offer_price,
  offer_stack
) VALUES (
  'Docker Inc',
  'docker.com',
  'Developer Tools',
  'DevOps',
  'builders',
  95,
  'Docker 27.0 Release Notes',
  18,
  45.0,
  'Get your new feature in front of 15 developers who clicked Docker content 18 times last week',
  80000, -- $800
  '["Featured article about your product", "Sent to 15 engaged Builders", "Social amplification", "24h performance report", "Click guarantee"]'::jsonb
) ON CONFLICT DO NOTHING;
