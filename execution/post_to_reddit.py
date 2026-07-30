#!/usr/bin/env python3
"""
Reddit Auto-Publisher for Brief Delights
Formats and posts high-converting, Reddit-native strategic breakdowns to r/BriefDelights.
"""

import json
import os
import glob
from datetime import datetime
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
TMP_DIR = PROJECT_ROOT / ".tmp"
TODAY = datetime.now().strftime("%Y-%m-%d")

SUBREDDIT = os.getenv("REDDIT_SUBREDDIT", "BriefDelights")


def load_summaries(segment: str) -> list:
    """Load summarized articles for a segment"""
    file_path = TMP_DIR / f"summaries_{segment}_{TODAY}.json"
    if not file_path.exists():
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


def format_reddit_post(segment: str, article: dict) -> tuple:
    """Format post for Reddit (catchy title + markdown body with strategic view USP)"""
    title = article.get('title', 'Daily Tech & AI Strategic Intelligence')
    summary = article.get('summary', '')
    key_takeaway = article.get('key_takeaway', '')
    why_it_matters = article.get('why_it_matters', '').strip()
    source = article.get('source', '')
    
    if not why_it_matters:
        why_it_matters = f"Strategic takeaway for {segment}: {key_takeaway}"

    segment_badges = {
        "leaders": "💼 [Leaders & Strategy]",
        "builders": "🛠️ [Engineering & Tech Stack]",
        "innovators": "🚀 [AI Research & Signals]"
    }
    
    reddit_title = f"{segment_badges.get(segment, '[Daily Brief]')} {title} — Strategic Breakdown ({TODAY})"
    
    reddit_body = f"""# {title}

**Source:** {source} | **Category:** {segment.capitalize()} | **Date:** {TODAY}

---

### 📌 What Happened
{summary}

### 💡 Key Takeaway
> **{key_takeaway}**

### 🎯 Strategic View (Why It Matters to Your Role)
{why_it_matters}

---

### 📰 About Brief Delights
*We scan 1,340+ tech & AI articles daily across engineering, strategy, and frontier research so you don't have to.*

* Read the full 14-story daily issue: [https://brief.delights.pro/archive/{TODAY}-{segment}](https://brief.delights.pro/archive/{TODAY}-{segment})
* Join free for daily email briefs: [https://brief.delights.pro](https://brief.delights.pro)
"""
    return reddit_title, reddit_body


def publish_via_session(username: str, password: str, title: str, body: str) -> bool:
    """Post to Reddit using standard Web Session (No API app keys needed!)"""
    import requests
    try:
        session = requests.Session()
        session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        })
        
        # 1. Login to Reddit via standard Web Session
        login_url = f"https://www.reddit.com/api/login/{username}"
        login_data = {
            'op': 'login-main',
            'user': username,
            'passwd': password,
            'api_type': 'json'
        }
        res = session.post(login_url, data=login_data, timeout=10)
        
        # Extract modhash token
        modhash = ""
        try:
            res_json = res.json()
            modhash = res_json.get('json', {}).get('data', {}).get('modhash', '')
        except Exception:
            pass
        
        # 2. Submit post directly to r/BriefDelights
        submit_url = "https://www.reddit.com/api/submit"
        submit_data = {
            'sr': SUBREDDIT,
            'kind': 'self',
            'title': title,
            'text': body,
            'uh': modhash,
            'api_type': 'json'
        }
        sub_res = session.post(submit_url, data=submit_data, timeout=10)
        if sub_res.status_code == 200:
            print(f"✅ Auto-posted via session to r/{SUBREDDIT}: {title[:40]}...")
            return True
        else:
            print(f"⚠️ Reddit submit response: status {sub_res.status_code}")
            return False
    except Exception as e:
        print(f"⚠️ Reddit Session post error: {e}")
        return False


def publish_to_reddit(title: str, body: str):
    """Attempt Reddit posting via PRAW API or direct Web Session (No developer app keys needed)"""
    client_id = os.getenv("REDDIT_CLIENT_ID")
    client_secret = os.getenv("REDDIT_CLIENT_SECRET")
    username = os.getenv("REDDIT_USERNAME")
    password = os.getenv("REDDIT_PASSWORD")
    
    # Method 1: PRAW API (if app keys exist)
    if client_id and client_secret and username and password:
        try:
            import praw
            reddit = praw.Reddit(
                client_id=client_id,
                client_secret=client_secret,
                username=username,
                password=password,
                user_agent="BriefDelightsBot/1.0"
            )
            submission = reddit.subreddit(SUBREDDIT).submit(title=title, selftext=body)
            print(f"✅ Auto-posted to r/{SUBREDDIT}: {submission.url}")
            return True
        except Exception as e:
            print(f"⚠️ Reddit PRAW API error: {e}")
    
    # Method 2: Direct Web Session (No API app keys needed!)
    if username and password:
        return publish_via_session(username, password, title, body)
    
    print(f"ℹ️ Reddit login not set in env. Saved post to .tmp/reddit_posts_{TODAY}.md")
    return False


def main():
    print(f"🤖 Preparing Reddit Strategic Posts for {TODAY}...")
    
    combined_md = f"# Brief Delights Reddit Auto-Posts — {TODAY}\n\n"
    
    for segment in ["leaders", "builders", "innovators"]:
        articles = load_summaries(segment)
        if not articles:
            continue
        
        top_article = articles[0]
        title, body = format_reddit_post(segment, top_article)
        
        combined_md += f"## {title}\n\n{body}\n\n---\n\n"
        publish_to_reddit(title, body)
    
    md_out = TMP_DIR / f"reddit_posts_{TODAY}.md"
    with open(md_out, "w", encoding="utf-8") as f:
        f.write(combined_md)
    
    print(f"✅ Reddit strategic posts ready: {md_out}")


if __name__ == "__main__":
    main()
