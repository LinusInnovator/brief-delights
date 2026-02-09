#!/usr/bin/env python3
"""
Trend Synthesis
Uses ONE LLM call per segment to generate human-readable trend narratives
Cost: ~$0.03 per segment
"""

import json
import sys
import os
from pathlib import Path
from datetime import datetime
from typing import Dict, List
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize OpenAI client (via OpenRouter)
client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENROUTER_API_KEY")
)

MODEL = "anthropic/claude-3.5-sonnet"


def create_trend_synthesis_prompt(trend_analysis: Dict, segment: str) -> str:
    """
    Create prompt for trend synthesis
    
    Args:
        trend_analysis: Output from detect_trends.py
        segment: Segment name (builders, leaders, innovators)
    
    Returns:
        LLM prompt string
    """
    trends = trend_analysis.get('trends', [])
    total = trend_analysis.get('total_articles', 0)
    
    # Format trends for prompt
    trends_text = ""
    for trend in trends[:5]:  # Top 5 trends
        trends_text += f"- {trend['theme_label']}: {trend['count']}/{total} articles ({trend['percentage']}%)\n"
    
    prompt = f"""You're analyzing emerging trends in today's tech newsletter for {segment}.

DETECTED THEMES:
{trends_text}

Generate 1-2 concise trend observations in this format:
- Start with "We're seeing..."
- Be specific about what's emerging (not generic)
- Connect to broader industry shifts when relevant

QUALITY EXAMPLES:
✅ "We're seeing a shift from model training to agent orchestration, with 5/14 articles focusing on multi-agent platforms"
✅ "Enterprise AI is moving from experimentation to production deployment, addressing authentication and compliance barriers"

❌ AVOID:
- "AI is advancing rapidly"
- "Lots of innovation happening"
- Generic observations

Output format: 1-2 sentences maximum, separated by newlines if multiple observations.
"""
    
    return prompt


def synthesize_trend_narrative(trend_analysis: Dict, segment: str) -> str:
    """
    Call LLM to synthesize trend narrative
    
    Args:
        trend_analysis: Output from detect_trends.py
        segment: Segment name
    
    Returns:
        Human-readable trend narrative
    """
    if not trend_analysis.get('trends'):
        return ""  # No trends to synthesize
    
    prompt = create_trend_synthesis_prompt(trend_analysis, segment)
    
    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "user", "content": prompt}
            ],
            max_tokens=150,
            temperature=0.7
        )
        
        narrative = response.choices[0].message.content.strip()
        return narrative
        
    except Exception as e:
        print(f"⚠️ Warning: Trend synthesis failed: {e}")
        return ""  # Graceful fallback


def main():
    """Synthesize trend narratives"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Synthesize trend narratives using LLM')
    parser.add_argument('--segment', required=True, choices=['builders', 'leaders', 'innovators'])
    parser.add_argument('--date', default=datetime.now().strftime('%Y-%m-%d'))
    args = parser.parse_args()
    
    # Load trend analysis
    base_dir = Path(__file__).parent.parent
    trends_file = base_dir / '.tmp' / f'trends_{args.segment}_{args.date}.json'
    
    if not trends_file.exists():
        print(f"❌ Error: {trends_file} not found")
        print(f"   Run detect_trends.py first")
        sys.exit(1)
    
    print(f"🤖 Synthesizing trend narrative for {args.segment}")
    print(f"   Input: {trends_file}\n")
    
    with open(trends_file) as f:
        trend_analysis = json.load(f)
    
    # Synthesize narrative
    print("🔄 Calling LLM for trend synthesis...")
    narrative = synthesize_trend_narrative(trend_analysis, args.segment)
    
    if narrative:
        print("\n" + "=" * 60)
        print("TREND NARRATIVE:")
        print("=" * 60)
        print(narrative)
        print("=" * 60)
        
        # Update trend analysis with narrative
        trend_analysis['narrative'] = narrative
        
        # Save updated results
        with open(trends_file, 'w') as f:
            json.dump(trend_analysis, f, indent=2)
        
        print(f"\n✅ Saved trend narrative to {trends_file}")
    else:
        print("\n⚠️ No trends detected or synthesis failed")


if __name__ == '__main__':
    main()
