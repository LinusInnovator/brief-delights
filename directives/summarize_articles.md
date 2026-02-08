# Directive: Summarize Articles

## Goal
Generate concise, engaging summaries for selected articles using LLM. Each summary should deliver the key information in 2-3 sentences that a busy executive can scan quickly.

## Inputs
- `.tmp/selected_articles_YYYY-MM-DD.json` - 5-7 curated articles from selection phase

## Tool to Use
- **Script:** `execution/summarize_articles.py`

## Expected Outputs
- `.tmp/summaries_YYYY-MM-DD.json` - Articles with AI-generated summaries
- Each article includes:
  - All previous metadata
  - `summary` - 2-3 sentence concise summary
  - `key_takeaway` - One-liner of the most important point

## Success Criteria
- ✅ All selected articles have summaries
- ✅ Summaries are 2-3 sentences (50-100 words)
- ✅ Consistent tone: informative, conversational, no fluff
- ✅ Focus on: What happened, why it matters, what's the takeaway
- ✅ No marketing speak or hype

## Process
1. Read selected articles from `.tmp/selected_articles_YYYY-MM-DD.json`
2. For each article:
   - Fetch full article content (if needed)
   - Send to LLM for summarization
   - Extract summary and key takeaway
   - Validate quality (length, tone)
3. Save enriched articles to `.tmp/summaries_YYYY-MM-DD.json`

## Content Extraction Strategy
- **Option 1:** Use existing `raw_content` from RSS feed (fastest)
- **Option 2:** Scrape full article if RSS content is insufficient
- **Fallback:** Use RSS description + title if scraping fails

## LLM Summarization Prompt Template

```
Summarize this tech/business article for a busy executive in 2-3 sentences (50-100 words).

Focus on:
1. What happened (the news/development)
2. Why it matters (impact on business/tech)
3. The key takeaway (what readers should know)

Tone: Informative and conversational. No hype, no marketing speak, no buzzwords.
Write like you're briefing a colleague, not selling something.

---
ARTICLE TITLE: {title}
SOURCE: {source}
CONTENT: {content}
---

Provide:
1. summary: 2-3 clear sentences
2. key_takeaway: One sentence capturing the most important point

Return ONLY valid JSON:
{
  "summary": "Your 2-3 sentence summary here.",
  "key_takeaway": "The most important point in one sentence."
}
```

## Quality Standards

**Good Summary Example:**
> "OpenAI announced GPT-5 with significantly improved reasoning capabilities, outperforming GPT-4 on complex problem-solving tasks. The model will be available via API next month, with enterprise pricing starting at $0.10 per 1K tokens. This represents a major leap in AI capabilities that could accelerate adoption of AI-powered business tools."

**Bad Summary (too salesy):**
> "OpenAI has revolutionized the AI landscape with the groundbreaking GPT-5! This game-changing model will transform how businesses operate. Don't miss out on this incredible opportunity!"

**Bad Summary (too technical):**
> "GPT-5 uses a novel transformer architecture with 1.8T parameters trained on a multimodal dataset spanning 50 languages, utilizing reinforcement learning from human feedback and constitutional AI principles to achieve state-of-the-art performance."

## Edge Cases & Error Handling
- **Content too short:** Combine RSS description + title for context
- **Content too long:** Truncate to first 2000 words to save tokens
- **Behind paywall:** Use available RSS content only
- **LLM produces too long summary:** Re-prompt with strict length limit
- **Summary is marketing fluff:** Re-prompt emphasizing factual tone

## Batch Processing
- Process articles in parallel to speed up (up to 3 concurrent)
- Use async/threading if possible
- Fallback to sequential if API rate limits hit

## Model Selection
- **Primary:** `anthropic/claude-3-haiku` (fast + cheap, good at summaries)
- **Fallback:** `openai/gpt-3.5-turbo` (if Claude unavailable)

## Performance Expectations
- **Runtime:** 10-20 seconds for 5-7 articles (parallel)
- **Cost:** ~$0.02-0.05 per day

## Logging
Log to `.tmp/summarization_log_YYYY-MM-DD.txt`:
- Number of articles processed
- Summarization strategy used (RSS vs scraping)
- Any errors or retries
- Execution time per article

## Next Step
After summarization, proceed to `compose_newsletter.md` to assemble the email.
