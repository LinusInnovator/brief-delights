#!/usr/bin/env python3
"""
Content Sharing Tools - Twitter Thread Generator

Convert newsletter content into shareable Twitter threads.
Helps with Week 1 organic growth strategy.
"""

import json
import re
from pathlib import Path
from typing import List, Dict
from datetime import datetime


def generate_twitter_thread(newsletter_html_path: Path) -> List[str]:
    """
    Generate a Twitter thread from newsletter content.
    
    Returns list of tweets (max 280 chars each).
    """
    with open(newsletter_html_path, 'r') as f:
        html = f.read()
    
    # Extract articles from HTML
    articles = extract_articles_from_html(html)
    
    # Create thread
    thread = []
    
    # Tweet 1: Hook
    thread.append(
        "3 things builders should know today 🧵\n\n"
        "Infrastructure, AI/ML, and tools you can't miss:"
    )
    
    # Tweets 2-4: Articles
    for i, article in enumerate(articles[:3], 1):
        tweet = f"{i}/ {article['category']}: {article['title']}\n\n"
        tweet += f"{article['summary']}\n\n"
        tweet += f"🔗 {article['url']}"
        thread.append(tweet)
    
    # Tweet 5: CTA
    thread.append(
        "Get this curated daily in your inbox 📬\n\n"
        "→ brief.delights.pro\n\n"
        "No fluff. Just signal. Free forever."
    )
    
    return thread


def extract_articles_from_html(html: str) -> List[Dict]:
    """Extract articles from newsletter HTML"""
    # This is a simplified version - in production, use proper HTML parsing
    articles = []
    
    # Mock articles for demonstration
    # In production, parse the HTML properly
    return [
        {
            'category': 'Infrastructure',
            'title': 'Vercel Adds Edge Caching',
            'summary': 'Deploy faster with global edge network',
            'url': 'https://vercel.com/blog/edge'
        },
        {
            'category': 'AI/ML',
            'title': 'Claude 3 Surpasses GPT-4',
            'summary': 'New benchmarks show Claude winning',
            'url': 'https://anthropic.com/claude'
        },
        {
            'category': 'Tools',
            'title': 'Railway Raises $20M',
            'summary': 'Deploy apps in one command',
            'url': 'https://railway.app'
        }
    ]


def generate_linkedin_post(thread: List[str]) -> str:
    """
    Convert Twitter thread to LinkedIn format.
    LinkedIn allows longer posts, so combine tweets.
    """
    post = "🚀 Daily Tech Intelligence for Builders\n\n"
    post += "Here's what you need to know today:\n\n"
    
    # Add first 3 articles from thread (skip hook and CTA tweets)
    for tweet in thread[1:4]:
        # Clean up tweet formatting for LinkedIn
        article = tweet.replace("/ ", ". ").replace("🔗 ", "→ ")
        post += f"{article}\n\n"
    
    post += "---\n\n"
    post += "💡 Get this curated daily → brief.delights.pro\n\n"
    post += "Built for engineers, developers, and technical founders who want signal over noise.\n\n"
    post += "#developers #ai #infrastructure #startup"
    
    return post


if __name__ == "__main__":
    # Example usage
    print("Twitter Thread Generator")
    print("=" * 50)
    
    # Generate sample thread
    thread = generate_twitter_thread(Path("sample.html"))
    
    print("\nTWITTER THREAD:")
    print("-" * 50)
    for i, tweet in enumerate(thread, 1):
        print(f"\n[Tweet {i}] ({len(tweet)} chars)")
        print(tweet)
        print()
    
    print("\nLINKEDIN POST:")
    print("-" * 50)
    linkedin = generate_linkedin_post(thread)
    print(linkedin)
    print(f"\n({len(linkedin)} chars)")
