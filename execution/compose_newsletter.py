#!/usr/bin/env python3
"""
Newsletter Composition Script - Segment-Aware Version
Assembles segment-specific HTML emails from summarized articles.
"""

import json
import os
import sys
import argparse
import re
import urllib.parse
from datetime import datetime
from pathlib import Path
from jinja2 import Template
from collections import defaultdict

# Configuration
PROJECT_ROOT = Path(__file__).parent.parent
TMP_DIR = PROJECT_ROOT / ".tmp"
TODAY = datetime.now().strftime("%Y-%m-%d")

TEMPLATE_FILE = PROJECT_ROOT / "newsletter_template.html"
SEGMENTS_CONFIG_FILE = PROJECT_ROOT / "segments_config.json"

# Newsletter config
NEWSLETTER_NAME = "Brief Delights"
WEBSITE_URL = "https://brief.delights.pro"
UNSUBSCRIBE_URL = "mailto:hello@brief.delights.pro?subject=Unsubscribe"


def log(message: str, log_file: Path):
    """Log to both console and file"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_entry = f"[{timestamp}] {message}"
    print(log_entry)
    with open(log_file, "a") as f:
        f.write(log_entry + "\n")


def load_segments_config():
    """Load segment configurations"""
    with open(SEGMENTS_CONFIG_FILE, 'r') as f:
        return json.load(f)


def format_date() -> str:
    """Format today's date for newsletter"""
    return datetime.now().strftime("%B %d, %Y")


def wrap_article_links_for_tracking(articles: list, segment: str, date: str) -> list:
    """Wrap article links with click tracking URLs"""
    base_url = "https://brief.delights.pro/api/track"
    
    for article in articles:
        original_url = article.get('url', '')  # The actual article URL (not 'source' which is the publisher name)
        title = article.get('title', '')[:100]  # Truncate long titles
        
        if not original_url:
            # Skip tracking for articles without URLs
            article['tracked_url'] = '#'
            continue
        
        # Build tracking URL with parameters
        params = {
            'url': original_url,
            's': segment,  # segment
            'd': date,     # date
            't': title     # title
        }
        
        tracking_url = f"{base_url}?{urllib.parse.urlencode(params)}"
        article['tracked_url'] = tracking_url
    
    return articles


def group_articles_by_category(articles: list) -> dict:
    """Group articles by their category tags"""
    grouped = defaultdict(list)
    
    for article in articles:
        category = article.get('category_tag', '📰 Top Stories')
        grouped[category].append(article)
    
    return dict(grouped)


def validate_footer_in_html(html: str, log_file: Path) -> bool:
    """Validate that critical footer elements are present in rendered HTML"""
    required_elements = [
        'Unsubscribe',
        'brief delights',
        'brief.delights.pro'
    ]
    
    missing = []
    for element in required_elements:
        if element not in html:
            missing.append(element)
    
    if missing:
        log(f"❌ CRITICAL: Footer missing elements: {missing}", log_file)
        return False
    
    log(f"✅ Footer validation passed", log_file)
    return True


def load_template() -> Template:
    """Load Jinja2 template"""
    try:
        with open(TEMPLATE_FILE, 'r') as f:
            template_content = f.read()
        return Template(template_content)
    except FileNotFoundError:
        # Minimal fallback template
        return Template("""
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
  <h1>{{ newsletter_name }} {{ segment_emoji }} - {{ formatted_date }}</h1>
  <p>{{ segment_description }}</p>
  {% for section in sections %}
    <h2>{{ section.category }}</h2>
    {% for article in section.articles %}
      <h3><a href="{{ article.url }}">{{ article.title }}</a></h3>
      <p>{{ article.summary }}</p>
    {% endfor %}
  {% endfor %}
</body>
</html>
        """)


def calculate_read_time(word_count: int) -> int:
    """Calculate read time in minutes based on word count (200 words/min average)"""
    if word_count == 0:
        return 1
    return max(1, min(round(word_count / 200), 15))


def fix_read_times(articles: list, log_file: Path) -> list:
    """Fix missing or zero read times. Preserves values already set by the summarizer,
    which has access to richer content than the raw RSS snippet available here."""
    for article in articles:
        old_rt = article.get('read_time_minutes', 0) or 0
        if old_rt > 0:
            continue  # Summarizer already set a valid value
        # Only recalculate if missing/zero
        raw = article.get('raw_content', '') or article.get('description', '')
        word_count = len(raw.split())
        article['read_time_minutes'] = calculate_read_time(word_count)
        log(f"  ⏱️ Read time fix: '{article['title'][:40]}' → {article['read_time_minutes']} min ({word_count} words)", log_file)
    return articles


def get_dynamic_scanned_count(segment_id: str, date: str) -> str:
    """Read actual article count from the aggregation output."""
    agg_file = TMP_DIR / f"aggregated_{segment_id}_{date}.json"
    if agg_file.exists():
        try:
            with open(agg_file) as f:
                data = json.load(f)
            count = len(data.get('articles', []))
            if count > 0:
                return f"{count:,}"
        except Exception:
            pass
    
    # Fallback: check the aggregation log for the count
    log_file = TMP_DIR / f"aggregation_{segment_id}_log_{date}.txt"
    if log_file.exists():
        try:
            text = log_file.read_text()
            # Look for patterns like "Found 1340 articles" or "1340 total articles"
            match = re.search(r'(\d[\d,]+)\s*(?:total\s+)?(?:articles?|entries|items)\s+(?:found|fetched|collected|aggregated)', text, re.IGNORECASE)
            if not match:
                match = re.search(r'(?:Found|Fetched|Collected|Total:?)\s*(\d[\d,]+)', text, re.IGNORECASE)
            if match:
                return match.group(1)
        except Exception:
            pass
    
    return "1,300+"  # Reasonable fallback based on RSS pool size


def compose_newsletter(articles: list, segment_id: str, segment_config: dict, log_file: Path) -> str:
    """Compose the final newsletter HTML for a specific segment with multi-tier support"""
    log("=" * 60, log_file)
    log(f"Composing Newsletter for {segment_config['name']} {segment_config['emoji']}", log_file)
    log("=" * 60, log_file)
    
    # Fix read times from raw content word count
    articles = fix_read_times(articles, log_file)
    
    # Separate articles by tier
    full_articles = [a for a in articles if a.get('tier', 'full') == 'full']
    quick_links = [a for a in articles if a.get('tier') == 'quick']
    trending = [a for a in articles if a.get('tier') == 'trending']
    
    log(f"📊 Separated {len(articles)} articles: {len(full_articles)} full, {len(quick_links)} quick, {len(trending)} trending", log_file)
    
    # Wrap article links with click tracking (GDPR-compliant)
    full_articles = wrap_article_links_for_tracking(full_articles, segment_id, TODAY)
    quick_links = wrap_article_links_for_tracking(quick_links, segment_id, TODAY)
    trending = wrap_article_links_for_tracking(trending, segment_id, TODAY)
    
    log(f"🔗 Wrapped {len(full_articles + quick_links + trending)} article links with click tracking", log_file)
    
    # Group FULL articles by category
    grouped = group_articles_by_category(full_articles)
    log(f"📊 Grouped {len(full_articles)} full articles into {len(grouped)} categories", log_file)
    
    # Create sections for template
    sections = []
    for category, category_articles in grouped.items():
        sections.append({
            'category': category,
            'articles': category_articles
        })
        log(f"  {category}: {len(category_articles)} articles", log_file)
    
    # Sort sections by priority
    priority_order = [
        '🚀 AI & Innovation',
        '💼 Tech Business',
        '☁️ Enterprise Tech',
        '🔐 Security',
        '💰 Funding & M&A',
        '📊 Market Trends'
    ]
    
    sections.sort(key=lambda s: priority_order.index(s['category']) 
                  if s['category'] in priority_order else 999)
    
    # Get dynamic scanned count from aggregation data
    total_scanned = get_dynamic_scanned_count(segment_id, TODAY)
    
    # Load template
    template = load_template()
    
    # Render HTML
    html = template.render(
        newsletter_name=NEWSLETTER_NAME,
        segment_name=f"{segment_config['name']} {segment_config['emoji']}",
        segment_emoji=segment_config['emoji'],
        segment_description=segment_config['description'],
        date=TODAY,
        formatted_date=format_date(),
        sections=sections,
        quick_links=quick_links,
        trending=trending,
        total_scanned=total_scanned,
        total_enriched=f"~{len(articles) * 15}",  # Rough estimate of enriched pool
        total_selected=len(articles),
        website_url=WEBSITE_URL,
        unsubscribe_url=UNSUBSCRIBE_URL
    )
    
    # Calculate size
    size_kb = len(html.encode('utf-8')) / 1024
    log(f"\n📏 Newsletter size: {size_kb:.2f} KB", log_file)
    
    if size_kb > 102:
        log("⚠️ Warning: Email exceeds 102KB (Gmail clipping threshold)", log_file)
    
    # Validate footer is present
    if not validate_footer_in_html(html, log_file):
        raise Exception("CRITICAL: Footer validation failed - missing required legal/branding elements")
    
    return html


def save_newsletter(html: str, output_file: Path, log_file: Path):
    """Save newsletter HTML to file"""
    with open(output_file, 'w') as f:
        f.write(html)
    
    log(f"\n✅ Newsletter saved to {output_file}", log_file)


def main():
    """Main execution"""
    parser = argparse.ArgumentParser(description='Compose segment-specific newsletter')
    parser.add_argument('--segment', required=True, help='Segment ID (builders/leaders/innovators)')
    args = parser.parse_args()
    
    segment_id = args.segment
    input_file = TMP_DIR / f"summaries_{segment_id}_{TODAY}.json"
    output_file = TMP_DIR / f"newsletter_{segment_id}_{TODAY}.html"
    log_file = TMP_DIR / f"composition_{segment_id}_log_{TODAY}.txt"
    
    start_time = datetime.now()
    
    try:
        # Check input file exists
        if not input_file.exists():
            raise FileNotFoundError(f"Input file not found: {input_file}")
        
        # Load segment config
        segments_data = load_segments_config()
        if segment_id not in segments_data['segments']:
            raise ValueError(f"Unknown segment: {segment_id}")
        
        segment_config = segments_data['segments'][segment_id]
        
        # Load summarized articles
        with open(input_file, 'r') as f:
            data = json.load(f)
        
        articles = data['articles']
        
        # Compose newsletter
        html = compose_newsletter(articles, segment_id, segment_config, log_file)
        
        # Save result
        save_newsletter(html, output_file, log_file)
        
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
