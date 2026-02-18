#!/usr/bin/env python3
"""
Story Selection Script - Multi-Segment Version
Uses LLM to select the most important articles for each audience segment.
"""

import json
import os
from datetime import datetime
from pathlib import Path
from openai import OpenAI
from dotenv import load_dotenv
import time
from collections import defaultdict

# Load environment variables
load_dotenv()

# Configuration
PROJECT_ROOT = Path(__file__).parent.parent
TMP_DIR = PROJECT_ROOT / ".tmp"
TODAY = datetime.now().strftime("%Y-%m-%d")

INPUT_FILE = TMP_DIR / f"raw_articles_{TODAY}.json"
SEGMENTS_CONFIG_FILE = PROJECT_ROOT / "segments_config.json"
LOG_FILE = TMP_DIR / f"story_selection_log_{TODAY}.txt"

# OpenRouter configuration
client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENROUTER_API_KEY")
)

# Model selection
PRIMARY_MODEL = "anthropic/claude-3.5-sonnet"
FALLBACK_MODEL = "openai/gpt-4-turbo"


def log(message: str):
    """Log to both console and file"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_entry = f"[{timestamp}] {message}"
    print(log_entry)
    with open(LOG_FILE, "a") as f:
        f.write(log_entry + "\n")


def load_segments_config():
    """Load segment configurations"""
    with open(SEGMENTS_CONFIG_FILE, 'r') as f:
        return json.load(f)


def prepare_articles_for_llm(articles: list) -> str:
    """Format articles for LLM analysis"""
    formatted = []
    
    for i, article in enumerate(articles, 1):
        desc = article.get('description', '')[:300]
        formatted.append(f"""
Article #{i}
ID: {article['id']}
Title: {article['title']}
Source: {article['source']}
Category: {article['category']}
Published: {article['published_date']}
Description: {desc}...
URL: {article['url']}
---
""")
    
    return "\n".join(formatted)


def create_segment_prompt(articles: list, segment_id: str, segment_config: dict) -> str:
    """Create segment-specific selection prompt with tier classification"""
    article_text = prepare_articles_for_llm(articles)
    
    segment_name = segment_config['name']
    segment_emoji = segment_config['emoji']
    description = segment_config['description']
    selection_criteria = segment_config['selection_criteria']
    focus_keywords = ", ".join(segment_config['focus_keywords'])
    skip_keywords = ", ".join(segment_config['skip_keywords'])
    
    prompt = f"""You are curating a daily tech newsletter for the "{segment_name}" segment {segment_emoji}.

TARGET AUDIENCE: {description}

SEGMENT-SPECIFIC CRITERIA:
{selection_criteria}

FOCUS ON these keywords: {focus_keywords}
SKIP articles about: {skip_keywords}

Review these {len(articles)} articles and select exactly 14-15 articles distributed across THREE TIERS:

TIER 1: FULL ARTICLES (8 articles)
- Breaking news, deep analysis, high impact
- These get full 30-40 word summaries
- Urgency score: 8-10
- Examples: Major releases, funding rounds, strategic shifts

TIER 2: QUICK LINKS (4 articles)  
- Technical tools, library releases, how-to guides
- Title + one-liner only (no full summary needed)
- Urgency score: 6-7
- Examples: New GitHub tools, framework updates, tutorials

TIER 3: WORTH YOUR ATTENTION (2-3 articles)
- Trending discussions, viral repos, cultural moments
- May not be breaking news but generating buzz/worth knowing about
- Urgency score: 5-8 but with high viral/discussion value
- Examples: Viral blog posts, trending GitHub repos, community debates

SELECTION CRITERIA:
1. Segment Relevance: Does this match the interests of {segment_name}?
2. Business Impact: Will this affect their decisions or work?
3. Tier Appropriateness: Does the content type match the tier?
4. Diversity: Cover multiple sub-topics within their focus areas

**EDITORIAL PRIORITIZATION (Critical):**

PRIMARY SOURCES FIRST (highest priority):
- STRONGLY PREFER: Blog posts, research papers, product releases, official announcements
- These are marked as source_type: "primary"
- Examples: Company engineering blogs, arXiv papers, GitHub releases, official product pages

AVOID NEWS REWRITES (lowest priority):
- DEPRIORITIZE: TechCrunch/Verge/Wired covering someone else's announcement
- These are marked as source_type: "secondary"
- Only select if the analysis adds unique value

BOOST TRENDING STORIES:
- PREFER articles with on_hn: true and hn_comments > 15
- High HN velocity indicates early buzz worth catching
- Especially for TIER 3 (Worth Your Attention)

RANKING FORMULA:
- Primary source + breaking news: 10/10
- Primary source + analysis: 9/10
- Primary source + tool/guide: 8/10
- Secondary source with unique angle: 7/10
- Secondary source covering primary: 5/10

For each selected article, provide:
1. tier: "full" | "quick" | "trending"
2. selection_reason: One sentence on why THIS segment needs this
3. audience_value: What {segment_name} will gain specifically
4. urgency_score: 1-10 (how time-sensitive for this audience)
5. category_tag: One of ["🚀 AI & Innovation", "💼 Tech Business", "☁️ Enterprise Tech", "🔐 Security", "💰 Funding & M&A", "📊 Market Trends"]

ARTICLES TO REVIEW:
{article_text}

Return ONLY valid JSON in this exact format (no markdown, no explanations):
{{
  "segment": "{segment_id}",
  "selected_articles": [
    {{
      "article_id": "original_article_id_here",
      "tier": "full",
      "selection_reason": "Why {segment_name} needs this",
      "audience_value": "Specific value for {segment_name}",
      "urgency_score": 9,
      "category_tag": "🚀 AI & Innovation"
    }}
  ]
}}
"""
    
    return prompt


def call_llm(prompt: str, model: str, retries: int = 3) -> dict:
    """Call OpenRouter LLM with retries"""
    for attempt in range(retries):
        try:
            log(f"🤖 Calling {model} (attempt {attempt + 1}/{retries})")
            
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=2000
            )
            
            # Extract response
            content = response.choices[0].message.content.strip()
            
            # Try to parse JSON
            # Remove markdown code blocks if present
            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
            
            result = json.loads(content)
            log(f"✅ LLM response parsed successfully")
            
            return result
            
        except json.JSONDecodeError as e:
            log(f"❌ JSON parsing error: {str(e)}")
            if attempt < retries - 1:
                time.sleep(2 ** attempt)
                continue
            else:
                raise
        
        except Exception as e:
            log(f"❌ LLM API error: {str(e)}")
            if attempt < retries - 1:
                time.sleep(2 ** attempt)
                continue
            else:
                raise
    
    raise Exception("Failed after all retries")


def validate_selection(selection: dict, segment_id: str) -> bool:
    """Validate LLM selection meets criteria with tier support"""
    if 'selected_articles' not in selection:
        log(f"⚠️ Missing 'selected_articles' field")
        return False
    
    selected = selection['selected_articles']
    
    # Check count (10-15 articles expected)
    if not (8 <= len(selected) <= 15):
        log(f"⚠️ Invalid count: {len(selected)} articles (expected 8-15)")
        return False
    
    # Check all required fields present
    required_fields = ['article_id', 'tier', 'selection_reason', 'audience_value', 'urgency_score', 'category_tag']
    for article in selected:
        for field in required_fields:
            if field not in article:
                log(f"⚠️ Missing field '{field}' in selection")
                return False
        
        # Validate tier value
        if article['tier'] not in ['full', 'quick', 'trending']:
            log(f"⚠️ Invalid tier: {article['tier']} (must be full/quick/trending)")
            return False
    
    # Check tier distribution (more flexible)
    tiers = [a['tier'] for a in selected]
    full_count = tiers.count('full')
    quick_count = tiers.count('quick')
    trending_count = tiers.count('trending')
    
    # At least 6 full articles to avoid thin newsletters
    if full_count < 6:
        log(f"⚠️ Not enough full articles: {full_count} (need at least 6 — prompt asks for 8)")
        return False
    
    if full_count < 8:
        log(f"ℹ️ Note: {full_count} full articles (ideal is 8, but acceptable)")
    
    if quick_count < 1:
        log(f"⚠️ Not enough quick articles: {quick_count} (need at least 1)")
        return False
    
    if trending_count < 1:
        log(f"⚠️ Not enough trending articles: {trending_count} (need at least 1)")
        return False
    
    log(f"✅ Selection validated for {segment_id}: {len(selected)} articles ({full_count} full, {quick_count} quick, {trending_count} trending)")
    return True


def calculate_newsworthiness_score(selected_articles: list) -> dict:
    """
    Calculate content quality score (0-100) based on article characteristics.
    
    Returns dict with:
    - score: 0-100 integer
    - tier: 'must_read' (90-100), 'relevant' (60-89), 'interesting' (0-59)
    - metrics: detailed breakdown
    """
    if not selected_articles:
        return {'score': 0, 'tier': 'interesting', 'metrics': {}}
    
    score = 0
    
    # 1. Base score from article count (max 20 points)
    article_count = len(selected_articles)
    score += min(20, (article_count / 15) * 20)
    
    # 2. Average urgency score (max 40 points)
    # Handle both int and str values from LLM, with fallback for invalid values
    urgency_scores = []
    for a in selected_articles:
        val = a.get('urgency_score', 3)
        try:
            score_val = int(val) if isinstance(val, str) else val
            urgency_scores.append(min(5, max(1, score_val)))  # Clamp 1-5
        except (ValueError, TypeError):
            urgency_scores.append(3)  # Default to 3 if conversion fails
    avg_urgency = sum(urgency_scores) / len(urgency_scores)
    score += (avg_urgency / 5) * 40
    
    # 3. Average audience value (max 30 points)
    # Handle both int and str values from LLM, with fallback for invalid values
    value_scores = []
    for a in selected_articles:
        val = a.get('audience_value', 3)
        try:
            score_val = int(val) if isinstance(val, str) else val
            value_scores.append(min(5, max(1, score_val)))  # Clamp 1-5
        except (ValueError, TypeError):
            value_scores.append(3)  # Default to 3 if conversion fails
    avg_value = sum(value_scores) / len(value_scores)
    score += (avg_value / 5) * 30
    
    # 4. Tier quality bonus (max 10 points)
    full_count = sum(1 for a in selected_articles if a.get('tier') == 'full')
    score += min(10, (full_count / 8) * 10)
    
    final_score = int(score)
    
    # Determine quality tier
    if final_score >= 90:
        tier = 'must_read'
    elif final_score >= 60:
        tier = 'relevant'
    else:
        tier = 'interesting'
    
    log(f"📊 Content Quality: {final_score}/100 ({tier.upper()})")
    
    return {
        'score': final_score,
        'tier': tier,
        'metrics': {
            'article_count': article_count,
            'avg_urgency': round(avg_urgency, 2),
            'avg_value': round(avg_value, 2),
            'full_articles': full_count
        }
    }


def merge_selection_with_articles(raw_articles: list, selection: dict) -> list:
    """Merge LLM selection metadata with original article data"""
    articles_dict = {a['id']: a for a in raw_articles}
    
    merged = []
    for selected in selection['selected_articles']:
        article_id = selected['article_id']
        
        if article_id in articles_dict:
            article = articles_dict[article_id].copy()
            article.update({
                'tier': selected['tier'], 
                'selection_reason': selected['selection_reason'],
                'audience_value': selected['audience_value'],
                'urgency_score': selected['urgency_score'],
                'category_tag': selected['category_tag']
            })
            merged.append(article)
        else:
            log(f"⚠️ Warning: Article ID {article_id} not found in raw articles")
    
    return merged


def pre_filter_articles(raw_articles: list, max_articles: int = 50) -> list:
    """Pre-filter to reduce payload size"""
    if len(raw_articles) <= max_articles:
        return raw_articles
    
    log(f"⚠️ Too many articles ({len(raw_articles)}), sampling {max_articles} for LLM analysis")
    
    # Group by category
    by_category = defaultdict(list)
    for article in raw_articles:
        by_category[article['category']].append(article)
    
    # Sample evenly from each category
    articles_per_category = max_articles // len(by_category)
    sampled = []
    
    for category, articles in by_category.items():
        sorted_articles = sorted(articles, key=lambda x: x.get('published_date', ''), reverse=True)
        sampled.extend(sorted_articles[:articles_per_category])
        log(f"   Selected {min(len(sorted_articles), articles_per_category)} articles from {category}")
    
    # Fill remaining slots
    if len(sampled) < max_articles:
        already_selected = set(a['id'] for a in sampled)
        for article in raw_articles:
            if article['id'] not in already_selected:
                sampled.append(article)
                if len(sampled) >= max_articles:
                    break
    
    result = sampled[:max_articles]
    log(f"✅ Reduced to {len(result)} articles for LLM analysis")
    return result


def select_stories_for_segment(articles: list, segment_id: str, segment_config: dict) -> list:
    """Select stories for a specific segment with retry logic"""
    log(f"\n{segment_config['emoji']} Processing segment: {segment_config['name']}")
    
    max_attempts = 3
    last_error = None
    
    for attempt in range(1, max_attempts + 1):
        # Create prompt (with correction hint on retries)
        prompt = create_segment_prompt(articles, segment_id, segment_config)
        
        if attempt > 1:
            prompt += f"""

IMPORTANT CORRECTION (attempt {attempt}/{max_attempts}):
Your previous response was rejected: {last_error}
You MUST follow the tier distribution exactly:
- TIER 1 "full": AT LEAST 6 articles (target 8)
- TIER 2 "quick": AT LEAST 2 articles (target 4)
- TIER 3 "trending": AT LEAST 1 article (target 2-3)
Total: 10-15 articles. Do NOT skimp on full articles."""
            log(f"  🔄 Retry attempt {attempt}/{max_attempts}: {last_error}")
        
        # Call LLM (try primary, fallback to secondary)
        try:
            selection = call_llm(prompt, PRIMARY_MODEL)
        except Exception as e:
            log(f"⚠️ Primary model failed, trying fallback: {str(e)}")
            selection = call_llm(prompt, FALLBACK_MODEL)
        
        # Validate selection
        if validate_selection(selection, segment_id):
            # Merge with original articles
            selected_articles = merge_selection_with_articles(articles, selection)
            
            log(f"\n📈 Selected {len(selected_articles)} stories for {segment_config['name']}:")
            for i, article in enumerate(selected_articles, 1):
                log(f"  {i}. [{article['category_tag']}] {article['title']}")
                log(f"     Reason: {article['selection_reason']}")
            
            if attempt > 1:
                log(f"  ✅ Succeeded on attempt {attempt}")
            
            return selected_articles
        else:
            # Capture the reason for the retry
            tiers = [a['tier'] for a in selection.get('selected_articles', [])]
            full_count = tiers.count('full')
            total = len(tiers)
            last_error = f"Got {full_count} full articles out of {total} total (need at least 6 full)"
    
    raise Exception(f"Selection validation failed for {segment_id} after {max_attempts} attempts: {last_error}")


def save_segment_selection(segment_id: str, articles: list):
    """Save segment-specific selection with newsworthiness score"""
    output_file = TMP_DIR / f"selected_articles_{segment_id}_{TODAY}.json"
    
    # Calculate newsworthiness score
    quality_data = calculate_newsworthiness_score(articles)
    
    output_data = {
        "generated_date": datetime.now().isoformat(),
        "segment": segment_id,
        "article_count": len(articles),
        "newsworthiness_score": quality_data['score'],
        "quality_tier": quality_data['tier'],
        "quality_metrics": quality_data['metrics'],
        "selected_articles": articles,
        "articles": articles  # Backward compatibility for compose_newsletter.py
    }
    
    with open(output_file, 'w') as f:
        json.dump(output_data, f, indent=2)
    
    log(f"✅ Saved {segment_id} selection to {output_file}")


def main():
    """Main execution"""
    start_time = datetime.now()
    
    try:
        log("=" * 60)
        log("Starting Multi-Segment Story Selection")
        log("=" * 60)
        
        # Check input file exists
        if not INPUT_FILE.exists():
            raise FileNotFoundError(f"Input file not found: {INPUT_FILE}")
        
        # Load raw articles
        with open(INPUT_FILE, 'r') as f:
            data = json.load(f)
        
        raw_articles = data['articles']
        log(f"📊 Loaded {len(raw_articles)} articles for analysis")
        
        # Pre-filter articles
        filtered_articles = pre_filter_articles(raw_articles, max_articles=50)
        
        # Load segments configuration
        segments_data = load_segments_config()
        segments = segments_data['segments']
        log(f"\n📋 Processing {len(segments)} segments: {', '.join(segments.keys())}")
        
        # Select stories for each segment with delay to avoid rate limiting
        segment_list = list(segments.items())
        failed_segments = []
        for idx, (segment_id, segment_config) in enumerate(segment_list):
            try:
                selected = select_stories_for_segment(filtered_articles, segment_id, segment_config)
                save_segment_selection(segment_id, selected)
                
                # Verify the file was actually created
                output_file = TMP_DIR / f"selected_articles_{segment_id}_{TODAY}.json"
                if not output_file.exists():
                    log(f"❌ ERROR: Selection file not created for {segment_id}")
                    failed_segments.append(segment_id)
                
                # Add delay between segments to avoid rate limiting (except for last segment)
                if idx < len(segment_list) - 1:
                    log(f"⏳ Waiting 5s before next segment to avoid rate limits...")
                    time.sleep(5)
                    
            except Exception as e:
                log(f"❌ Failed to process segment {segment_id}: {str(e)}")
                import traceback
                log(traceback.format_exc())
                failed_segments.append(segment_id)
                # Continue with other segments
                continue
        
        # Log execution time
        elapsed = (datetime.now() - start_time).total_seconds()
        log(f"\n⏱️ Total execution time: {elapsed:.2f} seconds")
        
        # Check if any segments failed
        if failed_segments:
            log(f"\n❌ CRITICAL: Story selection failed for segments: {', '.join(failed_segments)}")
            return False
        
        return True
        
    except Exception as e:
        log(f"\n❌ FATAL ERROR: {str(e)}")
        import traceback
        log(traceback.format_exc())
        return False


if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
