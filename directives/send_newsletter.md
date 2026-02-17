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
- **From:** `Brief Delights <hello@send.dreamvalidator.com>` (override via `EMAIL_SENDER` env var)
- **Subject:** `Brief Delights for {Segment} — {Date}`
- **Reply-To:** `hello@brief.delights.pro`

## Resend API Details
```python
import resend
resend.api_key = os.getenv("RESEND_API_KEY")

resend.Emails.send({
    "from": "Brief Delights <hello@send.dreamvalidator.com>",
    "to": subscriber_email,
    "subject": f"Brief Delights for Builders 🔧 — February 17, 2026",
    "html": personalized_html  # After referral personalization
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
    .select('email, segment, referral_code, referral_count')
    .eq('status', 'confirmed')
    .execute()
```

## Referral Personalization
Each email is personalized per-subscriber before sending via `personalize_referral()`:
- `{{ referral_code }}` → subscriber's unique 8-char code
- `{{ referral_count }}` → number of successful referrals
- `{{ referral_remaining }}` → referrals needed for next milestone
- `{{ referral_next_reward }}` → name of next reward tier
- `MILESTONE_X_STYLE` → highlighted style for achieved milestones
- `PROGRESS_BAR_WIDTH` → percentage width for progress bar

### Referral Tiers
| Referrals | Reward |
|---|---|
| 1 | Founding Reader badge |
| 3 | Sunday Deep Dive access |
| 5 | All 3 segments unlocked |
| 10 | Newsletter shoutout |

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

### Fixed: Sender domain mismatch (Feb 17, 2026)
- **Root cause:** `EMAIL_SENDER` defaulted to `brief.delights.pro` which is not verified in Resend
- **Fix:** Updated to `hello@send.dreamvalidator.com` (verified domain)
- **Prevention:** Always use `send.dreamvalidator.com` for outbound email

### Resolved: Ephemeral subscriber storage (Feb 17, 2026)
- **Root cause:** Netlify functions wrote subscribers to filesystem (`subscribers.json`, `pending_verifications.json`) which is lost on deploy
- **Fix:** Migrated both `subscribe.ts` and `verify.ts` to use Supabase tables exclusively
- **Prevention:** Never write persistent data to Netlify's filesystem

### Fixed: Sponsor click tracking missing (Feb 16, 2026)
- **Root cause:** `inject_sponsor()` wasn't wrapping CTA URL with tracking
- **Fix:** Added `/api/track?url=...&sponsor_schedule_id=...` wrapping
- **Prevention:** All outbound links in newsletters should go through `/api/track`

## Next Step
After sending, the pipeline logs results and aggregates weekly trends via `aggregate_weekly_trends.py`.
