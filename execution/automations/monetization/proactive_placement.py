#!/usr/bin/env python3
"""
Proactive Placement - Competitive Insertion Marketing

Status: BUILT but NOT DEPLOYED (waiting for 500+ subscribers)
Activation: Set enabled=true in automation_flags.json when ready

How it works:
1. Before sending newsletter, check if any article mentions a competitor
2. If a sponsor monitors that competitor, offer them placement
3. Inject their competitive message right after the competitor article
4. Track performance and bill accordingly

Example:
  Newsletter mentions "AWS announces new S3 feature"
  → Railway monitors "aws.amazon.com"
  → Inject: "While AWS moves slow, Railway ships fast. Try it →"
"""

import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional
from urllib.parse import urlparse
import re

# Add parent directories to path
sys.path.append(str(Path(__file__).parent.parent.parent))
try:
    from execution.automation_base import AutomationModule
except ImportError:
    class AutomationModule:
        def __init__(self, name):
            self.name = name
        def log(self, msg):
            print(f"[{self.name}] {msg}")


class ProactivePlacement(AutomationModule):
    """
    Check for competitive placement opportunities before sending newsletter.
    Inject sponsor responses next to competitor mentions.
    """
    
    def __init__(self):
        super().__init__("proactive_placement")
        self.dry_run = True  # ALWAYS dry run until ready to deploy
        self.enabled = False  # DISABLED by default
    
    def run(self, newsletter_html: str, articles: List[Dict]) -> Dict:
        """
        Main execution: Check for opportunities and inject placements
        
        Args:
            newsletter_html: The complete newsletter HTML
            articles: List of article dicts with url, title, etc.
        
        Returns:
            {
                "newsletter_html": modified HTML (or unchanged if dry_run),
                "opportunities_found": count,
                "placements_injected": count,
                "dry_run": boolean
            }
        """
        if not self.enabled:
            self.log("⏸️ Proactive Placement is DISABLED (waiting for subscriber base)")
            return {
                "status": "disabled",
                "newsletter_html": newsletter_html,
                "opportunities_found": 0,
                "placements_injected": 0
            }
        
        try:
            self.log("🎯 Checking for proactive placement opportunities...")
            
            # 1. Get active sponsors
            sponsors = self._get_active_sponsors()
            self.log(f"Found {len(sponsors)} active proactive sponsors")
            
            if not sponsors:
                return {
                    "status": "success",
                    "newsletter_html": newsletter_html,
                    "opportunities_found": 0,
                    "placements_injected": 0
                }
            
            # 2. Find opportunities (articles mentioning monitored competitors)
            opportunities = self._find_opportunities(articles, sponsors)
            self.log(f"Found {len(opportunities)} competitive placement opportunities")
            
            if not opportunities:
                return {
                    "status": "success",
                    "newsletter_html": newsletter_html,
                    "opportunities_found": 0,
                    "placements_injected": 0
                }
            
            # 3. Inject placements (or log in dry_run mode)
            modified_html, injected_count = self._inject_placements(
                newsletter_html, 
                opportunities
            )
            
            return {
                "status": "success",
                "newsletter_html": modified_html,
                "opportunities_found": len(opportunities),
                "placements_injected": injected_count,
                "dry_run": self.dry_run
            }
            
        except Exception as e:
            self.log(f"❌ Error: {str(e)}")
            return {
                "status": "error",
                "error": str(e),
                "newsletter_html": newsletter_html
            }
    
    def _get_active_sponsors(self) -> List[Dict]:
        """
        Get active sponsors with proactive_placement tier.
        
        In production: Query Supabase
        For now: Return mock data for testing
        """
        # TODO: Replace with Supabase query when ready
        # from supabase import create_client
        # supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))
        # sponsors = supabase.table('active_sponsors')\
        #     .select('*')\
        #     .eq('tier', 'proactive_placement')\
        #     .eq('status', 'active')\
        #     .execute()
        # return sponsors.data
        
        # Mock data for development
        return [
            {
                'id': 'sponsor_1',
                'company_name': 'Railway',
                'domain': 'railway.app',
                'monitored_competitors': ['aws.amazon.com', 'heroku.com', 'docker.com'],
                'auto_inject': True,
                'competitive_messages': {
                    'aws.amazon.com': {
                        'message': 'While AWS moves slow, Railway already shipped this 6 months ago. One command to deploy.',
                        'cta': 'Try Railway free',
                        'landing_url': 'https://railway.app/builders'
                    },
                    'docker.com': {
                        'message': 'Docker requires complex config. Railway deploys in one click.',
                        'cta': 'See how easy',
                        'landing_url': 'https://railway.app/vs-docker'
                    }
                },
                'placements_used_this_month': 1,
                'placements_included': 4
            }
        ]
    
    def _find_opportunities(self, articles: List[Dict], sponsors: List[Dict]) -> List[Dict]:
        """
        Check if any article mentions a competitor monitored by a sponsor.
        """
        opportunities = []
        
        for article in articles:
            # Extract domain from article URL
            try:
                parsed = urlparse(article['url'])
                domain = parsed.netloc.lower().replace('www.', '')
            except:
                continue
            
            # Check if any sponsor monitors this domain
            for sponsor in sponsors:
                if domain in sponsor['monitored_competitors']:
                    # Check if sponsor has placements remaining
                    if sponsor['placements_used_this_month'] >= sponsor['placements_included']:
                        self.log(f"  ⚠️ {sponsor['company_name']} hit placement limit")
                        continue
                    
                    # Check if sponsor has pre-written message for this competitor
                    if domain not in sponsor['competitive_messages']:
                        self.log(f"  ⚠️ {sponsor['company_name']} monitors {domain} but has no message")
                        continue
                    
                    opportunities.append({
                        'sponsor': sponsor,
                        'article': article,
                        'competitor_domain': domain,
                        'competitor_name': self._domain_to_company_name(domain),
                        'message': sponsor['competitive_messages'][domain],
                        'auto_inject': sponsor['auto_inject']
                    })
                    
                    self.log(f"  🎯 Opportunity: {sponsor['company_name']} vs {domain}")
        
        return opportunities
    
    def _inject_placements(self, newsletter_html: str, opportunities: List[Dict]) -> tuple:
        """
        Inject competitive sponsor messages into newsletter HTML.
        
        Returns:
            (modified_html, injected_count)
        """
        if self.dry_run:
            self.log(f"[DRY RUN] Would inject {len(opportunities)} placements:")
            for opp in opportunities:
                self.log(f"  → {opp['sponsor']['company_name']} after {opp['article']['title'][:50]}...")
            return (newsletter_html, 0)
        
        # ACTUAL INJECTION (disabled until ready)
        self.log("⚠️ LIVE INJECTION MODE (not yet implemented in production)")
        
        modified_html = newsletter_html
        injected_count = 0
        
        for opp in opportunities:
            # Create competitive sponsor callout
            placement_html = self._create_placement_html(opp)
            
            # Find article section in HTML and inject after it
            # This is simplified - in production, need robust HTML parsing
            article_marker = f'href="{opp["article"]["url"]}"'
            
            if article_marker in modified_html:
                # Find end of article section (next <div> or end of section)
                insert_pos = modified_html.find('</div>', modified_html.find(article_marker))
                
                if insert_pos != -1:
                    modified_html = (
                        modified_html[:insert_pos + 6] +
                        placement_html +
                        modified_html[insert_pos + 6:]
                    )
                    injected_count += 1
                    self.log(f"  ✅ Injected {opp['sponsor']['company_name']} placement")
                    
                    # Log to database (when Supabase integrated)
                    self._log_placement(opp)
        
        return (modified_html, injected_count)
    
    def _create_placement_html(self, opportunity: Dict) -> str:
        """
        Generate HTML for competitive sponsor placement.
        """
        msg = opportunity['message']
        
        return f"""
        <div style="
            margin: 24px 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 8px;
            border-left: 4px solid #FFD700;
        ">
            <div style="
                font-size: 11px;
                font-weight: 700;
                letter-spacing: 1px;
                color: #FFD700;
                margin-bottom: 12px;
            ">
                💡 SPONSORED RESPONSE
            </div>
            
            <div style="
                font-size: 15px;
                line-height: 1.6;
                color: #FFFFFF;
                margin-bottom: 16px;
            ">
                {msg['message']}
            </div>
            
            <a href="{msg['landing_url']}" style="
                display: inline-block;
                padding: 10px 20px;
                background: #FFFFFF;
                color: #667eea;
                text-decoration: none;
                border-radius: 6px;
                font-weight: 600;
                font-size: 14px;
            ">
                {msg['cta']} →
            </a>
        </div>
        """
    
    def _log_placement(self, opportunity: Dict):
        """
        Log placement to competitive_placements table (when Supabase integrated)
        """
        # TODO: Implement Supabase logging
        self.log(f"  📊 Logged placement for {opportunity['sponsor']['company_name']}")
    
    def _domain_to_company_name(self, domain: str) -> str:
        """Convert domain to company name"""
        name = domain.split('.')[0]
        special_cases = {
            'aws': 'AWS',
            'github': 'GitHub',
            'docker': 'Docker',
            'openai': 'OpenAI',
        }
        return special_cases.get(name.lower(), name.capitalize())


# CLI Testing
if __name__ == "__main__":
    placement = ProactivePlacement()
    
    # Mock newsletter and articles
    mock_html = """
    <html>
    <body>
        <h1>Today's Newsletter</h1>
        <div class="article">
            <h2>AWS announces new S3 feature</h2>
            <p><a href="https://aws.amazon.com/blog/s3-update">Read more</a></p>
        </div>
    </body>
    </html>
    """
    
    mock_articles = [
        {
            'title': 'AWS announces new S3 feature',
            'url': 'https://aws.amazon.com/blog/s3-update',
            'segment': 'builders'
        }
    ]
    
    result = placement.run(mock_html, mock_articles)
    print(json.dumps(result, indent=2))
