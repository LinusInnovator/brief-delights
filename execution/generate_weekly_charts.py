#!/usr/bin/env python3
"""
Weekly Insights Chart Generation Script
Generates trend charts for Sunday newsletter using Matplotlib.
"""

import json
import sys
from datetime import datetime
from pathlib import Path
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from matplotlib import ticker
import os

# Configuration
PROJECT_ROOT = Path(__file__).parent.parent
TMP_DIR = PROJECT_ROOT / ".tmp"
CHARTS_DIR = TMP_DIR / "charts"
TODAY = datetime.now().strftime("%Y-%m-%d")

def log(message: str):
    """Log to console"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {message}")

def ensure_charts_directory():
    """Create charts directory if it doesn't exist"""
    CHARTS_DIR.mkdir(parents=True, exist_ok=True)
    log(f"✅ Charts directory ready: {CHARTS_DIR}")

def load_synthesis(segment: str) -> dict:
    """Load weekly synthesis data"""
    synthesis_file = TMP_DIR / f"weekly_insights_{segment}_{TODAY}.json"
    
    if not synthesis_file.exists():
        raise FileNotFoundError(f"Synthesis not found: {synthesis_file}")
    
    with open(synthesis_file, 'r') as f:
        return json.load(f)

def generate_top_trend_chart(trend_evolution: list, keyword: str, segment: str) -> str:
    """Generate line chart for top trending keyword"""
    
    # Set style
    plt.style.use('seaborn-v0_8-whitegrid')
    fig, ax = plt.subplots(figsize=(8, 4), dpi=100, facecolor='white')
    
    # Extract data
    dates = [datetime.strptime(d['date'], '%Y-%m-%d') for d in trend_evolution]
    counts = [d['count'] for d in trend_evolution]
    
    # Plot line with fill
    ax.plot(dates, counts, linewidth=3, color='#0066cc', marker='o', 
            markersize=8, markerfacecolor='white', markeredgewidth=2)
    ax.fill_between(dates, counts, alpha=0.15, color='#0066cc')
    
    # Formatting
    ax.set_title(f'"{keyword}" - Weekly Trend', 
                 fontsize=16, fontweight='bold', pad=20, color='#000')
    ax.set_xlabel('Date', fontsize=12, color='#666')
    ax.set_ylabel('Mentions', fontsize=12, color='#666')
    
    # Grid styling
    ax.grid(True, alpha=0.3, linestyle='--', linewidth=0.5)
    ax.set_facecolor('#fafafa')
    
    # Date formatting
    ax.xaxis.set_major_formatter(mdates.DateFormatter('%b %d'))
    plt.xticks(rotation=45, ha='right')
    
    # Y-axis integers only
    ax.yaxis.set_major_locator(ticker.MaxNLocator(integer=True))
    
    # Spines styling
    for spine in ax.spines.values():
        spine.set_color('#e0e0e0')
        spine.set_linewidth(1)
    
    # Tight layout
    plt.tight_layout()
    
    # Save
    output_path = CHARTS_DIR / f"top_trend_{segment}_{TODAY}.png"
    plt.savefig(output_path, format='png', dpi=100, bbox_inches='tight', 
                facecolor='white', edgecolor='none')
    plt.close()
    
    file_size = os.path.getsize(output_path) / 1024
    log(f"✅ Top trend chart saved: {output_path.name} ({file_size:.1f}KB)")
    
    return str(output_path)

def generate_top_trends_bar(top_trends: list, segment: str) -> str:
    """Generate horizontal bar chart for top 5 trends"""
    
    # Set style
    plt.style.use('seaborn-v0_8-whitegrid')
    fig, ax = plt.subplots(figsize=(8, 5), dpi=100, facecolor='white')
    
    # Extract top 5
    keywords = [t[0] for t in top_trends[:5]]
    counts = [t[1] for t in top_trends[:5]]
    
    # Reverse for better visual hierarchy (highest at top)
    keywords = keywords[::-1]
    counts = counts[::-1]
    
    # Color gradient from light to dark
    colors = plt.cm.Blues([(i+3)/7 for i in range(5)])[::-1]
    
    # Create horizontal bars
    bars = ax.barh(keywords, counts, color=colors, edgecolor='white', linewidth=2)
    
    # Add value labels
    for i, (bar, count) in enumerate(zip(bars, counts)):
        width = bar.get_width()
        ax.text(width + 0.3, bar.get_y() + bar.get_height()/2, 
                f'{int(count)}',
                ha='left', va='center', fontsize=11, fontweight='bold', color='#333')
    
    # Formatting
    ax.set_title('Top 5 Trends This Week', 
                 fontsize=16, fontweight='bold', pad=20, color='#000')
    ax.set_xlabel('Total Mentions', fontsize=12, color='#666')
    
    # Grid styling
    ax.grid(True, alpha=0.3, axis='x', linestyle='--', linewidth=0.5)
    ax.set_axisbelow(True)
    ax.set_facecolor('#fafafa')
    
    # X-axis integers only
    ax.xaxis.set_major_locator(ticker.MaxNLocator(integer=True))
    
    # Spines styling
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.spines['left'].set_color('#e0e0e0')
    ax.spines['bottom'].set_color('#e0e0e0')
    
    # Tight layout
    plt.tight_layout()
    
    # Save
    output_path = CHARTS_DIR / f"top_trends_bar_{segment}_{TODAY}.png"
    plt.savefig(output_path, format='png', dpi=100, bbox_inches='tight',
                facecolor='white', edgecolor='none')
    plt.close()
    
    file_size = os.path.getsize(output_path) / 1024
    log(f"✅ Top trends bar chart saved: {output_path.name} ({file_size:.1f}KB)")
    
    return str(output_path)

def main():
    """Main execution"""
    if len(sys.argv) < 2:
        log("Usage: python3 generate_weekly_charts.py <segment>")
        sys.exit(1)
    
    segment = sys.argv[1]
    
    log("=" * 60)
    log(f"Generating Weekly Charts for {segment.upper()}")
    log("=" * 60)
    
    try:
        # Ensure directory exists
        ensure_charts_directory()
        
        # Load synthesis
        log(f"\n📊 Loading synthesis for {segment}...")
        synthesis = load_synthesis(segment)
        analysis = synthesis['analysis']
        
        # Get top trend data
        top_trend = analysis['top_trends'][0]
        top_keyword = top_trend[0]
        trend_evolution = analysis['trend_evolution'].get(top_keyword, [])
        
        if not trend_evolution:
            log(f"⚠️ No evolution data for {top_keyword}, skipping line chart")
        else:
            # Generate line chart
            log(f"\n📈 Generating line chart for '{top_keyword}'...")
            chart1_path = generate_top_trend_chart(trend_evolution, top_keyword, segment)
        
        # Generate bar chart
        log(f"\n📊 Generating top 5 trends bar chart...")
        chart2_path = generate_top_trends_bar(analysis['top_trends'], segment)
        
        log(f"\n✅ Chart generation complete")
        log(f"   Charts saved to: {CHARTS_DIR}")
        
        return True
        
    except Exception as e:
        log(f"\n❌ FATAL ERROR: {str(e)}")
        import traceback
        log(traceback.format_exc())
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
