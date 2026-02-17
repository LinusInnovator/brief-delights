#!/usr/bin/env python3
"""
Narrative Arc Detection
Tracks how stories evolve across days. When "OpenAI restructures" appears
Monday and "employees leave" Tuesday — synthesizes the arc.

Cost: ~$0.005 per newsletter (1 small LLM call to synthesize the arc narrative)

Approach:
1. Load selected articles from the last N days (deterministic)
2. Group by keyword overlap / entity similarity (deterministic)
3. Detect multi-day chains (deterministic)
4. One LLM call to write the arc synthesis (cheap)

Usage:
    python execution/track_story_arcs.py --segment builders --days 7
    python execution/track_story_arcs.py --segment innovators --days 7 --dry-run
"""

import json
import os
import re
import sys
from datetime import datetime, timedelta
from pathlib import Path
from collections import defaultdict
from typing import Dict, List, Optional, Set
from dotenv import load_dotenv

load_dotenv()

PROJECT_ROOT = Path(__file__).parent.parent
TMP_DIR = PROJECT_ROOT / ".tmp"
TODAY = datetime.now().strftime("%Y-%m-%d")

# LLM for arc synthesis (1 cheap call per arc)
from openai import OpenAI
client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENROUTER_API_KEY")
)
CHEAP_MODEL = "anthropic/claude-3-haiku"


def log(message: str):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")


# ──────────────────────────────────────────────
# STEP 1: Load multi-day article data
# ──────────────────────────────────────────────

def load_articles_across_days(segment: str, days: int) -> List[Dict]:
    """Load selected articles across multiple days for a segment"""
    all_articles = []
    
    for i in range(days):
        date = (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d")
        filepath = TMP_DIR / f"selected_articles_{segment}_{date}.json"
        
        if not filepath.exists():
            continue
        
        try:
            with open(filepath) as f:
                data = json.load(f)
            
            articles = data.get('selected_articles', data.get('articles', []))
            for a in articles:
                a['_date'] = date
                a['_segment'] = segment
            
            all_articles.extend(articles)
            log(f"  📄 {date}: {len(articles)} articles")
        except (json.JSONDecodeError, KeyError):
            continue
    
    return all_articles


# ──────────────────────────────────────────────
# STEP 2: Extract entities and keywords (no LLM)
# ──────────────────────────────────────────────

# Known entities to track
ENTITY_PATTERNS = [
    # Companies
    r'\b(openai|anthropic|google|meta|microsoft|apple|nvidia|amd|intel|tesla|amazon|aws)\b',
    r'\b(deepmind|perplexity|mistral|hugging\s?face|stability|midjourney)\b',
    r'\b(docker|kubernetes|vercel|netlify|supabase|railway|render|fly\.io)\b',
    r'\b(stripe|shopify|cloudflare|datadog|snowflake|databricks|confluent)\b',
    # Technologies
    r'\b(gpt-?4|gpt-?5|claude|gemini|llama|mistral|phi-?\d)\b',
    r'\b(rust|golang|python|typescript|webassembly|wasm)\b',
    r'\b(kubernetes|k8s|docker|terraform|ansible)\b',
    # Topics
    r'\b(open\s?source|regulation|safety|alignment|agi|superintelligence)\b',
    r'\b(layoff|restructur|acquisition|merger|ipo|funding)\b',
]

COMPILED_PATTERNS = [re.compile(p, re.IGNORECASE) for p in ENTITY_PATTERNS]


def extract_entities(text: str) -> Set[str]:
    """Extract known entities from text"""
    entities = set()
    for pattern in COMPILED_PATTERNS:
        matches = pattern.findall(text)
        for match in matches:
            entities.add(match.lower().strip())
    return entities


def extract_keywords(text: str) -> Set[str]:
    """Extract significant keywords from text (simple TF approach)"""
    # Remove common words
    stop_words = {
        'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
        'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
        'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for',
        'on', 'with', 'at', 'by', 'from', 'as', 'into', 'about', 'between',
        'through', 'after', 'before', 'during', 'without', 'and', 'but', 'or',
        'so', 'yet', 'not', 'no', 'this', 'that', 'these', 'those', 'it',
        'its', 'they', 'them', 'their', 'we', 'our', 'you', 'your', 'he',
        'she', 'him', 'her', 'his', 'how', 'why', 'what', 'when', 'where',
        'which', 'who', 'whom', 'new', 'just', 'now', 'also', 'more', 'than',
        'most', 'very', 'much', 'many', 'some', 'all', 'each', 'every',
        'both', 'few', 'get', 'got', 'like', 'use', 'make', 'made', 'read',
    }
    
    words = re.findall(r'\b[a-z]{3,}\b', text.lower())
    return {w for w in words if w not in stop_words}


# ──────────────────────────────────────────────
# STEP 3: Detect story arcs (no LLM)
# ──────────────────────────────────────────────

def calculate_similarity(article_a: Dict, article_b: Dict) -> float:
    """
    Calculate similarity between two articles using entity + keyword overlap.
    Returns 0.0 - 1.0 score.
    """
    text_a = f"{article_a.get('title', '')} {article_a.get('summary', '')} {article_a.get('key_takeaway', '')}"
    text_b = f"{article_b.get('title', '')} {article_b.get('summary', '')} {article_b.get('key_takeaway', '')}"
    
    # Entity overlap (weighted heavily)
    entities_a = extract_entities(text_a)
    entities_b = extract_entities(text_b)
    
    if entities_a and entities_b:
        entity_overlap = len(entities_a & entities_b) / max(len(entities_a | entities_b), 1)
    else:
        entity_overlap = 0
    
    # Keyword overlap
    kw_a = extract_keywords(text_a)
    kw_b = extract_keywords(text_b)
    
    if kw_a and kw_b:
        keyword_overlap = len(kw_a & kw_b) / max(len(kw_a | kw_b), 1)
    else:
        keyword_overlap = 0
    
    # Weighted combination: entities matter more than keywords
    return entity_overlap * 0.7 + keyword_overlap * 0.3


def detect_arcs(articles: List[Dict], similarity_threshold: float = 0.25) -> List[Dict]:
    """
    Find multi-day story arcs by clustering similar articles across dates.
    
    An arc requires:
    - At least 2 articles
    - From at least 2 different dates
    - Above similarity threshold
    """
    if len(articles) < 2:
        return []
    
    # Build similarity graph
    arcs = []
    used_indices = set()
    
    for i, article_a in enumerate(articles):
        if i in used_indices:
            continue
        
        chain = [article_a]
        chain_indices = {i}
        
        for j, article_b in enumerate(articles):
            if j <= i or j in used_indices:
                continue
            
            # Check similarity against any article in the chain
            max_sim = max(calculate_similarity(a, article_b) for a in chain)
            
            if max_sim >= similarity_threshold:
                chain.append(article_b)
                chain_indices.add(j)
        
        # Only count as an arc if multiple dates are involved
        dates = set(a.get('_date', '') for a in chain)
        
        if len(chain) >= 2 and len(dates) >= 2:
            # Extract the shared entities (the "story")
            all_text = ' '.join(f"{a.get('title', '')} {a.get('summary', '')}" for a in chain)
            shared_entities = extract_entities(all_text)
            
            # Sort chain by date
            chain.sort(key=lambda a: a.get('_date', ''))
            
            arcs.append({
                'articles': chain,
                'dates': sorted(list(dates)),
                'span_days': (datetime.strptime(max(dates), '%Y-%m-%d') - 
                            datetime.strptime(min(dates), '%Y-%m-%d')).days + 1,
                'shared_entities': sorted(list(shared_entities)),
                'article_count': len(chain),
            })
            
            used_indices.update(chain_indices)
    
    # Sort by span (longest arcs first) then by article count
    arcs.sort(key=lambda a: (a['span_days'], a['article_count']), reverse=True)
    
    return arcs


# ──────────────────────────────────────────────
# STEP 4: Synthesize arc narrative (1 LLM call per arc)
# ──────────────────────────────────────────────

def synthesize_arc(arc: Dict, segment: str) -> Optional[Dict]:
    """
    Use a single cheap LLM call to write a narrative synthesis of the arc.
    Returns dict with 'headline', 'synthesis', 'developing' flag.
    """
    # Prepare timeline
    timeline = []
    for article in arc['articles']:
        timeline.append(f"[{article.get('_date', '?')}] {article.get('title', '')}")
    
    prompt = f"""You are writing a "📡 Developing Story" section for a tech newsletter (segment: {segment}).

A story has been evolving over {arc['span_days']} days with {arc['article_count']} articles.

TIMELINE:
{chr(10).join(timeline)}

SHARED THEMES: {', '.join(arc['shared_entities'][:8])}

Write a concise arc synthesis. Format:
1. A headline that captures the developing story (8 words max)
2. A 2-3 sentence synthesis connecting the dots across days
3. Whether this story is "still developing" or "concluded"

Return ONLY valid JSON:
{{
  "headline": "Short developing story headline",
  "synthesis": "2-3 sentence narrative connecting the dots",
  "status": "developing" or "concluded"
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
        result['shared_entities'] = arc['shared_entities']
        result['span_days'] = arc['span_days']
        result['article_count'] = arc['article_count']
        result['dates'] = arc['dates']
        result['article_titles'] = [a.get('title', '') for a in arc['articles']]
        
        return result
        
    except Exception as e:
        log(f"⚠️  LLM synthesis failed: {e}")
        return {
            'headline': f"Developing: {', '.join(arc['shared_entities'][:3])}",
            'synthesis': f"This story has evolved over {arc['span_days']} days with {arc['article_count']} related articles.",
            'status': 'developing',
            'shared_entities': arc['shared_entities'],
            'span_days': arc['span_days'],
            'article_count': arc['article_count'],
            'dates': arc['dates'],
            'article_titles': [a.get('title', '') for a in arc['articles']],
        }


def main():
    """Main execution"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Track story arcs across days')
    parser.add_argument('--segment', required=True, choices=['builders', 'leaders', 'innovators'])
    parser.add_argument('--days', type=int, default=7, help='Lookback period')
    parser.add_argument('--dry-run', action='store_true', help='Skip LLM synthesis')
    parser.add_argument('--threshold', type=float, default=0.25, help='Similarity threshold')
    args = parser.parse_args()
    
    log(f"📡 Narrative Arc Detection — {args.segment} (last {args.days} days)")
    log(f"   Similarity threshold: {args.threshold}\n")
    
    # Load articles
    articles = load_articles_across_days(args.segment, args.days)
    log(f"\n📊 Loaded {len(articles)} articles across dates\n")
    
    if len(articles) < 2:
        log("❌ Need at least 2 articles from different dates to detect arcs.")
        return False
    
    # Detect arcs
    arcs = detect_arcs(articles, similarity_threshold=args.threshold)
    
    if not arcs:
        log("💭 No multi-day story arcs detected. Stories are standalone today.")
        return True
    
    log(f"⚡ Found {len(arcs)} narrative arc(s):\n")
    
    synthesized = []
    
    for i, arc in enumerate(arcs):
        print(f"{'─' * 60}")
        print(f"📡 Arc {i+1}: {arc['article_count']} articles over {arc['span_days']} days")
        print(f"   Entities: {', '.join(arc['shared_entities'][:5])}")
        print(f"   Dates: {' → '.join(arc['dates'])}")
        for article in arc['articles']:
            print(f"   [{article.get('_date', '?')}] {article.get('title', '')[:70]}")
        
        if not args.dry_run:
            synthesis = synthesize_arc(arc, args.segment)
            if synthesis:
                print(f"\n   📣 {synthesis['headline']}")
                print(f"   {synthesis['synthesis']}")
                print(f"   Status: {'🔴 Still developing' if synthesis['status'] == 'developing' else '✅ Concluded'}")
                synthesized.append(synthesis)
        print()
    
    # Save results
    output = {
        'generated_at': datetime.now().isoformat(),
        'segment': args.segment,
        'lookback_days': args.days,
        'arcs_detected': len(arcs),
        'arcs': synthesized if synthesized else [
            {
                'shared_entities': arc['shared_entities'],
                'span_days': arc['span_days'],
                'article_count': arc['article_count'],
                'dates': arc['dates'],
                'article_titles': [a.get('title', '') for a in arc['articles']],
            }
            for arc in arcs
        ],
    }
    
    output_file = TMP_DIR / f"story_arcs_{args.segment}_{TODAY}.json"
    with open(output_file, 'w') as f:
        json.dump(output, f, indent=2)
    
    log(f"\n💾 Saved to {output_file}")
    
    return True


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
