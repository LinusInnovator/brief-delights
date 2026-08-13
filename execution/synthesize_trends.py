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
    api_key=os.getenv("OPENROUTER_API_KEY"),
    default_headers={
        "HTTP-Referer": "https://brief.delights.pro",
        "X-Title": "The Brief",
    }
)

MODEL = os.getenv("PRIMARY_LLM_MODEL", "google/gemini-2.5-flash")


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
def create_trend_synthesis_prompt(trend_analysis: Dict, segment: str) -> str:
    """
    Format LLM prompt for deep executive trend synthesis
    """
    trends = trend_analysis.get('trends', [])
    total = trend_analysis.get('total_articles', 0)
    
    clusters_text = ""
    for trend in trends[:4]:
        label = trend.get('theme_label', 'Trend')
        count = trend.get('count', 0)
        pct = trend.get('percentage', 0)
        art_titles = [a.get('title', '') for a in trend.get('articles', [])[:4] if a.get('title')]
        art_list = "\n  * " + "\n  * ".join(art_titles) if art_titles else ""
        clusters_text += f"THEME: {label} ({count}/{total} signals, {pct}%)\nKey Signals:{art_list}\n\n"
    
    prompt = f"""You are the Chief Intelligence Analyst for Brief Delights, writing a Weekly Macro Synthesis for senior engineering and technology leaders ({segment}).

ANALYTICAL SIGNAL DATA (1,340+ feeds scanned over 7-day window, {total} curated articles analyzed):
{clusters_text}

TASK:
Write a 2-paragraph executive macro analysis synthesizing what is shifting across these technical vectors.

REQUIREMENTS:
1. Paragraph 1: State the core underlying structural shift happening right now. Be specific, referencing actual technical patterns (e.g. inference-time parallel scaling, KV cache optimizations, telemetry standards, agentic state persistence, multi-cloud LLM routing).
2. Paragraph 2: Explain the strategic consequence — what senior leaders or engineering teams must prepare for or adjust in their Q3/Q4 architecture roadmaps.
3. Tone: Authoritative, crisp, 250-IQ, zero corporate fluff, no generic statements like "AI is evolving fast".

Write ONLY the 2 paragraphs of synthesis:"""
    
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
            max_tokens=500,
            temperature=0.6
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
