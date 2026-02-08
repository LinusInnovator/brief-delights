#!/usr/bin/env python3
"""
Source Quality Analytics
Analyzes selection results to track feed performance and auto-flag low performers
"""

import json
from datetime import datetime
from pathlib import Path
from collections import defaultdict

# Configuration
PROJECT_ROOT = Path(__file__).parent.parent
TMP_DIR = PROJECT_ROOT / ".tmp"
REPORTS_DIR = PROJECT_ROOT / "reports"
REPORTS_DIR.mkdir(exist_ok=True)


def load_articles(date: str):
    """Load raw and selected articles for a given date"""
    raw_file = TMP_DIR / f"raw_articles_{date}.json"
    
    # Load raw articles
    with open(raw_file) as f:
        raw_articles = json.load(f)
    
    # Load selected articles for all segments
    selected_by_segment = {}
    
    for segment in ['builders', 'leaders', 'innovators']:
        selected_file = TMP_DIR / f"selected_articles_{segment}_{date}.json"
        if selected_file.exists():
            with open(selected_file) as f:
                data = json.load(f)
                # Handle nested structure: data['selected_articles'] or data directly
                if isinstance(data, dict) and 'selected_articles' in data:
                    selected_by_segment[segment] = data['selected_articles']
                elif isinstance(data, list):
                    selected_by_segment[segment] = data
                else:
                    selected_by_segment[segment] = []
    
    return raw_articles, selected_by_segment


def analyze_source_performance(raw_articles, selected_by_segment):
    """Analyze which sources produce selected articles"""
    
    source_stats = defaultdict(lambda: {
        'seen': 0,
        'selected_builders': 0,
        'selected_leaders': 0,
        'selected_innovators': 0,
        'selected_total': 0,
        'primary_count': 0,
        'secondary_count': 0
    })
    
    # Track all articles seen
    for article in raw_articles:
        source = article.get('source', 'Unknown')
        source_type = article.get('source_type', 'unknown')
        
        source_stats[source]['seen'] += 1
        source_stats[source]['source_type'] = source_type
        
        if source_type == 'primary':
            source_stats[source]['primary_count'] += 1
        else:
            source_stats[source]['secondary_count'] += 1
    
    # Track selected articles per segment
    for segment, selected_articles in selected_by_segment.items():
        for article in selected_articles:
            source = article.get('source', 'Unknown')
            source_stats[source][f'selected_{segment}'] += 1
            source_stats[source]['selected_total'] += 1
    
    # Calculate rates
    for source in source_stats:
        stats = source_stats[source]
        stats['selection_rate'] = stats['selected_total'] / stats['seen'] if stats['seen'] > 0 else 0
        stats['primary_rate'] = stats['primary_count'] / stats['seen'] if stats['seen'] > 0 else 0
    
    return dict(source_stats)


def generate_report(source_stats, date):
    """Generate markdown report"""
    
    # Sort by selection rate
    sorted_sources = sorted(source_stats.items(), key=lambda x: x[1]['selection_rate'], reverse=True)
    
    # Top performers
    top_20 = sorted_sources[:20]
    
    # Low performers
    low_performers = [
        (source, stats) for source, stats in sorted_sources
        if stats['selection_rate'] < 0.05 and stats['seen'] > 5
    ]
    
    # Generate report
    report = f"""# Source Performance Report - {date}

## Summary

- **Total Sources:** {len(source_stats)}
- **Top Performers:** {len([s for s, st in sorted_sources if st['selection_rate'] > 0.3])} sources with >30% selection rate
- **Low Performers:** {len(low_performers)} sources with <5% selection rate (candidates for removal)

---

## Top 20 Sources

| Rank | Source | Seen | Selected | Selection Rate | Primary % | Segments |
|------|--------|------|----------|----------------|-----------|----------|
"""
    
    for rank, (source, stats) in enumerate(top_20, 1):
        segments = []
        if stats['selected_builders'] > 0:
            segments.append(f"B:{stats['selected_builders']}")
        if stats['selected_leaders'] > 0:
            segments.append(f"L:{stats['selected_leaders']}")
        if stats['selected_innovators'] > 0:
            segments.append(f"I:{stats['selected_innovators']}")
        
        segment_str = " ".join(segments) if segments else "-"
        
        report += f"| {rank} | {source[:40]} | {stats['seen']} | {stats['selected_total']} | {stats['selection_rate']:.1%} | {stats['primary_rate']:.0%} | {segment_str} |\n"
    
    report += "\n---\n\n## Low Performers (<5% Selection Rate)\n\n"
    
    if low_performers:
        report += "**Recommended for Removal:**\n\n"
        report += "| Source | Seen | Selected | Selection Rate | Type |\n"
        report += "|--------|------|----------|----------------|---------|\n"
        
        for source, stats in low_performers:
            report += f"| {source[:40]} | {stats['seen']} | {stats['selected_total']} | {stats['selection_rate']:.1%} | {stats['source_type']} |\n"
    else:
        report += "✅ No low performers! All sources contributing value.\n"
    
    report += "\n---\n\n## Source Type Distribution\n\n"
    
    primary_sources = [(s, st) for s, st in sorted_sources if st.get('source_type') == 'primary']
    secondary_sources = [(s, st) for s, st in sorted_sources if st.get('source_type') == 'secondary']
    
    report += f"- **Primary Sources:** {len(primary_sources)} ({len(primary_sources)/len(source_stats):.0%})\n"
    report += f"- **Secondary Sources:** {len(secondary_sources)} ({len(secondary_sources)/len(source_stats):.0%})\n"
    
    # Average selection rates by type
    if primary_sources:
        avg_primary = sum(st['selection_rate'] for _, st in primary_sources) / len(primary_sources)
        report += f"- **Avg Primary Selection Rate:** {avg_primary:.1%}\n"
    
    if secondary_sources:
        avg_secondary = sum(st['selection_rate'] for _, st in secondary_sources) / len(secondary_sources)
        report += f"- **Avg Secondary Selection Rate:** {avg_secondary:.1%}\n"
    
    report += "\n---\n\n## Recommendations\n\n"
    
    if low_performers:
        report += f"1. **Remove {len(low_performers)} low-value feeds** from your configs\n"
        report += "2. Consider adding more sources from high-performing categories\n"
    else:
        report += "1. ✅ Feed quality is excellent\n"
        report += "2. Continue monitoring for 7 days before making changes\n"
    
    if len(primary_sources) / len(source_stats) < 0.6:
        report += "3. ⚠️ Consider adding more primary sources (currently <60%)\n"
    
    return report


def main():
    """Generate source performance report"""
    date = datetime.now().strftime("%Y-%m-%d")
    
    print(f"📊 Analyzing source performance for {date}...")
    
    try:
        # Load data
        raw_articles, selected_by_segment = load_articles(date)
        
        print(f"  Loaded {len(raw_articles)} raw articles")
        for segment, articles in selected_by_segment.items():
            print(f"  Loaded {len(articles)} selected articles for {segment}")
        
        # Analyze
        source_stats = analyze_source_performance(raw_articles, selected_by_segment)
        
        # Generate report
        report = generate_report(source_stats, date)
        
        # Save report
        report_file = REPORTS_DIR / f"source_performance_{date}.md"
        with open(report_file, 'w') as f:
            f.write(report)
        
        # Also save JSON
        json_file = TMP_DIR / f"source_analytics_{date}.json"
        with open(json_file, 'w') as f:
            json.dump(source_stats, f, indent=2)
        
        print(f"\n✅ Report saved to {report_file.name}")
        print(f"✅ JSON data saved to {json_file.name}")
        
        # Print summary
        sorted_sources = sorted(source_stats.items(), key=lambda x: x[1]['selection_rate'], reverse=True)
        top_source, top_stats = sorted_sources[0]
        
        print(f"\n📈 Quick Summary:")
        print(f"  Top performer: {top_source} ({top_stats['selection_rate']:.1%})")
        print(f"  Total sources: {len(source_stats)}")
        
        low_count = len([s for s, st in sorted_sources if st['selection_rate'] < 0.05 and st['seen'] > 5])
        if low_count > 0:
            print(f"  ⚠️  {low_count} low performers to review")
        
        return True
        
    except FileNotFoundError as e:
        print(f"❌ Error: {e}")
        print("   Make sure you've run selection for today first!")
        return False


if __name__ == "__main__":
    main()
