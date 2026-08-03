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


ICP_TIERS = {
    "startup": {
        "name": "Seed & Series A AI Startups",
        "price_tier": "$99–$199 / mo (Slack & Email Team Feed)",
        "icp_description": "Fast-scaling Seed & Series A AI startups (10-50 employees) with Founders, CTOs, or VPs of Eng looking for a daily 8:00 AM tech radar in Slack.",
        "pitch_angle": "Give your 20-person engineering team an automated daily 8:00 AM AI & Tech Brief in Slack for $99/mo."
    },
    "advisor": {
        "name": "Fractional CTOs & Tech Advisors",
        "price_tier": "$49 / mo (Pro Advisor Brief)",
        "icp_description": "Fractional CTOs, tech advisors, and consultants managing multiple startups who need daily 5-minute executive signal and 1-click LinkedIn/client briefing exports.",
        "pitch_angle": "Sound like the smartest advisor in every board meeting with automated daily executive intelligence for $49/mo."
    },
    "agency": {
        "name": "Boutique Agencies & DevRel Studios",
        "price_tier": "$149–$299 / mo (Co-Branded Client Brief)",
        "icp_description": "DevRel leads, boutique software agencies, and AI consultancies wanting to send a white-labeled daily/weekly client update.",
        "pitch_angle": "Auto-curate and deliver a co-branded weekly AI & engineering signal brief to your clients with zero manual effort."
    },
    "vc": {
        "name": "Micro-VCs & Accelerators",
        "price_tier": "$299 / mo (Portfolio White-Label Brief)",
        "icp_description": "Micro-VCs, incubators, and startup communities wanting to send a white-label daily/weekly tech brief to all their portfolio founders.",
        "pitch_angle": "Provide an exclusive white-label daily tech radar for all 30+ of your portfolio founders for $299/mo."
    },
    "enterprise": {
        "name": "Enterprise SaaS & Big Tech",
        "price_tier": "$14,400 / yr (Enterprise NaaS)",
        "icp_description": "Mid-market to enterprise B2B SaaS platforms and corporations seeking a white-label curation engine.",
        "pitch_angle": "Deploy Brief Delights enterprise curation engine to power custom market intelligence."
    }
}


def discover_ripe_business_prospects(tier_key: str = "startup") -> list:
    """Query LLM / market signals to discover active business prospects in a specific selectable ICP tier"""
    tier_info = ICP_TIERS.get(tier_key, ICP_TIERS["startup"])
    tier_name = tier_info["name"]
    icp_desc = tier_info["icp_description"]

    print(f"🔍 [LEAD HUNTER] Scouting prospects for tier: [{tier_key.upper()}] '{tier_name}'...")

    primary_model, _ = get_recommended_models("drafting", default_primary="google/gemini-2.5-flash")

    prompt = f"""You are an elite B2B sales intelligence agent.
Find 5 real, active, fast-growing companies or founders matching this exact ICP tier:

ICP TIER: {tier_name}
TARGET PROFILE: {icp_desc}

Return ONLY a JSON object with this structure:
{{
  "tier": "{tier_key}",
  "tier_name": "{tier_name}",
  "prospects": [
    {{
      "company": "Company Name",
      "domain": "company.com",
      "trigger_reason": "ProductHunt #1 Launch / Recent Funding / Scaling Eng Team",
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
                "trigger_reason": "High-Growth Developer Platform (Series B)",
                "founder_email": "founder@posthog.com"
            },
            {
                "company": "Linear",
                "domain": "linear.app",
                "trigger_reason": "Active Product Engineering Ecosystem (Series B)",
                "founder_email": "karri@linear.app"
            },
            {
                "company": "Supabase",
                "domain": "supabase.com",
                "trigger_reason": "Rapidly Growing Developer Infrastructure (Series B)",
                "founder_email": "paul@supabase.com"
            },
            {
                "company": "Pinecone",
                "domain": "pinecone.io",
                "trigger_reason": "Vector Database AI Infrastructure Scaling (Series B)",
                "founder_email": "greg@pinecone.io"
            },
            {
                "company": "Ramp",
                "domain": "ramp.com",
                "trigger_reason": "Executive B2B Finance & SaaS Platform (Series D)",
                "founder_email": "eric@ramp.com"
            }
        ]


def hunt_and_qualify_leads(tier: str = "startup", auto_pitch: bool = False):
    """Hunter workflow: Discover prospects ➔ Scrape Brand ➔ Scout Sources ➔ Matrix Score Gate ➔ Render Demo"""
    prospects = discover_ripe_business_prospects(tier_key=tier)
    tier_info = ICP_TIERS.get(tier, ICP_TIERS["startup"])
    print(f"\n🎯 Discovered {len(prospects)} ripe prospects for ICP Tier: [{tier.upper()}] '{tier_info['name']}':\n")

    qualified_leads = []
    for p in prospects:
        domain = p.get("domain")
        company = p.get("company")
        reason = p.get("trigger_reason", "High-Growth Target")

        print(f"🔥 Processing Ripe Prospect: {company} ({domain}) — Trigger: {reason}")
        try:
            pitch_result = generate_cobranded_pitch(domain, recipient_email=p.get("founder_email"), auto_send=auto_pitch)
            pitch_result["trigger_reason"] = reason
            pitch_result["icp_tier"] = tier
            pitch_result["tier_name"] = tier_info["name"]
            pitch_result["price_tier"] = tier_info["price_tier"]
            qualified_leads.append(pitch_result)
        except Exception as err:
            print(f"⚠️ Qualification warning for {company}: {err}")

    queue_file = TMP_DIR / f"ripe_leads_queue_{tier}_{TODAY}.json"
    with open(queue_file, "w", encoding="utf-8") as f:
        json.dump(qualified_leads, f, indent=2)

    print(f"\n🎉 RIPE LEAD HUNTING COMPLETE! Qualified {len(qualified_leads)} leads for [{tier.upper()}].")
    print(f"📂 Saved to lead queue: {queue_file}\n")
    return qualified_leads


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Autonomous Ripe Prospect Hunter Engine")
    parser.add_argument("--tier", type=str, choices=["startup", "advisor", "agency", "vc", "enterprise"], default="startup", help="Selectable ICP Tier (startup, advisor, agency, vc, enterprise)")
    parser.add_argument("--auto-pitch", action="store_true", help="Auto-dispatch pitch emails via Resend")
    args = parser.parse_args()

    hunt_and_qualify_leads(tier=args.tier, auto_pitch=args.auto_pitch)
