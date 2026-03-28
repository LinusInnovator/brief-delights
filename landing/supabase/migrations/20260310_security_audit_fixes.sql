-- Security Audit Fixes
-- Enables Row Level Security (RLS) on all exposed public tables
-- Removes overly permissive policies from AB testing schema
-- Restricts functions to prevent unauthorized invocation

-- ============================================================================
-- 1. Enable RLS universally to default-deny all public access
-- ============================================================================

-- Analytics & Growth Tables
ALTER TABLE IF EXISTS newsletter_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS email_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS article_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS subscriber_growth ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS automation_performance ENABLE ROW LEVEL SECURITY;

-- Proactive Placement & Sponsors
ALTER TABLE IF EXISTS active_sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS competitive_placements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sponsor_notifications ENABLE ROW LEVEL SECURITY;

-- Sponsor Matcher Database
ALTER TABLE IF EXISTS sponsor_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sponsor_outreach ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sponsor_bookings ENABLE ROW LEVEL SECURITY;

-- Partnership Manager
ALTER TABLE IF EXISTS sponsored_content ENABLE ROW LEVEL SECURITY;

-- Sponsor Content Library
ALTER TABLE IF EXISTS sponsor_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sponsor_schedule ENABLE ROW LEVEL SECURITY;

-- Newsletter Feedback
ALTER TABLE IF EXISTS newsletter_feedback ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- 2. Safely add feedback policy if table exists
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'newsletter_feedback') THEN
    -- Only create if it doesn't already exist to avoid errors on multiple runs
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'newsletter_feedback' AND policyname = 'Allow anonymous inserts for newsletter feedback') THEN
      CREATE POLICY "Allow anonymous inserts for newsletter feedback" ON newsletter_feedback
          FOR INSERT TO public WITH CHECK (true);
    END IF;
  END IF;
END $$;

-- ============================================================================
-- 3. Safely handle A/B Testing tables (they might not be deployed yet)
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ab_experiments') THEN
    
    -- Drop old bad policies
    DROP POLICY IF EXISTS "Service role full access on ab_experiments" ON ab_experiments;
    DROP POLICY IF EXISTS "Service role full access on ab_variants" ON ab_variants;
    DROP POLICY IF EXISTS "Service role full access on ab_events" ON ab_events;

    -- Add new restricted policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ab_experiments' AND policyname = 'Allow public read access to running ab_experiments') THEN
      CREATE POLICY "Allow public read access to running ab_experiments" ON ab_experiments
          FOR SELECT TO public USING (status = 'running');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ab_variants' AND policyname = 'Allow public read access to ab_variants') THEN
      CREATE POLICY "Allow public read access to ab_variants" ON ab_variants
          FOR SELECT TO public USING (
              experiment_id IN (SELECT id FROM ab_experiments WHERE status = 'running')
          );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ab_events' AND policyname = 'Allow public inserts for ab_events') THEN
      CREATE POLICY "Allow public inserts for ab_events" ON ab_events
          FOR INSERT TO public WITH CHECK (true);
    END IF;
  END IF;
END $$;

-- ============================================================================
-- 4. Secure Functions (Check if they exist first)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'gdpr_delete_user') THEN
    ALTER FUNCTION gdpr_delete_user(TEXT) SET search_path = public;
    REVOKE EXECUTE ON FUNCTION gdpr_delete_user(TEXT) FROM public;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'cleanup_expired_analytics') THEN
    ALTER FUNCTION cleanup_expired_analytics() SET search_path = public;
    REVOKE EXECUTE ON FUNCTION cleanup_expired_analytics() FROM public;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'increment_ab_impressions') THEN
    ALTER FUNCTION increment_ab_impressions(TEXT) SET search_path = public;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'increment_ab_conversions') THEN
    ALTER FUNCTION increment_ab_conversions(TEXT) SET search_path = public;
  END IF;
END $$;
