-- Referral System Schema
-- Adds referral tracking to subscribers table

-- Add referral columns to subscribers
ALTER TABLE subscribers 
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS referred_by TEXT,
ADD COLUMN IF NOT EXISTS referral_count INTEGER DEFAULT 0;

-- Generate referral codes for existing subscribers
UPDATE subscribers 
SET referral_code = LOWER(SUBSTR(MD5(email || NOW()::TEXT), 1, 8))
WHERE referral_code IS NULL;

-- Create index for referral lookups
CREATE INDEX IF NOT EXISTS idx_subscribers_referral_code ON subscribers(referral_code);
CREATE INDEX IF NOT EXISTS idx_subscribers_referred_by ON subscribers(referred_by);

-- Function to generate a short referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.referral_code IS NULL THEN
        NEW.referral_code := LOWER(SUBSTR(MD5(NEW.email || NOW()::TEXT), 1, 8));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-generate referral code on insert
DROP TRIGGER IF EXISTS tr_generate_referral_code ON subscribers;
CREATE TRIGGER tr_generate_referral_code
    BEFORE INSERT ON subscribers
    FOR EACH ROW
    EXECUTE FUNCTION generate_referral_code();

-- Function to increment referral count when someone signs up via referral
CREATE OR REPLACE FUNCTION increment_referral_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.referred_by IS NOT NULL AND NEW.status = 'confirmed' THEN
        UPDATE subscribers 
        SET referral_count = referral_count + 1
        WHERE referral_code = NEW.referred_by;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: when a subscriber is confirmed, credit the referrer
DROP TRIGGER IF EXISTS tr_increment_referral ON subscribers;
CREATE TRIGGER tr_increment_referral
    AFTER UPDATE OF status ON subscribers
    FOR EACH ROW
    WHEN (OLD.status != 'confirmed' AND NEW.status = 'confirmed')
    EXECUTE FUNCTION increment_referral_count();
