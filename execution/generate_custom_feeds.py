#!/usr/bin/env python3
"""
Custom Feed Generator
Scrapes sources that lack native RSS feeds (Anthropic, The Information, Gartner, Stanford HAI)
and synthesizes valid XML files for aggregate_feeds.py to ingest locally.
"""

import requests
from bs4 import BeautifulSoup
from datetime import datetime
import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
TMP_DIR = PROJECT_ROOT / ".tmp"
TMP_DIR.mkdir(exist_ok=True)

USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'

def fetch_html(url: str):
    try:
        headers = {'User-Agent': USER_AGENT}
        resp = requests.get(url, headers=headers, timeout=10)
        resp.raise_for_status()
        return resp.text
    except Exception as e:
        print(f"❌ Error fetching {url}: {e}")
        return None

def write_rss(filename, title, link, description, items):
    """
    items is a list of dicts with: title, link, description
    """
    rss = f'''<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
<channel>
  <title>{title}</title>
  <link>{link}</link>
  <description>{description}</description>
'''
    import html
    for item in items:
        pub_date = datetime.now().strftime("%a, %d %b %Y %H:%M:%S +0000")
        rss += f'''  <item>
    <title>{html.escape(item.get('title', ''))}</title>
    <link>{html.escape(item.get('link', ''))}</link>
    <description>{html.escape(item.get('description', ''))}</description>
    <pubDate>{pub_date}</pubDate>
  </item>
'''
    rss += '''</channel>
</rss>'''
    
    out_path = TMP_DIR / filename
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(rss)
    print(f"✅ Generated synthetic RSS feed: {out_path} ({len(items)} items)")

def scrape_anthropic():
    url = "https://www.anthropic.com/news"
    html_content = fetch_html(url)
    items = []
    if html_content:
        soup = BeautifulSoup(html_content, 'html.parser')
        # Anthropic news links
        for a in soup.find_all('a', href=True):
            if '/news/' in a['href'] and len(a['href']) > 15:
                title = a.get_text(strip=True)
                if not title or title.lower() in ['read more', 'news']:
                    continue
                link = a['href']
                if link.startswith('/'):
                    link = 'https://www.anthropic.com' + link
                if not any(i['link'] == link for i in items):
                    items.append({"title": title, "link": link})
    
    write_rss("custom_feed_anthropic.xml", "Anthropic Research", url, "Anthropic AI News", items[:10])

def scrape_the_information():
    url = "https://www.theinformation.com/"
    html_content = fetch_html(url)
    items = []
    if html_content:
        soup = BeautifulSoup(html_content, 'html.parser')
        for h2 in soup.find_all(['h2', 'h3']):
            a = h2.find('a', href=True)
            if a:
                title = a.get_text(strip=True)
                link = a['href']
                if link.startswith('/'):
                    link = 'https://www.theinformation.com' + link
                if not any(i['link'] == link for i in items):
                    items.append({"title": title, "link": link})
    
    write_rss("custom_feed_theinformation.xml", "The Information", url, "Exclusive Tech News", items[:10])

def scrape_gartner():
    url = "https://www.gartner.com/en/articles"
    html_content = fetch_html(url)
    items = []
    if html_content:
        soup = BeautifulSoup(html_content, 'html.parser')
        for a in soup.find_all('a', href=True):
            if '/en/articles/' in a['href']:
                title = a.get_text(strip=True)
                if len(title) > 20: 
                    link = a['href']
                    if link.startswith('/'):
                        link = 'https://www.gartner.com' + link
                    if not any(i['link'] == link for i in items):
                        items.append({"title": title, "link": link})
                        
    write_rss("custom_feed_gartner.xml", "Gartner Strategic Trends", url, "Gartner Insights", items[:10])

def scrape_stanford_hai():
    url = "https://hai.stanford.edu/news"
    html_content = fetch_html(url)
    items = []
    if html_content:
        soup = BeautifulSoup(html_content, 'html.parser')
        for h3 in soup.find_all(['h3', 'h2']):
            a = h3.find('a', href=True)
            if a:
                title = a.get_text(strip=True)
                link = a['href']
                if link.startswith('/'):
                    link = 'https://hai.stanford.edu' + link
                if not any(i['link'] == link for i in items):
                    items.append({"title": title, "link": link})
                    
    write_rss("custom_feed_stanfordhai.xml", "Stanford HAI", url, "Stanford Human-Centered AI", items[:10])

def main():
    print("=" * 60)
    print("Generating custom local RSS feeds for non-syndicated sources...")
    print("=" * 60)
    scrape_anthropic()
    scrape_the_information()
    scrape_gartner()
    scrape_stanford_hai()
    print("Synthetic RSS generation complete.")

if __name__ == '__main__':
    main()
