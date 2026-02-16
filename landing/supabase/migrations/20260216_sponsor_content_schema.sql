-- Sponsor Content & Schedule Schema
-- Adds sponsor library and scheduling for newsletter integration

-- ============================================================================
-- Table: sponsor_content
-- Stores actual ad creatives that go into newsletters
-- ============================================================================

CREATE TABLE IF NOT EXISTS sponsor_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Display info
  name TEXT NOT NULL,                -- Internal name "Docker Desktop Q1"
  company_name TEXT NOT NULL,        -- "Docker"
  headline TEXT NOT NULL,            -- "Ship faster with Docker Desktop"
  description TEXT NOT NULL,         -- Ad copy paragraph
  cta_text TEXT DEFAULT 'Learn More →',
  cta_url TEXT NOT NULL,
  logo_url TEXT,                     -- Optional logo URL
  
  -- Targeting
  segments TEXT[] DEFAULT '{builders,innovators,leaders}',
  
  -- Flags
  is_default BOOLEAN DEFAULT false,  -- Fallback when no paid sponsor
  is_active BOOLEAN DEFAULT true,
  
  -- Link to pipeline lead (if originated from auto-discovery)
  sponsor_lead_id UUID REFERENCES sponsor_leads(id) ON DELETE SET NULL,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sponsor_content_active ON sponsor_content(is_active);
CREATE INDEX idx_sponsor_content_default ON sponsor_content(is_default) WHERE is_default = true;
CREATE INDEX idx_sponsor_content_segments ON sponsor_content USING GIN(segments);

COMMENT ON TABLE sponsor_content IS 'Sponsor ad creatives for newsletter insertion';

-- ============================================================================
-- Table: sponsor_schedule
-- Maps sponsors to specific dates and segments
-- ============================================================================

CREATE TABLE IF NOT EXISTS sponsor_schedule (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sponsor_content_id UUID NOT NULL REFERENCES sponsor_content(id) ON DELETE CASCADE,
  
  -- When & where
  scheduled_date DATE NOT NULL,
  segment TEXT NOT NULL CHECK (segment IN ('builders', 'innovators', 'leaders')),
  
  -- Status tracking
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sent', 'cancelled')),
  newsletter_slug TEXT,              -- Filled after sending
  
  -- Performance
  clicks INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- One sponsor per segment per day
  UNIQUE(scheduled_date, segment)
);

CREATE INDEX idx_sponsor_schedule_date ON sponsor_schedule(scheduled_date);
CREATE INDEX idx_sponsor_schedule_status ON sponsor_schedule(status);
CREATE INDEX idx_sponsor_schedule_content ON sponsor_schedule(sponsor_content_id);

COMMENT ON TABLE sponsor_schedule IS 'Schedule sponsors to specific newsletter dates and segments';

-- ============================================================================
-- Auto-update timestamp trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION update_sponsor_content_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_sponsor_content_updated
    BEFORE UPDATE ON sponsor_content
    FOR EACH ROW
    EXECUTE FUNCTION update_sponsor_content_timestamp();

-- ============================================================================
-- Helper: Get sponsor for a given date + segment (with default fallback)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_sponsor_for_newsletter(
    target_date DATE,
    target_segment TEXT
)
RETURNS TABLE(
    sponsor_id UUID,
    sponsor_name TEXT,
    company TEXT,
    headline TEXT,
    description TEXT,
    cta_text TEXT,
    cta_url TEXT,
    logo_url TEXT,
    schedule_id UUID,
    is_default BOOLEAN
) AS $$
BEGIN
    -- First try scheduled sponsor
    RETURN QUERY
    SELECT 
        sc.id as sponsor_id,
        sc.name as sponsor_name,
        sc.company_name as company,
        sc.headline,
        sc.description,
        sc.cta_text,
        sc.cta_url,
        sc.logo_url,
        ss.id as schedule_id,
        false as is_default
    FROM sponsor_schedule ss
    JOIN sponsor_content sc ON ss.sponsor_content_id = sc.id
    WHERE ss.scheduled_date = target_date
      AND ss.segment = target_segment
      AND ss.status = 'scheduled'
      AND sc.is_active = true
    LIMIT 1;
    
    -- If no scheduled sponsor found, return default
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT 
            sc.id as sponsor_id,
            sc.name as sponsor_name,
            sc.company_name as company,
            sc.headline,
            sc.description,
            sc.cta_text,
            sc.cta_url,
            sc.logo_url,
            NULL::UUID as schedule_id,
            true as is_default
        FROM sponsor_content sc
        WHERE sc.is_default = true
          AND sc.is_active = true
          AND target_segment = ANY(sc.segments)
        LIMIT 1;
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_sponsor_for_newsletter IS 'Get scheduled or default sponsor for a newsletter date+segment';
