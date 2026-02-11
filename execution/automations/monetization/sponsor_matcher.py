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
        """Find potential sponsors based on topics"""
        sponsors = []
        
        # Sponsor database (will be replaced with real scraping/API)
        sponsor_database = {
            "DevOps": [
                {"name": "Vercel", "domain": "vercel.com", "description": "Frontend hosting platform"},
                {"name": "Render", "domain": "render.com", "description": "Cloud platform"},
                {"name": "Docker", "domain": "docker.com", "description": "Container platform"},
                {"name": "Supabase", "domain": "supabase.com", "description": "Open source Firebase alternative"}
            ],
            "AI/ML": [
                {"name": "OpenAI", "domain": "openai.com", "description": "AI research company"},
                {"name": "Anthropic", "domain": "anthropic.com", "description": "AI safety company"},
                {"name": "Hugging Face", "domain": "huggingface.co", "description": "ML model hub"}
            ],
            "Leadership": [
                {"name": "Harvard Business Review", "domain": "hbr.org", "description": "Business insights"},
                {"name": "First Round Review", "domain": "review.firstround.com", "description": "Startup advice"}
            ],
            "Cloud": [
                {"name": "AWS", "domain": "aws.amazon.com", "description": "Cloud computing"},
                {"name": "Netlify", "domain": "netlify.com", "description": "Web hosting"}
            ]
        }
        
        # Match sponsors to topics
        for topic, articles in topics.items():
            if topic in sponsor_database:
                for sponsor_info in sponsor_database[topic]:
                    # Find the most relevant article for this sponsor
                    best_article = max(articles, key=lambda x: x["clicks"])
                    
                    sponsors.append({
                        "company_name": sponsor_info["name"],
                        "domain": sponsor_info["domain"],
                        "industry": sponsor_info["description"],
                        "matched_topic": topic,
                        "matched_segment": best_article["segment"],
                        "match_score": self._calculate_match_score(sponsor_info, best_article),
                        "related_article_title": best_article["title"],
                        "related_article_url": best_article["url"],
                        "article_clicks": best_article["clicks"],
                        "dream_outcome": self._generate_dream_outcome(sponsor_info, best_article),
                        "offer_price": self._calculate_pricing(best_article),
                        "offer_stack": self._build_value_stack(sponsor_info, best_article)
                    })
        
        # Sort by match score
        sponsors.sort(key=lambda x: x["match_score"], reverse=True)
        
        return sponsors
    
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
    
    def _calculate_pricing(self, article: Dict) -> int:
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
