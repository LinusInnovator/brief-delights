#!/usr/bin/env python3
"""
Automated Social Teaser Generator
Extracts top stories from daily newsletter summaries and formats high-converting
social media posts for X/Twitter, LinkedIn, and Bluesky.
"""

import json
import os
import glob
from datetime import datetime
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
TMP_DIR = PROJECT_ROOT / ".tmp"
TODAY = datetime.now().strftime("%Y-%m-%d")

SEGMENTS = ["leaders", "builders", "innovators"]

SEGMENT_TITLES = {
    "leaders": "💼 Tech & Strategy Brief",
    "builders": "🛠️ Engineering & Stack Brief",
    "innovators": "🚀 AI Research & Frontier Signals"
}


def load_summaries(segment: str) -> list:
    """Load summarized articles for a segment"""
    file_path = TMP_DIR / f"summaries_{segment}_{TODAY}.json"
    if not file_path.exists():
        # Fallback to any recent summary file if today's doesn't exist yet
        pattern = str(TMP_DIR / f"summaries_{segment}_*.json")
        matches = sorted(glob.glob(pattern), reverse=True)
        if matches:
            file_path = Path(matches[0])
        else:
            return []
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data.get('articles', [])
    except Exception as e:
        print(f"Error loading {file_path}: {e}")
        return []


def format_social_post(segment: str, article: dict) -> str:
    """Format an engaging social thread post for an article, highlighting strategic USP"""
    title = article.get('title', '')
    summary = article.get('summary', '')
    key_takeaway = article.get('key_takeaway', '')
    why_it_matters = article.get('why_it_matters', '').strip()
    source = article.get('source', '')
    
    # If why_it_matters is missing, use key_takeaway to construct strategic view (our USP!)
    if not why_it_matters:
        why_it_matters = f"Strategic takeaway for {segment}: {key_takeaway}"
    
    post = f"""{SEGMENT_TITLES.get(segment, segment.upper())} | {TODAY}

🔥 TOP STORY: {title}
Source: {source}

📌 WHAT HAPPENED:
{summary}

💡 KEY TAKEAWAY:
{key_takeaway}

🎯 STRATEGIC VIEW (WHY IT MATTERS TO YOUR ROLE):
{why_it_matters}

---
💡 Why read news when you can get strategic intelligence?
Read full daily 14-story brief: https://brief.delights.pro/archive/{TODAY}-{segment}
"""
    return post


def main():
    print(f"📱 Generating Daily Social Teasers for {TODAY}...")
    
    all_posts = []
    output_text = f"====================================================\n"
    output_text += f"📱 BRIEF DELIGHTS — DAILY SOCIAL TEASERS ({TODAY})\n"
    output_text += f"====================================================\n\n"
    
    for segment in SEGMENTS:
        articles = load_summaries(segment)
        if not articles:
            print(f"⚠️ No summaries found for segment: {segment}")
            continue
        
        top_article = articles[0]
        formatted_post = format_social_post(segment, top_article)
        
        all_posts.append({
            "segment": segment,
            "title": top_article.get('title'),
            "post_content": formatted_post
        })
        
        output_text += f"--- [{segment.upper()} POST] ---\n"
        output_text += formatted_post
        output_text += "\n\n"
    
    # Save to text file for copy-pasting
    txt_out = TMP_DIR / f"social_posts_{TODAY}.txt"
    with open(txt_out, "w", encoding="utf-8") as f:
        f.write(output_text)
    
    # Save to JSON for automated social API bots
    json_out = TMP_DIR / f"social_posts_{TODAY}.json"
    with open(json_out, "w", encoding="utf-8") as f:
        json.dump({"date": TODAY, "posts": all_posts}, f, indent=2)
    
    print(f"✅ Generated social teasers: {txt_out}")
    print(f"✅ Saved JSON for automated bots: {json_out}")


if __name__ == "__main__":
    main()
