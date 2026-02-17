#!/usr/bin/env python3
"""
Weekly Trend Aggregation Script
Collects and stores daily article data for Sunday synthesis.
Run this AFTER daily newsletter pipeline to save data for the week.

Reads: .tmp/selected_articles_{segment}_{date}.json (produced by select_stories.py)
Writes: reports/weekly_insights/{date}_{segment}.json
"""

import json
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path

# Configuration
PROJECT_ROOT = Path(__file__).parent.parent
TMP_DIR = PROJECT_ROOT / ".tmp"
# Store weekly insights in a committed directory (not .tmp which is gitignored)
WEEKLY_DIR = PROJECT_ROOT / "reports" / "weekly_insights"
TODAY = datetime.now().strftime("%Y-%m-%d")

def log(message: str):
    """Log to console"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {message}")

def ensure_weekly_directory():
    """Create weekly insights directory if it doesn't exist"""
    WEEKLY_DIR.mkdir(parents=True, exist_ok=True)
    log(f"✅ Weekly directory ready: {WEEKLY_DIR}")

def load_daily_selections(segment: str) -> dict:
    """Load today's selected articles (matches select_stories.py output format)"""
    selections_file = TMP_DIR / f"selected_articles_{segment}_{TODAY}.json"
    
    if not selections_file.exists():
        log(f"⚠️  No selections found for {segment} on {TODAY}")
        log(f"   Expected file: {selections_file}")
        return None
    
    with open(selections_file, 'r') as f:
        return json.load(f)

def extract_trends_from_articles(articles: list) -> dict:
    """Derive trend signals from selected articles (no separate trend synthesis needed)"""
    if not articles:
        return {"categories": {}, "sources": {}, "topics": []}
    
    # Count category distribution
    categories = Counter()
    sources = Counter()
    topics = []
    
    for article in articles:
        # Count categories/tags
        cat = article.get('category', article.get('feed_category', 'uncategorized'))
        categories[cat] += 1
        
        # Count sources
        source = article.get('source', article.get('feed_name', 'unknown'))
        sources[source] += 1
        
        # Collect titles as topic signals
        title = article.get('title', '')
        if title:
            topics.append(title)
    
    return {
        "categories": dict(categories.most_common(10)),
        "sources": dict(sources.most_common(10)),
        "topics": topics,
        "total_articles": len(articles)
    }

def aggregate_daily_data(segment: str) -> dict:
    """Aggregate today's selection data into a weekly snapshot"""
    data = load_daily_selections(segment)
    
    if not data:
        return None
    
    # Handle both possible JSON structures from select_stories.py
    articles = data.get('selected_articles', data.get('articles', []))
    
    if not articles:
        log(f"⚠️  Selection file exists for {segment} but contains no articles")
        return None
    
    # Extract trends directly from the articles
    trends = extract_trends_from_articles(articles)
    
    return {
        "date": TODAY,
        "segment": segment,
        "trends": trends,
        "article_count": len(articles),
        "articles": articles
    }

def save_weekly_snapshot(segment: str, data: dict):
    """Save today's data to weekly collection"""
    output_file = WEEKLY_DIR / f"{TODAY}_{segment}.json"
    
    with open(output_file, 'w') as f:
        json.dump(data, f, indent=2)
    
    log(f"✅ Saved weekly snapshot: {output_file}")

def cleanup_old_snapshots(days_to_keep: int = 10):
    """Remove snapshots older than N days"""
    if not WEEKLY_DIR.exists():
        return
    
    cutoff = datetime.now().timestamp() - (days_to_keep * 24 * 60 * 60)
    removed = 0
    
    for file in WEEKLY_DIR.glob("*.json"):
        if file.stat().st_mtime < cutoff:
            file.unlink()
            removed += 1
    
    if removed > 0:
        log(f"🧹 Cleaned up {removed} old weekly snapshots")

def main():
    """Main execution"""
    if len(sys.argv) < 2:
        log("Usage: python3 aggregate_weekly_trends.py <segment>")
        sys.exit(1)
    
    segment = sys.argv[1]
    
    log("=" * 60)
    log(f"Aggregating Weekly Trends for {segment.upper()}")
    log("=" * 60)
    
    try:
        # Ensure directory exists
        ensure_weekly_directory()
        
        # Aggregate today's data
        log(f"\n📊 Collecting data for {TODAY}...")
        data = aggregate_daily_data(segment)
        
        if not data:
            log("❌ No data to aggregate (missing selected articles)")
            return False
        
        # Save snapshot
        save_weekly_snapshot(segment, data)
        
        # Cleanup old files
        cleanup_old_snapshots()
        
        log(f"\n✅ Weekly aggregation complete")
        log(f"   Articles: {data['article_count']}")
        log(f"   Categories: {len(data['trends'].get('categories', {}))}")
        
        return True
        
    except Exception as e:
        log(f"\n❌ FATAL ERROR: {str(e)}")
        import traceback
        log(traceback.format_exc())
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
