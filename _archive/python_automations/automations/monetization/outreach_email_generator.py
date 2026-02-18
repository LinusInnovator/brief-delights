#!/usr/bin/env python3
"""
Outreach Email Generator
Generates personalized sponsor outreach emails with:
- Smart pricing
- Content examples based on real performance
- Proof points from analytics
- Value stack
"""

import os
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, TYPE_CHECKING
from dataclasses import dataclass

# Add parent directories to path
sys.path.append(str(Path(__file__).parent.parent.parent))

# Import types for type hints
if TYPE_CHECKING:
    from execution.automations.monetization.smart_pricing import (
        SmartPricingCalculator, PricingInputs, PricingResult
    )
    from execution.automations.monetization.content_examples_generator import (
        ContentExamplesGenerator, ArticlePerformance, ContentExample
    )

# Import at runtime
try:
    from execution.automations.monetization.smart_pricing import (
        SmartPricingCalculator, PricingInputs, PricingResult
    )
    from execution.automations.monetization.content_examples_generator import (
        ContentExamplesGenerator, ArticlePerformance, ContentExample
    )
except ImportError as e:
    print(f"Warning: Could not import modules: {e}")
    SmartPricingCalculator = None
    ContentExamplesGenerator = None


@dataclass
class SponsorLead:
    """Sponsor lead data"""
    company_name: str
    domain: str
    industry: str
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    matched_segment: str = "builders"
    competitor_mentioned: Optional[str] = None
    

@dataclass
class EmailContext:
    """Context for email generation"""
    sponsor: SponsorLead
    pricing: 'PricingResult'
    content_examples: List['ContentExample']
    segment_stats: Dict
    next_available_date: str


class OutreachEmailGenerator:
    """Generate personalized outreach emails"""
    
    def __init__(self):
        self.pricing_calculator = SmartPricingCalculator()
        self.content_generator = ContentExamplesGenerator()
        
        # Segment descriptions
        self.segment_descriptions = {
            "builders": "hands-on developers and engineers",
            "leaders": "CTOs and engineering managers",
            "innovators": "product builders and founders"
        }
    
    def generate_outreach_email(
        self,
        sponsor: SponsorLead,
        top_articles: List['ArticlePerformance'],
        segment_stats: Dict
    ) -> Dict[str, str]:
        """Generate complete outreach email"""
        
        # Calculate pricing
        pricing = self.pricing_calculator.calculate(PricingInputs(
            subscribers=segment_stats.get('subscribers', 45),
            article_clicks=top_articles[0].clicks if top_articles else 15,
            segment_click_rate=segment_stats.get('click_rate', 6.5),
            competitor_name=sponsor.competitor_mentioned
        ))
        
        # Generate content examples
        content_examples = self.content_generator.generate_examples(
            sponsor_name=sponsor.company_name,
            sponsor_domain=sponsor.domain,
            sponsor_description=sponsor.industry,
            segment=sponsor.matched_segment,
            top_articles=top_articles
        )
        
        # Calculate next available date (3 days from now, skip weekends)
        next_date = self._get_next_available_date()
        
        # Build email context
        context = EmailContext(
            sponsor=sponsor,
            pricing=pricing,
            content_examples=content_examples,
            segment_stats=segment_stats,
            next_available_date=next_date
        )
        
        # Generate subject lines
        subject_a = self._generate_subject_competitive(context)
        subject_b = self._generate_subject_data_driven(context)
        
        # Generate email body
        body = self._generate_email_body(context, top_articles)
        
        return {
            "subject_line_a": subject_a,
            "subject_line_b": subject_b,
            "body": body,
            "pricing_tier": pricing.tier,
            "price_cents": pricing.final_price,
            "price_display": self.pricing_calculator.get_price_display(pricing.final_price),
            "guaranteed_clicks": pricing.min_guaranteed_clicks
        }
    
    def _generate_subject_competitive(self, ctx: EmailContext) -> str:
        """Generate competitive subject line"""
        if ctx.sponsor.competitor_mentioned:
            return f"{ctx.sponsor.competitor_mentioned} was in our newsletter. Show readers why {ctx.sponsor.company_name} is better?"
        else:
            return f"Feature {ctx.sponsor.company_name} to {ctx.segment_stats.get('subscribers', 45)} engaged {ctx.sponsor.matched_segment}?"
    
    def _generate_subject_data_driven(self, ctx: EmailContext) -> str:
        """Generate data-driven subject line"""
        top_article = ctx.content_examples[0] if ctx.content_examples else None
        clicks = ctx.segment_stats.get('recent_clicks', 18)
        
        if top_article:
            # Extract topic from headline
            topic = ctx.sponsor.industry.lower()
            return f"{clicks} {ctx.sponsor.matched_segment} clicked {topic} content. Feature {ctx.sponsor.company_name}?"
        else:
            return f"Get {ctx.sponsor.company_name} in front of {clicks}+ engaged {ctx.sponsor.matched_segment}"
    
    def _generate_email_body(self, ctx: EmailContext, top_articles: List['ArticlePerformance']) -> str:
        """Generate email body"""
        
        # Get first name (or fallback)
        first_name = ctx.sponsor.contact_name or "there"
        if " " in first_name:
            first_name = first_name.split()[0]
        
        # Build email
        email = f"""Hi {first_name},

Quick context: I run Brief Delights, a tech newsletter for {self.segment_descriptions.get(ctx.sponsor.matched_segment, 'tech professionals')}.

"""
        
        # Add proof point / hook
        if top_articles:
            top_article = top_articles[0]
            if ctx.sponsor.competitor_mentioned:
                email += f"""Last week, we sent an article about {ctx.sponsor.competitor_mentioned} to {ctx.segment_stats.get('subscribers', 45)} {ctx.sponsor.matched_segment}.

{top_article.clicks} people clicked it.

I think we should write about {ctx.sponsor.company_name} next.

"""
            else:
                email += f"""We just covered "{top_article.title}" and got {top_article.clicks} engaged clicks from {ctx.sponsor.matched_segment}.

Your product ({ctx.sponsor.company_name}) would be perfect for this audience.

"""
        
        # Add content examples
        if ctx.content_examples:
            email += f"""HERE'S WHAT WE'D CREATE:

📝 Two article options (you pick):

"""
            for i, example in enumerate(ctx.content_examples, 1):
                email += f"""{i}. "{example.headline}"
   → {example.angle.replace('_', ' ').title()} format
   → Expected: {example.expected_clicks_min}-{example.expected_clicks_max} engaged clicks
   → Inspired by our "{example.inspired_by_article}" ({example.inspired_by_clicks} clicks)

"""
        
        # Add value stack
        email += f"""📊 What you get:
• Curated technical article written by us (educational, not salesy)
• Sent ONLY to {ctx.sponsor.matched_segment} ({ctx.segment_stats.get('subscribers', 45)} decision-makers)
• Guaranteed {ctx.pricing.min_guaranteed_clicks}+ engaged clicks
• 24-hour performance report with full analytics
• Content rights - repurpose the article anywhere you want
• Social amplification (we'll share on Twitter + LinkedIn)

💰 Investment: {self.pricing_calculator.get_price_display(ctx.pricing.final_price)}

🎯 Guarantee: If we don't hit {ctx.pricing.min_guaranteed_clicks} clicks, we'll rerun it for free in the next edition.

"""
        
        # Add CTA
        email += f"""Interested? Just reply "yes" and I'll send you a calendar link to discuss the article angle.

Best,
Linus

P.S. Next available slot is {ctx.next_available_date}. We only do 1 featured article per segment per day, so it'll fill up fast."""

        return email
    
    def _get_next_available_date(self) -> str:
        """Get next available sponsorship date (skip weekends)"""
        date = datetime.now() + timedelta(days=3)
        
        # Skip weekends
        while date.weekday() >= 5:  # 5 = Saturday, 6 = Sunday
            date += timedelta(days=1)
        
        return date.strftime("%B %d")  # e.g., "February 16"
    
    def generate_follow_up_1(self, ctx: EmailContext) -> str:
        """Generate first follow-up (Day 3)"""
        first_name = ctx.sponsor.contact_name or "there"
        if " " in first_name:
            first_name = first_name.split()[0]
        
        example1 = ctx.content_examples[0] if ctx.content_examples else None
        
        return f"""Hey {first_name},

Following up on my email about featuring {ctx.sponsor.company_name} in Brief Delights.

The article ideas I sent were based on what our {ctx.sponsor.matched_segment} actually click on:
• "{example1.headline if example1 else 'Technical deep-dive'}" - inspired by our top performer ({example1.inspired_by_clicks if example1 else 25} clicks)

Still have the {ctx.next_available_date} slot open if you want it.

Let me know!
Linus"""
    
    def generate_follow_up_2(self, ctx: EmailContext) -> str:
        """Generate second follow-up (Day 5) - final ping"""
        first_name = ctx.sponsor.contact_name or "there"
        if " " in first_name:
            first_name = first_name.split()[0]
        
        price = self.pricing_calculator.get_price_display(ctx.pricing.final_price)
        
        return f"""{first_name},

Last ping on this. We're booking {ctx.next_available_date} for another sponsor unless I hear from you today.

Quick reminder of the offer:
• Featured article about {ctx.sponsor.company_name}
• {ctx.segment_stats.get('subscribers', 45)} {ctx.sponsor.matched_segment} who recently engaged with similar content
• {price}, guaranteed {ctx.pricing.min_guaranteed_clicks}+ clicks or free rerun

Reply "interested" to grab the slot.

Linus"""


# Example usage
if __name__ == "__main__":
    # Sample data
    sponsor = SponsorLead(
        company_name="Vercel",
        domain="vercel.com",
        industry="Frontend hosting platform",
        contact_name="Guillermo Rauch",
        contact_email="guillermo@vercel.com",
        matched_segment="builders",
        competitor_mentioned="AWS"
    )
    
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
            title="AWS vs Cloudflare: Edge Computing",
            url="https://techcrunch.com/aws-cloudflare",
            source_domain="techcrunch.com",
            clicks=18,
            click_rate=6.1,
            segment="builders",
            date="2026-02-11"
        )
    ]
    
    segment_stats = {
        "subscribers": 45,
        "click_rate": 7.5,
        "recent_clicks": 18
    }
    
    # Generate email
    generator = OutreachEmailGenerator()
    email = generator.generate_outreach_email(sponsor, top_articles, segment_stats)
    
    print("="*60)
    print("SUBJECT LINE A (Competitive):")
    print(email['subject_line_a'])
    print()
    print("SUBJECT LINE B (Data-driven):")
    print(email['subject_line_b'])
    print()
    print("="*60)
    print("EMAIL BODY:")
    print(email['body'])
    print()
    print("="*60)
    print(f"Pricing: {email['price_display']} ({email['pricing_tier']} tier)")
    print(f"Guaranteed clicks: {email['guaranteed_clicks']}+")
