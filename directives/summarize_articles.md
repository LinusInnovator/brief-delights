# Directive: Summarize Articles

## Goal
Generate concise, engaging summaries for selected articles per segment using LLM. Summaries are tiered — Full stories get deep treatment, Quick Links get one-liners.

## Inputs
- `.tmp/selected_articles_{segment}_{YYYY-MM-DD}.json` — Tiered articles from selection phase

## Tool to Use
- **Script:** `execution/summarize_articles.py --segment {segment}`
- Runs once per segment (called 3 times by the pipeline)

## Expected Outputs
- `.tmp/summaries_{segment}_{YYYY-MM-DD}.json` — Articles with AI-generated summaries
- Each article includes:
  - All previous metadata
  - `summary` — 2-3 sentence concise summary (Full tier) or 1 sentence (Quick Links)
  - `key_takeaway` — One-liner of the most important point
  - `why_it_matters` — Segment-specific framing (Full tier only)

## Tier-Specific Summarization

| Tier | Summary Length | Format |
|------|---------------|--------|
| **Full** | 2-3 sentences + "why this matters" | Deep, executive-ready |
| **Quick Links** | 1 sentence | Scannable one-liner |
| **Trending** | Not summarized | Topic name only |

## Process
1. Read selected articles from `.tmp/selected_articles_{segment}_{YYYY-MM-DD}.json`
2. For each article by tier:
   - Fetch full article content (scrape if RSS insufficient)
   - Send to LLM with tier-appropriate prompt
   - Extract summary, key takeaway, and why-it-matters
   - Validate quality (length, tone)
3. Save enriched articles to `.tmp/summaries_{segment}_{YYYY-MM-DD}.json`

## Content Extraction Strategy
1. **First:** Use `raw_content` from RSS feed (fastest)
2. **If insufficient:** Scrape full article via `scrape_articles.py`
3. **Fallback:** Use RSS `description` + `title` if scraping fails or hits paywall

## Quality Standards

**Good Summary (Full Tier):**
> "OpenAI announced GPT-5 with significantly improved reasoning capabilities, outperforming GPT-4 on complex problem-solving tasks. The model will be available via API next month, with enterprise pricing starting at $0.10 per 1K tokens."
>
> **Why this matters for Builders:** Direct API access means engineering teams can start integrating the improved reasoning into production systems immediately.

**Good Summary (Quick Links):**
> Cloudflare introduces AI-powered DDoS protection that reduces false positives by 40%.

## Model Selection
- **Primary:** `anthropic/claude-3.5-sonnet` via OpenRouter (best at nuanced editorial tone)
- **Fallback:** `openai/gpt-4o` if unavailable

## Edge Cases & Error Handling
- **Content too short:** Combine RSS description + title for context
- **Content too long:** Truncate to first 2000 words to save tokens
- **Behind paywall:** Use available RSS content only
- **LLM produces too long summary:** Re-prompt with strict length limit
- **Summary is marketing fluff:** Re-prompt emphasizing factual tone

## Performance Expectations
- **Runtime:** 30-90 seconds per segment (depends on article count)
- **Cost:** ~$0.02-0.05 per segment per day

## Known Issues & Learnings

### "Why this matters" adds significant value (Feb 2026)
- **Learning:** Segment-specific framing (e.g., "Why this matters for Builders") tested well
- **Prevention:** Always include for Full tier articles — it's the key differentiator

### Scraping sometimes returns cookie banners (ongoing)
- **Root cause:** Some sites return consent dialog HTML instead of article content
- **Mitigation:** RSS content fallback handles this gracefully
- **Impact:** Minor — affects <5% of articles

## Next Step
After summarization, proceed to `compose_newsletter.md` to assemble the email.
