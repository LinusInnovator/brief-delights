-- Brief Delights Database Schema
-- Creates subscribers table for email list management

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Subscribers table
CREATE TABLE IF NOT EXISTS subscribers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    segment TEXT NOT NULL CHECK (segment IN ('builders', 'leaders', 'innovators')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'unsubscribed')),
    
    -- Verification
    verification_token TEXT UNIQUE,
    token_expires_at TIMESTAMPTZ,
    
    -- Timestamps
    confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    unsubscribed_at TIMESTAMPTZ,
    
    -- Metadata
    ip_address INET,
    user_agent TEXT,
    referrer TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscribers_email ON subscribers(email);
CREATE INDEX IF NOT EXISTS idx_subscribers_verification_token ON subscribers(verification_token) WHERE verification_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscribers_status ON subscribers(status);
CREATE INDEX IF NOT EXISTS idx_subscribers_segment ON subscribers(segment);
CREATE INDEX IF NOT EXISTS idx_subscribers_created_at ON subscribers(created_at DESC);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to call the function
CREATE TRIGGER update_subscribers_updated_at
    BEFORE UPDATE ON subscribers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anon insert (for signup)
CREATE POLICY "Allow anonymous signup"
    ON subscribers
    FOR INSERT
    TO anon
    WITH CHECK (true);

-- Policy: Allow anon select with token (for verification)
CREATE POLICY "Allow verification lookup"
    ON subscribers
    FOR SELECT
    TO anon
    USING (verification_token IS NOT NULL);

-- Policy: Allow anon update with token (for confirmation)
CREATE POLICY "Allow verification update"
    ON subscribers
    FOR UPDATE
    TO anon
    USING (verification_token IS NOT NULL);

-- Comments for documentation
COMMENT ON TABLE subscribers IS 'Email subscribers for Brief Delights newsletter';
COMMENT ON COLUMN subscribers.email IS 'Subscriber email address (unique)';
COMMENT ON COLUMN subscribers.segment IS 'Newsletter segment: builders, leaders, or innovators';
COMMENT ON COLUMN subscribers.status IS 'Subscription status: pending, confirmed, or unsubscribed';
COMMENT ON COLUMN subscribers.verification_token IS 'Token sent in verification email';
COMMENT ON COLUMN subscribers.token_expires_at IS 'Expiration timestamp for verification token';
