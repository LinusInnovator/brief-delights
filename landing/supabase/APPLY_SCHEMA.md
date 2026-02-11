# Apply Analytics Schema to Supabase

## 📋 Quick Start

### 1. Open Supabase SQL Editor

Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new

### 2. Copy & Paste the Migration

Open: `landing/supabase/migrations/20260211_analytics_schema.sql`

Copy the entire file and paste into the SQL editor.

### 3. Run the Migration

Click **"Run"** button

You should see:
```
Success. No rows returned
```

### 4. Verify Tables Created

Go to: **Table Editor** tab

You should see 5 new tables:
- ✅ `newsletter_sends`
- ✅ `email_events`  
- ✅ `article_clicks`
- ✅ `subscriber_growth`
- ✅ `automation_performance`

### 5. Test the Views

Run this query to test:

```sql
-- Check sample data was inserted
SELECT * FROM subscriber_growth ORDER BY date DESC LIMIT 3;

-- Check view works
SELECT * FROM v_growth_summary_30d;

-- Test function
SELECT calculate_engagement_rate('builders', 7);
```

---

## 🎯 What This Schema Gives Us

### Tables
1. **newsletter_sends** - Track each newsletter sent
2. **email_events** - Resend webhooks (opens, clicks)
3. **article_clicks** - Track article engagement
4. **subscriber_growth** - Daily growth metrics
5. **automation_performance** - Monitor bot performance

### Views (Pre-built Queries)
- `v_recent_open_rates` - Open rates by segment (7 days)
- `v_top_articles_7d` - Most clicked articles
- `v_growth_summary_30d` - Growth trends

### Functions
- `calculate_engagement_rate()` - Click rate calculator

---

## ✅ Success Checklist

- [ ] Migration ran without errors
- [ ] 5 tables visible in Table Editor
- [ ] Sample data inserted (3 rows in `subscriber_growth`)
- [ ] Views return data
- [ ] Function works

---

## 🔧 Troubleshooting

**Error: "uuid_generate_v4() does not exist"**
→ Run: `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`

**Tables already exist**
→ Safe to ignore - schema uses `IF NOT EXISTS`

**No data in views**
→ Normal - they'll populate once we start tracking

---

## 🚀 Next Steps

Once schema is live:

1. **Day 2:** Build click tracking endpoint
2. **Day 3:** Create dashboard  
3. **Week 2:** Integrate with newsletter pipeline

Schema is ready! Let me know when it's applied and we'll move to Day 2.
