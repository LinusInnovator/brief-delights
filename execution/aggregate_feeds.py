#!/usr/bin/env python3
"""
RSS Feed Aggregation Script
Pulls articles from configured feeds and saves to JSON for further processing.
"""

import json
import os
from datetime import datetime, timedelta
from pathlib import Path
import feedparser
from typing import List, Dict
import hashlib

# Configuration
PROJECT_ROOT = Path(__file__).parent.parent
FEEDS_CONFIG = PROJECT_ROOT / "feeds_config.json"  # Legacy fallback
FEEDS_CONFIG_DIR = PROJECT_ROOT / "feeds_config"  # New segment-specific configs
TMP_DIR = PROJECT_ROOT / ".tmp"
TMP_DIR.mkdir(exist_ok=True)

# Today's date for file naming
TODAY = datetime.now().strftime("%Y-%m-%d")
OUTPUT_FILE = TMP_DIR / f"raw_articles_{TODAY}.json"
LOG_FILE = TMP_DIR / f"feed_aggregation_log_{TODAY}.txt"


def log(message: str):
    """Log to both console and file"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_entry = f"[{timestamp}] {message}"
    print(log_entry)
    with open(LOG_FILE, "a") as f:
        f.write(log_entry + "\n")


def parse_date(date_string) -> datetime:
    """Parse RSS date to datetime object"""
    try:
        # feedparser already parses to struct_time
        if hasattr(date_string, 'timetuple'):
            return datetime.fromtimestamp(date_string.timestamp())
        # Fallback to current time if parsing fails
        return datetime.now()
    except:
        return datetime.now()


def is_recent(published_date: datetime, lookback_hours: int = 24) -> bool:
    """Check if article is within lookback window"""
    cutoff = datetime.now() - timedelta(hours=lookback_hours)
    return published_date > cutoff


def generate_article_id(url: str) -> str:
    """Generate unique ID for deduplication"""
    return hashlib.md5(url.encode()).hexdigest()


def detect_source_type(url: str, source: str, category: str) -> str:
    """Detect if article is primary source (original) or secondary (news coverage)"""
    url_lower = url.lower()
    source_lower = source.lower()
    
    # PRIMARY SOURCE INDICATORS
    
    # Research & academic
    if 'arxiv.org' in url_lower or 'nature.com' in url_lower or 'science.org' in url_lower:
        return 'primary'
    
    # Company blogs & official announcements
    primary_domains = [
        'blog.', 'engineering.', 'research.', 'developers.',
        'github.com', 'gitlab.com',
        'openai.com', 'anthropic.com', 'deepmind', 'ai.meta.com',
        'stripe.com/blog', 'aws.amazon.com/blogs', 'cloud.google.com/blog',
        'martinfowler.com', 'codinghorror.com', 'joelonsoftware.com'
    ]
    
    if any(domain in url_lower for domain in primary_domains):
        return 'primary'
    
    # Product releases & changelogs
    if any(keyword in url_lower for keyword in ['changelog', 'release', 'announcing', 'launches']):
        return 'primary'
    
    # Known primary sources by name
    primary_sources = [
        'openai', 'anthropic', 'deepmind', 'meta ai', 'google ai',
        'stripe engineering', 'airbnb engineering', 'uber engineering',
        'martin fowler', 'joel spolsky', 'jeff atwood',
        'sequoia', 'a16z', 'ycombinator'
    ]
    
    if any(ps in source_lower for ps in primary_sources):
        return 'primary'
    
    # SECONDARY SOURCE INDICATORS (news coverage)
    secondary_sources = [
        'techcrunch', 'the verge', 'wired', 'ars technica',
        'bloomberg', 'reuters', 'cnet', 'zdnet',
        'venturebeat', 'engadget'
    ]
    
    if any(ss in source_lower or ss in url_lower for ss in secondary_sources):
        return 'secondary'
    
    # Default: assume primary if from known good sources, else secondary
    return 'primary' if 'blog' in url_lower or 'research' in url_lower else 'secondary'


def fetch_feed(feed_url: str, category: str, segment: str, lookback_hours: int = 24) -> List[Dict]:
    """Fetch and parse a single RSS feed"""
    articles = []
    
    try:
        # Parse feed with timeout
        feed = feedparser.parse(feed_url)
        
        # Check if feed parsed successfully
        if feed.bozo and not feed.entries:
            log(f"❌ Failed to parse feed: {feed_url}")
            return articles
        
        # Extract articles
        for entry in feed.entries:
            # Parse publication date
            pub_date = parse_date(entry.get('published_parsed') or entry.get('updated_parsed'))
            
            # Filter by date
            if not is_recent(pub_date, lookback_hours):
                continue
            
            # Extract article data
            article = {
                "id": generate_article_id(entry.link),
                "title": entry.get('title', 'No Title'),
                "url": entry.link,
                "published_date": pub_date.isoformat(),
                "description": entry.get('summary', ''),
                "source": feed.feed.get('title', feed_url),
                "category": category,
                "segment": segment,  # Tag with segment
                "source_type": detect_source_type(entry.link, feed.feed.get('title', ''), category),  # Detect primary vs secondary
                "raw_content": entry.get('content', [{}])[0].get('value', '') if entry.get('content') else entry.get('summary', '')
            }
            
            articles.append(article)
        
        log(f"✅ Fetched {len(articles)} recent articles from {category} ({segment})")
        
    except Exception as e:
        log(f"❌ Error fetching {feed_url}: {str(e)}")
    
    return articles


def aggregate_all_feeds() -> List[Dict]:
    """Main aggregation function - supports segment-specific configs"""
    log("=" * 60)
    log("Starting RSS Feed Aggregation (Multi-Segment)")
    log("=" * 60)
    
    all_articles = []
    feed_count = 0
    
    # Check if segment-specific configs exist
    if FEEDS_CONFIG_DIR.exists():
        log("Using segment-specific feed configurations")
        
        # Load all segment configs
        config_files = list(FEEDS_CONFIG_DIR.glob("feeds_*.json"))
        
        for config_file in config_files:
            log(f"\n📂 Loading config: {config_file.name}")
            
            with open(config_file, 'r') as f:
                config = json.load(f)
            
            segment = config.get('segment', 'unknown')
            lookback_hours = config.get('lookback_hours', 24)
            
            log(f"   Segment: {segment}")
            log(f"   Lookback: {lookback_hours} hours")
            
            # Process all categories in this segment config
            for category, feed_urls in config['categories'].items():
                log(f"\n📰 [{segment}] Processing category: {category}")
                
                for feed_url in feed_urls:
                    feed_count += 1
                    articles = fetch_feed(feed_url, category, segment, lookback_hours)
                    all_articles.extend(articles)
    
    else:
        # Fallback to legacy single config
        log("Using legacy single feed configuration")
        
        with open(FEEDS_CONFIG, 'r') as f:
            config = json.load(f)
        
        lookback_hours = config.get('lookback_hours', 24)
        log(f"Lookback window: {lookback_hours} hours")
        
        for category, feed_urls in config['categories'].items():
            log(f"\n📰 Processing category: {category}")
            
            for feed_url in feed_urls:
                feed_count += 1
                articles = fetch_feed(feed_url, category, "all", lookback_hours)
                all_articles.extend(articles)
    
    # Deduplicate by article ID
    unique_articles = {}
    for article in all_articles:
        article_id = article['id']
        if article_id not in unique_articles:
            unique_articles[article_id] = article
    
    deduplicated = list(unique_articles.values())
    
    # Sort by publication date (newest first)
    deduplicated.sort(key=lambda x: x['published_date'], reverse=True)
    
    log("\n" + "=" * 60)
    log(f"📊 Aggregation Summary:")
    log(f"   Feeds processed: {feed_count}")
    log(f"   Total articles: {len(all_articles)}")
    log(f"   Duplicates removed: {len(all_articles) - len(deduplicated)}")
    log(f"   Final unique articles: {len(deduplicated)}")
    log("=" * 60)
    
    # Check if we have enough articles
    if len(deduplicated) < 20:
        log("⚠️  Warning: Less than 20 articles found. Consider extending lookback window.")
    
    return deduplicated


def save_articles(articles: List[Dict]):
    """Save articles to JSON file"""
    output_data = {
        "generated_date": datetime.now().isoformat(),
        "article_count": len(articles),
        "articles": articles
    }
    
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(output_data, f, indent=2)
    
    log(f"\n✅ Saved {len(articles)} articles to {OUTPUT_FILE}")


def main():
    """Main execution"""
    start_time = datetime.now()
    
    try:
        # Aggregate feeds
        articles = aggregate_all_feeds()
        
        # Save results
        save_articles(articles)
        
        # Log execution time
        elapsed = (datetime.now() - start_time).total_seconds()
        log(f"\n⏱️  Total execution time: {elapsed:.2f} seconds")
        
        return True
        
    except Exception as e:
        log(f"\n❌ FATAL ERROR: {str(e)}")
        import traceback
        log(traceback.format_exc())
        return False


if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
