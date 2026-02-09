#!/usr/bin/env python3
"""
Batch Article Content Enrichment
Scrapes full content for selected articles
"""

import json
import sys
from pathlib import Path
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, List
import logging

# Add execution to path
sys.path.insert(0, str(Path(__file__).parent))
from scrape_articles import scrape_article

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# Paths
BASE_DIR = Path(__file__).parent.parent
TMP_DIR = BASE_DIR / '.tmp'
TODAY = datetime.now().strftime('%Y-%m-%d')

# Processing settings
MAX_WORKERS = 8  # Parallel scraping threads (reduced from 15 to avoid rate limits)
ARTICLES_TO_ENRICH = 'full'  # 'full' = all articles, 'selected' = only selected ones


def log(message: str):
    """Log to console"""
    logger.info(message)


def enrich_article(article: Dict) -> Dict:
    """
    Enrich a single article with full content
    
    Args:
        article: Article dictionary with URL and raw_content
    
    Returns:
        Article with enriched content
    """
    url = article.get('url', '')
    fallback = article.get('raw_content', '') or article.get('description', '')
    
    # Scrape full content
    full_content = scrape_article(url, fallback_content=fallback)
    
    # Update article
    article['full_content'] = full_content
    article['content_enriched'] = len(full_content) > len(fallback)
    article['content_length'] = len(full_content)
    
    return article


def enrich_articles_batch(articles: List[Dict], max_workers: int = MAX_WORKERS) -> List[Dict]:
    """
    Enrich articles in parallel
    
    Args:
        articles: List of article dictionaries
        max_workers: Number of parallel workers
    
    Returns:
        List of enriched articles
    """
    enriched = []
    success_count = 0
    total = len(articles)
    
    log(f"🚀 Enriching {total} articles with {max_workers} parallel workers...")
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        # Submit all tasks
        future_to_article = {
            executor.submit(enrich_article, article): article 
            for article in articles
        }
        
        # Process as they complete
        for i, future in enumerate(as_completed(future_to_article), 1):
            try:
                enriched_article = future.result()
                enriched.append(enriched_article)
                
                if enriched_article.get('content_enriched'):
                    success_count += 1
                
                # Progress update every 100 articles
                if i % 100 == 0 or i == total:
                    log(f"  Progress: {i}/{total} articles processed ({success_count} enriched)")
                    
            except Exception as e:
                article = future_to_article[future]
                log(f"  ⚠️ Failed to enrich {article.get('url', 'unknown')}: {e}")
                enriched.append(article)  # Keep original
    
    success_rate = (success_count / total * 100) if total > 0 else 0
    log(f"\n✅ Enrichment complete: {success_count}/{total} articles ({success_rate:.1f}% success rate)")
    
    return enriched


def main():
    """Main execution"""
    start_time = datetime.now()
    
    log("=" * 60)
    log("Starting Article Content Enrichment")
    log("=" * 60)
    
    # Load raw articles
    input_file = TMP_DIR / f"raw_articles_{TODAY}.json"
    
    if not input_file.exists():
        log(f"❌ Error: {input_file} not found")
        log("   Run aggregate_feeds.py first")
        sys.exit(1)
    
    log(f"📖 Loading articles from {input_file}")
    
    with open(input_file) as f:
        data = json.load(f)
    
    articles = data.get('articles', [])
    log(f"   Found {len(articles)} articles to enrich\n")
    
    # Enrich articles
    enriched_articles = enrich_articles_batch(articles)
    
    # Calculate stats
    avg_original_length = sum(len(a.get('raw_content', '')) for a in articles) / len(articles)
    avg_enriched_length = sum(a.get('content_length', 0) for a in enriched_articles) / len(enriched_articles)
    improvement = (avg_enriched_length / avg_original_length) if avg_original_length > 0 else 0
    
    log(f"\n📊 Content Quality Improvement:")
    log(f"   Average original length: {avg_original_length:.0f} chars")
    log(f"   Average enriched length: {avg_enriched_length:.0f} chars")
    log(f"   Improvement: {improvement:.1f}x\n")
    
    # Save enriched articles
    output_file = TMP_DIR / f"enriched_articles_{TODAY}.json"
    
    output_data = {
        'generated_date': datetime.now().isoformat(),
        'article_count': len(enriched_articles),
        'enrichment_stats': {
            'success_rate': f"{(sum(1 for a in enriched_articles if a.get('content_enriched')) / len(enriched_articles) * 100):.1f}%",
            'avg_original_length': int(avg_original_length),
            'avg_enriched_length': int(avg_enriched_length),
            'improvement_factor': f"{improvement:.1f}x"
        },
        'articles': enriched_articles
    }
    
    with open(output_file, 'w') as f:
        json.dump(output_data, f, indent=2)
    
    log(f"💾 Saved enriched articles to {output_file}")
    
    # Calculate execution time
    duration = (datetime.now() - start_time).total_seconds()
    log(f"\n⏱️  Total execution time: {duration:.2f} seconds")
    log("=" * 60)


if __name__ == '__main__':
    main()
