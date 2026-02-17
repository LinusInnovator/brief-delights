-- Migration: Pending Verifications Table
-- Replaces filesystem-based pending_verifications.json with Supabase table
-- Required for subscribe/verify flow to survive Netlify deploys

CREATE TABLE IF NOT EXISTS pending_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  segment TEXT NOT NULL CHECK (segment IN ('builders', 'leaders', 'innovators')),
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
);

-- Index for token lookups during verification
CREATE INDEX IF NOT EXISTS idx_pending_token ON pending_verifications(token);

-- Index for auto-cleanup of expired verifications
CREATE INDEX IF NOT EXISTS idx_pending_expires ON pending_verifications(expires_at);

-- Ensure subscribers table has the columns we need
-- (table should already exist, this is a safety net)
CREATE TABLE IF NOT EXISTS subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  segment TEXT NOT NULL DEFAULT 'leaders' CHECK (segment IN ('builders', 'leaders', 'innovators')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'unsubscribed')),
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  referral_code TEXT,
  referred_by TEXT
);

-- RLS: Allow anon key to insert pending verifications and read/update during verify
ALTER TABLE pending_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow insert pending verifications" ON pending_verifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow select pending verifications by token" ON pending_verifications
  FOR SELECT USING (true);

CREATE POLICY "Allow delete pending verifications" ON pending_verifications
  FOR DELETE USING (true);

-- RLS for subscribers: allow inserts during verification, allow reads for send pipeline
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;

-- Allow anon to insert new subscribers (during verification)
CREATE POLICY "Allow insert subscribers" ON subscribers
  FOR INSERT WITH CHECK (true);

-- Allow anon to read subscriber count (for landing page)
CREATE POLICY "Allow select subscribers" ON subscribers
  FOR SELECT USING (true);

-- Allow anon to update subscriber status (for unsubscribe)
CREATE POLICY "Allow update subscribers" ON subscribers
  FOR UPDATE USING (true);
