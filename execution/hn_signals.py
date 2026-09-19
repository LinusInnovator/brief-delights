#!/usr/bin/env python3
"""
Hacker News Signals Integration
Detects HN discussion and trending velocity to boost early stories
"""

import requests
from typing import Dict, Optional
import time

# HN Algolia API
HN_SEARCH_API = "https://hn.algolia.com/api/v1/search"
HN_ITEM_API = "https://hn.algolia.com/api/v1/items"

_HN_TRENDING_CACHE = None
_HN_CACHE_TIMESTAMP = 0

def fetch_hn_trending_index(ttl_seconds: int = 1800) -> dict:
    """
    Fetch top 200 trending HN stories in 1-2 fast requests and build an in-memory lookup index.
    Caches for 30 minutes. Returns a dict mapping clean URL/domain/title tokens to HN stats.
    """
    global _HN_TRENDING_CACHE, _HN_CACHE_TIMESTAMP
    now = time.time()
    if _HN_TRENDING_CACHE is not None and (now - _HN_CACHE_TIMESTAMP) < ttl_seconds:
        return _HN_TRENDING_CACHE

    index = {
        "by_clean_url": {},
        "by_title": {}
    }

    try:
        # 1. Fetch current Front Page
        endpoints = [
            f"{HN_SEARCH_API}?tags=front_page&hitsPerPage=100",
            f"https://hn.algolia.com/api/v1/search_by_date?tags=story&numericFilters=points%3E20&hitsPerPage=100"
        ]
        
        for ep in endpoints:
            try:
                resp = requests.get(ep, timeout=5)
                if resp.status_code == 200:
                    hits = resp.json().get("hits", [])
                    for hit in hits:
                        url = (hit.get("url") or "").strip().lower().rstrip("/")
                        clean_url = url.replace("https://", "").replace("http://", "").replace("www.", "")
                        title = (hit.get("title") or "").strip().lower()
                        points = hit.get("points", 0)
                        comments = hit.get("num_comments", 0)
                        created_at = hit.get("created_at_i", 0)
                        age_hours = max((now - created_at) / 3600 if created_at else 24, 0.1)
                        velocity_score = (points + comments * 2) / age_hours

                        if velocity_score > 50:
                            velocity = "high"
                        elif velocity_score > 15:
                            velocity = "medium"
                        else:
                            velocity = "low"

                        hn_meta = {
                            "on_hn": True,
                            "hn_points": points,
                            "hn_comments": comments,
                            "hn_story_id": hit.get("objectID", ""),
                            "hn_velocity": velocity,
                            "hn_url": f"https://news.ycombinator.com/item?id={hit.get('objectID', '')}"
                        }

                        if clean_url:
                            index["by_clean_url"][clean_url] = hn_meta
                        if title:
                            index["by_title"][title] = hn_meta
            except Exception as e:
                print(f"⚠️ Warning fetching HN endpoint {ep}: {e}")

        _HN_TRENDING_CACHE = index
        _HN_CACHE_TIMESTAMP = now
        print(f"✅ Indexed {len(index['by_clean_url'])} trending Hacker News items into memory")
    except Exception as err:
        print(f"⚠️ Failed building HN trending index: {err}")
        _HN_TRENDING_CACHE = index

    return _HN_TRENDING_CACHE


def check_hn_discussion(url: str, retry_limit: int = 2) -> Dict:
    """
    Check if article is on Hacker News using fast index first, then Algolia search fallback.
    """
    if not url:
        return {'on_hn': False}

    # Fast in-memory check first
    index = fetch_hn_trending_index()
    clean_url = url.strip().lower().rstrip("/").replace("https://", "").replace("http://", "").replace("www.", "")
    if clean_url in index.get("by_clean_url", {}):
        return index["by_clean_url"][clean_url]

    # Quick search fallback for high-profile domains
    try:
        params = {
            'query': url,
            'tags': 'story',
            'hitsPerPage': 1
        }
        response = requests.get(HN_SEARCH_API, params=params, timeout=3)
        if response.status_code == 200:
            data = response.json()
            if data.get('hits'):
                hit = data['hits'][0]
                points = hit.get('points', 0)
                comments = hit.get('num_comments', 0)
                created_at = hit.get('created_at_i', 0)
                now = time.time()
                age_hours = max((now - created_at) / 3600 if created_at else 24, 0.1)
                velocity_score = (points + comments * 2) / age_hours
                velocity = 'high' if velocity_score > 50 else ('medium' if velocity_score > 15 else 'low')
                return {
                    'on_hn': True,
                    'hn_points': points,
                    'hn_comments': comments,
                    'hn_rank': hit.get('position', 999),
                    'hn_story_id': hit.get('objectID', ''),
                    'hn_velocity': velocity,
                    'hn_url': f"https://news.ycombinator.com/item?id={hit.get('objectID', '')}"
                }
    except Exception:
        pass

    return {'on_hn': False}


def enrich_articles_with_hn(articles: list, max_individual_lookups: int = 30) -> list:
    """
    Fast enrichment: matches against bulk HN trending index in < 1ms,
    then queries up to max_individual_lookups top candidate URLs.
    """
    index = fetch_hn_trending_index()
    hn_url_map = index.get("by_clean_url", {})
    hn_title_map = index.get("by_title", {})

    found_count = 0
    direct_lookup_count = 0

    for article in articles:
        url = (article.get('url') or '').strip().lower().rstrip('/')
        clean_url = url.replace("https://", "").replace("http://", "").replace("www.", "")
        title = (article.get('title') or '').strip().lower()

        # 1. Match by clean URL
        if clean_url in hn_url_map:
            article.update(hn_url_map[clean_url])
            found_count += 1
            continue

        # 2. Match by title
        if title in hn_title_map:
            article.update(hn_title_map[title])
            found_count += 1
            continue

        # 3. Direct lookup for primary sources if quota remains
        if direct_lookup_count < max_individual_lookups and article.get('source_type') == 'primary':
            direct_lookup_count += 1
            hn_data = check_hn_discussion(article.get('url', ''))
            article.update(hn_data)
            if hn_data.get('on_hn'):
                found_count += 1
        else:
            article['on_hn'] = False

    print(f"📊 HN Signal Enrichment: {found_count} articles matched trending HN velocity")
    return articles


def batch_check_hn(articles: list) -> list:
    """Backward compatibility wrapper"""
    return enrich_articles_with_hn(articles)


if __name__ == "__main__":
    test_url = "https://en.wikipedia.org/wiki/PageRank"
    result = check_hn_discussion(test_url)
    print(f"Test result: {result}")
