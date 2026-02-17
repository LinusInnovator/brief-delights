# Directive: Aggregate RSS Feeds

## Goal
Pull fresh articles from 1,300+ configured RSS feeds and prepare them for LLM-powered curation. This is Step 1 of the daily pipeline — shared across all 3 segments.

## Inputs
- `feeds_config.json` — Master feed configuration
- `feeds_config/` — Category-specific feed lists
- Environment: Current date/time to filter recent articles

## Tool to Use
- **Script:** `execution/aggregate_feeds.py`

## Expected Outputs
- `.tmp/raw_articles_{YYYY-MM-DD}.json` — All articles from the past 24 hours
- Each article record includes:
  - `title` — Article headline
  - `url` — Full article URL
  - `published_date` — ISO 8601 timestamp
  - `description` — RSS description/excerpt
  - `source` — Feed name/publication
  - `category` — Category from feeds_config
  - `raw_content` — Full RSS content (if available)

## Success Criteria
- ✅ All configured feeds attempted (1,300+)
- ✅ Only articles from last 24 hours included
- ✅ Duplicates removed (based on URL)
- ✅ Target: 100-300 articles collected
- ✅ Output JSON valid and properly formatted

## Process
1. Read `feeds_config.json` + `feeds_config/` to get all feed URLs
2. For each feed:
   - Parse RSS/Atom feed using feedparser
   - Extract article metadata
   - Filter by publication date (last 24 hours)
   - Assign category based on feeds_config
3. Deduplicate articles (same URL = duplicate)
4. Sort by publication date (newest first)
5. Save to `.tmp/raw_articles_{YYYY-MM-DD}.json`

## Edge Cases & Error Handling
- **Feed unavailable:** Log warning, continue with other feeds (expect 5-10% failure rate)
- **Malformed feed:** Skip and log error, don't crash pipeline
- **No new articles:** If total <20 articles, extend lookback to 48 hours
- **Slow feeds:** Set 10-second timeout per feed
- **Date parsing errors:** Use feed fetch time as fallback

## Performance Expectations
- **Runtime:** 30-120 seconds for 1,300+ feeds (parallel fetching)
- **Output size:** 100-300 articles on average
- **Feed success rate:** ~90-95% (some feeds are intermittently down)

## Known Issues & Learnings

### Feed volume is much higher than original design (Feb 2026)
- **Original assumption:** ~30 feeds producing 50-150 articles
- **Reality:** 1,300+ feeds producing 100-300+ articles daily
- **Impact:** Downstream LLM calls process more data, timeouts needed to be increased
- **Prevention:** Monitor article count; if consistently >300, consider pre-filtering

### Some feeds return stale content (ongoing)
- **Root cause:** Some RSS feeds don't respect `published_date` properly
- **Mitigation:** The 24-hour filter catches most, but some slip through
- **Impact:** Minor — story selection LLM handles deduplication

## Next Step
After aggregation, proceed to `select_top_stories.md` to filter articles per segment.
