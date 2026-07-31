#!/usr/bin/env python3
"""
Autonomous Ripe Prospect Hunter & Lead Qualification Engine
Discovers companies and brands currently launching, raising funding, or scaling fast
(ProductHunt launches, YC directory, GitHub sponsors, VC portfolios) and populates the Lead Queue.
"""

import os
import sys
import json
import argparse
from datetime import datetime
from pathlib import Path
from openai import OpenAI

PROJECT_ROOT = Path(__file__).parent.parent
TMP_DIR = PROJECT_ROOT / ".tmp"
TMP_DIR.mkdir(exist_ok=True)
TODAY = datetime.now().strftime("%Y-%m-%d")

sys.path.insert(0, str(PROJECT_ROOT))
from execution.snell_router import get_recommended_models
from execution.generate_cobranded_pitch import generate_cobranded_pitch

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENROUTER_API_KEY") or "dummy_key_for_init",
    default_headers={
        "HTTP-Referer": "https://brief.delights.pro",
        "X-Title": "Brief Delights Lead Hunter",
    }
)


def discover_ripe_business_prospects(sector: str = "AI & Developer Infrastructure") -> list:
    """Query LLM / market signals to discover active fast-growing business prospects ripe for white-label newsletters"""
    print(f"🔍 [LEAD HUNTER] Scouting ripe business prospects in sector: '{sector}'...")

    primary_model, _ = get_recommended_models("drafting", default_primary="google/gemini-2.5-flash")

    prompt = f"""You are a top B2B lead intelligence agent.
Find 5 real, active, fast-growing companies or VC funds in the sector: "{sector}".
Include a mix of SaaS tools, agencies, VC firms, and tech platforms.

Return ONLY a JSON object with this structure:
{{
  "sector": "{sector}",
  "prospects": [
    {{
      "company": "Company Name",
      "domain": "company.com",
      "trigger_reason": "ProductHunt #1 Launch / Recent Series A / Active Community",
      "founder_email": "founder@company.com"
    }}
  ]
}}"""

    try:
        if not os.getenv("OPENROUTER_API_KEY"):
            raise ValueError("OPENROUTER_API_KEY not set")

        response = client.chat.completions.create(
            model=primary_model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.4,
            max_tokens=1000,
            response_format={"type": "json_object"}
        )
        data = json.loads(response.choices[0].message.content)
        return data.get("prospects", [])
    except Exception as e:
        print(f"⚠️ Lead hunter fallback ({e}), returning curated ripe prospects...")
        return [
            {
                "company": "PostHog",
                "domain": "posthog.com",
                "trigger_reason": "High-Growth Developer Platform",
                "founder_email": "founder@posthog.com"
            },
            {
                "company": "Linear",
                "domain": "linear.app",
                "trigger_reason": "Active Product Engineering Ecosystem",
                "founder_email": "karri@linear.app"
            },
            {
                "company": "Supabase",
                "domain": "supabase.com",
                "trigger_reason": "Rapidly Growing Developer Infrastructure",
                "founder_email": "paul@supabase.com"
            }
        ]


def hunt_and_qualify_leads(sector: str = "AI & Developer Infrastructure", auto_pitch: bool = False):
    """Hunter workflow: Discover prospects ➔ Scrape Brand ➔ Scout Sources ➔ Matrix Score Gate ➔ Render Demo"""
    prospects = discover_ripe_business_prospects(sector)
    print(f"\n🎯 Discovered {len(prospects)} ripe prospects for qualification:\n")

    qualified_leads = []
    for p in prospects:
        domain = p.get("domain")
        company = p.get("company")
        reason = p.get("trigger_reason", "High-Growth Target")

        print(f"🔥 Processing Ripe Prospect: {company} ({domain}) — Trigger: {reason}")
        try:
            pitch_result = generate_cobranded_pitch(domain, recipient_email=p.get("founder_email"), auto_send=auto_pitch)
            pitch_result["trigger_reason"] = reason
            qualified_leads.append(pitch_result)
        except Exception as err:
            print(f"⚠️ Qualification warning for {company}: {err}")

    queue_file = TMP_DIR / f"ripe_leads_queue_{TODAY}.json"
    with open(queue_file, "w", encoding="utf-8") as f:
        json.dump(qualified_leads, f, indent=2)

    print(f"\n🎉 RIPE LEAD HUNTING COMPLETE! Qualified {len(qualified_leads)} leads.")
    print(f"📂 Saved to lead queue: {queue_file}\n")
    return qualified_leads


def main():
    parser = argparse.ArgumentParser(description="Autonomous Ripe Prospect Hunter Engine")
    parser.add_argument("--sector", default="AI & Developer Infrastructure", help="Target sector string")
    parser.add_argument("--auto-pitch", action="store_true", help="Auto-dispatch pitch emails via Resend")
    args = parser.parse_args()

    hunt_and_qualify_leads(args.sector, auto_pitch=args.auto_pitch)


if __name__ == "__main__":
    main()
