#!/usr/bin/env python3
"""
Article Summarization Script - Segment-Aware Version
Uses LLM to generate concise summaries for newsletter articles.
"""

import json
import os
import argparse
from datetime import datetime
from pathlib import Path
from openai import OpenAI
from dotenv import load_dotenv
import concurrent.futures
from typing import Dict, List, Tuple
import time

# Import editorial prompt templates from same directory
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from prompt_templates import get_editorial_guidance, get_segment_role_description

# Load environment variables
load_dotenv()

# Configuration
PROJECT_ROOT = Path(__file__).parent.parent
TMP_DIR = PROJECT_ROOT / ".tmp"
TODAY = datetime.now().strftime("%Y-%m-%d")

# OpenRouter configuration
client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENROUTER_API_KEY")
)

# Model selection (using faster/cheaper model for summaries)
PRIMARY_MODEL = "anthropic/claude-3-haiku"
FALLBACK_MODEL = "openai/gpt-3.5-turbo"

# Parallel processing
MAX_WORKERS = 3


def log(message: str, log_file: Path):
    """Log to both console and file"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_entry = f"[{timestamp}] {message}"
    print(log_entry)
    with open(log_file, "a") as f:
        f.write(log_entry + "\n")


def prepare_content(article: Dict) -> str:
    """Prepare article content for summarization"""
    # Prioritize enriched full_content, fallback to raw_content, then description
    content = (
        article.get('full_content', '') or 
        article.get('raw_content', '') or 
        article.get('description', '')
    )
    
    # Truncate if too long (save tokens)
    max_length = 3000
    if len(content) > max_length:
        content = content[:max_length] + "..."
    
    return content


def calculate_read_time(word_count: int) -> int:
    """Calculate read time in minutes based on word count (200 words/min average)"""
    if word_count == 0:
        return 1
    minutes = max(1, round(word_count / 200))
    return min(minutes, 15)  # Cap at 15 min for sanity


def create_summary_prompt(article: Dict, trend_context: str = "") -> Tuple[str, int]:
    """Create summarization prompt with segment-specific editorial guidance
    
    Returns:
        tuple: (prompt, word_count) - word_count used for fallback read time calculation
    """
    content = prepare_content(article)
    
    # Estimate word count for read time calculation
    word_count = len(content.split())
    estimated_read_time = calculate_read_time(word_count)
    
    # Get segment and metadata
    segment = article.get('segment', 'builders')
    source_type = article.get('source_type', 'unknown')
    tier = article.get('tier', 'full')
    
    # Get segment-specific role and editorial guidance
    role_description = get_segment_role_description(segment)
    editorial_guidance = get_editorial_guidance(segment)
    
    # Add trend context if available
    trend_section = ""
    if trend_context:
        article_themes = article.get('detected_themes', [])
        themes_text = ", ".join(article_themes) if article_themes else "general tech trends"
        trend_section = f"""

**TREND CONTEXT:**
{trend_context}

This article relates to: {themes_text}
Use this context to make "why this matters" more strategic.
"""
    
    prompt = f"""{role_description}

Your goal: Help busy professionals quickly understand WHAT happened and WHY it strategically matters to them.

REQUIREMENTS:
1. **Summary:** ONE paragraph, 30-40 words MAXIMUM
   - Focus on WHAT it is and WHY it matters
   - Skip background/setup/fluff
   - Get straight to concrete details

2. **Key Takeaway:** One crisp sentence (15 words max)
   - The single most important point

3. **Why This Matters:** Strategic editorial insight (ONE sentence, 20-25 words)
   - Answer: "What should this audience do differently because of this?"
   
4. **Read Time:** Estimate based on article length

{editorial_guidance}
{trend_section}

ARTICLE METADATA:
- Title: {article['title']}
- Source: {article['source']}
- Source Type: {source_type} ({'original research/announcement' if source_type == 'primary' else 'news coverage'})
- Tier: {tier}
- Word Count: ~{word_count} words

ARTICLE CONTENT:
{content}
---

Return ONLY valid JSON (no markdown, no explanations):
{{
  "summary": "Ultra-concise summary in 30-40 words.",
  "key_takeaway": "One crisp sentence in 15 words max.",
  "why_this_matters": "Strategic insight - specific, actionable, non-obvious (20-25 words)",
  "read_time_minutes": {estimated_read_time}
}}
"""
    
    return prompt, word_count



def call_llm_for_summary(prompt: str, model: str = PRIMARY_MODEL) -> Dict:
    """Call LLM to generate summary"""
    try:
        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.5,
            max_tokens=300
        )
        
        content = response.choices[0].message.content.strip()
        
        # Remove markdown if present
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        
        return json.loads(content)
        
    except Exception as e:
        log(f"❌ Error in LLM call: {str(e)}")
        raise



def summarize_article(article: Dict, index: int, log_file: Path, trend_context: str = "") -> Dict:
    """Summarize a single article (tier-aware)"""
    article_num = index + 1
    tier = article.get('tier', 'full')
    
    # QUICK LINKS: Skip LLM, use description as one-liner
    if tier == 'quick':
        log(f"⚡ Quick link {article_num}: {article['title'][:60]}...", log_file)
        
        # Extract 2-3 sentences or use description
        description = article.get('description', '') or article.get('raw_content', '')
        
        # Get first 2-3 sentences (up to 200 chars)
        sentences = description.split('. ')
        snippet = ''
        for i, sent in enumerate(sentences[:3]):
            snippet += sent + '. '
            if len(snippet) > 200 or i >= 1:  # Stop after 2 sentences or 200 chars
                break
        
        snippet = snippet.strip() if snippet else "See article for details"
        if len(snippet) > 250:
            snippet = snippet[:247] + "..."
        
        # Calculate read time from description word count
        desc_word_count = len(description.split())
        article['summary'] = snippet
        article['key_takeaway'] = ''
        article['read_time_minutes'] = calculate_read_time(desc_word_count)
        
        log(f"✅ Quick link {article_num} processed (no LLM needed)", log_file)
        return article
    
    # FULL & TRENDING: Use LLM for summaries
    log(f"📝 Summarizing article {article_num} ({tier}): {article['title'][:60]}...", log_file)
    
    start_time = time.time()
    
    try:
        # Create prompt and get word count for fallback read time
        prompt, word_count = create_summary_prompt(article, trend_context=trend_context)
        calculated_read_time = calculate_read_time(word_count)
        
        # Get summary from LLM
        try:
            summary_data = call_llm_for_summary(prompt, PRIMARY_MODEL)
        except:
            log(f"⚠️ Primary model failed, trying fallback", log_file)
            summary_data = call_llm_for_summary(prompt, FALLBACK_MODEL)
        
        # Add summary to article
        article['summary'] = summary_data['summary']
        article['key_takeaway'] = summary_data.get('key_takeaway', '')
        article['why_this_matters'] = summary_data.get('why_this_matters', '')  # NEW: Editorial context
        article['read_time_minutes'] = summary_data.get('read_time_minutes', calculated_read_time)  # Use calculated as fallback
        
        elapsed = time.time() - start_time
        log(f"✅ Article {article_num} summarized in {elapsed:.2f}s ({article['read_time_minutes']} min read)", log_file)
        
        return article
        
    except Exception as e:
        log(f"❌ Failed to summarize article {article_num}: {str(e)}", log_file)
        # Fallback: use description as summary and calculate read time
        fallback_content = article.get('description', '') or article.get('raw_content', '')
        fallback_word_count = len(fallback_content.split())
        article['summary'] = fallback_content[:200]
        article['key_takeaway'] = f"See full article for details: {article['source']}"
        article['read_time_minutes'] = calculate_read_time(fallback_word_count)
        return article


def summarize_all_articles(articles: List[Dict], log_file: Path, trend_context: str = "") -> List[Dict]:
    """Summarize all articles (with parallel processing)"""
    log("=" * 60, log_file)
    log("Starting Article Summarization", log_file)
    log("=" * 60, log_file)
    log(f"📊 Processing {len(articles)} articles", log_file)
    
    # Process in parallel
    with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {
            executor.submit(summarize_article, article, i, log_file, trend_context): i 
            for i, article in enumerate(articles)
        }
        
        summarized = []
        for future in concurrent.futures.as_completed(futures):
            try:
                result = future.result()
                summarized.append(result)
            except Exception as e:
                log(f"❌ Thread exception: {str(e)}", log_file)
    
    # Sort by urgency
    summarized.sort(key=lambda x: x.get('urgency_score', 0), reverse=True)
    
    log(f"\n✅ Summarized {len(summarized)} articles", log_file)
    
    return summarized


def save_summaries(articles: List[Dict], output_file: Path, log_file: Path):
    """Save summarized articles to JSON"""
    output_data = {
        "generated_date": datetime.now().isoformat(),
        "article_count": len(articles),
        "articles": articles
    }
    
    with open(output_file, 'w') as f:
        json.dump(output_data, f, indent=2)
    
    log(f"\n✅ Saved summaries to {output_file}", log_file)


def main():
    """Main execution"""
    parser = argparse.ArgumentParser(description='Summarize segment-specific articles')
    parser.add_argument('--segment', required=True, help='Segment ID (builders/leaders/innovators)')
    parser.add_argument('--enable-trends', action='store_true', help='Enable trend detection context (adds ~$0.03 cost)')
    args = parser.parse_args()
    
    segment_id = args.segment
    input_file = TMP_DIR / f"selected_articles_{segment_id}_{TODAY}.json"
    output_file = TMP_DIR / f"summaries_{segment_id}_{TODAY}.json"
    log_file = TMP_DIR / f"summarization_{segment_id}_log_{TODAY}.txt"
    
    start_time = datetime.now()
    
    try:
        # Check input file exists
        if not input_file.exists():
            raise FileNotFoundError(f"Input file not found: {input_file}")
        
        # Load selected articles
        with open(input_file, 'r') as f:
            data = json.load(f)
        
        articles = data['selected_articles']
        
        # Load trend context if enabled
        trend_context = ""
        if args.enable_trends:
            trends_file = TMP_DIR / f"trends_{segment_id}_{TODAY}.json"
            if trends_file.exists():
                with open(trends_file) as f:
                    trends_data = json.load(f)
                    trend_context = trends_data.get('narrative', '')
                    if trend_context:
                        log(f"📊 Loaded trend context ({len(trend_context)} chars)", log_file)
                    else:
                        log(f"⚠️ No trend narrative found in {trends_file}", log_file)
            else:
                log(f"⚠️ Trends file not found: {trends_file}", log_file)
                log(f"   Run: python3 execution/detect_trends.py --segment {segment_id}", log_file)
                log(f"   Then: python3 execution/synthesize_trends.py --segment {segment_id}", log_file)
        
        # Summarize all articles (with trend context if available)
        summarized = summarize_all_articles(articles, log_file, trend_context=trend_context)

        
        # Save results
        save_summaries(summarized, output_file, log_file)
        
        # Log execution time
        elapsed = (datetime.now() - start_time).total_seconds()
        log(f"\n⏱️ Total execution time: {elapsed:.2f} seconds", log_file)
        
        return True
        
    except Exception as e:
        log(f"\n❌ FATAL ERROR: {str(e)}", log_file)
        import traceback
        log(traceback.format_exc(), log_file)
        return False


if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
