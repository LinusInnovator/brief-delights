# Directive: Send Newsletter

## Goal
Deliver composed newsletter HTML to all confirmed subscribers via Resend API, with per-segment sponsor injection and click tracking.

## Inputs
- `.tmp/newsletter_{segment}_{YYYY-MM-DD}.html` — Composed newsletter for each segment
- Supabase `subscribers` table — confirmed subscribers with segment assignment
- Supabase `sponsor_schedule` + `sponsor_content` — sponsor for today's segment (if scheduled)
- `.env` — `RESEND_API_KEY`, `EMAIL_SENDER`, `SUPABASE_SERVICE_KEY`

## Tool to Use
- **Script:** `execution/send_newsletter.py`

## Expected Outputs
- Email delivered to all confirmed subscribers per segment
- `.tmp/send_log_{YYYY-MM-DD}.json` — delivery report
- Sponsor impressions recorded in `sponsor_schedule.impressions`

## Process
1. Load `.env` and connect to Supabase
2. For each segment (builders, leaders, innovators):
   a. Read composed newsletter HTML from `.tmp/`
   b. Fetch confirmed subscribers for this segment from Supabase
   c. Query `get_sponsor_for_newsletter(date, segment)` via Supabase RPC
   d. If sponsor found: call `inject_sponsor()` to replace placeholders:
      - `{{ sponsor_headline }}`, `{{ sponsor_description }}`
      - `{{ sponsor_cta_text }}`, `{{ sponsor_cta_url }}`
      - CTA URL is wrapped with `/api/track?url=...&sponsor_schedule_id=...` for click tracking
   e. Send to each subscriber via Resend API
   f. Update `sponsor_schedule` with impressions count
3. Save send log to `.tmp/send_log_{YYYY-MM-DD}.json`

## Email Configuration
- **From:** `Brief Delights <hello@brief.delights.pro>` (override via `EMAIL_SENDER` env var)
- **Subject:** `📬 Brief Delights | {Segment Name} {Emoji} — {Date}`
- **Reply-To:** `hello@brief.delights.pro`

## Resend API Details
```python
import resend
resend.api_key = os.getenv("RESEND_API_KEY")

resend.Emails.send({
    "from": "Brief Delights <hello@brief.delights.pro>",
    "to": subscriber_email,
    "subject": f"📬 Brief Delights | Builders 🔧 — February 17, 2026",
    "html": newsletter_html
})
```

## Batching Strategy
- **Batch size:** 100 emails per batch
- **Delay between batches:** 1 second
- **Retry failed sends:** Up to 3 attempts with exponential backoff

## Subscriber Source
Subscribers come from Supabase, **not** `subscribers.json` (legacy file, kept as fallback only):
```python
supabase.table('subscribers')
    .select('email, segment')
    .eq('status', 'confirmed')
    .execute()
```

## Sponsor Injection Flow
```
sponsor_schedule (date + segment) → sponsor_content (creative) → inject_sponsor()
  → Replace placeholders in HTML
  → Wrap CTA URL with /api/track for click tracking
  → increment_sponsor_clicks() RPC on subscriber click
```

## Edge Cases & Error Handling
- **No subscribers for segment:** Skip segment, log warning
- **Newsletter HTML missing:** Skip segment, log error
- **No sponsor scheduled:** Send without sponsor block (placeholders removed)
- **Resend API error:** Log and continue with next subscriber
- **Rate limit hit:** Wait and retry (exponential backoff)
- **All sends fail:** Alert for manual investigation

## Performance Expectations
- **Runtime:** 1-5 minutes per segment (scales with subscriber count)
- **Success rate:** >98%

## Known Issues & Learnings

### Fixed: Stale dreamvalidator.com links (Feb 16, 2026)
- **Root cause:** `EMAIL_SENDER` defaulted to `brief@send.dreamvalidator.com`
- **Fix:** Updated fallback to `Brief Delights <hello@brief.delights.pro>`
- **Prevention:** Always use `brief.delights.pro` domain for all email references

### Fixed: Sponsor click tracking missing (Feb 16, 2026)
- **Root cause:** `inject_sponsor()` wasn't wrapping CTA URL with tracking
- **Fix:** Added `/api/track?url=...&sponsor_schedule_id=...` wrapping
- **Prevention:** All outbound links in newsletters should go through `/api/track`

## Next Step
After sending, the pipeline logs results and aggregates weekly trends via `aggregate_weekly_trends.py`.
