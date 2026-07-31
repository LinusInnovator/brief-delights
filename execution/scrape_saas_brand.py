#!/usr/bin/env python3
"""
SaaS Brand & Lead Scraper Module
Scrapes target SaaS domain URLs to extract brand logos, CSS accent colors, ICP keywords, and company metadata.
"""

import os
import sys
import json
import re
import argparse
from pathlib import Path
from urllib.parse import urlparse, urljoin
import requests
from bs4 import BeautifulSoup
from openai import OpenAI

PROJECT_ROOT = Path(__file__).parent.parent
TMP_DIR = PROJECT_ROOT / ".tmp"
TMP_DIR.mkdir(exist_ok=True)

sys.path.insert(0, str(PROJECT_ROOT))
from execution.snell_router import get_recommended_models

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENROUTER_API_KEY") or "dummy_key_for_init",
    default_headers={
        "HTTP-Referer": "https://brief.delights.pro",
        "X-Title": "Brief Delights Brand Scraper",
    }
)


def extract_brand_assets(url: str) -> dict:
    """Scrape domain for logo, theme colors, title, and meta description"""
    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    parsed_domain = urlparse(url).netloc or urlparse(url).path
    clean_domain = parsed_domain.replace("www.", "")
    company_name = clean_domain.split(".")[0].capitalize()

    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    logo_url = f"https://www.google.com/s2/favicons?domain={clean_domain}&sz=128"
    brand_color = "#3b82f6"  # Default accent blue
    page_text = ""

    try:
        resp = requests.get(url, headers=headers, timeout=8)
        if resp.status_code == 200:
            soup = BeautifulSoup(resp.text, 'html.parser')

            # 1. Look for theme-color meta tag or primary CSS colors
            theme_meta = soup.find('meta', attrs={'name': 'theme-color'})
            if theme_meta and theme_meta.get('content'):
                brand_color = theme_meta['content']
            else:
                style_text = " ".join([s.get_text() for s in soup.find_all('style')])
                color_match = re.search(r'--(?:primary|brand|accent)[-a-z]*:\s*(#[0-9a-fA-F]{3,6}|rgb\([^)]+\))', style_text)
                if color_match:
                    brand_color = color_match.group(1)

            # 2. Extract official logotype (SVG / PNG img or icon link)
            logo_img = soup.find('img', attrs={'src': re.compile(r'logo', re.I)}) or soup.find('img', attrs={'alt': re.compile(r'logo', re.I)})
            if logo_img and logo_img.get('href'):
                logo_url = urljoin(url, logo_img['href'])
            elif logo_img and logo_img.get('src'):
                logo_url = urljoin(url, logo_img['src'])
            else:
                icon_link = soup.find('link', rel=lambda x: x and ('apple-touch-icon' in x or 'icon' in x))
                if icon_link and icon_link.get('href'):
                    logo_url = urljoin(url, icon_link['href'])

            # 3. Extract og:image banner separately
            og_img = soup.find('meta', property='og:image')
            if og_img and og_img.get('content'):
                banner_url = og_img['content'] if og_img['content'].startswith('http') else urljoin(url, og_img['content'])

            # Extract page text for ICP analysis
            page_text = soup.get_text(separator=' ', strip=True)[:3000]

    except Exception as e:
        print(f"⚠️ Web scraping warning for {url}: {e}")

    # Use LLM to infer company ICP keyword and value prop
    icp_keyword = f"{company_name} Technology & Innovation"
    if os.getenv("OPENROUTER_API_KEY") and page_text:
        try:
            primary_model, _ = get_recommended_models("drafting", default_primary="google/gemini-2.5-flash")
            prompt = f"""Analyze this website text for {company_name} ({url}):
"{page_text[:1500]}"

In 3 to 5 words, what is the exact target ICP/industry niche for this company?
(e.g., "Developer Analytics", "AI Product Engineering", "Post-Quantum Security", "HR & Payroll SaaS").

Return ONLY a JSON object: {{"company_name": "{company_name}", "icp_keyword": "Your 3-5 word summary"}}"""

            res = client.chat.completions.create(
                model=primary_model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                max_tokens=100,
                response_format={"type": "json_object"}
            )
            data = json.loads(res.choices[0].message.content)
            icp_keyword = data.get("icp_keyword", icp_keyword)
        except Exception as llm_err:
            print(f"⚠️ LLM ICP inference fallback ({llm_err})")

    return {
        "domain": clean_domain,
        "name": company_name,
        "url": url,
        "logo_url": logo_url,
        "brand_color": brand_color,
        "icp_keyword": icp_keyword,
        "founder_email": f"founder@{clean_domain}"
    }


def main():
    parser = argparse.ArgumentParser(description="Scrape SaaS domain brand assets and ICP")
    parser.add_argument("--url", required=True, help="Target SaaS URL (e.g. posthog.com)")
    args = parser.parse_args()

    brand_data = extract_brand_assets(args.url)
    print("\n============================================================")
    print("🎨 SAAS BRAND & ICP ASSET EXTRACTION COMPLETE")
    print("============================================================")
    print(json.dumps(brand_data, indent=2))
    print("============================================================\n")

    output_path = TMP_DIR / f"brand_{brand_data['domain'].replace('.', '_')}.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(brand_data, f, indent=2)

    print(f"✅ Saved brand assets to {output_path}")


if __name__ == "__main__":
    main()
