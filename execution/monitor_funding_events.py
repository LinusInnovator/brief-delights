#!/usr/bin/env python3
"""
Predictive Sponsor Timing Engine
Monitors external signals (funding, launches, negative press) to trigger outreach
at the perfect moment.

Cost: $0 (pure API monitoring + deterministic scoring)

Signals monitored:
1. Crunchbase API — funding rounds (free tier: 200 calls/month)
2. Product Hunt API — trending launches
3. HN front page — viral moments for companies

Usage:
    python execution/monitor_funding_events.py                    # Scan all signals
    python execution/monitor_funding_events.py --source crunchbase  # Specific source
    python execution/monitor_funding_events.py --dry-run            # Preview only
"""

import json
import os
import sys
import re
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional
from dotenv import load_dotenv

load_dotenv()

PROJECT_ROOT = Path(__file__).parent.parent
TMP_DIR = PROJECT_ROOT / ".tmp"
TMP_DIR.mkdir(exist_ok=True)
EVENTS_FILE = TMP_DIR / "funding_events.json"
TODAY = datetime.now().strftime("%Y-%m-%d")


def log(message: str):
    """Log to console"""
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")


# ──────────────────────────────────────────────
# SIGNAL SOURCES
# ──────────────────────────────────────────────

# Companies we want to monitor (from our sponsor database)
WATCHED_COMPANIES = {
    # DevOps / Infrastructure
    'railway.app': {'name': 'Railway', 'industry': 'Infrastructure', 'segment': 'builders'},
    'render.com': {'name': 'Render', 'industry': 'Cloud Platform', 'segment': 'builders'},
    'fly.io': {'name': 'Fly.io', 'industry': 'Edge Compute', 'segment': 'builders'},
    'vercel.com': {'name': 'Vercel', 'industry': 'Frontend Cloud', 'segment': 'builders'},
    # AI / ML
    'anthropic.com': {'name': 'Anthropic', 'industry': 'AI Safety', 'segment': 'innovators'},
    'perplexity.ai': {'name': 'Perplexity', 'industry': 'AI Search', 'segment': 'innovators'},
    'together.ai': {'name': 'Together AI', 'industry': 'AI Platform', 'segment': 'innovators'},
    'modal.com': {'name': 'Modal', 'industry': 'Serverless AI', 'segment': 'builders'},
    'replicate.com': {'name': 'Replicate', 'industry': 'ML Deployment', 'segment': 'builders'},
    # Database / Backend
    'supabase.com': {'name': 'Supabase', 'industry': 'Database', 'segment': 'builders'},
    'neon.tech': {'name': 'Neon', 'industry': 'Serverless Postgres', 'segment': 'builders'},
    'planetscale.com': {'name': 'PlanetScale', 'industry': 'MySQL Platform', 'segment': 'builders'},
    'turso.tech': {'name': 'Turso', 'industry': 'Edge Database', 'segment': 'builders'},
    # Dev Tools
    'clerk.com': {'name': 'Clerk', 'industry': 'Auth Platform', 'segment': 'builders'},
    'resend.com': {'name': 'Resend', 'industry': 'Email API', 'segment': 'builders'},
    'inngest.com': {'name': 'Inngest', 'industry': 'Workflow Engine', 'segment': 'builders'},
}


def scan_hn_for_companies() -> List[Dict]:
    """
    Scan Hacker News front page and recent stories for watched companies.
    Uses the free Algolia HN API (no auth needed, unlimited calls).
    """
    import urllib.request
    
    events = []
    
    try:
        # Search HN for each watched company
        for domain, info in WATCHED_COMPANIES.items():
            company_name = info['name'].lower()
            
            # Search recent stories mentioning this company
            query = urllib.parse.quote(company_name)
            url = f"https://hn.algolia.com/api/v1/search_by_date?query={query}&tags=story&hitsPerPage=5"
            
            try:
                req = urllib.request.Request(url, headers={'User-Agent': 'BriefDelights/1.0'})
                with urllib.request.urlopen(req, timeout=10) as resp:
                    data = json.loads(resp.read().decode())
                
                for hit in data.get('hits', []):
                    # Check if it's from the last 7 days
                    created_at = hit.get('created_at', '')
                    try:
                        hit_date = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                        if hit_date < datetime.now(hit_date.tzinfo) - timedelta(days=7):
                            continue
                    except (ValueError, TypeError):
                        continue
                    
                    points = hit.get('points', 0) or 0
                    comments = hit.get('num_comments', 0) or 0
                    
                    # Only care about stories with traction
                    if points < 20:
                        continue
                    
                    # Detect event type from title
                    title = hit.get('title', '')
                    event_type = _detect_event_type(title)
                    
                    events.append({
                        'company_name': info['name'],
                        'domain': domain,
                        'industry': info['industry'],
                        'segment': info['segment'],
                        'event_type': event_type,
                        'event_title': title,
                        'event_url': hit.get('url', f"https://news.ycombinator.com/item?id={hit.get('objectID', '')}"),
                        'source': 'hacker_news',
                        'points': points,
                        'comments': comments,
                        'velocity_score': _calculate_velocity(points, comments),
                        'detected_at': datetime.now().isoformat(),
                        'event_date': created_at[:10] if created_at else TODAY,
                    })
                    
            except Exception as e:
                log(f"  ⚠️  HN search failed for {company_name}: {e}")
                continue
                
    except Exception as e:
        log(f"❌ HN scan failed: {e}")
    
    return events


def scan_product_hunt() -> List[Dict]:
    """
    Scan Product Hunt API for recent launches by watched companies.
    Free API, no auth required for basic queries.
    """
    import urllib.request
    
    events = []
    
    try:
        # PH RSS feed for today's top products
        url = "https://www.producthunt.com/feed"
        
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'BriefDelights/1.0'})
            with urllib.request.urlopen(req, timeout=10) as resp:
                content = resp.read().decode()
            
            # Simple regex to extract product names and URLs
            # Look for our watched companies in the feed
            for domain, info in WATCHED_COMPANIES.items():
                company_lower = info['name'].lower()
                if company_lower in content.lower():
                    events.append({
                        'company_name': info['name'],
                        'domain': domain,
                        'industry': info['industry'],
                        'segment': info['segment'],
                        'event_type': 'product_launch',
                        'event_title': f"{info['name']} launched on Product Hunt",
                        'event_url': f"https://www.producthunt.com/search?q={urllib.parse.quote(info['name'])}",
                        'source': 'product_hunt',
                        'points': 0,
                        'comments': 0,
                        'velocity_score': 50,  # Base score for PH launches
                        'detected_at': datetime.now().isoformat(),
                        'event_date': TODAY,
                    })
                    
        except Exception as e:
            log(f"  ⚠️  Product Hunt scan failed: {e}")
            
    except Exception as e:
        log(f"❌ Product Hunt scan failed: {e}")
    
    return events


def scan_rss_for_funding() -> List[Dict]:
    """
    Scan tech news RSS feeds for funding announcements about watched companies.
    Reuses existing RSS infrastructure — no new dependencies.
    """
    events = []
    
    # Check if we have today's raw articles already
    raw_file = TMP_DIR / f"raw_articles_{TODAY}.json"
    
    if not raw_file.exists():
        # Try yesterday
        yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
        raw_file = TMP_DIR / f"raw_articles_{yesterday}.json"
    
    if not raw_file.exists():
        log("  ⚠️  No raw articles found for funding scan")
        return events
    
    with open(raw_file) as f:
        data = json.load(f)
    
    articles = data.get('articles', [])
    
    # Funding-related keywords
    funding_keywords = [
        'raises', 'raised', 'funding', 'series a', 'series b', 'series c',
        'series d', 'ipo', 'acquisition', 'acquired', 'valuation',
        'investment', 'secures', 'closes round'
    ]
    
    # Launch-related keywords
    launch_keywords = [
        'launches', 'announces', 'introduces', 'unveils', 'releases',
        'open source', 'now available', 'v2', 'v3', 'ga ', 'general availability'
    ]
    
    for article in articles:
        title_lower = article.get('title', '').lower()
        
        # Check if any watched company is mentioned
        for domain, info in WATCHED_COMPANIES.items():
            company_lower = info['name'].lower()
            
            if company_lower not in title_lower:
                continue
            
            # Check for funding events
            if any(kw in title_lower for kw in funding_keywords):
                events.append({
                    'company_name': info['name'],
                    'domain': domain,
                    'industry': info['industry'],
                    'segment': info['segment'],
                    'event_type': _detect_event_type(article['title']),
                    'event_title': article['title'],
                    'event_url': article.get('url', ''),
                    'source': 'rss_news',
                    'points': 0,
                    'comments': 0,
                    'velocity_score': 60,  # News coverage = moderate signal
                    'detected_at': datetime.now().isoformat(),
                    'event_date': article.get('published_date', TODAY)[:10],
                })
            
            # Check for product launches
            elif any(kw in title_lower for kw in launch_keywords):
                events.append({
                    'company_name': info['name'],
                    'domain': domain,
                    'industry': info['industry'],
                    'segment': info['segment'],
                    'event_type': 'product_launch',
                    'event_title': article['title'],
                    'event_url': article.get('url', ''),
                    'source': 'rss_news',
                    'points': 0,
                    'comments': 0,
                    'velocity_score': 55,
                    'detected_at': datetime.now().isoformat(),
                    'event_date': article.get('published_date', TODAY)[:10],
                })
    
    return events


# ──────────────────────────────────────────────
# EVENT ANALYSIS
# ──────────────────────────────────────────────

def _detect_event_type(title: str) -> str:
    """Classify event type from title"""
    title_lower = title.lower()
    
    if any(kw in title_lower for kw in ['series a', 'series b', 'series c', 'series d', 'raises', 'raised', 'funding']):
        return 'funding_round'
    elif any(kw in title_lower for kw in ['ipo', 'goes public', 'listing']):
        return 'ipo'
    elif any(kw in title_lower for kw in ['acquired', 'acquisition', 'buys', 'merger']):
        return 'acquisition'
    elif any(kw in title_lower for kw in ['launches', 'announces', 'introduces', 'releases', 'v2', 'v3']):
        return 'product_launch'
    elif any(kw in title_lower for kw in ['open source', 'open-source']):
        return 'open_source_release'
    elif any(kw in title_lower for kw in ['layoff', 'cuts', 'restructur', 'controversy']):
        return 'negative_press'
    else:
        return 'mention'


def _calculate_velocity(points: int, comments: int) -> int:
    """Calculate velocity score (0-100) from HN engagement"""
    # Points-weighted score
    if points >= 500:
        score = 95
    elif points >= 200:
        score = 80
    elif points >= 100:
        score = 65
    elif points >= 50:
        score = 50
    elif points >= 20:
        score = 35
    else:
        score = 20
    
    # Comments boost (discussion = strong signal)
    if comments >= 100:
        score = min(100, score + 15)
    elif comments >= 50:
        score = min(100, score + 10)
    elif comments >= 20:
        score = min(100, score + 5)
    
    return score


def calculate_outreach_urgency(event: Dict) -> Dict:
    """
    Calculate how urgently we should reach out based on event type.
    Returns enriched event with outreach guidance.
    """
    event_type = event['event_type']
    velocity = event.get('velocity_score', 50)
    
    # Eagerness boost per event type
    eagerness_boosts = {
        'funding_round': 30,      # "Congrats on the raise!"
        'product_launch': 25,     # "Great launch — want to amplify?"
        'open_source_release': 20, # "Developers love this — let us tell them"
        'ipo': 15,                # Less urgency (they're busy)
        'acquisition': 10,        # Mixed signal
        'negative_press': 35,     # "Your competitors are talking — own the narrative"
        'mention': 5,             # General awareness
    }
    
    boost = eagerness_boosts.get(event_type, 0)
    
    # Outreach templates
    templates = {
        'funding_round': {
            'subject': f"Congrats on the raise, {event['company_name']}! 🎉 Want to reach developers?",
            'hook': f"Congratulations on {event['company_name']}'s funding round. This is the perfect time to build developer awareness.",
            'timing': 'within 48 hours',
        },
        'product_launch': {
            'subject': f"Great launch, {event['company_name']}! Let's amplify it to developers.",
            'hook': f"{event['company_name']} just launched something exciting. Our readers would love to hear about it.",
            'timing': 'within 24 hours',
        },
        'negative_press': {
            'subject': f"Developers are talking about your space. Own the narrative, {event['company_name']}.",
            'hook': "There's discussion happening in your space. A featured article is the best way to shape the conversation.",
            'timing': 'within 24 hours',
        },
        'open_source_release': {
            'subject': f"Developers already love {event['company_name']}. Let's tell more of them.",
            'hook': f"{event['company_name']}'s open source release is getting attention. Want to reach more developers?",
            'timing': 'within 72 hours',
        },
    }
    
    template = templates.get(event_type, {
        'subject': f"{event['company_name']} is making news. Want to reach our developer audience?",
        'hook': f"{event['company_name']} just appeared in our radar. Great timing for a sponsored placement.",
        'timing': 'this week',
    })
    
    event['eagerness_boost'] = boost
    event['outreach_urgency'] = 'high' if boost >= 25 else ('medium' if boost >= 15 else 'low')
    event['outreach_template'] = template
    event['discovery_method'] = f"predictive_timing_{event_type}"
    
    return event


# ──────────────────────────────────────────────
# MAIN
# ──────────────────────────────────────────────

def main():
    """Main execution"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Monitor funding events and company signals')
    parser.add_argument('--source', choices=['hn', 'producthunt', 'rss', 'all'], default='all')
    parser.add_argument('--dry-run', action='store_true', help='Preview events, don\'t save')
    args = parser.parse_args()
    
    log(f"🔭 Predictive Sponsor Timing — scanning {args.source}")
    log(f"   Watching {len(WATCHED_COMPANIES)} companies\n")
    
    all_events = []
    
    # Scan sources
    if args.source in ('hn', 'all'):
        log("📡 Scanning Hacker News...")
        hn_events = scan_hn_for_companies()
        log(f"   Found {len(hn_events)} HN signals\n")
        all_events.extend(hn_events)
    
    if args.source in ('producthunt', 'all'):
        log("🚀 Scanning Product Hunt...")
        ph_events = scan_product_hunt()
        log(f"   Found {len(ph_events)} Product Hunt signals\n")
        all_events.extend(ph_events)
    
    if args.source in ('rss', 'all'):
        log("📰 Scanning RSS news for funding/launches...")
        rss_events = scan_rss_for_funding()
        log(f"   Found {len(rss_events)} RSS signals\n")
        all_events.extend(rss_events)
    
    if not all_events:
        log("💭 No events detected today. Companies are quiet.")
        return True
    
    # Deduplicate by company + event type
    seen = set()
    unique_events = []
    for event in all_events:
        key = f"{event['domain']}_{event['event_type']}"
        if key not in seen:
            seen.add(key)
            unique_events.append(event)
    
    # Enrich with outreach urgency
    enriched = [calculate_outreach_urgency(e) for e in unique_events]
    
    # Sort by urgency (high velocity + high eagerness boost first)
    enriched.sort(key=lambda e: e['velocity_score'] + e['eagerness_boost'], reverse=True)
    
    # Display results
    print("\n" + "=" * 80)
    print("🔭 PREDICTIVE SPONSOR TIMING — EVENT REPORT")
    print("=" * 80)
    
    for event in enriched:
        urgency_emoji = {'high': '🔴', 'medium': '🟡', 'low': '🟢'}.get(event['outreach_urgency'], '⚪')
        print(f"\n{urgency_emoji} {event['company_name']} — {event['event_type'].replace('_', ' ').title()}")
        print(f"   📰 {event['event_title'][:80]}")
        print(f"   📊 Velocity: {event['velocity_score']} | Source: {event['source']}")
        print(f"   📧 {event['outreach_template']['subject']}")
        print(f"   ⏰ Outreach: {event['outreach_template']['timing']}")
    
    # Summary
    high_urgency = sum(1 for e in enriched if e['outreach_urgency'] == 'high')
    print(f"\n{'─' * 80}")
    print(f"📊 {len(enriched)} events detected | {high_urgency} high urgency | "
          f"Sources: HN, Product Hunt, RSS news")
    print("=" * 80)
    
    # Save
    if not args.dry_run:
        output = {
            'generated_at': datetime.now().isoformat(),
            'total_events': len(enriched),
            'high_urgency': high_urgency,
            'events': enriched,
        }
        
        with open(EVENTS_FILE, 'w') as f:
            json.dump(output, f, indent=2)
        
        log(f"\n💾 Saved {len(enriched)} events to {EVENTS_FILE}")
    else:
        log("\n🏃 Dry run — events not saved")
    
    return True


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
