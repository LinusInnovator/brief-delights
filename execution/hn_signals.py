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


def check_hn_discussion(url: str, retry_limit: int = 2) -> Dict:
    """
    Check if article is on Hacker News and get engagement metrics
    
    Returns:
        {
            'on_hn': bool,
            'hn_points': int,
            'hn_comments': int,
            'hn_rank': int (position on front page, 0 if not on FP),
            'hn_story_id': str,
            'hn_velocity': str ('high', 'medium', 'low')
        }
    """
    try:
        # Search for URL on HN
        params = {
            'query': url,
            'tags': 'story',
            'hitsPerPage': 1
        }
        
        response = requests.get(HN_SEARCH_API, params=params, timeout=5)
        response.raise_for_status()
        data = response.json()
        
        if not data.get('hits'):
            return {'on_hn': False}
        
        hit = data['hits'][0]
        
        # Calculate velocity based on comments and points
        points = hit.get('points', 0)
        comments = hit.get('num_comments', 0)
        created_at = hit.get('created_at_i', 0)
        
        # Calculate age in hours
        age_hours = (time.time() - created_at) / 3600 if created_at else 24
        age_hours = max(age_hours, 0.1)  # Avoid division by zero
        
        # Velocity score: (points + comments * 2) / age_hours
        velocity_score = (points + comments * 2) / age_hours
        
        # Classify velocity
        if velocity_score > 50:
            velocity = 'high'
        elif velocity_score > 15:
            velocity = 'medium'
        else:
            velocity = 'low'
        
        return {
            'on_hn': True,
            'hn_points': points,
            'hn_comments': comments,
            'hn_rank': hit.get('position', 999),
            'hn_story_id': hit.get('objectID', ''),
            'hn_velocity': velocity,
            'hn_url': f"https://news.ycombinator.com/item?id={hit.get('objectID', '')}"
        }
        
    except requests.exceptions.Timeout:
        print(f"⚠️  HN API timeout for {url}")
        return {'on_hn': False}
    except Exception as e:
        print(f"⚠️  HN check failed for {url}: {str(e)}")
        return {'on_hn': False}


def batch_check_hn(articles: list) -> list:
    """
    Check HN status for multiple articles with rate limiting
    
    Args:
        articles: List of article dicts with 'url' field
    
    Returns:
        Same list with HN metadata added
    """
    print(f"Checking HN discussion for {len(articles)} articles...")
    
    for i, article in enumerate(articles):
        # Rate limit: 1 request per second to be respectful
        if i > 0:
            time.sleep(1)
        
        hn_data = check_hn_discussion(article['url'])
        
        # Add HN metadata to article
        article.update(hn_data)
        
        if hn_data.get('on_hn'):
            print(f"  ✅ {article['title'][:60]}... ({hn_data['hn_comments']} comments, {hn_data['hn_velocity']} velocity)")
    
    print(f"✅ HN check complete: {sum(1 for a in articles if a.get('on_hn'))} found on HN")
    
    return articles


if __name__ == "__main__":
    # Test with a known HN article
    test_url = "https://en.wikipedia.org/wiki/PageRank"
    result = check_hn_discussion(test_url)
    print(f"Test result: {result}")
