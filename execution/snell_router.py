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


# Blocklist of premium/flagship model patterns that must NEVER be used by the pipeline
EXPENSIVE_MODEL_PATTERNS = [
    "fable", "opus", "sonnet", "gpt-5", "grok",
    "claude-3-opus", "claude-3.5-sonnet", "command-r-plus"
]

SAFE_BUDGET_MODELS = [
    "deepseek/deepseek-v4.1-flash",
    "deepseek/deepseek-v4-flash-0731",
    "google/gemini-2.5-flash",
    "google/gemini-2.5-flash-lite",
    "openai/gpt-4o-mini"
]


def is_safe_cheap_model(model_name: str, max_cost: float = 0.50, reported_cost: float = None) -> bool:
    """Validate that a model is strictly in the ultra-low-cost tier and not a flagship."""
    if not model_name:
        return False
    lower = model_name.lower()
    # Explicitly block any known flagship keywords
    for pattern in EXPENSIVE_MODEL_PATTERNS:
        if pattern in lower:
            print(f"🚨 [COST GUARD] Blocked expensive model: {model_name}")
            return False
    # Check reported cost per million tokens if available
    if reported_cost is not None and reported_cost > max_cost:
        print(f"🚨 [COST GUARD] Model {model_name} cost (${reported_cost}/1M) exceeds limit (${max_cost}/1M)")
        return False
    return True


def get_recommended_models(
    intent: str = "drafting",
    default_primary: str = "deepseek/deepseek-v4.1-flash",
    default_fallback: str = "google/gemini-2.5-flash",
    strategy: str = "price_performance",
    max_cost_per_m: float = 0.50
) -> tuple:
    """
    Fetch (primary_model, fallback_model) dynamically from Snell API Gateway.
    Strictly enforces ultra-low-cost models (<$0.50/1M tokens) and rejects any expensive flagships.
    """
    # Allow optional environment override if explicitly set by admin
    env_primary = os.getenv("PRIMARY_LLM_MODEL")
    if env_primary and is_safe_cheap_model(env_primary, max_cost_per_m):
        print(f"🔒 [SNELL ROUTER] Admin PRIMARY_LLM_MODEL override: {env_primary}")
        return env_primary, default_fallback

    if not SNELL_GOD_KEY:
        print(f"ℹ️ INTERNAL_GOD_KEY secret not set, using default budget models: {default_primary}, {default_fallback}")
        return default_primary, default_fallback

    try:
        headers = {
            "Authorization": f"Bearer {SNELL_GOD_KEY}",
            "Content-Type": "application/json"
        }
        params = {
            "intent": intent,
            "policy": "max_savings",
            "strategy": strategy,
            "max_cost_per_m": max_cost_per_m,
            "mode": "value_optimized"
        }
        resp = requests.get(SNELL_ROUTER_URL, headers=headers, params=params, timeout=4)

        if resp.status_code == 200:
            data = resp.json()

            # 1. Look for smart_value (the actual key returned by Snell Gateway for budget tier)
            smart_val_obj = data.get("smart_value") or {}
            smart_val_model = smart_val_obj.get("model") if isinstance(smart_val_obj, dict) else None
            smart_val_cost = smart_val_obj.get("cost_per_1m") if isinstance(smart_val_obj, dict) else None

            candidate_primary = smart_val_model or data.get("value_model") or data.get("optimal")

            # Validate primary candidate against Cost Guard
            if candidate_primary and is_safe_cheap_model(candidate_primary, max_cost_per_m, smart_val_cost):
                primary = candidate_primary
            else:
                primary = default_primary

            # Pick a safe fallback from budget list
            candidate_fallbacks = [
                m for m in data.get("fallback_array", [])
                if is_safe_cheap_model(m, max_cost_per_m) and m != primary
            ]
            fallback = candidate_fallbacks[0] if candidate_fallbacks else default_fallback

            print(f"🌐 [SNELL ROUTER Gateway] Intent '{intent}' -> Primary: {primary} | Fallback: {fallback} (Cost Guard Active)")
            return primary, fallback
    except Exception as e:
        print(f"⚠️ Snell Router offline ({e}), using budget defaults: {default_primary}, {default_fallback}")

    return default_primary, default_fallback
