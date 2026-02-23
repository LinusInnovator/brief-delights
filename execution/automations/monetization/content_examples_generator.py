#!/usr/bin/env python3
"""
Content Examples Generator
Uses real performance data + LLM to generate compelling article ideas for sponsors.
"""

import json
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict, Optional
from dataclasses import dataclass

# Add parent directories to path
sys.path.append(str(Path(__file__).parent.parent.parent))


@dataclass
class ArticlePerformance:
    """Performance data for a past article"""
    title: str
    url: str
    source_domain: str
    clicks: int
    click_rate: float
    segment: str
    date: str


@dataclass
class ContentExample:
    """Generated content example for sponsor"""
    headline: str
    angle: str  # "technical", "comparison", "case_study", "tutorial"
    expected_clicks_min: int
    expected_clicks_max: int
    talking_points: List[str]
    inspired_by_article: str
    inspired_by_clicks: int


class ContentExamplesGenerator:
    """Generate article ideas based on real performance data"""
    
    def __init__(self, openrouter_api_key: Optional[str] = None):
        self.api_key = openrouter_api_key or os.getenv("OPENROUTER_API_KEY")
    
    def generate_examples(
        self,
        sponsor_name: str,
        sponsor_domain: str,
        sponsor_description: str,
        segment: str,
        top_articles: List[ArticlePerformance]
    ) -> List[ContentExample]:
        """Generate 2 content examples for sponsor"""
        
        # Use LLM to generate ideas
        examples = self._generate_with_llm(
            sponsor_name, sponsor_domain, sponsor_description, segment, top_articles
        )
        
        # Fallback to template-based if LLM fails
        if not examples:
            examples = self._generate_template_based(
                sponsor_name, segment, top_articles
            )
        
        return examples[:2]  # Return top 2
    
    def _generate_with_llm(
        self,
        sponsor_name: str,
        sponsor_domain: str,
        sponsor_description: str,
        segment: str,
        top_articles: List[ArticlePerformance]
    ) -> List[ContentExample]:
        """Generate examples using LLM"""
        
        if not self.api_key:
            return []
        
        # Build context from top articles
        articles_context = "\n".join([
            f"• \"{article.title}\" ({article.clicks} clicks, {article.click_rate}% CTR, {article.source_domain})"
            for article in top_articles[:5]
        ])
        
        # Segment description
        segment_descriptions = {
            "builders": "hands-on developers and engineers who love technical deep-dives",
            "leaders": "CTOs and engineering managers focused on strategy and team growth",
            "innovators": "product builders and founders exploring cutting-edge tech"
        }
        
        prompt = f"""You are a technical newsletter editor for Brief Delights.

Target audience: {segment.title()}s - {segment_descriptions.get(segment, '')}

Sponsor to feature: {sponsor_name} ({sponsor_description})
Website: {sponsor_domain}

Our top-performing articles in the last 30 days:
{articles_context}

Generate 2 article headline ideas that would:
1. Showcase {sponsor_name}'s key differentiator or unique value
2. Match our audience's proven interests (based on the top articles above)
3. Be educational/helpful, not salesy
4. Follow a similar format/angle to our top performers

For each headline, provide:
- The headline (punchy, specific, technical)
- Article angle (technical_deepdive, comparison, case_study, or tutorial)
- Expected engagement (estimated clicks based on similar past articles)
- 3-4 key talking points

Format as JSON:
[
  {{
    "headline": "...",
    "angle": "technical_deepdive",
    "expected_clicks_min": 15,
    "expected_clicks_max": 25,
    "talking_points": ["...", "...", "..."],
    "inspired_by": "title of similar article from list above"
  }}
]"""

        try:
            import requests
            
            response = requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "anthropic/claude-3.5-sonnet",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.8,
                    "max_tokens": 1500
                },
                timeout=30
            )
            
            if response.status_code == 200:
                content = response.json()["choices"][0]["message"]["content"]
                
                # Extract JSON from response
                import re
                json_match = re.search(r'\[.*\]', content, re.DOTALL)
                if json_match:
                    ideas = json.loads(json_match.group(0))
                    
                    # Convert to ContentExample objects
                    examples = []
                    for idea in ideas:
                        # Find the article it was inspired by
                        inspired_article = next(
                            (a for a in top_articles if a.title.lower() in idea['inspired_by'].lower()),
                            top_articles[0]
                        )
                        
                        examples.append(ContentExample(
                            headline=idea['headline'],
                            angle=idea['angle'],
                            expected_clicks_min=idea['expected_clicks_min'],
                            expected_clicks_max=idea['expected_clicks_max'],
                            talking_points=idea['talking_points'],
                            inspired_by_article=inspired_article.title,
                            inspired_by_clicks=inspired_article.clicks
                        ))
                    
                    return examples
        
        except Exception as e:
            print(f"LLM generation failed: {e}")
            return []
        
        return []
    
    def _generate_template_based(
        self,
        sponsor_name: str,
        segment: str,
        top_articles: List[ArticlePerformance]
    ) -> List[ContentExample]:
        """Fallback: Generate examples using templates"""
        
        # Get top article for inspiration
        top_article = top_articles[0] if top_articles else None
        
        if not top_article:
            return []
        
        # Template-based examples
        examples = []
        
        # Example 1: Technical deep-dive
        examples.append(ContentExample(
            headline=f"How {sponsor_name} Solves [Technical Problem]",
            angle="technical_deepdive",
            expected_clicks_min=max(10, int(top_article.clicks * 0.7)),
            expected_clicks_max=max(15, int(top_article.clicks * 1.2)),
            talking_points=[
                f"{sponsor_name}'s technical approach",
                "Benchmarks and performance data",
                "How it compares to traditional solutions",
                "Real-world implementation example"
            ],
            inspired_by_article=top_article.title,
            inspired_by_clicks=top_article.clicks
        ))
        
        # Example 2: Comparison/competitive
        if len(top_articles) > 1:
            second_article = top_articles[1]
            examples.append(ContentExample(
                headline=f"{sponsor_name} vs [Alternative]: A Data-Driven Comparison",
                angle="comparison",
                expected_clicks_min=max(8, int(second_article.clicks * 0.6)),
                expected_clicks_max=max(12, int(second_article.clicks * 1.0)),
                talking_points=[
                    "Head-to-head feature comparison",
                    "Performance benchmarks",
                    "Use case fit analysis",
                    "Migration path from alternative"
                ],
                inspired_by_article=second_article.title,
                inspired_by_clicks=second_article.clicks
            ))
        
        return examples


def get_sample_performance_data() -> List[ArticlePerformance]:
    """Get sample performance data (replace with Supabase query)"""
    return [
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
            title="Kubernetes Best Practices for Production",
            url="https://kubernetes.io/best-practices",
            source_domain="kubernetes.io",
            clicks=18,
            click_rate=6.1,
            segment="builders",
            date="2026-02-11"
        ),
        ArticlePerformance(
            title="AWS vs Cloudflare: Edge Computing Showdown",
            url="https://techcrunch.com/aws-cloudflare",
            source_domain="techcrunch.com",
            clicks=22,
            click_rate=7.8,
            segment="builders",
            date="2026-02-09"
        )
    ]


# Example usage
if __name__ == "__main__":
    generator = ContentExamplesGenerator()
    
    # Example: Generate for Vercel
    top_articles = get_sample_performance_data()
    
    examples = generator.generate_examples(
        sponsor_name="Vercel",
        sponsor_domain="vercel.com",
        sponsor_description="Frontend hosting and deployment platform",
        segment="builders",
        top_articles=top_articles
    )
    
    print("Generated Content Examples for Vercel:\n")
    for i, example in enumerate(examples, 1):
        print(f"Example {i}: \"{example.headline}\"")
        print(f"Angle: {example.angle}")
        print(f"Expected clicks: {example.expected_clicks_min}-{example.expected_clicks_max}")
        print(f"Inspired by: \"{example.inspired_by_article}\" ({example.inspired_by_clicks} clicks)")
        print(f"Talking points:")
        for point in example.talking_points:
            print(f"  • {point}")
        print()
