# Resend Webhook Setup Guide

## Overview
Configure Resend to send webhook events to your Brief Delights analytics endpoint.

## Steps

### 1. Access Resend Dashboard
1. Go to https://resend.com/dashboard
2. Navigate to **Settings** → **Webhooks**

### 2. Create Webhook
Click **Add Endpoint** and configure:

**Webhook URL:**
```
https://brief.delights.pro/api/webhooks/resend
```

**Events to Subscribe:**
Select the following events:
- ✅ `email.sent`
- ✅ `email.delivered`  
- ✅ `email.opened`
- ✅ `email.clicked` *(most important for analytics)*
- ✅ `email.bounced`
- ✅ `email.complained`

### 3. Optional: Webhook Secret
For production security, generate a webhook secret:
1. Copy the webhook signing secret
2. Add to Netlify environment variables:
   - Key: `RESEND_WEBHOOK_SECRET`
   - Value: `<your_secret>`

### 4. Test Webhook
1. Send a test newsletter via Resend
2. Click an article link
3. Check Supabase `article_clicks` table for new rows

## Verification

After setup, verify webhook is working:

```sql
-- Check recent article clicks
SELECT 
  article_title,
  source_domain,
  segment,
  COUNT(*) as clicks,
  newsletter_date
FROM article_clicks
WHERE newsletter_date >= CURRENT_DATE - 7
GROUP BY article_title, source_domain, segment, newsletter_date
ORDER BY clicks DESC;
```

Should see click events appearing after newsletters are sent.

## Environment Variables Needed

Add to Netlify (if not already set):

```bash
# For sending emails from dashboard
RESEND_API_KEY=re_****

# Optional: For testing before production
SPONSOR_TEST_EMAIL=your@email.com

# Optional: Webhook signature verification
RESEND_WEBHOOK_SECRET=<from_resend_dashboard>
```

## Testing Locally

For local development:
1. Use ngrok to expose localhost: `ngrok http 3000`
2. Use the ngrok URL in Resend webhook config
3. Format: `https://abc123.ngrok.io/api/webhooks/resend`

## Troubleshooting

**No clicks appearing?**
- Check Resend webhook logs for delivery failures
- Verify webhook URL is correct (no typos)
- Ensure all events are subscribed

**Getting 401 errors?**
- Webhook secret may be incorrect
- Comment out signature verification temporarily for testing

**Newsletter links not tracking?**
- Ensure links use tracking format: `https://brief.delights.pro/track?url=<article_url>&segment=<segment>`
- Resend must track the `/track` redirect as a click

## GDPR Compliance ✅

The webhook handler automatically:
- Hashes all emails (SHA-256)
- Stores only: article URL + segment + timestamp
- Auto-deletes data after 90 days
- Does NOT store: IP addresses, user agents, device info

See [GDPR_ANALYTICS.md](file:///Users/linus/Library/Mobile%20Documents/com~apple~CloudDocs/projects/Dream%20Validator/Prototrying.com/Prototryers/antigravity/The%20letter/landing/GDPR_ANALYTICS.md) for full details.
