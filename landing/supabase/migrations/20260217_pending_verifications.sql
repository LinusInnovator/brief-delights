-- Migration: Pending Verifications Table
-- Replaces filesystem-based pending_verifications.json with Supabase table
-- Required for subscribe/verify flow to survive Netlify deploys

CREATE TABLE IF NOT EXISTS pending_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  segment TEXT NOT NULL CHECK (segment IN ('builders', 'leaders', 'innovators')),
  token TEXT NOT NULL UNIQUE,
  referrer TEXT,  -- referral code of the person who referred this signup
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
);

-- Index for token lookups during verification
CREATE INDEX IF NOT EXISTS idx_pending_token ON pending_verifications(token);

-- Index for auto-cleanup of expired verifications
CREATE INDEX IF NOT EXISTS idx_pending_expires ON pending_verifications(expires_at);

-- RLS for subscribers: ensure policies exist for the send pipeline and signup flow
-- (These are safe to run even if policies already exist due to IF NOT EXISTS-style behavior)
DO $$ BEGIN
  -- Allow reading subscribers (for send pipeline and landing page count)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subscribers' AND policyname = 'Allow select subscribers') THEN
    CREATE POLICY "Allow select subscribers" ON subscribers FOR SELECT USING (true);
  END IF;
  
  -- Allow inserting new subscribers (during verification)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subscribers' AND policyname = 'Allow insert subscribers') THEN
    CREATE POLICY "Allow insert subscribers" ON subscribers FOR INSERT WITH CHECK (true);
  END IF;
  
  -- Allow updating subscriber status (for unsubscribe)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subscribers' AND policyname = 'Allow update subscribers') THEN
    CREATE POLICY "Allow update subscribers" ON subscribers FOR UPDATE USING (true);
  END IF;
END $$;
