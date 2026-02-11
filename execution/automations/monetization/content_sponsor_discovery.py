#!/usr/bin/env python3
"""
Content-Driven Sponsor Discovery
Automatically discovers potential sponsors from newsletter content.

How it works:
1. Parse today's newsletter HTML
2. Extract all article sources and company mentions
3. Parse company names from URLs/text
4. Enrich with company data (simulated Crunchbase-style)
5. Score against eagerness formula
6. Add high-scoring companies to sponsor_leads
"""

import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Set
from urllib.parse import urlparse

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


class ContentSponsorDiscovery(AutomationModule):
    """Discover sponsors from newsletter content"""
    
    def __init__(self):
        super().__init__("content_sponsor_discovery")
        self.min_eagerness_score = 70  # Only add sponsors scoring 70+
        self.known_domains = set()  # Track already-discovered domains
    
    def run(self) -> Dict:
        """Main execution flow"""
        try:
            self.log("🔍 Starting Content-Driven Sponsor Discovery")
            
            # 1. Find today's newsletters
            newsletters = self._find_recent_newsletters()
            self.log(f"Found {len(newsletters)} recent newsletters")
            
            if not newsletters:
                self.log("⚠️ No newsletters found, skipping")
                return {"status": "skipped", "reason": "no_newsletters"}
            
            # 2. Extract all companies from newsletters
            companies = self._extract_companies_from_newsletters(newsletters)
            self.log(f"Extracted {len(companies)} company mentions")
            
            # 3. Enrich companies with funding/team data
            enriched = self._enrich_companies(companies)
            self.log(f"Enriched {len(enriched)} companies")
            
            # 4. Score companies against eagerness algorithm
            scored = self._score_companies(enriched)
            
            # 5. Filter high-scoring companies
            qualified = [c for c in scored if c['eagerness_score'] >= self.min_eagerness_score]
            self.log(f"Found {len(qualified)} qualified sponsors (score >= {self.min_eagerness_score})")
            
            # 6. Save to sponsor leads
            self._save_sponsor_leads(qualified)
            
            return {
                "status": "success",
                "newsletters_analyzed": len(newsletters),
                "companies_found": len(companies),
                "companies_enriched": len(enriched),
                "qualified_sponsors": len(qualified),
                "top_sponsor": qualified[0]['name'] if qualified else None
            }
            
        except Exception as e:
            self.log(f"❌ Error: {str(e)}")
            return {"status": "error", "error": str(e)}
    
    def _find_recent_newsletters(self) -> List[Path]:
        """Find recently sent newsletters"""
        # Look in execution/.tmp/final_newsletters/
        newsletters_dir = Path(__file__).parent.parent.parent / ".tmp" / "final_newsletters"
        
        if not newsletters_dir.exists():
            return []
        
        # Get all HTML files from last 3 days
        newsletters = []
        for html_file in newsletters_dir.glob("*.html"):
            # Check if file is recent (modified in last 3 days)
            mtime = datetime.fromtimestamp(html_file.stat().st_mtime)
            days_old = (datetime.now() - mtime).days
            
            if days_old <= 3:
                newsletters.append(html_file)
        
        return sorted(newsletters, key=lambda x: x.stat().st_mtime, reverse=True)[:10]
    
    def _extract_companies_from_newsletters(self, newsletters: List[Path]) -> Set[Dict]:
        """Extract company mentions from newsletter HTML"""
        companies = {}  # Use dict to deduplicate by domain
        
        for newsletter_path in newsletters:
            with open(newsletter_path, 'r', encoding='utf-8') as f:
                html = f.read()
            
            # Extract all URLs from href attributes
            url_pattern = r'href="([^"]+)"'
            urls = re.findall(url_pattern, html)
            
            for url in urls:
                # Skip tracking URLs, email links, etc.
                if any(skip in url for skip in ['mailto:', 'twitter.com', 'linkedin.com', 
                                                   'facebook.com', 'instagram.com',
                                                   'brief.delights.pro', '/api/track']):
                    continue
                
                # Parse domain
                try:
                    parsed = urlparse(url)
                    domain = parsed.netloc.lower()
                    
                    # Clean domain (remove www)
                    domain = domain.replace('www.', '')
                    
                    if domain and domain not in companies and domain not in self.known_domains:
                        # Extract company name from domain
                        company_name = self._domain_to_company_name(domain)
                        
                        companies[domain] = {
                            'name': company_name,
                            'domain': domain,
                            'discovered_from': newsletter_path.name,
                            'discovered_at': datetime.now().isoformat()
                        }
                except Exception as e:
                    continue
        
        return list(companies.values())
    
    def _domain_to_company_name(self, domain: str) -> str:
        """Convert domain to company name"""
        # Remove TLD
        name = domain.split('.')[0]
        
        # Capitalize
        name = name.capitalize()
        
        # Special cases
        special_cases = {
            'techcrunch': 'TechCrunch',
            'vercel': 'Vercel',
            'github': 'GitHub',
            'gitlab': 'GitLab',
            'openai': 'OpenAI',
            'anthropic': 'Anthropic',
            'supabase': 'Supabase',
            'netlify': 'Netlify',
            'kubernetes': 'Kubernetes',
            'docker': 'Docker'
        }
        
        return special_cases.get(name.lower(), name)
    
    def _enrich_companies(self, companies: List[Dict]) -> List[Dict]:
        """Enrich companies with funding/team data"""
        # In production: Call Crunchbase API, LinkedIn API, etc.
        # For now: Use simulated data based on known companies
        
        company_database = {
            # DevOps/Cloud
            'vercel.com': {'stage': 'series_b', 'age': 6, 'team': 100, 'raised_m': 150},
            'render.com': {'stage': 'series_b', 'age': 5, 'team': 50, 'raised_m': 85},
            'railway.app': {'stage': 'series_a', 'age': 3, 'team': 25, 'raised_m': 30},
            'fly.io': {'stage': 'series_a', 'age': 4, 'team': 30, 'raised_m': 70},
            'netlify.com': {'stage': 'series_c', 'age': 8, 'team': 200, 'raised_m': 212},
            
            # AI/ML
            'anthropic.com': {'stage': 'series_c', 'age': 3, 'team': 150, 'raised_m': 1500},
            'perplexity.ai': {'stage': 'series_b', 'age': 2, 'team': 20, 'raised_m': 73},
            'together.ai': {'stage': 'series_a', 'age': 2, 'team': 40, 'raised_m': 100},
            'modal.com': {'stage': 'series_a', 'age': 3, 'team': 15, 'raised_m': 16},
            'replicate.com': {'stage': 'series_b', 'age': 4, 'team': 25, 'raised_m': 60},
            
            # Database/Backend
            'supabase.com': {'stage': 'series_b', 'age': 4, 'team': 30, 'raised_m': 116},
            'convex.dev': {'stage': 'series_a', 'age': 2, 'team': 20, 'raised_m': 26},
            'neon.tech': {'stage': 'series_b', 'age': 2, 'team': 35, 'raised_m': 104},
            'turso.tech': {'stage': 'series_a', 'age': 2, 'team': 8, 'raised_m': 10},
            'planetscale.com': {'stage': 'series_b', 'age': 4, 'team': 50, 'raised_m': 105},
            
            # Developer Tools
            'clerk.com': {'stage': 'series_b', 'age': 3, 'team': 35, 'raised_m': 55},
            'resend.com': {'stage': 'series_a', 'age': 2, 'team': 12, 'raised_m': 3},
            'inngest.com': {'stage': 'series_a', 'age': 2, 'team': 15, 'raised_m': 6},
            
            # Too big/slow (skip these)
            'docker.com': {'stage': 'public', 'age': 12, 'team': 1000, 'raised_m': 500},
            'github.com': {'stage': 'acquired', 'age': 16, 'team': 3000, 'raised_m': 0},
            'aws.amazon.com': {'stage': 'public', 'age': 20, 'team': 50000, 'raised_m': 0},
        }
        
        enriched = []
        for company in companies:
            domain = company['domain']
            
            # Check if we have data
            if domain in company_database:
                company.update(company_database[domain])
                enriched.append(company)
            else:
                # Unknown company - use conservative defaults
                company.update({
                    'stage': 'unknown',
                    'age': 5,
                    'team': 50,
                    'raised_m': 10
                })
                enriched.append(company)
        
        return enriched
    
    def _score_companies(self, companies: List[Dict]) -> List[Dict]:
        """Score companies using eagerness algorithm"""
        for company in companies:
            company['eagerness_score'] = self._calculate_eagerness_score(company)
        
        # Sort by score (highest first)
        return sorted(companies, key=lambda x: x['eagerness_score'], reverse=True)
    
    def _calculate_eagerness_score(self, company: Dict) -> int:
        """Calculate eagerness score (0-100)"""
        score = 0
        
        # Funding stage (0-40 points)
        stage_scores = {
            'series_a': 40,
            'series_b': 35,
            'series_c': 30,
            'seed': 20,
            'series_d': 15,
            'public': 5,
            'acquired': 5,
            'unknown': 25  # Give unknowns a chance
        }
        score += stage_scores.get(company.get('stage', 'unknown'), 0)
        
        # Company age (0-25 points)
        age = company.get('age', 10)
        if age <= 2:
            score += 25
        elif age <= 5:
            score += 15
        elif age <= 10:
            score += 5
        
        # Team size (0-20 points)
        team = company.get('team', 1000)
        if 10 <= team <= 50:
            score += 20
        elif 51 <= team <= 200:
            score += 10
        elif team <= 500:
            score += 5
        
        # Budget capacity (0-15 points)
        raised_m = company.get('raised_m', 0)
        if raised_m >= 50:
            score += 15
        elif raised_m >= 10:
            score += 10
        elif raised_m >= 3:
            score += 5
        
        return min(score, 100)
    
    def _save_sponsor_leads(self, sponsors: List[Dict]):
        """Save discovered sponsors to JSON"""
        if not sponsors:
            self.log("No qualified sponsors to save")
            return
        
        # Save to .tmp/sponsor_leads/
        output_dir = Path(__file__).parent.parent.parent / ".tmp" / "sponsor_leads"
        output_dir.mkdir(parents=True, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y-%m-%d_%H%M%S")
        output_file = output_dir / f"content_discovered_{timestamp}.json"
        
        with open(output_file, 'w') as f:
            json.dump({
                "discovered_at": datetime.now().isoformat(),
                "discovery_method": "content_analysis",
                "total_sponsors": len(sponsors),
                "sponsors": sponsors
            }, f, indent=2)
        
        self.log(f"💾 Saved {len(sponsors)} sponsors to {output_file}")
        
        # Log top 3
        for i, sponsor in enumerate(sponsors[:3], 1):
            self.log(f"  {i}. {sponsor['name']} ({sponsor['domain']}) - Score: {sponsor['eagerness_score']}")


if __name__ == "__main__":
    discovery = ContentSponsorDiscovery()
    result = discovery.run()
    print(json.dumps(result, indent=2))
