# Directive: Aggregate RSS Feeds

## Goal
Pull fresh articles from configured RSS feeds and prepare them for LLM-powered curation. This is the first step in the daily newsletter pipeline.

## Inputs
- `feeds_config.json` - List of RSS feed URLs organized by category
- Environment: Current date/time to filter recent articles

## Tool to Use
- **Script:** `execution/aggregate_feeds.py`

## Expected Outputs
- `.tmp/raw_articles_YYYY-MM-DD.json` - All articles from the past 24 hours
- Each article record includes:
  - `title` - Article headline
  - `url` - Full article URL
  - `published_date` - ISO 8601 timestamp
  - `description` - RSS description/excerpt
  - `source` - Feed name/publication
  - `category` - Category from feeds_config
  - `raw_content` - Full RSS content (if available)

## Success Criteria
- ✅ All feeds in config are successfully parsed
- ✅ Only articles from last 24 hours are included
- ✅ Duplicates are removed (based on URL)
- ✅ At least 50-100 articles collected total
- ✅ Output JSON is valid and properly formatted

## Process
1. Read `feeds_config.json` to get all feed URLs
2. For each feed:
   - Parse RSS/Atom feed using feedparser
   - Extract article metadata
   - Filter by publication date (last 24 hours)
   - Assign category based on feeds_config
3. Deduplicate articles (same URL = duplicate)
4. Sort by publication date (newest first)
5. Save to `.tmp/raw_articles_YYYY-MM-DD.json`

## Edge Cases & Error Handling
- **Feed unavailable:** Log warning, continue with other feeds
- **Malformed feed:** Skip and log error, don't crash pipeline
- **No new articles:** If total < 20 articles, extend lookback to 48 hours
- **Slow feeds:** Set 10-second timeout per feed
- **Date parsing errors:** Use feed fetch time as fallback

## Performance Expectations
- **Runtime:** 30-60 seconds for ~30 feeds
- **Output size:** 50-150 articles on average

## Logging
Log to `.tmp/feed_aggregation_log_YYYY-MM-DD.txt`:
- Number of articles per feed
- Any feed errors or timeouts
- Total articles collected
- Execution time

## Next Step
After successful aggregation, proceed to `select_top_stories.md` to filter articles using LLM.
