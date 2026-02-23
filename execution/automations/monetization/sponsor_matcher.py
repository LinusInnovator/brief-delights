#!/usr/bin/env python3
"""
Sponsor Matcher Module - Hormozi $100M Offers Framework
Finds potential sponsors based on content performance and creates irresistible offers.
"""

import json
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict
from collections import Counter

# Add parent directories to path
sys.path.append(str(Path(__file__).parent.parent.parent))
try:
    from execution.automation_base import AutomationModule
except ImportError:
    # Fallback for standalone testing
    class AutomationModule:
        def __init__(self, name):
            self.name = name
        def log(self, msg):
            print(f"[{self.name}] {msg}")

class SponsorMatcher(AutomationModule):
    """Match sponsors to content performance using Hormozi framework"""
    
    def __init__(self):
        super().__init__("sponsor_matcher")
        self.min_clicks = 10  # Minimum clicks to consider article successful
        self.lookback_days = 7  # Analyze last 7 days of content
    
    def run(self) -> Dict:
        """Main execution flow"""
        try:
            self.log("🎯 Starting Sponsor Matcher")
            
            # 1. Analyze top-performing content
            top_articles = self._get_top_articles()
            self.log(f"Found {len(top_articles)} top-performing articles")
            
            # 2. Extract topics from successful content
            topics = self._extract_topics(top_articles)
            self.log(f"Extracted topics: {', '.join(topics.keys())}")
            
            # 3. Find potential sponsors (simulation for now)
            sponsors = self._find_sponsors(topics, top_articles)
            self.log(f"Matched {len(sponsors)} potential sponsors")
            
            # 4. Save to JSON (will integrate with Supabase later)
            self._save_sponsor_leads(sponsors)
            
            return {
                "status": "success",
                "sponsors_found": len(sponsors),
                "top_articles": len(top_articles),
                "topics": list(topics.keys())
            }
            
        except Exception as e:
            self.log(f"❌ Error: {str(e)}")
            return {"status": "error", "error": str(e)}
    
    def _get_top_articles(self) -> List[Dict]:
        """Get top-performing articles from recent newsletters"""
        # For now, simulate based on recent newsletter file structure
        # Later: Query Supabase article_clicks table
        
        # Simulated top articles based on our known content
        return [
            {
                "title": "Docker 27.0 Release Notes",
                "url": "https://docker.com/blog/docker-27",
                "source": "docker.com",
                "segment": "builders",
                "clicks": 18,
                "date": (datetime.now() - timedelta(days=2)).strftime("%Y-%m-%d")
            },
            {
                "title": "AI Agents Are Eating the World",
                "url": "https://techcrunch.com/ai-agents",
                "source": "techcrunch.com",
                "segment": "innovators",
                "clicks": 24,
                "date": (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
            },
            {
                "title": "Kubernetes Best Practices",
                "url": "https://kubernetes.io/best-practices",
                "source": "kubernetes.io",
                "segment": "builders",
                "clicks": 15,
                "date": (datetime.now() - timedelta(days=3)).strftime("%Y-%m-%d")
            },
            {
                "title": "Leadership in 2026",
                "url": "https://hbr.org/leadership-2026",
                "source": "hbr.org",
                "segment": "leaders",
                "clicks": 12,
                "date": datetime.now().strftime("%Y-%m-%d")
            }
        ]
    
    def _extract_topics(self, articles: List[Dict]) -> Dict[str, List[Dict]]:
        """Extract topics from article titles and sources"""
        topics = {}
        
        # Topic detection based on keywords in titles and sources
        topic_keywords = {
            "DevOps": ["docker", "kubernetes", "k8s", "devops", "ci/cd", "container", "infrastructure"],
            "AI/ML": ["ai", "ml", "gpt", "agent", "machine learning", "neural", "llm"],
            "Leadership": ["leadership", "management", "ceo", "executive", "team"],
            "Cloud": ["cloud", "aws", "azure", "vercel", "netlify", "hosting"],
            "Developer Tools": ["api", "framework", "library", "sdk", "tool", "code"]
        }
        
        for article in articles:
            title_lower = article["title"].lower()
            source_lower = article["source"].lower()
            
            for topic, keywords in topic_keywords.items():
                if any(kw in title_lower or kw in source_lower for kw in keywords):
                    if topic not in topics:
                        topics[topic] = []
                    topics[topic].append(article)
        
        return topics
    
    def _find_sponsors(self, topics: Dict[str, List[Dict]], all_articles: List[Dict]) -> List[Dict]:
        """Find potential sponsors based on topics - PRIORITIZE HUNGRY CHALLENGERS"""
        sponsors = []
        
        # Sponsor database - CHALLENGERS ONLY (Series A-C, fast-moving)
        # Avoid: Docker (public), AWS (too big), OpenAI (corporate)
        sponsor_database = {
            "DevOps": [
                {"name": "Vercel", "domain": "vercel.com", "description": "Frontend hosting", 
                 "stage": "series_b", "age": 6, "team": 100, "raised_m": 150},
                {"name": "Render", "domain": "render.com", "description": "Cloud platform",
                 "stage": "series_b", "age": 5, "team": 50, "raised_m": 85},
                {"name": "Railway", "domain": "railway.app", "description": "Infrastructure",
                 "stage": "series_a", "age": 3, "team": 25, "raised_m": 30},
                {"name": "Fly.io", "domain": "fly.io", "description": "Edge compute",
                 "stage": "series_a", "age": 4, "team": 30, "raised_m": 70}
            ],
            "AI/ML": [
                {"name": "Anthropic", "domain": "anthropic.com", "description": "AI safety",
                 "stage": "series_c", "age": 3, "team": 150, "raised_m": 1500},
                {"name": "Perplexity", "domain": "perplexity.ai", "description": "AI search",
                 "stage": "series_b", "age": 2, "team": 20, "raised_m": 73},
                {"name": "Together AI", "domain": "together.ai", "description": "AI platform",
                 "stage": "series_a", "age": 2, "team": 40, "raised_m": 100},
                {"name": "Modal", "domain": "modal.com", "description": "Serverless AI",
                 "stage": "series_a", "age": 3, "team": 15, "raised_m": 16},
                {"name": "Replicate", "domain": "replicate.com", "description": "ML deployment",
                 "stage": "series_b", "age": 4, "team": 25, "raised_m": 60}
            ],
            "Leadership": [
                {"name": "First Round Review", "domain": "review.firstround.com", "description": "Startup advice",
                 "stage": "series_a", "age": 5, "team": 30, "raised_m": 50},
                {"name": "Pavilion", "domain": "joinpavilion.com", "description": "Executive network",
                 "stage": "series_b", "age": 3, "team": 40, "raised_m": 35}
            ],
            "Cloud": [
                {"name": "Supabase", "domain": "supabase.com", "description": "Database platform",
                 "stage": "series_b", "age": 4, "team": 30, "raised_m": 116},
                {"name": "Convex", "domain": "convex.dev", "description": "Backend platform",
                 "stage": "series_a", "age": 2, "team": 20, "raised_m": 26},
                {"name": "Neon", "domain": "neon.tech", "description": "Serverless Postgres",
                 "stage": "series_b", "age": 2, "team": 35, "raised_m": 104},
                {"name": "Turso", "domain": "turso.tech", "description": "Edge database",
                 "stage": "series_a", "age": 2, "team": 8, "raised_m": 10},
                {"name": "PlanetScale", "domain": "planetscale.com", "description": "MySQL platform",
                 "stage": "series_b", "age": 4, "team": 50, "raised_m": 105}
            ],
            "Developer Tools": [
                {"name": "Clerk", "domain": "clerk.com", "description": "Auth for developers",
                 "stage": "series_b", "age": 3, "team": 35, "raised_m": 55},
                {"name": "Resend", "domain": "resend.com", "description": "Email API",
                 "stage": "series_a", "age": 2, "team": 12, "raised_m": 3},
                {"name": "Inngest", "domain": "inngest.com", "description": "Workflow engine",
                 "stage": "series_a", "age": 2, "team": 15, "raised_m": 6}
            ]
        }
        
        # Match sponsors to topics
        for topic, articles in topics.items():
            if topic in sponsor_database:
                for sponsor_info in sponsor_database[topic]:
                    # Find the most relevant article for this sponsor
                    best_article = max(articles, key=lambda x: x["clicks"])
                    
                    # Calculate eagerness score (how fast will they move?)
                    eagerness = self._calculate_eagerness_score(sponsor_info)
                    
                    # Calculate content match score
                    content_match = self._calculate_match_score(sponsor_info, best_article)
                    
                    # Final score (50% eagerness, 30% content, 20% budget)
                    final_score = (
                        eagerness * 0.5 +
                        content_match * 0.3 +
                        self._budget_fit_score(sponsor_info) * 0.2
                    )
                    
                    sponsors.append({
                        "company_name": sponsor_info["name"],
                        "domain": sponsor_info["domain"],
                        "industry": sponsor_info["description"],
                        "matched_topic": topic,
                        "matched_segment": best_article["segment"],
                        "match_score": int(final_score),
                        "eagerness_score": int(eagerness),
                        "content_match_score": int(content_match),
                        "funding_stage": sponsor_info["stage"],
                        "team_size": sponsor_info["team"],
                        "related_article_title": best_article["title"],
                        "related_article_url": best_article["url"],
                        "article_clicks": best_article["clicks"],
                        "dream_outcome": self._generate_dream_outcome(sponsor_info, best_article),
                        "offer_price": self._calculate_pricing(best_article, sponsor_info),
                        "offer_stack": self._build_value_stack(sponsor_info, best_article)
                    })
        
        # Sort by final score (challengers will naturally rank higher)
        sponsors.sort(key=lambda x: x["match_score"], reverse=True)
        
        return sponsors
    
    def _calculate_eagerness_score(self, sponsor: Dict) -> int:
        """Calculate how eager/fast this company will move (0-100)"""
        score = 0
        
        # Funding stage (0-40 points) - Series A is PERFECT
        stage_scores = {
            "series_a": 40,      # Sweet spot - just raised, eager
            "series_b": 35,      # Still hungry, bigger budgets
            "series_c": 30,      # Getting mature
            "seed": 20,          # Too small, limited budget
            "series_d": 15,      # Getting bureaucratic
            "public": 5          # Way too slow
        }
        score += stage_scores.get(sponsor.get("stage", "").lower(), 0)
        
        # Company age (0-25 points) - Younger = hungrier
        age = sponsor.get("age", 10)
        if age <= 2:
            score += 25
        elif age <= 5:
            score += 15
        elif age <= 10:
            score += 5
        
        # Team size (0-20 points) - Small teams move fast
        team = sponsor.get("team", 1000)
        if 10 <= team <= 50:
            score += 20   # Perfect - small, fast decisions
        elif 51 <= team <= 200:
            score += 10   # Medium, still agile
        elif team <= 500:
            score += 5    # Getting slow
        
        # Budget capacity (0-15 points) - Based on funding
        raised_m = sponsor.get("raised_m", 0)
        if raised_m >= 50:
            score += 15   # Can definitely afford $500-1200
        elif raised_m >= 10:
            score += 10
        elif raised_m >= 3:
            score += 5
        
        return min(score, 100)
    
    def _budget_fit_score(self, sponsor: Dict) -> int:
        """Can they afford our pricing? (0-100)"""
        raised_m = sponsor.get("raised_m", 0)
        
        if raised_m >= 50:
            return 100  # Easy yes
        elif raised_m >= 10:
            return 80   # Likely yes
        elif raised_m >= 3:
            return 60   # Maybe
        else:
            return 30   # Stretch
    
    def _calculate_match_score(self, sponsor: Dict, article: Dict) -> int:
        """Calculate 0-100 match score"""
        # Simple scoring for now
        base_score = 70
        
        # Bonus for high clicks
        if article["clicks"] > 20:
            base_score += 20
        elif article["clicks"] > 15:
            base_score += 10
        
        # Bonus for builders segment (technical audience)
        if article["segment"] == "builders":
            base_score += 10
        
        return min(base_score, 100)
    
    def _generate_dream_outcome(self, sponsor: Dict, article: Dict) -> str:
        """Generate Hormozi-style dream outcome"""
        clicks = article["clicks"]
        segment = article["segment"]
        topic = article["title"]
        
        return f"Get your product in front of {clicks}+ {segment} who recently clicked content about {topic}"
    
    def _calculate_pricing(self, article: Dict, sponsor: Dict = None) -> int:
        """Calculate pricing based on engagement (in cents)"""
        base_price = 50000  # $500
        
        # Premium pricing for high engagement
        if article["clicks"] > 20:
            return 120000  # $1,200
        elif article["clicks"] > 15:
            return 80000  # $800
        else:
            return base_price
    
    def _build_value_stack(self, sponsor: Dict, article: Dict) -> List[str]:
        """Build Hormozi-style value stack"""
        segment = article["segment"]
        
        return [
            f"Featured article about {sponsor['name']} written by us",
            f"Sent ONLY to {segment} segment (decision-makers in your space)",
            "Social amplification (Twitter + LinkedIn post)",
            "24-hour performance report with clicks and engagement",
            "Content rights - repurpose our article anywhere",
            "Click guarantee - if <10 clicks, we rerun it free in next edition"
        ]
    
    def _save_sponsor_leads(self, sponsors: List[Dict]):
        """Save sponsor leads to JSON file (temp, before Supabase integration)"""
        output_dir = Path(__file__).parent.parent.parent / ".tmp" / "sponsor_leads"
        output_dir.mkdir(parents=True, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y-%m-%d")
        output_file = output_dir / f"sponsor_leads_{timestamp}.json"
        
        with open(output_file, 'w') as f:
            json.dump({
                "generated_at": datetime.now().isoformat(),
                "total_leads": len(sponsors),
                "leads": sponsors
            }, f, indent=2)
        
        self.log(f"💾 Saved {len(sponsors)} sponsor leads to {output_file}")


if __name__ == "__main__":
    matcher = SponsorMatcher()
    result = matcher.run()
    print(json.dumps(result, indent=2))
