#!/usr/bin/env python3
"""
Save Social Posts Persistence Helper
Formats daily strategic breakdown posts for social channels and persists them
to landing/public/data/social_posts_latest.json and Supabase (if configured).
"""

import json
import os
import glob
import re
import urllib.parse
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

PROJECT_ROOT = Path(__file__).parent.parent
TMP_DIR = PROJECT_ROOT / ".tmp"
PUBLIC_DATA_DIR = PROJECT_ROOT / "landing" / "public" / "data"
PUBLIC_DATA_DIR.mkdir(parents=True, exist_ok=True)

TODAY = datetime.now().strftime("%Y-%m-%d")

SEGMENTS = [
    {"id": "leaders", "name": "Leaders & Strategy", "emoji": "💼"},
    {"id": "builders", "name": "Engineering & Tech Stack", "emoji": "🛠️"},
    {"id": "innovators", "name": "AI Research & Signals", "emoji": "🚀"}
]


def load_segment_articles(segment_id: str) -> tuple:
    """Load summaries for a segment, falling back to most recent available"""
    file_path = TMP_DIR / f"summaries_{segment_id}_{TODAY}.json"
    used_date = TODAY

    if not file_path.exists():
        pattern = str(TMP_DIR / f"summaries_{segment_id}_*.json")
        matches = sorted(glob.glob(pattern), reverse=True)
        if matches:
            file_path = Path(matches[0])
            # Extract date from filename summaries_<segment>_<YYYY-MM-DD>.json
            match = re.search(r'\d{4}-\d{2}-\d{2}', file_path.name)
            if match:
                used_date = match.group(0)
        else:
            return [], TODAY

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data.get('articles', []), used_date
    except Exception as e:
        print(f"Error loading {file_path}: {e}")
        return [], TODAY


def format_post(seg: dict, top_article: dict, date_str: str) -> dict:
    """Format single breakdown post for segment"""
    segment_id = seg["id"]
    segment_name = seg["name"]
    segment_emoji = seg["emoji"]

    title = top_article.get('title', 'Daily Tech & AI Strategic Intelligence')
    summary = top_article.get('summary', '')
    key_takeaway = top_article.get('key_takeaway', summary)
    why_it_matters = top_article.get('why_it_matters', top_article.get('why_this_matters', '')).strip()
    why_it_matters = re.sub(r'^(why\s+(it|this)\s+matters:?\s*|strategic\s+takeaway\s+(for\s+[^:]+:?\s*)?)+', '', why_it_matters, flags=re.IGNORECASE).strip()

    if not why_it_matters or why_it_matters.lower() == key_takeaway.lower():
        if segment_id == 'leaders':
            why_it_matters = f"Executive & Business Impact: {key_takeaway} — Forces decision-makers to evaluate operational risk and vendor reliance."
        elif segment_id == 'builders':
            why_it_matters = f"Engineering & Stack Impact: {key_takeaway} — Directly impacts architecture design, latency budgets, and tooling integration."
        else:
            why_it_matters = f"Frontier & AI Research Impact: {key_takeaway} — Accelerates state-of-the-art capabilities and challenges existing model deployment benchmarks."

    reddit_title = f"{segment_emoji} [{segment_name}] {title} — Strategic Breakdown ({date_str})"
    source_name = top_article.get('source', 'Research')

    reddit_body = f"""{title}

Source: {source_name} | Category: {segment_name} | Date: {date_str}

📌 WHAT HAPPENED
{summary}

💡 KEY TAKEAWAY
• {key_takeaway}

🎯 WHY IT MATTERS
• {why_it_matters}

📰 ABOUT BRIEF DELIGHTS
We scan 1,340+ tech & AI articles daily across engineering, strategy, and frontier research so you don't have to.

• Read full daily issue: https://brief.delights.pro/archive/{date_str}-{segment_id}
• Join free for daily email briefs: https://brief.delights.pro"""

    tweet_text = f"{reddit_title}\n\nRead breakdown: "
    archive_url = f"https://brief.delights.pro/archive/{date_str}-{segment_id}"

    encoded_title = urllib.parse.quote(reddit_title)
    encoded_body = urllib.parse.quote(reddit_body)
    reddit_submit_url = f"https://www.reddit.com/r/BriefDelights/submit?title={encoded_title}&text={encoded_body}"
    twitter_share_url = f"https://twitter.com/intent/tweet?text={urllib.parse.quote(tweet_text)}&url={urllib.parse.quote(archive_url)}"
    linkedin_share_url = f"https://www.linkedin.com/sharing/share-offsite/?url={urllib.parse.quote(archive_url)}"


    return {
        "segment": segment_id,
        "segment_name": segment_name,
        "segment_emoji": segment_emoji,
        "article_title": title,
        "reddit_title": reddit_title,
        "reddit_body": reddit_body,
        "reddit_submit_url": reddit_submit_url,
        "twitter_share_url": twitter_share_url,
        "linkedin_share_url": linkedin_share_url,
        "archive_url": f"https://brief.delights.pro/archive/{date_str}-{segment_id}",
        "date": date_str
    }


def generate_and_save():
    """Main execution to generate and store social posts"""
    posts = []
    latest_date = TODAY

    for seg in SEGMENTS:
        articles, date_str = load_segment_articles(seg["id"])
        if articles:
            post = format_post(seg, articles[0], date_str)
            posts.append(post)
            latest_date = date_str

    output_payload = {
        "success": True,
        "date": latest_date,
        "updated_at": datetime.now().isoformat(),
        "posts": posts
    }

    # 1. Save static JSON to landing/public/data/social_posts_latest.json
    out_file = PUBLIC_DATA_DIR / "social_posts_latest.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(output_payload, f, indent=2)
    print(f"✅ Saved static social breakdown file: {out_file}")

    # 2. Save to Supabase if credentials present
    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_KEY")

    if supabase_url and supabase_key:
        try:
            from supabase import create_client
            supabase = create_client(supabase_url, supabase_key)
            for p in posts:
                data_row = {
                    "segment": p["segment"],
                    "date": p["date"],
                    "reddit_title": p["reddit_title"],
                    "reddit_body": p["reddit_body"],
                    "reddit_submit_url": p["reddit_submit_url"],
                    "twitter_share_url": p["twitter_share_url"],
                    "linkedin_share_url": p["linkedin_share_url"],
                    "archive_url": p["archive_url"],
                    "updated_at": datetime.now().isoformat()
                }
                # Upsert into social_posts table if present
                supabase.table("social_posts").upsert(data_row, on_conflict="segment,date").execute()
            print("✅ Successfully updated social_posts in Supabase")
        except Exception as e:
            print(f"ℹ️ Supabase update skipped (non-critical): {e}")


if __name__ == "__main__":
    generate_and_save()
