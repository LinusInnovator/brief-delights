# Directive: Weekly Insights (Sunday Edition)

## Goal
Synthesize a week's worth of daily newsletter data into a strategic Sunday insights email. This gives subscribers a higher-level view of trends, patterns, and what to watch.

## Inputs
- `.tmp/weekly_trends_{segment}_{date}.json` — Aggregated daily trend data (saved by Step 6 of daily pipeline)
- `segments_config.json` — Segment definitions
- `weekly_insights_template.html` — Jinja2 template (or inline fallback in script)

## Tools

| Script | Purpose |
|--------|---------|
| `execution/aggregate_weekly_trends.py {segment}` | Aggregate daily trends into weekly summary data |
| `execution/synthesize_weekly_insights.py {segment}` | LLM synthesis of trends into narrative insights |
| `execution/generate_weekly_charts.py {segment}` | Generate trend charts (PNG, base64-encoded for email) |
| `execution/compose_insights_newsletter.py {segment}` | Compose final Sunday email HTML |

## Pipeline Sequence

```
Step 1: Aggregate Weekly Trends (already done daily in Step 6)
   → Data accumulates in .tmp/weekly_trends_{segment}_{date}.json

Step 2: Synthesize Insights (LLM-powered)
   → execution/synthesize_weekly_insights.py {segment}
   → Output: .tmp/weekly_insights_{segment}_{date}.json
   → Contains: narrative analysis, key trends, predictions

Step 3: Generate Charts
   → execution/generate_weekly_charts.py {segment}
   → Output: .tmp/charts/top_trend_{segment}_{date}.png
   → Output: .tmp/charts/top_trends_bar_{segment}_{date}.png
   → Charts encoded as base64 data URIs for email embedding

Step 4: Compose Email
   → execution/compose_insights_newsletter.py {segment}
   → Output: .tmp/newsletter_weekly_{segment}_{date}.html
   → Charts embedded inline (no external image hosting needed)

Step 5: Send (reuse send_newsletter.py)
   → Deliver to confirmed subscribers per segment
```

## Email Format
- Header: "Brief Delights — Weekly Insights 📊"
- Curation stats: "~8,000 scanned → ~2,400 analyzed → N selected this week"
- Narrative insights (LLM-generated, converted from markdown to HTML)
- Trend charts (embedded base64 PNG)
- Footer: same as daily (brief.delights.pro links)

## Scheduling
- **When:** Sunday morning
- **Method:** Manual trigger or dedicated GitHub Actions workflow

## Performance Expectations
- **Synthesis:** 30-60 seconds per segment (LLM call)
- **Charts:** 5-10 seconds per segment
- **Composition:** <5 seconds per segment

## Known Issues & Learnings

### Charts can push email over 102KB (ongoing)
- **Root cause:** Base64-encoded PNGs are ~50-100KB each
- **Mitigation:** Limit to 2 charts; optimize PNG compression
- **Impact:** Gmail may clip the email if too large
- **Prevention:** Check `compose_insights_newsletter.py` size warning

### OpenRouter HTTP-Referer header (Feb 2026)
- **Observation:** `synthesize_weekly_insights.py` sets `HTTP-Referer: https://dreamvalidator.com`
- **Status:** Still works but should be updated to `https://brief.delights.pro`
- **Impact:** Low — only affects OpenRouter analytics/billing attribution

## Next Steps
- Automate Sunday send via cron/GitHub Actions
- Add subscriber engagement comparison (this week vs. last)
- Include "what to watch next week" predictions section
