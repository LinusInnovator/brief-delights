#!/usr/bin/env python3
"""
Content Repurposing Pipeline
Turns each newsletter into 5+ social posts + 1 SEO blog summary.

Cost: ~$0.01 per newsletter (1 LLM call to generate all social content)

The framework says: "Turn 1 newsletter into 5+ social posts = 500+ entry points/year."
Currently: 0 entry points. This script fixes that.

Usage:
    python execution/repurpose_newsletter.py --segment builders --date 2026-02-13
    python execution/repurpose_newsletter.py --segment builders --date 2026-02-13 --dry-run
"""

import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
from dotenv import load_dotenv

load_dotenv()

PROJECT_ROOT = Path(__file__).parent.parent
TMP_DIR = PROJECT_ROOT / ".tmp"
TODAY = datetime.now().strftime("%Y-%m-%d")

# LLM for content generation (1 call per day)
from openai import OpenAI
client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENROUTER_API_KEY")
)
MODEL = "anthropic/claude-3-haiku"


def log(message: str):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")


def load_selected_articles(segment: str, date: str) -> List[Dict]:
    """Load the day's selected articles"""
    filepath = TMP_DIR / f"selected_articles_{segment}_{date}.json"
    
    if not filepath.exists():
        log(f"❌ No selected articles found at {filepath}")
        return []
    
    with open(filepath) as f:
        data = json.load(f)
    
    return data.get('selected_articles', data.get('articles', []))


def pick_top_stories(articles: List[Dict], count: int = 3) -> List[Dict]:
    """Pick the top N stories by tier and urgency for social sharing"""
    scored = []
    for a in articles:
        tier_scores = {'s': 4, 'a': 3, 'b': 2, 'c': 1}
        tier = a.get('tier', 'c').lower()
        urgency = a.get('urgency_score', 5)
        score = tier_scores.get(tier, 1) * 10 + urgency
        scored.append((score, a))
    
    scored.sort(key=lambda x: x[0], reverse=True)
    return [a for _, a in scored[:count]]


def generate_social_content(articles: List[Dict], segment: str, date: str, dry_run: bool = False) -> Optional[Dict]:
    """
    Generate social content from top newsletter stories.
    One LLM call produces: 3 Twitter posts, 2 LinkedIn posts, 1 SEO blog summary.
    """
    if not articles:
        return None
    
    top_stories = pick_top_stories(articles, 3)
    
    # Build context for LLM
    story_context = ""
    for i, article in enumerate(top_stories, 1):
        story_context += f"""
Story {i}:
- Title: {article.get('title', '')}
- Source: {article.get('source', '')}
- Summary: {article.get('summary', '')}
- Key Takeaway: {article.get('key_takeaway', '')}
- Why This Matters: {article.get('why_this_matters', '')}
- URL: {article.get('url', '')}
"""
    
    if dry_run:
        log("🏃 Dry run — skipping LLM call")
        return {
            'top_stories': [{'title': a.get('title', ''), 'url': a.get('url', '')} for a in top_stories],
            'dry_run': True,
        }
    
    prompt = f"""You write social media content for Brief Delights, a tech newsletter for {segment}.
Today's date: {date}

Here are the top 3 stories from today's newsletter:
{story_context}

Generate ALL of the following. Be punchy, insight-driven, not clickbaity.

1. THREE Twitter/X posts (max 280 chars each)
   - Each about a different story
   - Include the article URL
   - Use the insight angle, not just the headline
   - End with "📧 Get stories like this daily: brief.delights.pro"

2. TWO LinkedIn posts (max 200 words each)
   - Pick the 2 most strategic stories
   - Professional tone, insight-first
   - End with a soft CTA to subscribe

3. ONE SEO blog summary (300-400 words)
   - Title: "Daily Tech Brief — {date}"
   - Summarize all 3 stories
   - Include article links
   - End with newsletter signup CTA

Return ONLY valid JSON:
{{
  "twitter_posts": ["post1", "post2", "post3"],
  "linkedin_posts": ["post1", "post2"],
  "blog_summary": {{
    "title": "...",
    "body": "...",
    "meta_description": "..."
  }}
}}"""

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.8,
            max_tokens=1500
        )
        
        content = response.choices[0].message.content.strip()
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        
        result = json.loads(content)
        result['top_stories'] = [{'title': a.get('title', ''), 'url': a.get('url', '')} for a in top_stories]
        result['generated_at'] = datetime.now().isoformat()
        result['segment'] = segment
        result['date'] = date
        
        return result
        
    except Exception as e:
        log(f"❌ LLM generation failed: {e}")
        return None


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Repurpose newsletter into social content')
    parser.add_argument('--segment', required=True, choices=['builders', 'leaders', 'innovators'])
    parser.add_argument('--date', default=TODAY)
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()
    
    log(f"♻️  Content Repurposing Pipeline — {args.segment} ({args.date})")
    
    # Load articles
    articles = load_selected_articles(args.segment, args.date)
    if not articles:
        return False
    
    log(f"📊 Loaded {len(articles)} articles\n")
    
    # Generate social content
    result = generate_social_content(articles, args.segment, args.date, args.dry_run)
    
    if not result:
        log("❌ No content generated")
        return False
    
    # Display results
    if not result.get('dry_run'):
        print("\n" + "=" * 60)
        print("♻️  REPURPOSED CONTENT")
        print("=" * 60)
        
        print("\n𝕏 TWITTER POSTS:")
        for i, post in enumerate(result.get('twitter_posts', []), 1):
            print(f"\n  [{i}] {post}")
            print(f"      ({len(post)} chars)")
        
        print("\n\n💼 LINKEDIN POSTS:")
        for i, post in enumerate(result.get('linkedin_posts', []), 1):
            print(f"\n  [{i}] {post[:100]}...")
        
        blog = result.get('blog_summary', {})
        if blog:
            print(f"\n\n📝 SEO BLOG:")
            print(f"  Title: {blog.get('title', '')}")
            print(f"  Meta: {blog.get('meta_description', '')}")
            print(f"  Body: {blog.get('body', '')[:150]}...")
    else:
        print("\n🏃 Dry run — top stories selected:")
        for s in result.get('top_stories', []):
            print(f"  • {s['title'][:70]}")
    
    # Save
    output_file = TMP_DIR / f"social_content_{args.segment}_{args.date}.json"
    with open(output_file, 'w') as f:
        json.dump(result, f, indent=2)
    
    log(f"\n💾 Saved to {output_file}")
    
    print("\n" + "=" * 60)
    return True


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
