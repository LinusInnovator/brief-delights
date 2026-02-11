-- Quick Test Queries for Analytics Schema
-- Run these in Supabase SQL Editor to verify everything works

-- 1. Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('newsletter_sends', 'email_events', 'article_clicks', 'subscriber_growth', 'automation_performance')
ORDER BY table_name;
-- Expected: 5 rows

-- 2. Check sample data was inserted
SELECT * FROM subscriber_growth ORDER BY date DESC LIMIT 3;
-- Expected: 3 rows with subscriber counts

-- 3. Test the growth view
SELECT * FROM v_growth_summary_30d LIMIT 5;
-- Expected: Shows growth metrics with calculated rates

-- 4. Test email hashing function
SELECT hash_email('test@example.com');
-- Expected: Returns a long SHA-256 hash like '973dfe463ec85785f5f95af5ba3906ee...'

-- 5. Test GDPR deletion function
SELECT * FROM gdpr_delete_user('test@example.com');
-- Expected: Returns (deleted_events, deleted_clicks)

-- 6. Check email_events has test data
SELECT event_type, subscriber_hash, segment FROM email_events LIMIT 5;
-- Expected: Shows hashed emails, not raw addresses

-- 7. Verify auto-expiration columns exist
SELECT expires_at FROM email_events LIMIT 1;
SELECT expires_at FROM article_clicks LIMIT 1;
-- Expected: Timestamps 90 days in the future

-- 8. Test engagement rate function
SELECT calculate_engagement_rate('builders', 7);
-- Expected: Returns a percentage (might be 0 if no data yet)

-- ✅ If all 8 queries work, schema is perfect!
