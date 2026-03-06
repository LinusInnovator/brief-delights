#!/usr/bin/env python3
"""
Automated Outreach Demo
Shows end-to-end email generation with smart pricing and content examples
"""

import sys
from pathlib import Path

# Add to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from automations.monetization.smart_pricing import SmartPricingCalculator, PricingInputs
from automations.monetization.content_examples_generator import (
    ContentExamplesGenerator, ArticlePerformance
)
import os
import resend
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
resend.api_key = os.getenv("RESEND_API_KEY", "")

def demo_outreach():
    """Demonstrate complete outreach email generation"""
    
    print("=" * 70)
    print("AUTOMATED SPONSOR OUTREACH DEMO")
    print("=" * 70)
    print()
    
    # Sponsor info
    sponsor_name = "Vercel"
    sponsor_domain = "vercel.com"
    sponsor_industry = "Frontend hosting platform"
    segment = "builders"
    competitor = "AWS"
    
    # Analytics data (from Supabase in production)
    subscribers = 45
    segment_click_rate = 7.5
    
    # Top performing articles (from article_clicks table)
    top_articles = [
        ArticlePerformance(
            title="Docker 27.0 Performance Optimizations",
            url="https://docker.com/blog/docker-27",
            source_domain="docker.com",
            clicks=25,
            click_rate=8.3,
            segment="builders",
            date="2026-02-10"
        ),
        ArticlePerformance(
            title="AWS vs Cloudflare: Edge Computing Showdown",
            url="https://techcrunch.com/aws-cloudflare",
            source_domain="techcrunch.com",
            clicks=18,
            click_rate=6.1,
            segment="builders",
            date="2026-02-11"
        )
    ]
    
    # Step 1: Calculate Smart Pricing
    print("📊 STEP 1: Smart Pricing Calculation")
    print("-" * 70)
    
    pricing_calc = SmartPricingCalculator()
    pricing = pricing_calc.calculate(PricingInputs(
        subscribers=subscribers,
        article_clicks=top_articles[0].clicks,
        segment_click_rate=segment_click_rate,
        competitor_name=competitor
    ))
    
    print(f"Base Price: ${pricing.base_price}")
    print(f"Reach Score: {pricing.reach_score:.2f}x (audience: {subscribers} subs)")
    print(f"Engagement Score: {pricing.engagement_score:.2f}x (CTR: {segment_click_rate}%)")
    print(f"Proof Score: {pricing.proof_score:.2f}x ({top_articles[0].clicks} clicks)")
    print(f"\\nFinal Price: {pricing_calc.get_price_display(pricing.final_price)} ({pricing.tier} tier)")
    print(f"Guaranteed Clicks: {pricing.min_guaranteed_clicks}+")
    print(f"Reasoning: {pricing.reasoning}")
    print()
    
    # Step 2: Generate Content Examples
    print("✍️  STEP 2: Content Example Generation")
    print("-" * 70)
    
    try:
        content_gen = ContentExamplesGenerator()
        content_examples = content_gen.generate_examples(
            sponsor_name=sponsor_name,
            sponsor_domain=sponsor_domain,
            sponsor_description=sponsor_industry,
            segment=segment,
            top_articles=top_articles
        )
    except Exception as e:
        print(f"⚠️ Could not generate content examples (Likely missing OPENROUTER_API_KEY): {e}")
        print("Using fallback examples for demo purposes.")
        from automations.monetization.content_examples_generator import ContentExample
        content_examples = [
            ContentExample(
                headline="How Vercel cut our build times in half",
                angle="case_study",
                expected_clicks_min=20,
                expected_clicks_max=35,
                inspired_by_article="Docker 27.0 Performance Optimizations",
                inspired_by_clicks=25,
                talking_points=["Improved DX", "Faster deployments", "Edge caching built-in"]
            ),
            ContentExample(
                headline="Why Frontend Infrastructure is the New Backend",
                angle="industry_analysis",
                expected_clicks_min=15,
                expected_clicks_max=30,
                inspired_by_article="AWS vs Cloudflare: Edge Computing Showdown",
                inspired_by_clicks=18,
                talking_points=["Rise of edge compute", "Vercel's strategic advantage", "Next.js dominance"]
            )
        ]
    
    for i, example in enumerate(content_examples, 1):
        print(f"\\nExample {i}: \"{example.headline}\"")
        print(f"  Angle: {example.angle}")
        print(f"  Expected: {example.expected_clicks_min}-{example.expected_clicks_max} clicks")
        print(f"  Inspired by: \"{example.inspired_by_article}\" ({example.inspired_by_clicks} clicks)")
        print(f"  Talking Points:")
        for point in example.talking_points:
            print(f"    • {point}")
    print()
    
    # Step 3: Generate Outreach Email
    print("📧 STEP 3: Personalized Outreach Email")
    print("=" * 70)
    print()
    
    # Subject lines
    subject_a = f"{competitor} was in our newsletter. Show readers why {sponsor_name} is better?"
    subject_b = f"18 builders clicked {sponsor_industry.lower()} content. Feature {sponsor_name}?"
    
    print("SUBJECT A (Competitive):")
    print(subject_a)
    print()
    print("SUBJECT B (Data-driven):")
    print(subject_b)
    print()
    print("-" * 70)
    print()
    
    # Email body
    email_body = f"""Hi Guillermo,

Quick context: I run Brief Delights, a tech newsletter for hands-on developers and engineers.

Last week, we sent an article about {competitor} to {subscribers} builders.

{top_articles[0].clicks} people clicked it.

I think we should write about {sponsor_name} next.

HERE'S WHAT WE'D CREATE:

📝 Two article options (you pick):

1. "{content_examples[0].headline}"
   → {content_examples[0].angle.replace('_', ' ').title()} format
   → Expected: {content_examples[0].expected_clicks_min}-{content_examples[0].expected_clicks_max} engaged clicks
   → Inspired by our "{content_examples[0].inspired_by_article}" ({content_examples[0].inspired_by_clicks} clicks)

2. "{content_examples[1].headline}"
   → {content_examples[1].angle.replace('_', ' ').title()} format
   → Expected: {content_examples[1].expected_clicks_min}-{content_examples[1].expected_clicks_max} engaged clicks
   → Inspired by our "{content_examples[1].inspired_by_article}" ({content_examples[1].inspired_by_clicks} clicks)

📊 What you get:
• Curated technical article written by us (educational, not salesy)
• Sent ONLY to builders ({subscribers} decision-makers)
• Guaranteed {pricing.min_guaranteed_clicks}+ engaged clicks
• 24-hour performance report with full analytics
• Content rights - repurpose the article anywhere you want
• Social amplification (we'll share on Twitter + LinkedIn)

💰 Investment: {pricing_calc.get_price_display(pricing.final_price)}

🎯 Guarantee: If we don't hit {pricing.min_guaranteed_clicks} clicks, we'll rerun it for free in the next edition.

Interested? Just reply "yes" and I'll send you a calendar link to discuss the article angle.

Best,
Linus

P.S. Next available slot is February 17. We only do 1 featured article per segment per day, so it'll fill up fast."""
    
    print(email_body)
    print()
    print("=" * 70)
    print()
    print(f"✅ Price: {pricing_calc.get_price_display(pricing.final_price)} ({pricing.tier} tier)")
    print(f"✅ Guaranteed: {pricing.min_guaranteed_clicks}+ clicks")
    print(f"✅ Proof: Based on real {top_articles[0].clicks} clicks from similar content")
    print()
    
    # Step 4: Send via Resend
    print("🚀 STEP 4: Sending via Resend API")
    print("-" * 70)
    if not resend.api_key:
        print("⚠️ RESEND_API_KEY not found in environment. Skipping email dispatch.")
    else:
        try:
            # For demo purposes, we send this to ourselves to review before forwarding
            sender = "partnerships@brief.delights.pro"
            recipient = "linus@brief.delights.pro" # Replace with actual target or yourself
            
            response = resend.Emails.send({
                "from": f"Linus <{sender}>",
                "to": recipient,
                "subject": subject_b,
                "text": email_body
            })
            print(f"✅ Email queued successfully!")
            print(f"Resend Response ID: {response.get('id')}")
            print(f"Sent to: {recipient}")
        except Exception as e:
            print(f"❌ Failed to send email via Resend: {e}")
            print("Make sure you have a verified domain on Resend.")
            
    print()


if __name__ == "__main__":
    demo_outreach()
