#!/usr/bin/env python3
"""
Snell Model Router Helper for Brief Delights
Queries https://model.delights.pro/api/v1/route to dynamically fetch optimal OpenRouter models.
"""

import os
import requests

SNELL_ROUTER_URL = os.getenv("MODEL_DELIGHTS_BASE_URL", "https://model.delights.pro/api/v1/route")
SNELL_GOD_KEY = os.getenv("INTERNAL_GOD_KEY")


def get_recommended_models(intent: str = "drafting", default_primary: str = "deepseek/deepseek-v4-flash-0731", default_fallback: str = "google/gemini-2.5-flash") -> tuple:
    """
    Fetch (primary_model, fallback_model) from Snell API Gateway.
    Falls back gracefully to DeepSeek-V4-Flash / Gemini 2.5 Flash if gateway key or endpoint is unreachable.
    """
    if not SNELL_GOD_KEY:
        print(f"ℹ️ INTERNAL_GOD_KEY secret not set, using default models: {default_primary}, {default_fallback}")
        return default_primary, default_fallback

    try:
        headers = {
            "Authorization": f"Bearer {SNELL_GOD_KEY}",
            "Content-Type": "application/json"
        }
        url = f"{SNELL_ROUTER_URL}?intent={intent}"
        resp = requests.get(url, headers=headers, timeout=4)
        if resp.status_code == 200:
            data = resp.json()
            flagship = data.get("flagship", {}).get("model")
            fallbacks = data.get("fallback_array", [])
            
            primary = flagship or (fallbacks[0] if fallbacks else default_primary)
            fallback = fallbacks[1] if len(fallbacks) > 1 else default_fallback
            
            # Print Snell Router recommendation
            print(f"🌐 [SNELL ROUTER] Intent '{intent}' -> Primary: {primary} | Fallback: {fallback}")
            return primary, fallback
    except Exception as e:
        print(f"⚠️ Snell Router offline ({e}), using defaults: {default_primary}, {default_fallback}")
    
    return default_primary, default_fallback
