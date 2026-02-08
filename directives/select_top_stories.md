# Directive: Select Top Stories

## Goal
Use LLM to analyze aggregated articles and select the 5-7 most important stories for the newsletter. This implements the "Would I forward this to my friends?" filter.

## Inputs
- `.tmp/raw_articles_YYYY-MM-DD.json` - All articles from RSS aggregation
- Target audience: B2B Tech & AI Decision-Makers

## Tool to Use
- **Script:** `execution/select_stories.py`

## Expected Outputs
- `.tmp/selected_articles_YYYY-MM-DD.json` - 5-7 curated articles
- Each article includes:
  - All original metadata (title, url, source, etc.)
  - `selection_reason` - Why this article was chosen
  - `audience_value` - What readers will gain
  - `urgency_score` - 1-10 rating
  - `category_tag` - Section placement (e.g., "🚀 AI Updates", "💼 Business")

## Success Criteria
- ✅ Exactly 5-7 articles selected
- ✅ Diversity: Multiple categories represented
- ✅ Relevance: All stories matter to decision-makers
- ✅ Quality: Each has clear "why it matters" reasoning
- ✅ No fluff: High signal-to-noise ratio

## Process
1. Read raw articles from `.tmp/raw_articles_YYYY-MM-DD.json`
2. Prepare articles for LLM analysis (deduplicate, format)
3. Send to OpenRouter with selection prompt
4. Parse LLM response to get selected articles + metadata
5. Validate selection (5-7 articles, diverse categories)
6. Save to `.tmp/selected_articles_YYYY-MM-DD.json`

## LLM Selection Criteria

**Audience:** B2B decision-makers (CTOs, VPs of Engineering, Product Leaders, Tech Executives)

**Selection Rules:**
1. **Relevance:** Impacts their work, company strategy, or tech stack decisions
2. **Newsworthiness:** Breaking news, major announcements, or significant trends
3. **Actionability:** Readers can apply insights or make decisions
4. **Shareability:** Worth discussing with colleagues ("forward-worthy")
5. **Diversity:** Cover multiple sub-topics (AI, cloud, security, startups, etc.)

**Filters to Apply:**
- ❌ Skip: Tutorials, how-to guides, deep technical implementation details
- ❌ Skip: Minor product updates, individual developer blog posts
- ❌ Skip: Old news (rehashed stories already covered widely)
- ✅ Prioritize: Major funding rounds, breakthrough AI research, enterprise tech shifts
- ✅ Prioritize: Leadership changes at major companies, regulatory developments
- ✅ Prioritize: Market trends that affect business strategy

## LLM Prompt Template

```
You are a senior tech editor curating a daily newsletter for B2B decision-makers (CTOs, VPs of Engineering, Product Leaders). Your audience includes people who make technology purchasing decisions and strategic tech choices for their companies.

Review these {count} articles and select exactly 5-7 that are most important for this audience.

SELECTION CRITERIA:
1. Business Impact: Does this affect their company strategy, budget, or tech decisions?
2. Newsworthiness: Is this breaking news, a major announcement, or a significant trend?
3. Actionability: Can readers apply insights or make better decisions?
4. Shareability: Would a CTO forward this to their team?
5. Diversity: Cover multiple areas (AI, cloud, security, funding, etc.)

SKIP:
- Tutorials and how-tos
- Minor product updates
- Individual developer blogs
- Old/rehashed news

PRIORITIZE:
- Major funding rounds ($50M+)
- Breakthrough AI/tech research
- Enterprise tech shifts (cloud, infrastructure)
- Leadership changes at major companies
- Regulatory developments
- Market trends affecting business

For each selected article, provide:
1. selection_reason: One sentence on why you chose it
2. audience_value: What decision-makers will gain
3. urgency_score: 1-10 (how time-sensitive)
4. category_tag: One of ["🚀 AI & Innovation", "💼 Tech Business", "☁️  Enterprise Tech", "🔐 Security", "💰 Funding & M&A", "📊 Market Trends"]

Return ONLY valid JSON in this exact format:
{
  "selected_articles": [
    {
      "article_id": "original_article_id",
      "selection_reason": "...",
      "audience_value": "...",
      "urgency_score": 8,
      "category_tag": "🚀 AI & Innovation"
    }
  ]
}
```

## Edge Cases & Error Handling
- **LLM returns wrong count:** If <5 or >7 articles, re-prompt with stricter instructions
- **Invalid JSON:** Parse error → retry with formatted examples
- **All articles low quality:** Relax lookback window in RSS aggregation
- **Missing article IDs:** Cross-reference by title/URL
- **API timeout:** Retry up to 3 times with exponential backoff

## Model Selection
- **Primary:** `anthropic/claude-3.5-sonnet` (best at nuanced editorial decisions)
- **Fallback:** `openai/gpt-4-turbo` (if Claude unavailable)

## Performance Expectations
- **Runtime:** 10-30 seconds (depends on article count)
- **Cost:** ~$0.05-0.15 per day

## Logging
Log to `.tmp/story_selection_log_YYYY-MM-DD.txt`:
- Number of articles analyzed
- LLM model used
- Selection reasoning summary
- Any errors or retries

## Next Step
After selection, proceed to `summarize_articles.md` to generate concise summaries.
