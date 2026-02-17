#!/usr/bin/env python3
"""
Source Ranking Engine
Scores RSS feed sources by signal-to-noise ratio.
Cost: $0 (pure statistics, no LLM)

Compares raw_articles (what was fetched) vs selected_articles (what the LLM kept).
Sources that consistently produce selected articles rank higher.
Sources that produce noise get flagged for review.

Usage:
    python execution/rank_sources.py              # Analyze all available data
    python execution/rank_sources.py --days 7     # Last 7 days only
"""

import json
import sys
from datetime import datetime, timedelta
from pathlib import Path
from collections import defaultdict
from typing import Dict, List

PROJECT_ROOT = Path(__file__).parent.parent
TMP_DIR = PROJECT_ROOT / ".tmp"
RANKINGS_FILE = TMP_DIR / "source_rankings.json"
TODAY = datetime.now().strftime("%Y-%m-%d")


def log(message: str):
    """Log to console"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] {message}")


def load_pipeline_data(days: int = 30) -> tuple:
    """
    Load all available raw + selected article data.
    Returns (raw_articles, selected_articles) aggregated across all dates.
    """
    raw_all = []
    selected_all = []

    # Find all raw article files
    raw_files = sorted(TMP_DIR.glob("raw_articles_*.json"))
    selected_files = sorted(TMP_DIR.glob("selected_articles_*_*.json"))

    if not raw_files:
        log("❌ No raw_articles files found in .tmp/")
        return raw_all, selected_all

    # Filter by date range
    cutoff = datetime.now() - timedelta(days=days)

    for raw_file in raw_files:
        # Extract date from filename: raw_articles_2026-02-13.json
        try:
            date_str = raw_file.stem.replace("raw_articles_", "")
            file_date = datetime.strptime(date_str, "%Y-%m-%d")
            if file_date < cutoff:
                continue
        except ValueError:
            continue

        with open(raw_file, 'r') as f:
            data = json.load(f)

        articles = data.get('articles', [])
        for a in articles:
            a['_pipeline_date'] = date_str
        raw_all.extend(articles)
        log(f"  📄 {raw_file.name}: {len(articles)} raw articles")

    for sel_file in selected_files:
        try:
            with open(sel_file, 'r') as f:
                data = json.load(f)

            articles = data.get('selected_articles', data.get('articles', []))
            selected_all.extend(articles)
        except (json.JSONDecodeError, KeyError):
            continue

    log(f"\n📊 Loaded {len(raw_all)} raw articles, {len(selected_all)} selected")
    return raw_all, selected_all


def calculate_source_scores(raw_articles: List[Dict], selected_articles: List[Dict]) -> List[Dict]:
    """
    Calculate signal-to-noise score per source.

    Score formula:
        selection_rate = selected / total (0.0 - 1.0)
        avg_tier_quality = weighted average (full=1.0, trending=0.8, quick=0.6)
        avg_urgency = normalized urgency score (0.0 - 1.0)

        final_score = (selection_rate * 50) + (avg_tier_quality * 30) + (avg_urgency * 20)
    """
    # Count articles per source
    source_totals = defaultdict(int)
    source_categories = defaultdict(set)

    for article in raw_articles:
        source = article.get('source', 'Unknown')
        source_totals[source] += 1
        source_categories[source].add(article.get('category', 'Unknown'))

    # Count selected articles per source + quality metrics
    source_selected = defaultdict(int)
    source_tiers = defaultdict(list)
    source_urgency = defaultdict(list)
    source_selected_titles = defaultdict(list)

    for article in selected_articles:
        source = article.get('source', 'Unknown')
        source_selected[source] += 1

        # Track tier quality
        tier = article.get('tier', 'full')
        tier_score = {'full': 1.0, 'trending': 0.8, 'quick': 0.6}.get(tier, 0.5)
        source_tiers[source].append(tier_score)

        # Track urgency
        urgency = article.get('urgency_score', 5)
        try:
            urgency = int(urgency) if isinstance(urgency, str) else urgency
        except (ValueError, TypeError):
            urgency = 5
        source_urgency[source].append(min(10, max(1, urgency)))

        # Track titles for examples
        source_selected_titles[source].append(article.get('title', '')[:80])

    # Calculate scores
    rankings = []

    for source, total in source_totals.items():
        selected = source_selected.get(source, 0)
        selection_rate = selected / total if total > 0 else 0

        # Tier quality average
        tiers = source_tiers.get(source, [])
        avg_tier_quality = sum(tiers) / len(tiers) if tiers else 0

        # Urgency average (normalized to 0-1)
        urgencies = source_urgency.get(source, [])
        avg_urgency = (sum(urgencies) / len(urgencies) / 10) if urgencies else 0

        # Final weighted score (0-100)
        score = (selection_rate * 50) + (avg_tier_quality * 30) + (avg_urgency * 20)

        # Grade assignment
        if score >= 70:
            grade = 'A'
            status = '🟢 Top source'
        elif score >= 50:
            grade = 'B'
            status = '🔵 Good source'
        elif score >= 30:
            grade = 'C'
            status = '🟡 Average'
        elif score >= 15:
            grade = 'D'
            status = '🟠 Low signal'
        else:
            grade = 'F'
            status = '🔴 Noise — review'

        rankings.append({
            'source': source,
            'score': round(score, 1),
            'grade': grade,
            'status': status,
            'total_articles': total,
            'selected_articles': selected,
            'selection_rate': round(selection_rate * 100, 1),
            'avg_tier_quality': round(avg_tier_quality, 2),
            'avg_urgency': round(avg_urgency * 10, 1),
            'categories': sorted(list(source_categories[source])),
            'top_selected': source_selected_titles.get(source, [])[:3]
        })

    # Sort by score descending
    rankings.sort(key=lambda x: x['score'], reverse=True)

    return rankings


def print_leaderboard(rankings: List[Dict]):
    """Print human-readable source leaderboard"""
    print("\n" + "=" * 80)
    print("📡 RSS SOURCE LEADERBOARD")
    print("=" * 80)
    print(f"{'Rank':<5} {'Source':<30} {'Score':<8} {'Grade':<6} {'Sel%':<8} {'Total':<7} {'Status'}")
    print("-" * 80)

    for i, r in enumerate(rankings, 1):
        print(f"{i:<5} {r['source'][:29]:<30} {r['score']:<8} {r['grade']:<6} "
              f"{r['selection_rate']}%{'':<3} {r['total_articles']:<7} {r['status']}")

    # Summary stats
    total_sources = len(rankings)
    a_sources = sum(1 for r in rankings if r['grade'] == 'A')
    noise_sources = sum(1 for r in rankings if r['grade'] in ('D', 'F'))

    print("\n" + "-" * 80)
    print(f"📊 {total_sources} sources | {a_sources} top-tier (A) | {noise_sources} noise (D/F)")

    if noise_sources > 0:
        print("\n⚠️  Low-signal sources to consider removing:")
        for r in rankings:
            if r['grade'] in ('D', 'F'):
                print(f"   🔴 {r['source']} — {r['total_articles']} articles fetched, "
                      f"{r['selected_articles']} selected ({r['selection_rate']}%)")

    print("=" * 80)


def save_rankings(rankings: List[Dict]):
    """Save rankings to JSON"""
    output = {
        'generated_at': datetime.now().isoformat(),
        'total_sources': len(rankings),
        'rankings': rankings,
        'summary': {
            'top_5': [r['source'] for r in rankings[:5]],
            'noise_sources': [r['source'] for r in rankings if r['grade'] in ('D', 'F')],
            'avg_selection_rate': round(
                sum(r['selection_rate'] for r in rankings) / len(rankings), 1
            ) if rankings else 0
        }
    }

    with open(RANKINGS_FILE, 'w') as f:
        json.dump(output, f, indent=2)

    log(f"\n💾 Saved rankings to {RANKINGS_FILE}")


def main():
    """Main execution"""
    import argparse

    parser = argparse.ArgumentParser(description='Score RSS sources by signal-to-noise')
    parser.add_argument('--days', type=int, default=30, help='Lookback period in days')
    args = parser.parse_args()

    log(f"📡 Analyzing RSS source quality (last {args.days} days)")
    log(f"   Looking in: {TMP_DIR}\n")

    # Load data
    raw_articles, selected_articles = load_pipeline_data(days=args.days)

    if not raw_articles:
        log("❌ No data found. Run the daily pipeline first.")
        return False

    if not selected_articles:
        log("⚠️  No selected articles found. Cannot rank sources.")
        return False

    # Calculate scores
    rankings = calculate_source_scores(raw_articles, selected_articles)

    # Display leaderboard
    print_leaderboard(rankings)

    # Save
    save_rankings(rankings)

    return True


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
