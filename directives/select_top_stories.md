# Directive: Select Top Stories

## Goal
Use LLM to analyze aggregated articles and select the most important stories per audience segment. Each segment gets its own curated selection based on unique criteria from `segments_config.json`.

## Inputs
- `.tmp/raw_articles_{YYYY-MM-DD}.json` — All articles from RSS aggregation
- `segments_config.json` — Segment definitions with focus categories and keywords

## Tool to Use
- **Script:** `execution/select_stories.py`

## Segments
Selection runs independently for each of the 3 segments:

| Segment | Target Audience | Focus |
|---------|----------------|-------|
| **Builders** 🔧 | CTOs, VPs of Engineering | Infrastructure, DevOps, APIs, databases, scalability |
| **Leaders** 💼 | CEOs, Founders | Strategy, M&A, market trends, funding, leadership |
| **Innovators** 🚀 | Researchers, Early Adopters | AI research, breakthroughs, novel applications |

Each segment has `focus_keywords`, `skip_keywords`, and `selection_criteria` in `segments_config.json`.

## Expected Outputs
- `.tmp/selected_articles_{segment}_{YYYY-MM-DD}.json` — per segment (×3 files)
- Each article includes:
  - All original metadata (title, url, source, etc.)
  - `selection_reason` — Why this article was chosen
  - `audience_value` — What readers will gain
  - `urgency_score` — 1-10 rating
  - `category_tag` — Section placement
  - `tier` — Full, Quick Link, or Trending

## 3-Tier Selection

| Tier | Count | Criteria |
|------|-------|----------|
| **Full** | 3-4 | Highest impact, worth deep summary |
| **Quick Links** | 5-8 | Relevant but lower priority, one-liner summaries |
| **Trending** | 3-5 | Hot topics appearing across multiple sources |

## Process
1. Read raw articles from `.tmp/raw_articles_{YYYY-MM-DD}.json`
2. For each segment:
   a. Filter by segment's `focus_categories` and `focus_keywords`
   b. Exclude articles matching `skip_keywords`
   c. Send filtered set to OpenRouter with segment-specific prompt
   d. LLM returns tiered selection with metadata
   e. Validate (correct tier counts, diverse categories)
   f. Save to `.tmp/selected_articles_{segment}_{YYYY-MM-DD}.json`

## Model Selection
- **Primary:** `anthropic/claude-3.5-sonnet` via OpenRouter (best editorial judgement)
- **Fallback:** `openai/gpt-4o` if Claude unavailable

## Edge Cases & Error Handling
- **LLM returns wrong count:** Re-prompt with stricter instructions
- **Invalid JSON:** Parse error → retry with formatted examples
- **All articles low quality:** Relax keyword filtering, expand selection
- **Missing article IDs:** Cross-reference by title/URL
- **API timeout:** Retry up to 3 times with exponential backoff

## Performance Expectations
- **Runtime:** 60-300 seconds total (all 3 segments)
- **Cost:** ~$0.05-0.15 per day (OpenRouter)
- **Timeout:** 300 seconds (increased from 120s due to large datasets)

## Known Issues & Learnings

### Timeout at 120s with large article sets (Feb 2026)
- **Root cause:** Processing 200+ articles in a single LLM call took >120s
- **Fix:** Increased timeout to 300s in `run_daily_pipeline.py`
- **Prevention:** If article count regularly exceeds 250, consider pre-filtering or batching

### Segment overlap can be high (ongoing)
- **Observation:** Some articles (especially major AI news) appear in all 3 segments
- **Impact:** Low — each segment frames the article differently
- **Prevention:** Acceptable; segment value comes from framing, not exclusivity

## Next Step
After selection, proceed to `summarize_articles.md` to generate per-segment summaries.
