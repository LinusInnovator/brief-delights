#!/usr/bin/env python3
"""
Snell Model Router Helper for Brief Delights
Queries https://model.delights.pro/api/v1/route to dynamically fetch optimal OpenRouter models
using dynamic Price-Performance routing strategies without hardcoded model constraints.
"""

import os
import requests

SNELL_ROUTER_URL = os.getenv("MODEL_DELIGHTS_BASE_URL", "https://model.delights.pro/api/v1/route")
SNELL_GOD_KEY = os.getenv("INTERNAL_GOD_KEY")


def get_recommended_models(
    intent: str = "drafting",
    default_primary: str = "deepseek/deepseek-v4-flash-0731",
    default_fallback: str = "google/gemini-2.5-flash",
    strategy: str = "price_performance",
    max_cost_per_m: float = 0.50
) -> tuple:
    """
    Fetch (primary_model, fallback_model) dynamically from Snell API Gateway.
    Passes strategy='price_performance' and max_cost ceilings to ensure Snell selects
    the highest-signal models at the lowest cost tier without hardcoded model strings.
    """
    # Allow optional environment override if explicitly set by admin
    env_primary = os.getenv("PRIMARY_LLM_MODEL")
    if env_primary:
        print(f"🔒 [SNELL ROUTER] Admin PRIMARY_LLM_MODEL override: {env_primary}")
        return env_primary, default_fallback

    if not SNELL_GOD_KEY:
        print(f"ℹ️ INTERNAL_GOD_KEY secret not set, using default models: {default_primary}, {default_fallback}")
        return default_primary, default_fallback

    try:
        headers = {
            "Authorization": f"Bearer {SNELL_GOD_KEY}",
            "Content-Type": "application/json"
        }
        # Dynamic query params requesting price_performance optimal models
        params = {
            "intent": intent,
            "strategy": strategy,
            "max_cost_per_m": max_cost_per_m,
            "mode": "value_optimized"
        }
        resp = requests.get(SNELL_ROUTER_URL, headers=headers, params=params, timeout=4)

        if resp.status_code == 200:
            data = resp.json()
            # Snell Gateway returns value-optimized model array
            optimal_model = data.get("value_model") or data.get("optimal") or data.get("flagship", {}).get("model")
            fallbacks = data.get("fallback_array", [])

            primary = optimal_model or (fallbacks[0] if fallbacks else default_primary)
            fallback = fallbacks[1] if len(fallbacks) > 1 else default_fallback

            print(f"🌐 [SNELL ROUTER Gateway] Intent '{intent}' ({strategy}) -> Primary: {primary} | Fallback: {fallback}")
            return primary, fallback
    except Exception as e:
        print(f"⚠️ Snell Router offline ({e}), using defaults: {default_primary}, {default_fallback}")

    return default_primary, default_fallback
