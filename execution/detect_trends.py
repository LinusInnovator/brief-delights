#!/usr/bin/env python3
"""
Trend Detection
Analyzes the 14 selected articles to detect emerging themes
Cost: $0 (keyword-based, no LLM)
"""

import json
import sys
import glob
import re
from pathlib import Path
from datetime import datetime
from collections import defaultdict
from typing import Dict, List, Tuple


# Trend keyword categories
TREND_KEYWORDS = {
    'agent_orchestration': [
        'agent', 'agentic', 'agent teams', 'multi-agent', 'agent platform',
        'agent coordination', 'autonomous agents'
    ],
    'enterprise_ai': [
        'enterprise', 'production', 'at scale', 'enterprise-grade',
        'production deployment', 'enterprise ai', 'business ai'
    ],
    'model_architecture': [
        'transformer', 'architecture', 'attention mechanism', 'model design',
        'neural architecture', 'foundation model', 'llm architecture'
    ],
    'ai_infrastructure': [
        'datacenter', 'gpu', 'inference', 'training infrastructure',
        'compute', 'hardware acceleration', 'ai chips', 'tpu'
    ],
    'code_generation': [
        'code generation', 'coding assistant', 'copilot', 'code completion',
        'ai coding', 'software development ai'
    ],
    'ai_safety_governance': [
        'ai safety', 'governance', 'regulation', 'compliance', 'ethical ai',
        'responsible ai', 'ai policy'
    ],
    'vertical_ai': [
        'healthcare ai', 'fintech ai', 'legal ai', 'vertical',
        'industry-specific', 'domain-specific'
    ],
    'ai_tooling': [
        'evaluation', 'testing', 'observability', 'monitoring',
        'debugging', 'ai ops', 'mlops'
    ],
    'data_infrastructure': [
        'data pipeline', 'data quality', 'feature engineering',
        'embeddings', 'vector database', 'rag'
    ],
    'ai_consolidation': [
        'acquisition', 'merger', 'consolidation', 'funding round',
        'series a', 'series b', 'investment'
    ],
}


def clean_title(title: str) -> str:
    """Strip raw HTML tags and extra whitespace from article titles"""
    if not title:
        return ""
    cleaned = re.sub(r'<[^>]+>', '', str(title))
    return re.sub(r'\s+', ' ', cleaned).strip()


def extract_themes_from_article(article: Dict) -> List[str]:

    """
    Extract themes from a single article using keyword matching
    
    Args:
        article: Article dictionary with title and description
    
    Returns:
        List of theme names
    """
    # Combine title and description for analysis
    text = (
        article.get('title', '') + ' ' + 
        article.get('description', '') + ' ' +
        article.get('summary', '')
    ).lower()
    
    detected_themes = []
    
    for theme, keywords in TREND_KEYWORDS.items():
        if any(keyword.lower() in text for keyword in keywords):
            detected_themes.append(theme)
    
    return detected_themes


def detect_trends(articles: List[Dict]) -> Dict:
    """
    Detect trends across selected articles
    
    Args:
        articles: List of selected articles (typically 14)
    
    Returns:
        Dictionary with trend analysis
    """
    theme_counts = defaultdict(int)
    theme_articles = defaultdict(list)
    
    # Analyze each article
    for article in articles:
        themes = extract_themes_from_article(article)
        article['detected_themes'] = themes  # Add to article for later use
        
        for theme in themes:
            theme_counts[theme] += 1
            theme_articles[theme].append({
                'title': article.get('title', ''),
                'url': article.get('url', '')
            })
    
    # Calculate statistics
    total_articles = len(articles)
    trends = []
    
    min_count = 2 if total_articles >= 8 else 1
    for theme, count in theme_counts.items():
        if count >= min_count:
            percentage = (count / total_articles * 100) if total_articles > 0 else 0
            trends.append({
                'theme': theme,
                'theme_label': theme.replace('_', ' ').title(),
                'count': count,
                'percentage': round(percentage, 1),
                'articles': theme_articles[theme]
            })
            
    if not trends and theme_counts:
        sorted_themes = sorted(theme_counts.items(), key=lambda x: x[1], reverse=True)
        for theme, count in sorted_themes[:3]:
            percentage = (count / total_articles * 100) if total_articles > 0 else 0
            trends.append({
                'theme': theme,
                'theme_label': theme.replace('_', ' ').title(),
                'count': count,
                'percentage': round(percentage, 1),
                'articles': theme_articles[theme]
            })

    
    # Sort by count (descending)
    trends.sort(key=lambda x: x['count'], reverse=True)
    
    return {
        'total_articles': total_articles,
        'trends': trends,
        'top_trend': trends[0] if trends else None
    }


def main():
    """Test trend detection"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Detect trends in selected articles')
    parser.add_argument('--segment', required=True, choices=['builders', 'leaders', 'innovators'])
    parser.add_argument('--date', default=datetime.now().strftime('%Y-%m-%d'))
    args = parser.parse_args()
    
    base_dir = Path(__file__).parent.parent
    tmp_dir = base_dir / '.tmp'
    
    # Gather selected articles from all recent runs (past 7 days)
    selection_files = sorted(glob.glob(str(tmp_dir / f"selected_articles_{args.segment}_*.json")), reverse=True)[:7]
    
    articles = []
    seen_titles = set()
    
    for s_file in selection_files:
        try:
            with open(s_file, 'r', encoding='utf-8') as f:
                sdata = json.load(f)
            raw_arts = sdata.get('selected_articles', sdata.get('articles', []))
            for a in raw_arts:
                t = clean_title(a.get('title', ''))
                if t and t not in seen_titles:
                    seen_titles.add(t)
                    a['title'] = t
                    articles.append(a)
        except Exception as e:
            print(f"⚠️ Warning reading {s_file}: {e}")

    if not articles:
        input_file = tmp_dir / f'selected_articles_{args.segment}_{args.date}.json'
        if input_file.exists():
            with open(input_file) as f:
                data = json.load(f)
            articles = data.get('selected_articles', data.get('articles', []))
    
    if not articles:
        print(f"❌ Error: No articles found for {args.segment}")
        sys.exit(1)
    
    print(f"📊 Analyzing 7-day trend pool for {args.segment} ({len(articles)} total curated articles)")
    
    # Detect trends
    trend_analysis = detect_trends(articles)
    
    # Display results
    print("=" * 60)
    print(f"TREND ANALYSIS FOR {args.segment.upper()}")
    print("=" * 60)
    print(f"\nTotal articles analyzed: {trend_analysis['total_articles']}")
    print(f"Trends detected: {len(trend_analysis['trends'])}\n")
    
    if trend_analysis['trends']:
        print("TOP TRENDS:")
        for i, trend in enumerate(trend_analysis['trends'], 1):
            print(f"\n{i}. {trend['theme_label']}")
            print(f"   Count: {trend['count']}/{trend_analysis['total_articles']} articles ({trend['percentage']}%)")
            print(f"   Articles:")
            for article in trend['articles'][:3]:  # Show first 3
                print(f"     - {article['title'][:70]}...")
    else:
        print("No significant trends detected (need at least 2 articles per theme)")
    
    # Save results
    output_file = base_dir / '.tmp' / f'trends_{args.segment}_{args.date}.json'
    with open(output_file, 'w') as f:
        json.dump(trend_analysis, f, indent=2)
    
    print(f"\n💾 Saved trend analysis to {output_file}")
    print("=" * 60)


if __name__ == '__main__':
    main()
