#!/usr/bin/env python3
"""
Source Auto-Improver
Runs weekly to prune underperforming RSS feeds and scout for new high-quality ones.
"""

import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path
import feedparser
from openai import OpenAI
from pydantic import BaseModel, Field

# Local imports
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "execution"))
try:
    from rank_sources import load_pipeline_data, calculate_source_scores
except ImportError:
    print("❌ Cannot import rank_sources. Make sure you run from project root.")
    sys.exit(1)

FEEDS_CONFIG_DIR = PROJECT_ROOT / "feeds_config"
FEEDS_CONFIG = PROJECT_ROOT / "feeds_config.json"
CANDIDATES_FILE = FEEDS_CONFIG_DIR / "feeds_candidates.json"

# Ensure feeds config dir exists
FEEDS_CONFIG_DIR.mkdir(exist_ok=True)

# Initialize OpenRouter Client
api_key = os.environ.get("OPENROUTER_API_KEY")
if not api_key:
    from dotenv import load_dotenv
    load_dotenv(PROJECT_ROOT / ".env")
    api_key = os.environ.get("OPENROUTER_API_KEY")

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=api_key
)

SCOUT_MODEL = "openai/gpt-4o-mini"

class FeedSuggestion(BaseModel):
    name: str = Field(description="Name of the publication or blog")
    url: str = Field(description="The exact RSS or Atom feed URL to subscribe to")
    reason: str = Field(description="Why this is a hidden gem for the given category")

class FeedScoutResult(BaseModel):
    suggestions: list[FeedSuggestion]


def log(msg, level="INFO"):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] [{level}] {msg}")

def prune_bad_sources(days=14):
    log(f"Evaluating sources over the last {days} days for pruning...")
    raw_articles, selected_articles = load_pipeline_data(days=days)
    if not raw_articles:
        log("No data found for pruning.", "WARN")
        return []
    
    rankings = calculate_source_scores(raw_articles, selected_articles)
    
    # Identify F-grade sources: >5 articles seen, 0% selection rate
    bad_sources = [r for r in rankings if r['grade'] == 'F' and r['total_articles'] > 5]
    
    if not bad_sources:
        log("No F-grade sources found. Nothing to prune.", "OK")
        return []
        
    bad_source_names = {r['source'].lower() for r in bad_sources}
    log(f"Found {len(bad_source_names)} bad sources to prune.")
    
    # Prune from configs
    pruned_count = 0
    configs_to_check = list(FEEDS_CONFIG_DIR.glob("feeds_*.json"))
    if FEEDS_CONFIG.exists():
        configs_to_check.append(FEEDS_CONFIG)
        
    for config_file in configs_to_check:
        with open(config_file, 'r') as f:
            config = json.load(f)
            
        modified = False
        new_categories = {}
        for cat, feeds in config.get('categories', {}).items():
            new_feeds = []
            for feed_url in feeds:
                is_bad = False
                url_lower = feed_url.lower()
                for bad_name in bad_source_names:
                    safe_bad_name = bad_name.replace(" ", "").replace(".com", "").replace("blog", "").strip()
                    if len(safe_bad_name) > 3 and safe_bad_name in url_lower:
                        is_bad = True
                        log(f"Pruning {feed_url} (matches bad source '{bad_name}')", "PRUNE")
                        break
                
                if not is_bad:
                    new_feeds.append(feed_url)
                else:
                    modified = True
                    pruned_count += 1
            
            new_categories[cat] = new_feeds
            
        if modified:
            config['categories'] = new_categories
            with open(config_file, 'w') as f:
                json.dump(config, f, indent=2)
                
    log(f"Finished pruning {pruned_count} feed URLs.")
    return bad_sources

def validate_feed(url):
    """Pings the RSS feed to ensure it's valid and has entries."""
    try:
        import requests
        headers = {'User-Agent': 'Mozilla/5.0'}
        # Check HTTP status first to fail fast
        resp = requests.head(url, headers=headers, timeout=5)
        if resp.status_code >= 400:
            return False, f"HTTP Error {resp.status_code}"
            
        feed = feedparser.parse(url)
        if feed.bozo and not feed.entries:
            return False, "Malformed or dead feed"
        if not feed.entries:
            return False, "No entries found"
        return True, f"Valid! Found {len(feed.entries)} recent entries"
    except Exception as e:
        return False, str(e)

def scout_new_sources(category, segment_niche):
    log(f"Scouting new feeds for: {category} ({segment_niche})")
    prompt = f"""
    We need high-signal, hidden-gem RSS feeds for a newsletter targeting: {segment_niche}
    The specific category we need sources for is: {category}
    
    Provide 3 highly specific, technical, or insightful blogs, publications, or subreddits that have valid RSS/Atom feeds.
    Avoid mainstream noise like general Forbes or generic TechCrunch feeds. Focus on engineering blogs, deep-tech analysts, niche research labs, or high-value curated aggregates.
    
    Ensure the URL you provide is the EXACT URL to their RSS or Atom feed (e.g. ending in .xml, /feed/, .rss).
    """
    
    schema = FeedScoutResult.model_json_schema()
    options = {
        "model": SCOUT_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.5
    }
    
    try:
        options["response_format"] = {"type": "json_object"}
        options["messages"][0]["content"] += "\nReturn JSON matching this schema: " + json.dumps(schema)
            
        response = client.chat.completions.create(**options)
        content = response.choices[0].message.content.strip()
        
        # Remove markdown if present
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
                
        result = json.loads(content)
        return result.get("suggestions", [])
    except Exception as e:
        log(f"Scout LLM call failed: {e}", "ERROR")
        return []

def run_scout_loop():
    log("Identifying categories that need new sources...")
    
    cat_counts = {}
    configs = list(FEEDS_CONFIG_DIR.glob("feeds_*.json"))
    if not configs and FEEDS_CONFIG.exists():
        configs = [FEEDS_CONFIG]
        
    for config_file in configs:
        if config_file.name == "feeds_candidates.json":
            continue
        with open(config_file, 'r') as f:
            config = json.load(f)
            for cat, feeds in config.get('categories', {}).items():
                cat_counts[cat] = cat_counts.get(cat, 0) + len(feeds)
                
    if not cat_counts:
        log("No categories found to scout for.", "ERROR")
        return
        
    # Sort categories by fewest feeds
    needy_categories = sorted(cat_counts.items(), key=lambda x: x[1])
    target_category = needy_categories[0][0]
    
    log(f"Targeting category '{target_category}' which currently has {cat_counts[target_category]} feeds.")
    segment_niche = "B2B Tech & AI for Decision-Makers, Builders, and Innovators"
    
    suggestions = scout_new_sources(target_category, segment_niche)
    if not suggestions:
        log("LLM returned no suggestions.", "WARN")
        return
        
    valid_new_feeds = []
    for sug in suggestions:
        log(f"Testing proposed feed: {sug.get('name')} -> {sug.get('url')}", "SCOUT")
        is_valid, msg = validate_feed(sug.get('url'))
        if is_valid:
            log(f"  ✅ {msg}", "OK")
            valid_new_feeds.append(sug.get('url'))
        else:
            log(f"  ❌ Failed: {msg}", "WARN")
            
    if valid_new_feeds:
        if CANDIDATES_FILE.exists():
            with open(CANDIDATES_FILE, 'r') as f:
                candidates_config = json.load(f)
        else:
            candidates_config = {
                "segment": "candidates",
                "lookback_hours": 24,
                "categories": {}
            }
            
        if target_category not in candidates_config["categories"]:
            candidates_config["categories"][target_category] = []
            
        added = 0
        for url in valid_new_feeds:
            if url not in candidates_config["categories"][target_category]:
                candidates_config["categories"][target_category].append(url)
                added += 1
                
        with open(CANDIDATES_FILE, 'w') as f:
            json.dump(candidates_config, f, indent=2)
            
        log(f"Successfully added {added} new valid feeds to {CANDIDATES_FILE.name}", "OK")
    else:
        log("No valid feeds found in this scout cycle.", "WARN")

def main():
    print("=" * 60)
    print("🔄 Autonomous Source Improvement Loop")
    print("=" * 60)
    
    prune_bad_sources(days=14)
    print("-" * 60)
    run_scout_loop()
    
    print("=" * 60)
    print("✅ Improvement cycle complete.")

if __name__ == "__main__":
    main()
