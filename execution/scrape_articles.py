#!/usr/bin/env python3
"""
Article Content Scraper
Extracts full article content for richer editorial insights
"""

import requests
from readability import Document
from bs4 import BeautifulSoup
from newspaper import Article
from typing import Optional
import time
from urllib.parse import urlparse
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Rate limiting
REQUESTS_PER_DOMAIN = {}
MIN_DELAY_SECONDS = 0.5

# Timeout settings
TIMEOUT_SECONDS = 10

# User agent
USER_AGENT = 'Mozilla/5.0 (compatible; BriefDelightsBot/1.0; +https://briefdelights.com/about)'


def rate_limit(url: str):
    """Simple rate limiting per domain"""
    domain = urlparse(url).netloc
    
    if domain in REQUESTS_PER_DOMAIN:
        elapsed = time.time() - REQUESTS_PER_DOMAIN[domain]
        if elapsed < MIN_DELAY_SECONDS:
            time.sleep(MIN_DELAY_SECONDS - elapsed)
    
    REQUESTS_PER_DOMAIN[domain] = time.time()


def fetch_html(url: str) -> Optional[str]:
    """Fetch HTML content from URL"""
    rate_limit(url)
    
    headers = {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=TIMEOUT_SECONDS)
        response.raise_for_status()
        return response.text
    except Exception as e:
        logger.warning(f"Failed to fetch {url}: {e}")
        return None


def extract_with_readability(html: str) -> Optional[str]:
    """Extract article content using readability-lxml"""
    try:
        doc = Document(html)
        soup = BeautifulSoup(doc.summary(), 'html.parser')
        text = soup.get_text(separator='\n', strip=True)
        return text if len(text) > 100 else None
    except Exception as e:
        logger.debug(f"Readability extraction failed: {e}")
        return None


def extract_with_newspaper(url: str, html: str) -> Optional[str]:
    """Extract article content using newspaper3k"""
    try:
        article = Article(url)
        article.download(input_html=html)
        article.parse()
        
        text = article.text
        return text if len(text) > 100 else None
    except Exception as e:
        logger.debug(f"Newspaper extraction failed: {e}")
        return None


def extract_with_bs4(html: str) -> Optional[str]:
    """Fallback: extract from common article containers"""
    try:
        soup = BeautifulSoup(html, 'html.parser')
        
        # Try common article containers
        selectors = [
            'article',
            '[role="main"]',
            '.post-content',
            '.article-content',
            '.entry-content',
            'main',
        ]
        
        for selector in selectors:
            container = soup.select_one(selector)
            if container:
                # Remove script, style, nav, footer
                for tag in container.find_all(['script', 'style', 'nav', 'footer', 'aside']):
                    tag.decompose()
                
                text = container.get_text(separator='\n', strip=True)
                if len(text) > 100:
                    return text
        
        return None
    except Exception as e:
        logger.debug(f"BS4 extraction failed: {e}")
        return None


def clean_text(text: str, max_chars: int = 3000) -> str:
    """Clean and truncate extracted text"""
    # Remove excessive whitespace
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    text = '\n\n'.join(lines)
    
    # Truncate to max_chars (preserve word boundaries)
    if len(text) > max_chars:
        text = text[:max_chars]
        # Find last sentence boundary
        last_period = text.rfind('.')
        if last_period > max_chars * 0.8:  # Keep if we're keeping >80%
            text = text[:last_period + 1]
        else:
            text = text + '...'
    
    return text


def scrape_article(url: str, fallback_content: str = '') -> str:
    """
    Main scraper function
    
    Args:
        url: Article URL to scrape
        fallback_content: RSS snippet to use if scraping fails
    
    Returns:
        Extracted article content or fallback
    """
    logger.info(f"Scraping: {url}")
    
    # Fetch HTML
    html = fetch_html(url)
    if not html:
        logger.warning(f"Failed to fetch HTML, using fallback")
        return fallback_content
    
    # Try extraction strategies in order
    strategies = [
        ('readability', lambda: extract_with_readability(html)),
        ('newspaper', lambda: extract_with_newspaper(url, html)),
        ('bs4', lambda: extract_with_bs4(html)),
    ]
    
    for strategy_name, extract_fn in strategies:
        try:
            content = extract_fn()
            if content:
                cleaned = clean_text(content)
                logger.info(f"✅ Extracted {len(cleaned)} chars using {strategy_name}")
                return cleaned
        except Exception as e:
            logger.debug(f"{strategy_name} failed: {e}")
            continue
    
    # All strategies failed
    logger.warning(f"❌ All strategies failed, using fallback ({len(fallback_content)} chars)")
    return fallback_content


if __name__ == '__main__':
    # Test with a sample URL
    import sys
    
    if len(sys.argv) > 1:
        test_url = sys.argv[1]
    else:
        test_url = 'https://techcrunch.com/2026/02/05/anthropic-releases-opus-4-6-with-new-agent-teams/'
    
    print(f"Testing scraper on: {test_url}\n")
    content = scrape_article(test_url, fallback_content="Fallback RSS snippet here")
    
    print("=" * 80)
    print("EXTRACTED CONTENT:")
    print("=" * 80)
    print(content)
    print("=" * 80)
    print(f"\nLength: {len(content)} characters")
