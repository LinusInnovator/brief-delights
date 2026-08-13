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


def clean_text_snippet(text: str, max_chars: int = 400) -> str:
    """Clean HTML tags and collapse whitespace, truncating cleanly at word boundaries"""
    if not text:
        return ""
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    if len(text) > max_chars:
        trimmed = text[:max_chars]
        if ' ' in trimmed:
            return trimmed.rsplit(' ', 1)[0] + "..."
        return trimmed + "..."
    return text


def parse_article_from_newsletter_html(html_path: Path) -> tuple[dict, str]:
    """Extract top article data from committed newsletter HTML file"""
    try:
        match = re.search(r'\d{4}-\d{2}-\d{2}', html_path.name)
        date_str = match.group(0) if match else TODAY
        
        with open(html_path, 'r', encoding='utf-8') as f:
            html = f.read()

        title = 'Daily Tech & AI Strategic Intelligence'
        h_match = re.search(r'<h1[^>]*>(.*?)<\/h1>', html, re.DOTALL | re.IGNORECASE) or re.search(r'<h2[^>]*>(.*?)<\/h2>', html, re.DOTALL | re.IGNORECASE)
        if h_match:
            title = clean_text_snippet(h_match.group(1), max_chars=140)

        p_matches = [clean_text_snippet(m.group(1), max_chars=400) for m in re.finditer(r'<p[^>]*>(.*?)</p>', html, re.DOTALL | re.IGNORECASE)]
        p_matches = [p for p in p_matches if len(p) > 25]

        summary = p_matches[0] if p_matches else f"Strategic intelligence breakdown for {date_str}."
        takeaway = p_matches[1] if len(p_matches) > 1 else summary
        why_it_matters = p_matches[2] if len(p_matches) > 2 else f"Directly impacts architectural design, operational risk, and tech stack choices."

        article = {
            "title": title,
            "summary": clean_text_snippet(summary, max_chars=450),
            "key_takeaway": clean_text_snippet(takeaway, max_chars=250),
            "why_this_matters": clean_text_snippet(why_it_matters, max_chars=300),
            "source": "Brief Delights Editorial"
        }
        return [article], date_str
    except Exception as e:
        print(f"Error parsing HTML fallback {html_path}: {e}")
        return [], TODAY



def load_segment_articles(segment_id: str) -> tuple:
    """Load summaries for a segment with multi-tier fallback (summaries -> selected -> public HTML)"""
    # Tier 1: summaries_<seg>_<date>.json in .tmp
    file_path = TMP_DIR / f"summaries_{segment_id}_{TODAY}.json"
    used_date = TODAY

    if file_path.exists():
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                articles = data.get('articles', [])
                if articles:
                    return articles, TODAY
        except Exception:
            pass

    # Search for recent summaries files in .tmp
    pattern = str(TMP_DIR / f"summaries_{segment_id}_*.json")
    matches = sorted(glob.glob(pattern), reverse=True)
    if matches:
        file_path = Path(matches[0])
        match = re.search(r'\d{4}-\d{2}-\d{2}', file_path.name)
        used_date = match.group(0) if match else TODAY
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                articles = data.get('articles', [])
                if articles:
                    return articles, used_date
        except Exception:
            pass

    # Tier 2: selected_articles_<seg>_<date>.json in .tmp
    sel_path = TMP_DIR / f"selected_articles_{segment_id}_{TODAY}.json"
    if not sel_path.exists():
        pattern = str(TMP_DIR / f"selected_articles_{segment_id}_*.json")
        matches = sorted(glob.glob(pattern), reverse=True)
        if matches:
            sel_path = Path(matches[0])
            match = re.search(r'\d{4}-\d{2}-\d{2}', sel_path.name)
            used_date = match.group(0) if match else TODAY

    if sel_path.exists():
        try:
            with open(sel_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                articles = data.get('articles', [])
                if articles:
                    return articles, used_date
        except Exception:
            pass

    # Tier 3: Committed public HTML newsletters in landing/public/newsletters/
    public_newsletters_dir = PROJECT_ROOT / "landing" / "public" / "newsletters"
    if public_newsletters_dir.exists():
        html_pattern = str(public_newsletters_dir / f"newsletter_{segment_id}_*.html")
        html_matches = sorted(glob.glob(html_pattern), reverse=True)
        if html_matches:
            return parse_article_from_newsletter_html(Path(html_matches[0]))

    return [], TODAY



def format_post(seg: dict, top_article: dict, date_str: str) -> dict:
    """Format single breakdown post for segment"""
    segment_id = seg["id"]
    segment_name = seg["name"]
    segment_emoji = seg["emoji"]

    title = clean_text_snippet(top_article.get('title', 'Daily Tech & AI Strategic Intelligence'), max_chars=140)
    summary = clean_text_snippet(top_article.get('summary', ''), max_chars=450)
    key_takeaway = clean_text_snippet(top_article.get('key_takeaway', summary), max_chars=250)
    raw_why = top_article.get('why_it_matters', top_article.get('why_this_matters', '')).strip()
    raw_why = re.sub(r'^(why\s+(it|this)\s+matters:?\s*|strategic\s+takeaway\s+(for\s+[^:]+:?\s*)?)+', '', raw_why, flags=re.IGNORECASE).strip()
    why_it_matters = clean_text_snippet(raw_why, max_chars=300)

    if segment_id == 'leaders':

        if not why_it_matters or why_it_matters.lower() == key_takeaway.lower():
            why_it_matters = f"Executive & Business Impact: {key_takeaway} — Forces decision-makers to evaluate operational risk and vendor reliance."
        hook_headline = f"Executive Strategy: {title}"
        pro_image_prompt = f"Minimalist 3D isometric corporate strategy diagram depicting '{title}', sleek obsidian glassmorphism aesthetic, glowing gold and emerald nodes, dark ambient background, 8k render, professional UI design"
    elif segment_id == 'builders':
        if not why_it_matters or why_it_matters.lower() == key_takeaway.lower():
            why_it_matters = f"Engineering & Stack Impact: {key_takeaway} — Directly impacts architecture design, latency budgets, and tooling integration."
        hook_headline = f"Engineering Shift: {title}"
        pro_image_prompt = f"Cybernetic software engineering architecture diagram illustrating '{title}', obsidian dark mode UI, glowing neon cyan lines, data flow blocks, 8k render, hyper-detailed tech graphic"
    else:
        if not why_it_matters or why_it_matters.lower() == key_takeaway.lower():
            why_it_matters = f"Frontier & AI Research Impact: {key_takeaway} — Accelerates state-of-the-art capabilities and challenges existing model deployment benchmarks."
        hook_headline = f"Frontier AI Signal: {title}"
        pro_image_prompt = f"Abstract frontier AI research neural network topology showing '{title}', glowing violet and deep purple laser paths, dark glassmorphism space, 8k render, high-tech research visual"


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
        "hook_headline": hook_headline,
        "key_takeaway": key_takeaway,
        "why_it_matters": why_it_matters,
        "pro_image_prompt": pro_image_prompt,
        "reddit_title": reddit_title,
        "reddit_body": reddit_body,
        "reddit_submit_url": reddit_submit_url,
        "twitter_share_url": twitter_share_url,
        "linkedin_share_url": linkedin_share_url,
        "archive_url": archive_url,
        "date": date_str
    }



def generate_weekly_trend_posts(date_str: str) -> list:
    """Generate weekly macro trend posts for social publisher & OmniCap ad packages with rich narrative & signal clusters"""
    trend_posts = []
    for seg in SEGMENTS:
        segment_id = seg["id"]
        segment_name = seg["name"]
        segment_emoji = seg["emoji"]

        # Check trends file generated by detect_trends.py and synthesize_trends.py
        trends_file = TMP_DIR / f"trends_{segment_id}_{date_str}.json"
        if not trends_file.exists():
            files = sorted(TMP_DIR.glob(f"trends_{segment_id}_*.json"), reverse=True)
            trends_file = files[0] if files else None

        insights_file = TMP_DIR / f"weekly_insights_{segment_id}_{date_str}.json"
        if not insights_file.exists():
            files = sorted(TMP_DIR.glob(f"weekly_insights_{segment_id}_*.json"), reverse=True)
            insights_file = files[0] if files else None

        tdata = {}
        if trends_file and trends_file.exists():
            try:
                with open(trends_file, "r", encoding="utf-8") as f:
                    tdata = json.load(f)
            except Exception as e:
                print(f"⚠️ Error reading {trends_file}: {e}")

        idata = {}
        if insights_file and insights_file.exists():
            try:
                with open(insights_file, "r", encoding="utf-8") as f:
                    idata = json.load(f)
            except Exception as e:
                print(f"⚠️ Error reading {insights_file}: {e}")

        if tdata or idata:
            try:
                narrative = tdata.get("narrative") or idata.get("narrative") or "Significant macro shifts observed across core technical vectors, driving new architecture decisions."
                trends_list = tdata.get("trends", []) or idata.get("trends", [])
                
                title = f"Weekly Macro Intelligence: Industry Trends in {segment_name}"
                hook_headline = f"Macro Report: Top Trends Reshaping {segment_name}"
                
                # Format rich theme breakdown
                shifts_lines = []
                if trends_list and isinstance(trends_list, list):
                    for t in trends_list[:4]:
                        label = t.get("theme_label", t.get("theme", "Trend")).replace("_", " ").title()
                        pct = t.get("percentage", 0)
                        count = t.get("count", 0)
                        arts = t.get("articles", [])
                        art_titles = [a.get("title", "") for a in arts[:2] if isinstance(a, dict) and a.get("title")]
                        art_str = ("\n   - " + "\n   - ".join(art_titles)) if art_titles else ""
                        shifts_lines.append(f"• {label} ({pct}% of weekly signals, {count} sources){art_str}")

                if not shifts_lines:
                    raw_trends = idata.get("synthesized_trends", ["Enterprise AI adoption accelerating", "Agentic memory replacing traditional vector search"])
                    shifts_summary = "\n".join([f"• {t}" for t in raw_trends]) if isinstance(raw_trends, list) else str(raw_trends)
                else:
                    shifts_summary = "\n\n".join(shifts_lines)

                pro_prompt = f"Executive 3D isometric dashboard showing macro trends in '{segment_name}', sleek dark glassmorphism, glowing gold and cyan data streams, 8k render"
                archive_url = f"https://brief.delights.pro/archive/{date_str}-{segment_id}"
                reddit_title = f"{segment_emoji} [Weekly Macro Trends] {segment_name} — Key Industry Synthesis ({date_str})"
                
                reddit_body = f"""{title}

Source: Brief Delights Weekly Synthesis | Category: {segment_name} | Date: {date_str}

🧠 EXECUTIVE SYNTHESIS
{narrative}

📌 KEY MACRO SHIFTS & SIGNAL CLUSTERS
{shifts_summary}

🎯 STRATEGIC IMPLICATION
• Forces technology decision-makers to align Q3/Q4 roadmaps with emerging architecture standards.

📰 ABOUT BRIEF DELIGHTS
We scan 1,340+ tech & AI articles daily across engineering, strategy, and frontier research so you don't have to.

• Read full weekly digest: {archive_url}
• Join free for daily email briefs: https://brief.delights.pro"""

                encoded_title = urllib.parse.quote(reddit_title)
                encoded_body = urllib.parse.quote(reddit_body)

                trend_posts.append({
                    "segment": segment_id,
                    "segment_name": segment_name,
                    "segment_emoji": segment_emoji,
                    "post_type": "weekly_trend",
                    "article_title": title,
                    "hook_headline": hook_headline,
                    "key_takeaway": narrative,
                    "why_it_matters": "Forces technology decision-makers to align roadmap with emerging standards.",
                    "pro_image_prompt": pro_prompt,
                    "reddit_title": reddit_title,
                    "reddit_body": reddit_body,
                    "reddit_submit_url": f"https://www.reddit.com/r/BriefDelights/submit?title={encoded_title}&text={encoded_body}",
                    "twitter_share_url": f"https://twitter.com/intent/tweet?text={urllib.parse.quote(reddit_title)}&url={urllib.parse.quote(archive_url)}",
                    "linkedin_share_url": f"https://www.linkedin.com/sharing/share-offsite/?url={urllib.parse.quote(archive_url)}",
                    "archive_url": archive_url,
                    "date": date_str
                })
            except Exception as e:
                print(f"⚠️ Error formatting weekly trends for {segment_id}: {e}")


    if not trend_posts:
        for seg in SEGMENTS:
            segment_id = seg["id"]
            segment_name = seg["name"]
            segment_emoji = seg["emoji"]
            archive_url = f"https://brief.delights.pro/archive/{date_str}-{segment_id}"
            title = f"Weekly Macro Synthesis: {segment_name} Insights"
            reddit_title = f"{segment_emoji} [Weekly Trends] {segment_name} Synthesis ({date_str})"
            reddit_body = f"""{title}\n\nWeekly macro trend analysis and strategic synthesis across {segment_name}.\n\n• Read full digest: {archive_url}"""
            
            trend_posts.append({
                "segment": segment_id,
                "segment_name": segment_name,
                "segment_emoji": segment_emoji,
                "post_type": "weekly_trend",
                "article_title": title,
                "hook_headline": f"Weekly Executive Briefing: {segment_name}",
                "key_takeaway": "Key architectural and strategic shifts observed across 1,340+ daily feeds this week.",
                "why_it_matters": "High-signal trend analysis for executive roadmap planning.",
                "pro_image_prompt": f"Minimalist 3D data visualization of macro trends in {segment_name}, obsidian dark mode, glowing accents, 8k render",
                "reddit_title": reddit_title,
                "reddit_body": reddit_body,
                "reddit_submit_url": f"https://www.reddit.com/r/BriefDelights/submit?title={urllib.parse.quote(reddit_title)}&text={urllib.parse.quote(reddit_body)}",
                "twitter_share_url": f"https://twitter.com/intent/tweet?text={urllib.parse.quote(reddit_title)}&url={urllib.parse.quote(archive_url)}",
                "linkedin_share_url": f"https://www.linkedin.com/sharing/share-offsite/?url={urllib.parse.quote(archive_url)}",
                "archive_url": archive_url,
                "date": date_str
            })

    return trend_posts


def generate_and_save():
    """Main execution to generate and store social posts"""
    posts = []
    latest_date = TODAY

    for seg in SEGMENTS:
        articles, date_str = load_segment_articles(seg["id"])
        if articles:
            post = format_post(seg, articles[0], date_str)
            post["post_type"] = "daily"
            posts.append(post)
            latest_date = date_str

    weekly_trends = generate_weekly_trend_posts(latest_date)

    output_payload = {
        "success": True,
        "date": latest_date,
        "updated_at": datetime.now().isoformat(),
        "posts": posts,
        "weekly_trends": weekly_trends
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
