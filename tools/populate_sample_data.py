#!/usr/bin/env python3
"""
Populate sample data for sponsor pipeline demo
Creates realistic article clicks and sponsor leads to showcase the dashboard
"""

import os
import sys
from datetime import datetime, timedelta
from supabase import create_client, Client
from pathlib import Path

# Supabase setup
url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_KEY")

if not url or not key:
    print("❌ Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY")
    sys.exit(1)

supabase: Client = create_client(url, key)

def hash_email(email: str) -> str:
    """Hash email using same logic as webhook"""
    import hashlib
    return hashlib.sha256(email.lower().strip().encode()).hexdigest()

def populate_article_clicks():
    """Add sample article clicks from last 7 days"""
    print("📊 Adding sample article clicks...")
    
    sample_clicks = [
        # Docker article - HIGH engagement
        {
            "article_url": "https://docker.com/blog/docker-27-release",
            "article_title": "Docker 27.0: Major Release with Performance Improvements",
            "segment": "builders",
            "newsletter_date": (datetime.now() - timedelta(days=2)).strftime("%Y-%m-%d"),
            "subscriber_hash": hash_email("demo1@example.com"),
            "source_domain": "docker.com"
        },
        {
            "article_url": "https://docker.com/blog/docker-27-release",
            "article_title": "Docker 27.0: Major Release with Performance Improvements",
            "segment": "builders",
            "newsletter_date": (datetime.now() - timedelta(days=2)).strftime("%Y-%m-%d"),
            "subscriber_hash": hash_email("demo2@example.com"),
            "source_domain": "docker.com"
        },
        {
            "article_url": "https://docker.com/blog/docker-27-release",
            "article_title": "Docker 27.0: Major Release with Performance Improvements",
            "segment": "builders",
            "newsletter_date": (datetime.now() - timedelta(days=2)).strftime("%Y-%m-%d"),
            "subscriber_hash": hash_email("demo3@example.com"),
            "source_domain": "docker.com"
        },
        
        # Kubernetes article - MEDIUM engagement
        {
            "article_url": "https://kubernetes.io/blog/2026/02/best-practices",
            "article_title": "Kubernetes Best Practices for 2026",
            "segment": "builders",
            "newsletter_date": (datetime.now() - timedelta(days=3)).strftime("%Y-%m-%d"),
            "subscriber_hash": hash_email("demo4@example.com"),
            "source_domain": "kubernetes.io"
        },
        {
            "article_url": "https://kubernetes.io/blog/2026/02/best-practices",
            "article_title": "Kubernetes Best Practices for 2026",
            "segment": "builders",
            "newsletter_date": (datetime.now() - timedelta(days=3)).strftime("%Y-%m-%d"),
            "subscriber_hash": hash_email("demo5@example.com"),
            "source_domain": "kubernetes.io"
        },
        
        # AI article - HIGH engagement
        {
            "article_url": "https://openai.com/blog/gpt-5-preview",
            "article_title": "GPT-5 Preview: What's Coming",
            "segment": "innovators",
            "newsletter_date": (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d"),
            "subscriber_hash": hash_email("demo6@example.com"),
            "source_domain": "openai.com"
        },
        {
            "article_url": "https://openai.com/blog/gpt-5-preview",
            "article_title": "GPT-5 Preview: What's Coming",
            "segment": "innovators",
            "newsletter_date": (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d"),
            "subscriber_hash": hash_email("demo7@example.com"),
            "source_domain": "openai.com"
        },
        {
            "article_url": "https://openai.com/blog/gpt-5-preview",
            "article_title": "GPT-5 Preview: What's Coming",
            "segment": "innovators",
            "newsletter_date": (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d"),
            "subscriber_hash": hash_email("demo8@example.com"),
            "source_domain": "openai.com"
        },
        {
            "article_url": "https://openai.com/blog/gpt-5-preview",
            "article_title": "GPT-5 Preview: What's Coming",
            "segment": "innovators",
            "newsletter_date": (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d"),
            "subscriber_hash": hash_email("demo9@example.com"),
            "source_domain": "openai.com"
        },
    ]
    
    result = supabase.table("article_clicks").insert(sample_clicks).execute()
    print(f"✅ Added {len(sample_clicks)} article clicks")

def populate_sponsor_leads():
    """Add sample sponsor leads matched from articles"""
    print("🎯 Adding sample sponsor leads...")
    
    sample_leads = [
        # Matched from Docker article → Railway
        {
            "company_name": "Railway",
            "domain": "railway.app",
            "industry": "Cloud Infrastructure",
            "matched_topic": "DevOps",
            "matched_segment": "builders",
            "match_score": 92,
            "status": "matched",
            "competitor_mentioned": "Docker",
            "related_article_title": "Docker 27.0: Major Release with Performance Improvements",
            "related_article_url": "https://docker.com/blog/docker-27-release",
            "article_clicks": 3,
            "offer_price_cents": 80000,  # $800
        },
        
        # Matched from Docker article → Render
        {
            "company_name": "Render",
            "domain": "render.com",
            "industry": "Cloud Platform",
            "matched_topic": "DevOps",
            "matched_segment": "builders",
            "match_score": 88,
            "status": "outreach_sent",
            "competitor_mentioned": "Docker",
            "related_article_title": "Docker 27.0: Major Release with Performance Improvements",
            "related_article_url": "https://docker.com/blog/docker-27-release",
            "article_clicks": 3,
            "offer_price_cents": 80000,  # $800
            "outreach_sent_at": (datetime.now() - timedelta(hours=12)).isoformat(),
        },
        
        # Matched from Docker article → Fly.io
        {
            "company_name": "Fly.io",
            "domain": "fly.io",
            "industry": "Edge Compute",
            "matched_topic": "DevOps",
            "matched_segment": "builders",
            "match_score": 85,
            "status": "matched",
            "competitor_mentioned": "Docker",
            "related_article_title": "Docker 27.0: Major Release with Performance Improvements",
            "related_article_url": "https://docker.com/blog/docker-27-release",
            "article_clicks": 3,
            "offer_price_cents": 80000,  # $800
        },
        
        # Matched from OpenAI article → Perplexity
        {
            "company_name": "Perplexity",
            "domain": "perplexity.ai",
            "industry": "AI Search",
            "matched_topic": "AI/ML",
            "matched_segment": "innovators",
            "match_score": 95,
            "status": "matched",
            "competitor_mentioned": "OpenAI",
            "related_article_title": "GPT-5 Preview: What's Coming",
            "related_article_url": "https://openai.com/blog/gpt-5-preview",
            "article_clicks": 4,
            "offer_price_cents": 120000,  # $1,200 (high engagement)
        },
        
        # Matched from OpenAI article → Together AI
        {
            "company_name": "Together AI",
            "domain": "together.ai",
            "industry": "AI Platform",
            "matched_topic": "AI/ML",
            "matched_segment": "innovators",
            "match_score": 90,
            "status": "matched",
            "competitor_mentioned": "OpenAI",
            "related_article_title": "GPT-5 Preview: What's Coming",
            "related_article_url": "https://openai.com/blog/gpt-5-preview",
            "article_clicks": 4,
            "offer_price_cents": 120000,  # $1,200
        },
    ]
    
    result = supabase.table("sponsor_leads").insert(sample_leads).execute()
    print(f"✅ Added {len(sample_leads)} sponsor leads")

def main():
    print("\n🚀 Populating sample data for sponsor pipeline...\n")
    
    try:
        populate_article_clicks()
        populate_sponsor_leads()
        
        print("\n✅ Sample data populated successfully!")
        print("\n📍 Next steps:")
        print("1. Visit: https://brief.delights.pro/admin/sponsors/insights")
        print("2. You should see articles with click counts and matched sponsors")
        print("3. Visit: https://brief.delights.pro/admin/sponsors")
        print("4. You should see sponsor leads in the pipeline")
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
