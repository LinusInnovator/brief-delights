# Directive: Daily Automation

## Goal
Orchestrate the complete newsletter pipeline end-to-end. This is the master directive that coordinates all other directives in sequence.

## Inputs
- Configuration files: `feeds_config.json`, `subscribers.json`
- Environment: Current date/time, API keys in `.env`

## Tool to Use
- **Script:** `execution/run_daily_pipeline.py`

## Expected Outputs
- Complete newsletter generated and sent
- All intermediate files in `.tmp/`
- Comprehensive execution log

## Success Criteria
- ✅ All pipeline steps complete successfully
- ✅ Newsletter sent to all active subscribers
- ✅ No manual intervention required
- ✅ Complete execution in < 5 minutes
- ✅ Detailed logs for debugging if needed

## Pipeline Sequence

```
1. Aggregate RSS Feeds (30-60s)
   → execution/aggregate_feeds.py
   → Output: .tmp/raw_articles_YYYY-MM-DD.json

2. Select Top Stories (10-30s)
   → execution/select_stories.py
   → Output: .tmp/selected_articles_YYYY-MM-DD.json

3. Summarize Articles (10-20s)
   → execution/summarize_articles.py
   → Output: .tmp/summaries_YYYY-MM-DD.json

4. Compose Newsletter (<5s)
   → execution/compose_newsletter.py
   → Output: .tmp/newsletter_YYYY-MM-DD.html

5. Send Newsletter (1-5min)
   → execution/send_newsletter.py
   → Output: .tmp/send_log_YYYY-MM-DD.json
```

## Error Handling Strategy

**Step failures:**
- If step fails, log error and STOP pipeline (don't continue)
- Send alert/notification to admin
- Save partial results for debugging

**Retry logic:**
- Aggregate feeds: Retry up to 2 times on failure
- LLM calls: Already have retry logic in individual scripts
- Email sending: Continue even if some emails fail

**Logging:**
- Each step logs to its own file in `.tmp/`
- Master pipeline creates `pipeline_log_YYYY-MM-DD.txt` with summary

## Scheduling

**Recommended schedule:**
- **Weekdays:** 6:00 AM local time
- **Weekends:** Optional (can skip or send reduced frequency)

**macOS cron setup:**
```bash
# Edit crontab
crontab -e

# Add this line (runs Mon-Fri at 6 AM)
0 6 * * 1-5 cd /path/to/project && python3 execution/run_daily_pipeline.py
```

**Alternative: launchd (macOS native)**
Create `~/Library/LaunchAgents/com.newsletter.daily.plist`

## Environment Requirements
- Python 3.8+
- All dependencies installed (`pip install -r requirements.txt`)
- API keys in `.env`
- Sufficient API credits (OpenRouter, Resend)

## Pre-flight Checks
Before running pipeline, verify:
1. `.env` file exists with all required keys
2. `feeds_config.json` has valid RSS feeds
3. `subscribers.json` has at least one active subscriber
4. No stale locks from previous runs

## Monitoring & Alerts

**Success indicators:**
- Pipeline completes in < 5 minutes
- All log files created
- Send log shows >95% delivery success

**Failure indicators:**
- Pipeline exceeds 10 minutes
- Any step exits with error code
- Send log shows <80% delivery success

**Alert mechanisms (future):**
- Send error report to admin email
- Slack/Discord webhook notification
- SMS via Twilio (for critical failures)

## Cleanup
- Keep logs for 30 days, then delete
- `.tmp/` files can be regenerated, so safe to delete anytime

## Testing
Run manually first:
```bash
cd /path/to/project
python3 execution/run_daily_pipeline.py
```

Check all outputs to verify correct operation before scheduling.

## Performance Expectations
- **Total runtime:** 2-5 minutes (depends on subscriber count)
- **API costs per day:** ~$0.10-0.20 (OpenRouter) + email costs
- **Success rate:** >98%

## Edge Cases
- **No new articles:** If RSS aggregation finds <5 articles, skip newsletter for that day
- **All LLM calls fail:** Send error alert, don't send empty newsletter
- **Resend API down:** Retry 3 times, then alert admin

## Next Steps
Once pipeline is stable:
1. Add performance monitoring
2. Implement A/B testing
3. Build referral program
4. Add analytics dashboard
