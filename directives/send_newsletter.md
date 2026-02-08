# Directive: Send Newsletter

## Goal
Distribute the newsletter to all active subscribers using Resend API. Handle batching, rate limits, and error tracking.

## Inputs
- `.tmp/newsletter_YYYY-MM-DD.html` - Compiled newsletter HTML
- `subscribers.json` - Subscriber list with emails and preferences

## Tool to Use
- **Script:** `execution/send_newsletter.py`

## Expected Outputs
- Email sent to all active subscribers
- `.tmp/send_log_YYYY-MM-DD.json` - Delivery log
- Success/failure status for each recipient

## Success Criteria
- ✅ All active subscribers receive the email
- ✅ No rate limit errors
- ✅ Failed sends are logged for retry
- ✅ Delivery within 5 minutes for lists under 1000 subscribers

## Process
1. Read newsletter HTML from `.tmp/newsletter_YYYY-MM-DD.html`
2. Load subscribers from `subscribers.json`
3. Filter for active subscribers only
4. Batch sends (100 emails at a time to avoid rate limits)
5. For each batch:
   - Send via Resend API
   - Log success/failure
   - Wait between batches if needed
6. Save delivery log to `.tmp/send_log_YYYY-MM-DD.json`

## Resend API Integration

**Authentication:**
- API Key from `RESEND_API_KEY` environment variable

**Send Endpoint:**
```python
import resend
resend.api_key = os.getenv("RESEND_API_KEY")

resend.Emails.send({
    "from": "TechPulse Daily <send@send.dreamvalidator.com>",
    "to": subscriber_email,
    "subject": f"📬 TechPulse Daily - {formatted_date}",
    "html": newsletter_html
})
```

**Rate Limits:**
- Resend free tier: 100 emails/day, 3,000/month
- Paid tier: Higher limits based on plan
- Implement batching with delays to stay within limits

## Batching Strategy
- **Batch size:** 100 emails per batch
- **Delay between batches:** 1 second
- **Retry failed sends:** Up to 3 attempts with exponential backoff

## Email Headers
- **From:** `TechPulse Daily <send@send.dreamvalidator.com>`
- **Reply-To:** `hello@send.dreamvalidator.com` (optional)
- **Subject:** `📬 TechPulse Daily - [Date]`
- **List-Unsubscribe:** `<{unsubscribe_url}>`

## Subscriber Filtering
- **Active status:** Only send to `status: "active"`
- **Skip bounced:** Don't send to `status: "bounced"` or `"unsubscribed"`
- **Respect preferences:** Check frequency preferences (daily, weekly, etc.)

## Error Handling
- **API error:** Log and continue with next batch
- **Invalid email:** Skip and log warning
- **Rate limit hit:** Wait and retry
- **Network timeout:** Retry up to 3 times

## Logging
Log to `.tmp/send_log_YYYY-MM-DD.json`:
```json
{
  "send_date": "2026-02-08T07:00:00",
  "total_subscribers": 150,
  "emails_sent": 148,
  "failures": 2,
  "failed_emails": [
    {"email": "bounce@example.com", "error": "Invalid recipient"}
  ],
  "execution_time_seconds": 45
}
```

## Performance Expectations
- **Runtime:** 1-5 minutes for 100-1000 subscribers
- **Success rate:** >98%

## Edge Cases
- **No subscribers:** Log warning, skip sending
- **HTML file missing:** Abort with error
- **API credentials invalid:** Abort with clear error message
- **All sends fail:** Alert for manual investigation

## Next Step
After sending, proceed to tracking and monitoring (future phase).

## Future Enhancements
- Personalization (use subscriber name in greeting)
- A/B testing subject lines
- Send time optimization
- Engagement scoring
