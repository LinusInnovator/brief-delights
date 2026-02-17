# Directive: Daily Automation

## Goal
Orchestrate the complete multi-segment newsletter pipeline end-to-end. Run all steps sequentially for 3 audience segments (Builders, Leaders, Innovators), then deliver and archive.

## Inputs
- `feeds_config.json` + `feeds_config/` — 1,300+ RSS feed URLs by category
- `segments_config.json` — 3 segment definitions with focus keywords
- Supabase `subscribers` table — subscriber list with segment assignment
- `.env` — all API keys (OpenRouter, Resend, Supabase, Serper, Apify)

## Tool to Use
- **Script:** `execution/run_daily_pipeline.py`

## Pipeline Sequence (6 Steps)

```
Step 1: Aggregate RSS Feeds (30-120s)
   → execution/aggregate_feeds.py
   → Input: 1,300+ RSS feeds
   → Output: .tmp/raw_articles_{YYYY-MM-DD}.json
   → Shared across all segments

Step 2: Select Top Stories (60-300s, LLM-heavy)
   → execution/select_stories.py
   → Runs per-segment selection with segment-specific criteria
   → Output: .tmp/selected_articles_{segment}_{YYYY-MM-DD}.json (×3)
   → Uses OpenRouter (Claude/GPT-4o)

Step 3: Summarize Articles (per segment, 30-90s each)
   → execution/summarize_articles.py --segment {segment}
   → Output: .tmp/summaries_{segment}_{YYYY-MM-DD}.json (×3)

Step 4: Compose Newsletter (per segment, <5s each)
   → execution/compose_newsletter.py --segment {segment}
   → Output: .tmp/newsletter_{segment}_{YYYY-MM-DD}.html (×3)
   → Also archives to .tmp/ via NewsletterArchive utility

Step 5: Send Newsletters (1-5min total)
   → execution/send_newsletter.py
   → Handles all segments, fetches subscribers from Supabase
   → Injects sponsors if scheduled, wraps links with tracking
   → Output: .tmp/send_log_{YYYY-MM-DD}.json

Step 6: Aggregate Weekly Trends (per segment, <30s each)
   → execution/aggregate_weekly_trends.py {segment}
   → Saves daily trend data for Sunday synthesis
```

## Segment-Specific Processing
Steps 2-4 run independently per segment. The pipeline iterates:
```
for segment in [builders, leaders, innovators]:
    select_stories.py    (uses segment-specific criteria from segments_config.json)
    summarize_articles.py --segment {segment}
    compose_newsletter.py --segment {segment}
```

## Pre-flight Checks
The pipeline verifies before starting:
1. ✅ `.env` exists with API keys (or env vars set)
2. ✅ `feeds_config.json` exists
3. ✅ `subscribers.json` exists (legacy fallback)
4. ✅ `segments_config.json` exists

## Error Handling Strategy

| Failure | Response |
|---------|----------|
| Aggregation fails | **STOP** — no articles means no newsletter |
| Selection fails | **STOP** — can't proceed without curated articles |
| Summarization fails for one segment | **SKIP** that segment, continue others |
| Composition fails for one segment | **SKIP** that segment, continue others |
| Send fails | Log error, return failure |
| Weekly aggregation fails | **WARN** only — non-critical |

## Scheduling
- **Weekdays:** 6:00 AM UTC (7:00 AM CET)
- **Method:** GitHub Actions cron (`.github/workflows/daily_newsletter.yml`)
- **Manual trigger:** GitHub Actions → "Run workflow" button

```yaml
# .github/workflows/daily_newsletter.yml
on:
  schedule:
    - cron: '0 6 * * *'
  workflow_dispatch:  # manual trigger
```

## Performance Expectations
- **Total runtime:** 3-8 minutes (depends on article volume and subscriber count)
- **API costs per day:** ~$0.10-0.30 (OpenRouter LLM calls)
- **Success rate target:** >98%

## Monitoring
- `pipeline_log_{YYYY-MM-DD}.txt` — master log with all steps
- Check `.tmp/` for expected output files per segment
- `send_log_{YYYY-MM-DD}.json` — delivery statistics

## Known Issues & Learnings

### LLM timeout on large datasets (Feb 2026)
- **Root cause:** `select_stories.py` processing 200+ articles sometimes exceeded 120s timeout
- **Fix:** Increased timeout to 300s for story selection step
- **Prevention:** Monitor article count; consider batching if consistently >250

### Newsletter archiving silently fails (Feb 2026)
- **Root cause:** `NewsletterArchive` import errors caught and logged as warning, not failure
- **Impact:** Low — newsletter still sends, just archive copy missing
- **Prevention:** Non-critical, but monitor for repeated failures

### iCloud git push bus errors (Feb 2026)
- **Root cause:** Git operations on iCloud-synced directories cause signal 10 crashes
- **Fix:** Set `GIT_HTTP_POST_BUFFER=524288000` and retry
- **Prevention:** Always retry git push with buffer flag if first attempt fails

## Next Steps (Future)
- Add email alerting on pipeline failure
- Implement A/B testing for subject lines
- Send time optimization per subscriber timezone

## Previous Issues (Resolved)

### Missing `supabase` in requirements.txt (Feb 17, 2026)
- **Root cause:** `send_newsletter.py` imports `supabase` but the package was never added to `requirements.txt`
- **Impact:** Step 5 (send) crashed with `ModuleNotFoundError` in CI; steps 1-4 worked fine because they don't use Supabase
- **Fix:** Added `supabase>=2.0.0` to `requirements.txt` and added `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_KEY` env vars to both workflow files
- **Prevention:** When adding new imports, always verify they're in `requirements.txt`. Run `pip freeze | grep <pkg>` locally doesn't catch CI gaps
