#!/usr/bin/env python3
"""
Weekly Insights Synthesis Script
Analyzes 6 days of trend data and generates strategic insights for Sunday newsletter.
"""

import json
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path
from collections import defaultdict, Counter
from dotenv import load_dotenv
import requests

# Load environment
load_dotenv()

# Configuration
PROJECT_ROOT = Path(__file__).parent.parent
TMP_DIR = PROJECT_ROOT / ".tmp"
# Read weekly insights from committed directory (not .tmp which is gitignored)
WEEKLY_DIR = PROJECT_ROOT / "reports" / "weekly_insights"
TODAY = datetime.now().strftime("%Y-%m-%d")

# OpenRouter config
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

def log(message: str):
    """Log to console"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {message}")

def get_last_6_days():
    """Get list of last 6 days (Mon-Sat if run on Sunday)"""
    days = []
    for i in range(1, 7):
        day = datetime.now() - timedelta(days=i)
        days.append(day.strftime("%Y-%m-%d"))
    return reversed(list(days))  # Oldest first

def load_week_data(segment: str) -> list:
    """Load all snapshots from the past week"""
    week_data = []
    
    for date in get_last_6_days():
        file_path = WEEKLY_DIR / f"{date}_{segment}.json"
        
        if file_path.exists():
            with open(file_path, 'r') as f:
                data = json.load(f)
                week_data.append(data)
                log(f"  ✅ Loaded {date}: {data['article_count']} articles")
        else:
            log(f"  ⚠️  Missing {date}")
    
    return week_data

def analyze_weekly_trends(week_data: list) -> dict:
    """Analyze trends across the entire week"""
    all_trends = Counter()
    trend_evolution = defaultdict(list)
    total_articles = 0
    
    for day_data in week_data:
        total_articles += day_data['article_count']
        
        # Count trend occurrences
        for trend in day_data['trends'].get('detected_trends', []):
            keyword = trend['keyword']
            all_trends[keyword] += trend['count']
            trend_evolution[keyword].append({
                'date': day_data['date'],
                'count': trend['count']
            })
    
    # Identify top trends
    top_trends = all_trends.most_common(10)
    
    # Detect accelerating vs declining trends
    accelerating = []
    declining = []
    
    for keyword, total_count in top_trends:
        evolution = trend_evolution[keyword]
        if len(evolution) >= 3:
            early_avg = sum(d['count'] for d in evolution[:3]) / 3
            late_avg = sum(d['count'] for d in evolution[-3:]) / 3
            
            if late_avg > early_avg * 1.5:
                accelerating.append((keyword, late_avg / early_avg))
            elif late_avg < early_avg * 0.5:
                declining.append((keyword, early_avg / late_avg))
    
    return {
        "total_articles": total_articles,
        "top_trends": top_trends,
        "accelerating_trends": sorted(accelerating, key=lambda x: x[1], reverse=True)[:5],
        "declining_trends": sorted(declining, key=lambda x: x[1], reverse=True)[:5],
        "trend_evolution": dict(trend_evolution)
    }

def call_llm(prompt: str, model: str = "anthropic/claude-3.5-sonnet") -> str:
    """Call OpenRouter API for synthesis"""
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://brief.delights.pro",
        "X-Title": "The Brief"
    }
    
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.7,
        "max_tokens": 2000
    }
    
    response = requests.post(OPENROUTER_URL, headers=headers, json=payload)
    response.raise_for_status()
    
    return response.json()['choices'][0]['message']['content']

def synthesize_insights(week_data: list, analysis: dict, segment: str) -> str:
    """Generate strategic insights via LLM"""
    
    # Prepare context
    context = f"""
You are a strategic technology analyst preparing the Sunday Weekly Insights report for {segment}.

WEEK OVERVIEW:
- Days analyzed: {len(week_data)} (Mon-Sat)
- Total articles analyzed: {analysis['total_articles']}
- Total articles scanned: ~8,000+ (from 1,340+ daily RSS feeds)
- Articles enriched: ~2,400 (full content scraped)

TOP TRENDS THIS WEEK:
{json.dumps([{"keyword": k, "mentions": c} for k, c in analysis['top_trends'][:5]], indent=2)}

ACCELERATING TRENDS (gaining momentum):
{json.dumps([{"keyword": k, "acceleration": f"{a:.1f}x"} for k, a in analysis['accelerating_trends']], indent=2)}

DECLINING TRENDS (losing momentum):
{json.dumps([{"keyword": k, "decline": f"{d:.1f}x"} for k, d in analysis['declining_trends']], indent=2)}

TASK:
Generate a Sunday Weekly Insights report with the following structure:

1. WEEK AT A GLANCE (1-2 sentences)
   - High-level summary of what defined the week

2. DOMINANT THEME (150-200 words)
   - Pick the #1 theme (highest % coverage)
   - What happened? (concrete events)
   - Why it matters (strategic context)
   - Strategic implication (action for readers)

3. EMERGING SIGNAL (100-150 words)
   - Pick accelerating trend that's notable
   - Pattern detected (what's the trend)
   - Trend analysis (quantitative context)
   - What to watch (forward-looking)

4. CONTRARIAN SIGNAL (100-150 words)
   - Something underreported but important
   - By the numbers (data points)
   - Counter-narrative (why it matters despite low coverage)
   - Opportunity (how readers can benefit)

5. LOOKING AHEAD
   - 2-3 predictions for next week
   - Based on accelerating trends
   - Specific events if known

STYLE:
- Data-driven and quantitative
- Confident but not hype
- Strategic (connects dots, sees patterns)
- Concise (each section exactly as long as specified)
- Use actual percentages from the data

OUTPUT:
Write ONLY the content sections, no meta-commentary.
Use markdown formatting.
Be specific with numbers.
"""
    
    log("\n🤖 Calling Claude 3.5 Sonnet for synthesis...")
    insights = call_llm(context)
    log("✅ Synthesis complete")
    
    return insights

def save_synthesis(segment: str, insights: str, analysis: dict):
    """Save synthesized insights"""
    output = {
        "date": TODAY,
        "segment": segment,
        "analysis": analysis,
        "insights": insights,
        "generated_at": datetime.now().isoformat()
    }
    
    output_file = TMP_DIR / f"weekly_insights_{segment}_{TODAY}.json"
    
    with open(output_file, 'w') as f:
        json.dump(output, f, indent=2)
    
    log(f"✅ Saved synthesis: {output_file}")

def main():
    """Main execution"""
    if len(sys.argv) < 2:
        log("Usage: python3 synthesize_weekly_insights.py <segment>")
        sys.exit(1)
    
    segment = sys.argv[1]
    
    log("=" * 60)
    log(f"Synthesizing Weekly Insights for {segment.upper()}")
    log("=" * 60)
    
    try:
        # Load week data
        log(f"\n📊 Loading data from past 6 days...")
        week_data = load_week_data(segment)
        
        if len(week_data) < 4:
            log(f"❌ Insufficient data (need 4+ days, have {len(week_data)})")
            return False
        
        log(f"✅ Loaded {len(week_data)} days of data")
        
        # Analyze trends
        log(f"\n📈 Analyzing weekly trends...")
        analysis = analyze_weekly_trends(week_data)
        log(f"✅ Analyzed {analysis['total_articles']} total articles")
        log(f"   Top trend: {analysis['top_trends'][0][0]} ({analysis['top_trends'][0][1]} mentions)")
        
        # Synthesize insights
        insights = synthesize_insights(week_data, analysis, segment)
        
        # Save results
        save_synthesis(segment, insights, analysis)
        
        # Cost estimate
        log(f"\n💰 Estimated cost: ~$0.05")
        
        return True
        
    except Exception as e:
        log(f"\n❌ FATAL ERROR: {str(e)}")
        import traceback
        log(traceback.format_exc())
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
