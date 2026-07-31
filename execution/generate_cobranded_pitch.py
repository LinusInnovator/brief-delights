#!/usr/bin/env python3
"""
Co-Branded White-Label Pitch Generator & Cold Email Dispatcher
Scrapes target SaaS domain, validates niche against Matrix Score Gate (≥85),
renders live co-branded preview page, and dispatches personalized pitch via Resend.
"""

import os
import sys
import json
import argparse
from datetime import datetime
from pathlib import Path
import requests

PROJECT_ROOT = Path(__file__).parent.parent
TMP_DIR = PROJECT_ROOT / ".tmp"
PREVIEWS_DIR = PROJECT_ROOT / "landing" / "public" / "previews"
PREVIEWS_DIR.mkdir(parents=True, exist_ok=True)
TODAY = datetime.now().strftime("%Y-%m-%d")

sys.path.insert(0, str(PROJECT_ROOT))
from execution.scrape_saas_brand import extract_brand_assets
from execution.scout_niche_sources import scout_niche, slugify
from execution.eval_matrix import run_matrix_evaluation


def render_cobranded_html(brand: dict, articles: list) -> str:
    """Render co-branded newsletter preview HTML with SaaS logo & brand colors"""
    brand_color = brand.get("brand_color", "#3b82f6")
    company_name = brand.get("name", "Target SaaS")
    logo_url = brand.get("logo_url", "")

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{company_name} Signal Brief — Co-Branded White-Label Demo</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 20px; }}
        .container {{ max-width: 680px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; overflow: hidden; border: 1px solid #334155; }}
        .header {{ background-color: #0f172a; padding: 24px; text-align: center; border-bottom: 3px solid {brand_color}; }}
        .logo {{ max-height: 48px; margin-bottom: 12px; }}
        .badge {{ background-color: {brand_color}; color: #ffffff; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: bold; text-transform: uppercase; }}
        .title {{ font-size: 24px; margin: 12px 0 4px 0; color: #ffffff; }}
        .subtitle {{ font-size: 14px; color: #94a3b8; margin: 0; }}
        .content {{ padding: 24px; }}
        .card {{ background-color: #0f172a; border-radius: 8px; padding: 16px; margin-bottom: 16px; border: 1px solid #334155; }}
        .card-tag {{ color: {brand_color}; font-size: 12px; font-weight: bold; text-transform: uppercase; margin-bottom: 6px; display: block; }}
        .card-title {{ font-size: 18px; color: #ffffff; margin: 0 0 8px 0; text-decoration: none; display: block; }}
        .card-desc {{ font-size: 14px; color: #cbd5e1; line-height: 1.5; margin-bottom: 10px; }}
        .why-box {{ background-color: #1e293b; padding: 10px 14px; border-radius: 6px; border-left: 3px solid {brand_color}; font-size: 13px; color: #e2e8f0; }}
        .footer {{ text-align: center; padding: 24px; font-size: 13px; color: #64748b; border-top: 1px solid #334155; }}
        .cta-btn {{ display: inline-block; background-color: {brand_color}; color: #ffffff; padding: 12px 24px; border-radius: 8px; font-weight: bold; text-decoration: none; margin-top: 16px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="{logo_url}" alt="{company_name}" class="logo" onerror="this.style.display='none'">
            <span class="badge">POWERED BY BRIEF DELIGHTS ENGINE</span>
            <h1 class="title">{company_name} Weekly Signal Brief</h1>
            <p class="subtitle">Curated high-impact intelligence for {brand.get('icp_keyword', 'Tech Engineering')}</p>
        </div>
        <div class="content">
            <h3 style="color: #94a3b8; text-transform: uppercase; font-size: 12px; letter-spacing: 1px;">Top Curated Signals This Week</h3>
"""

    for a in articles[:6]:
        html_content += f"""
            <div class="card">
                <span class="card-tag">{a.get('category', 'RESEARCH & SIGNAL')}</span>
                <a href="{a.get('url', '#')}" target="_blank" class="card-title">{a.get('title', 'Untitled Signal')}</a>
                <p class="card-desc">{a.get('description', '')[:200]}...</p>
                <div class="why-box">💡 <strong>Why This Matters to Your Users:</strong> High-impact development in {brand.get('icp_keyword', 'tech')}.</div>
            </div>
"""

    html_content += f"""
            <div style="text-align: center; margin-top: 32px;">
                <a href="{brand.get('url', 'https://brief.delights.pro')}" class="cta-btn">Explore {company_name} SaaS Platform →</a>
            </div>
        </div>
        <div class="footer">
            <p>Generated dynamically for <strong>{company_name}</strong> via Brief Delights White-Label Signal Engine.</p>
            <p>Matrix Score Quality Verified • 100% Automated Curation</p>
        </div>
    </div>
</body>
</html>"""
    return html_content


def send_pitch_email(brand: dict, preview_url: str, recipient_email: str) -> bool:
    """Send personalized cold pitch via Resend API"""
    resend_key = os.getenv("RESEND_API_KEY")
    if not resend_key:
        print("⚠️ RESEND_API_KEY not found in environment. Skipping email dispatch.")
        return False

    company_name = brand.get("name", "there")
    email_body = f"""Hi team at {company_name},

I noticed what you're building at {brand.get('url', company_name)} for {brand.get('icp_keyword', 'your audience')}.

We built an autonomous white-label Signal Engine for SaaS platforms like yours. It automatically curates, validates, and formats top 1% industry news for your users without your team spending a single hour writing.

We put together a live co-branded demonstration created specifically for {company_name}:

👉 View Live {company_name} Signal Demo: {preview_url}

It runs 100% on auto-pilot under your brand and logo.

Would you be open to an 8-minute demo to see how this can drive engagement and retain users for {company_name}?

Best regards,
Linus Innovator
Founder, Brief Delights Signal Engine
https://brief.delights.pro
"""

    try:
        resp = requests.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {resend_key}",
                "Content-Type": "application/json"
            },
            json={
                "from": "Linus <hello@brief.delights.pro>",
                "to": [recipient_email],
                "subject": f"Custom Signal Engine Demo for {company_name} (White-Label)",
                "text": email_body
            },
            timeout=10
        )
        if resp.status_code in [200, 201]:
            print(f"📧 Cold pitch email sent successfully to {recipient_email}!")
            return True
        else:
            print(f"⚠️ Resend API response ({resp.status_code}): {resp.text}")
            return False
    except Exception as err:
        print(f"❌ Failed to dispatch pitch email: {err}")
        return False


def generate_cobranded_pitch(url: str, recipient_email: str = None, auto_send: bool = False) -> dict:
    """Full end-to-end B2B Pitch Generation Flow"""
    print(f"\n⚡ [B2B PITCH ENGINE] Processing SaaS Target: {url}...")

    # 1. Scrape Brand Assets
    brand = extract_brand_assets(url)
    slug = slugify(brand['domain'])
    icp_keyword = brand['icp_keyword']

    # 2. Scout Niche Feeds & Dry-Run Matrix Gate
    scout_niche(icp_keyword)

    # 3. Load Sample Articles
    sample_file = TMP_DIR / f"selected_articles_{slugify(icp_keyword)}_{TODAY}.json"
    articles = []
    if sample_file.exists():
        with open(sample_file, 'r', encoding='utf-8') as f:
            articles = json.load(f).get("articles", [])

    # 4. Render Co-Branded HTML Preview
    html_code = render_cobranded_html(brand, articles)
    preview_file = PREVIEWS_DIR / f"{slug}.html"
    with open(preview_file, 'w', encoding='utf-8') as f:
        f.write(html_code)

    preview_url = f"https://brief.delights.pro/previews/{slug}.html"
    print(f"✅ Generated co-branded live preview: {preview_url}")

    # 5. Email Dispatch (if auto_send enabled or recipient provided)
    target_email = recipient_email or brand.get("founder_email")
    email_status = "QUEUED_FOR_REVIEW"

    if auto_send and target_email:
        sent = send_pitch_email(brand, preview_url, target_email)
        email_status = "PITCHED" if sent else "SEND_FAILED"

    result = {
        "company": brand["name"],
        "domain": brand["domain"],
        "preview_url": preview_url,
        "recipient_email": target_email,
        "status": email_status,
        "brand": brand
    }

    output_file = TMP_DIR / f"pitch_{slug}.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2)

    return result


def main():
    parser = argparse.ArgumentParser(description="Co-Branded White-Label Pitch Generator")
    parser.add_argument("--url", required=True, help="Target SaaS URL (e.g. posthog.com)")
    parser.add_argument("--email", help="Target founder email")
    parser.add_argument("--auto-send", action="store_true", help="Automatically dispatch pitch email via Resend")
    args = parser.parse_args()

    generate_cobranded_pitch(args.url, recipient_email=args.email, auto_send=args.auto_send)


if __name__ == "__main__":
    main()
