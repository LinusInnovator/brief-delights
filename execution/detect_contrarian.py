#!/usr/bin/env python3
"""
Contrarian Signal Detector
When 80% of sources agree on a take, find the 20% that disagree.
Surfaces "The Other Side" for the newsletter.
Cost: $0.003 per newsletter (1 small LLM call to pick the best angle)

Pipeline position: runs AFTER story selection, BEFORE newsletter composition.

Usage:
    python execution/detect_contrarian.py --segment builders --date 2026-02-13
"""

import json
import sys
import os
from datetime import datetime
from pathlib import Path
from collections import defaultdict, Counter
from typing import Dict, List, Tuple, Optional
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

PROJECT_ROOT = Path(__file__).parent.parent
TMP_DIR = PROJECT_ROOT / ".tmp"
TODAY = datetime.now().strftime("%Y-%m-%d")

# LLM for the final contrarian angle selection (cheap model, 1 call)
client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENROUTER_API_KEY")
)
CHEAP_MODEL = "anthropic/claude-3-haiku"


def log(message: str):
    """Log to console"""
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")


# ──────────────────────────────────────────────
# STEP 1: Detect dominant narratives (no LLM)
# ──────────────────────────────────────────────

# Topic clusters — keywords that indicate the same underlying story
TOPIC_CLUSTERS = {
    'ai_replaces_jobs': [
        'replace', 'automate', 'job loss', 'layoffs', 'workforce reduction',
        'ai taking', 'obsolete', 'displacement', 'restructuring'
    ],
    'ai_augments_humans': [
        'augment', 'assist', 'copilot', 'pair', 'enhance', 'productivity',
        'human-in-the-loop', 'collaboration', 'empower'
    ],
    'open_source_winning': [
        'open source', 'open-source', 'hugging face', 'llama', 'mistral',
        'open weights', 'community', 'democratize'
    ],
    'closed_models_better': [
        'gpt-4', 'claude', 'proprietary', 'enterprise', 'api',
        'performance gap', 'benchmark', 'state-of-the-art'
    ],
    'ai_bubble': [
        'bubble', 'overvalued', 'hype', 'overhyped', 'correction',
        'downturn', 'unsustainable', 'warning'
    ],
    'ai_boom': [
        'boom', 'growth', 'investment', 'funding', 'revenue',
        'adoption', 'scaling', 'trillion', 'opportunity'
    ],
    'regulation_needed': [
        'regulation', 'regulate', 'safety', 'alignment', 'guardrails',
        'compliance', 'oversight', 'responsible', 'ethics'
    ],
    'regulation_stifles': [
        'innovation', 'freedom', 'overregulation', 'competition',
        'bureaucracy', 'slow', 'barrier'
    ],
    'cloud_dominance': [
        'aws', 'azure', 'gcp', 'cloud', 'hyperscaler',
        'cloud-native', 'serverless', 'managed service'
    ],
    'self_host_movement': [
        'self-host', 'on-premise', 'sovereignty', 'data control',
        'local', 'edge', 'privacy', 'self-managed'
    ],
}

# Tension pairs — topics that represent opposing views
TENSION_PAIRS = [
    ('ai_replaces_jobs', 'ai_augments_humans', 'AI & employment'),
    ('open_source_winning', 'closed_models_better', 'Open vs closed AI'),
    ('ai_bubble', 'ai_boom', 'AI market outlook'),
    ('regulation_needed', 'regulation_stifles', 'AI regulation'),
    ('cloud_dominance', 'self_host_movement', 'Cloud vs self-hosting'),
]


def detect_topic_signals(articles: List[Dict]) -> Dict[str, List[Dict]]:
    """
    Tag each article with topic signals based on keyword matching.
    Returns dict: topic_name -> list of matching articles
    """
    topic_matches = defaultdict(list)

    for article in articles:
        text = (
            article.get('title', '') + ' ' +
            article.get('summary', '') + ' ' +
            article.get('description', '') + ' ' +
            article.get('key_takeaway', '') + ' ' +
            article.get('why_this_matters', '')
        ).lower()

        for topic, keywords in TOPIC_CLUSTERS.items():
            if any(kw in text for kw in keywords):
                topic_matches[topic].append(article)

    return topic_matches


def find_narrative_tensions(topic_matches: Dict[str, List[Dict]]) -> List[Dict]:
    """
    Find topic pairs where both sides have signal — this is where tension lives.
    The minority side becomes the contrarian signal.
    """
    tensions = []

    for side_a, side_b, label in TENSION_PAIRS:
        count_a = len(topic_matches.get(side_a, []))
        count_b = len(topic_matches.get(side_b, []))

        if count_a == 0 and count_b == 0:
            continue  # No signal for this tension

        total = count_a + count_b
        if total < 2:
            continue  # Need at least 2 articles to have a tension

        # Determine majority and minority
        if count_a >= count_b:
            majority_topic, minority_topic = side_a, side_b
            majority_count, minority_count = count_a, count_b
        else:
            majority_topic, minority_topic = side_b, side_a
            majority_count, minority_count = count_b, count_a

        # Calculate divergence score (higher = more contrarian)
        # Perfect split (50/50) = low divergence (no clear contrarian)
        # Strong majority (90/10) = high divergence (clear contrarian)
        if total > 0:
            majority_ratio = majority_count / total
            divergence = majority_ratio  # Simple: how dominant is the majority?
        else:
            divergence = 0

        # Only interesting if there IS a minority voice
        if minority_count == 0:
            # All articles agree — note the absence of dissent
            tensions.append({
                'label': label,
                'type': 'consensus',
                'majority_topic': majority_topic,
                'majority_count': majority_count,
                'minority_topic': minority_topic,
                'minority_count': 0,
                'divergence': divergence,
                'majority_articles': topic_matches.get(majority_topic, []),
                'minority_articles': [],
                'insight': f"All {majority_count} articles lean toward {majority_topic.replace('_', ' ')} — no dissenting voices today."
            })
        else:
            tensions.append({
                'label': label,
                'type': 'tension',
                'majority_topic': majority_topic,
                'majority_count': majority_count,
                'minority_topic': minority_topic,
                'minority_count': minority_count,
                'divergence': divergence,
                'majority_articles': topic_matches.get(majority_topic, []),
                'minority_articles': topic_matches.get(minority_topic, []),
                'insight': f"{majority_count} articles say {majority_topic.replace('_', ' ')}, but {minority_count} argue {minority_topic.replace('_', ' ')}."
            })

    # Sort by divergence (strongest contrarian signal first)
    tensions.sort(key=lambda t: t['divergence'], reverse=True)

    return tensions


# ──────────────────────────────────────────────
# STEP 2: Pick the best contrarian angle (1 LLM call)
# ──────────────────────────────────────────────

def generate_contrarian_section(tensions: List[Dict], segment: str) -> Optional[Dict]:
    """
    Use a single cheap LLM call to craft the best contrarian insight
    for the newsletter.

    Returns dict with 'title', 'body', 'source_articles' or None if no good tension.
    """
    # Filter to tensions with actual minority voices
    real_tensions = [t for t in tensions if t['type'] == 'tension']

    if not real_tensions:
        log("💭 No contrarian signals today — all sources agree.")
        return None

    # Pick the top tension
    best = real_tensions[0]

    # Prepare article summaries for LLM
    majority_titles = [a.get('title', '') for a in best['majority_articles'][:3]]
    minority_titles = [a.get('title', '') for a in best['minority_articles'][:3]]

    prompt = f"""You are writing a "🤔 The Other Side" section for a tech newsletter (segment: {segment}).

TODAY'S TENSION: {best['label']}

MAJORITY VIEW ({best['majority_count']} articles):
{chr(10).join(f'- {t}' for t in majority_titles)}

MINORITY VIEW ({best['minority_count']} articles):
{chr(10).join(f'- {t}' for t in minority_titles)}

Write a SHORT, punchy contrarian insight (2-3 sentences max).
Format: Start with what everyone is saying, then pivot to the dissenting view.
Tone: Thoughtful, not clickbait. Like a smart friend nudging you to consider the other side.

Return ONLY valid JSON:
{{
  "title": "One-line hook (8 words max)",
  "body": "2-3 sentence contrarian insight"
}}"""

    try:
        response = client.chat.completions.create(
            model=CHEAP_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=200
        )

        content = response.choices[0].message.content.strip()
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]

        result = json.loads(content)
        result['tension'] = best['label']
        result['majority_topic'] = best['majority_topic']
        result['minority_topic'] = best['minority_topic']
        result['majority_count'] = best['majority_count']
        result['minority_count'] = best['minority_count']
        result['source_articles'] = [
            {'title': a.get('title', ''), 'url': a.get('url', '')}
            for a in best['minority_articles'][:2]
        ]

        log(f"✅ Contrarian angle: {result['title']}")
        return result

    except Exception as e:
        log(f"⚠️  LLM call failed: {e}")
        # Fallback: use the raw tension data
        return {
            'title': f"The other side of {best['label'].lower()}",
            'body': best['insight'],
            'tension': best['label'],
            'majority_topic': best['majority_topic'],
            'minority_topic': best['minority_topic'],
            'majority_count': best['majority_count'],
            'minority_count': best['minority_count'],
            'source_articles': [
                {'title': a.get('title', ''), 'url': a.get('url', '')}
                for a in best['minority_articles'][:2]
            ]
        }


def main():
    """Main execution"""
    import argparse

    parser = argparse.ArgumentParser(description='Detect contrarian signals in selected articles')
    parser.add_argument('--segment', required=True, choices=['builders', 'leaders', 'innovators'])
    parser.add_argument('--date', default=TODAY)
    parser.add_argument('--dry-run', action='store_true', help='Skip LLM call, show tensions only')
    args = parser.parse_args()

    log(f"🤔 Contrarian Signal Detector — {args.segment} ({args.date})")

    # Load selected articles (these are the ones going into the newsletter)
    input_file = TMP_DIR / f"selected_articles_{args.segment}_{args.date}.json"

    if not input_file.exists():
        log(f"❌ {input_file} not found. Run select_stories.py first.")
        return False

    with open(input_file) as f:
        data = json.load(f)

    articles = data.get('selected_articles', data.get('articles', []))
    log(f"📊 Analyzing {len(articles)} selected articles\n")

    # ALSO load raw articles for broader signal
    raw_file = TMP_DIR / f"raw_articles_{args.date}.json"
    if raw_file.exists():
        with open(raw_file) as f:
            raw_data = json.load(f)
        raw_articles = raw_data.get('articles', [])
        log(f"📊 Also analyzing {len(raw_articles)} raw articles for broader signal\n")
        all_articles = articles + raw_articles
    else:
        all_articles = articles

    # Step 1: Detect topic signals (free)
    topic_matches = detect_topic_signals(all_articles)

    log("📡 Topic signals detected:")
    for topic, matches in sorted(topic_matches.items(), key=lambda x: len(x[1]), reverse=True):
        if matches:
            log(f"  {topic.replace('_', ' ').title()}: {len(matches)} articles")

    # Step 2: Find tensions (free)
    tensions = find_narrative_tensions(topic_matches)

    print()
    if tensions:
        log("⚡ Narrative tensions found:")
        for t in tensions:
            emoji = "🔴" if t['type'] == 'consensus' else "⚡"
            log(f"  {emoji} {t['label']}: {t['insight']}")
    else:
        log("💭 No narrative tensions detected today.")

    # Step 3: Generate contrarian section (1 cheap LLM call)
    if args.dry_run:
        log("\n🏃 Dry run — skipping LLM call")
        contrarian = None
    else:
        print()
        contrarian = generate_contrarian_section(tensions, args.segment)

    # Save results
    output = {
        'generated_at': datetime.now().isoformat(),
        'segment': args.segment,
        'date': args.date,
        'topic_signals': {k: len(v) for k, v in topic_matches.items() if v},
        'tensions': [
            {
                'label': t['label'],
                'type': t['type'],
                'majority_topic': t['majority_topic'],
                'minority_topic': t['minority_topic'],
                'majority_count': t['majority_count'],
                'minority_count': t['minority_count'],
                'divergence': round(t['divergence'], 2),
                'insight': t['insight']
            }
            for t in tensions
        ],
        'contrarian_section': contrarian
    }

    output_file = TMP_DIR / f"contrarian_{args.segment}_{args.date}.json"
    with open(output_file, 'w') as f:
        json.dump(output, f, indent=2)

    log(f"\n💾 Saved to {output_file}")

    if contrarian:
        print(f"\n{'=' * 60}")
        print(f"🤔 THE OTHER SIDE")
        print(f"{'=' * 60}")
        print(f"\n  {contrarian['title']}")
        print(f"\n  {contrarian['body']}")
        if contrarian.get('source_articles'):
            print(f"\n  Sources:")
            for src in contrarian['source_articles']:
                print(f"    → {src['title'][:70]}")
        print(f"\n{'=' * 60}")

    return True


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
