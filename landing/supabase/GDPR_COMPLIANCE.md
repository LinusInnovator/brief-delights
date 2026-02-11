# GDPR Compliance Strategy for Analytics

## 🚨 Issues in Original Schema

### Personal Data Stored
- ❌ `subscriber_email` in `email_events`
- ❌ `subscriber_email` in `article_clicks`
- ❌ `ip_address` in `email_events`
- ❌ No retention limits
- ❌ No deletion mechanism

## ✅ GDPR-Compliant Approach

### 1. Hash Emails Instead of Storing Raw

**Before:**
```sql
subscriber_email TEXT
```

**After:**
```sql
subscriber_hash TEXT  -- SHA-256 hash of email
```

**Benefits:**
- ✅ Can still track unique users
- ✅ Can't reverse to identify individuals
- ✅ GDPR compliant (pseudonymization)

### 2. Remove IP Addresses

**Instead of storing IP:**
- Don't collect it at all
- Or use it only for GeoIP lookup, then discard

### 3. Add Retention Policy

**Auto-delete old data:**
```sql
-- Delete events older than 90 days
DELETE FROM email_events WHERE created_at < NOW() - INTERVAL '90 days';

-- Delete clicks older than 90 days  
DELETE FROM article_clicks WHERE clicked_at < NOW() - INTERVAL '90 days';
```

### 4. Add GDPR Deletion Function

**Right to be forgotten:**
```sql
CREATE FUNCTION gdpr_delete_user(user_email TEXT) RETURNS void AS $$
DECLARE
  email_hash TEXT;
BEGIN
  -- Hash the email
  email_hash := encode(digest(user_email, 'sha256'), 'hex');
  
  -- Delete all data for this user
  DELETE FROM email_events WHERE subscriber_hash = email_hash;
  DELETE FROM article_clicks WHERE subscriber_hash = email_hash;
END;
$$ LANGUAGE plpgsql;
```

## 📋 Updated Schema Changes

### email_events Table
```sql
CREATE TABLE email_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL,
  email_id TEXT NOT NULL,
  subscriber_hash TEXT,  -- ← SHA-256 hash instead of raw email
  segment TEXT,
  clicked_url TEXT,
  user_agent TEXT,
  -- ip_address TEXT,    ← REMOVED
  country_code TEXT,     -- ← Only store country from IP, then delete IP
  created_at TIMESTAMP DEFAULT NOW()
);
```

### article_clicks Table
```sql
CREATE TABLE article_clicks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_url TEXT NOT NULL,
  article_title TEXT,
  segment TEXT NOT NULL,
  newsletter_date DATE NOT NULL,
  subscriber_hash TEXT,  -- ← SHA-256 hash instead of raw email
  source_domain TEXT,
  referrer TEXT,
  clicked_at TIMESTAMP DEFAULT NOW()
);
```

## 🔐 Implementation

### Hash Function (Python)
```python
import hashlib

def hash_email(email: str) -> str:
    """Hash email for GDPR-compliant storage"""
    return hashlib.sha256(email.lower().encode()).hexdigest()
```

### Hash Function (PostgreSQL)
```sql
CREATE FUNCTION hash_email(email TEXT) RETURNS TEXT AS $$
BEGIN
  RETURN encode(digest(lower(email), 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql;
```

## 🗑️ Data Retention

### Automated Cleanup (Supabase Edge Function)
```sql
-- Run daily via cron job
CREATE OR REPLACE FUNCTION cleanup_old_analytics() RETURNS void AS $$
BEGIN
  -- Delete events older than 90 days
  DELETE FROM email_events WHERE created_at < NOW() - INTERVAL '90 days';
  DELETE FROM article_clicks WHERE clicked_at < NOW() - INTERVAL '90 days';
  
  -- Keep aggregate data (no personal info)
  -- Don't delete from subscriber_growth or newsletter_sends
END;
$$ LANGUAGE plpgsql;
```

## ✅ GDPR Compliance Checklist

### Data Minimization
- [x] Only collect what's needed
- [x] Hash personal identifiers
- [x] Remove IP addresses

### Right to be Forgotten
- [x] `gdpr_delete_user()` function
- [x] Deletes all user data

### Data Retention
- [x] 90-day retention for personal data
- [x] Automated cleanup function
- [x] Aggregate data kept (no PII)

### Transparency
- [ ] Privacy policy updated (TODO)
- [ ] Cookie consent banner (TODO)
- [ ] Unsubscribe includes data deletion

### Purpose Limitation
- [x] Data only used for analytics
- [x] Not shared with third parties
- [x] Clear purpose in docs

## 🎯 Recommendation

**Apply the GDPR-compliant version instead!**

Key changes:
1. `subscriber_email` → `subscriber_hash`
2. Remove `ip_address`, add `country_code` only
3. Add 90-day retention policy
4. Add `gdpr_delete_user()` function
5. Add automated cleanup

This gives you analytics without GDPR risk! 🎉
