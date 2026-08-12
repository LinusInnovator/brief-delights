#!/usr/bin/env python3
"""
Robust LLM Router with Triple-Layer Provider & Model Failover
Wraps OpenAI/OpenRouter client calls with automated retries across primary & backup models/providers.
"""

import os
import time
from typing import Any, Dict, List, Optional
from openai import OpenAI


def get_failover_models(primary_model: str, fallback_model: str) -> List[str]:
    """Build prioritized list of models to try in sequence"""
    candidates = [
        primary_model,
        fallback_model,
        "google/gemini-2.5-flash",
        "openai/gpt-4o-mini",
        "deepseek/deepseek-v4-flash-0731",
        "anthropic/claude-3.5-haiku"
    ]
    seen = set()
    result = []
    for model in candidates:
        if model and model not in seen:
            seen.add(model)
            result.append(model)
    return result


def robust_chat_completion(
    client: OpenAI,
    messages: List[Dict[str, str]],
    primary_model: str = "deepseek/deepseek-v4-flash-0731",
    fallback_model: str = "google/gemini-2.5-flash",
    response_format: Optional[Dict[str, Any]] = None,
    temperature: float = 0.7,
    max_tokens: Optional[int] = None,
    timeout: int = 45
) -> Any:
    """
    Execute chat completion with automatic model & provider failover retries.
    Returns the response completion object.
    """
    models_to_try = get_failover_models(primary_model, fallback_model)
    last_exception = None

    for model in models_to_try:
        for attempt in range(2):  # 2 attempts per model
            try:
                kwargs = {
                    "model": model,
                    "messages": messages,
                    "temperature": temperature,
                    "timeout": timeout
                }
                if response_format:
                    kwargs["response_format"] = response_format
                if max_tokens:
                    kwargs["max_tokens"] = max_tokens

                response = client.chat.completions.create(**kwargs)
                return response
            except Exception as e:
                last_exception = e
                print(f"⚠️ [LLM Failover] Model {model} attempt {attempt+1} failed: {e}")
                time.sleep(1)

    print(f"❌ [LLM Failover] All models failed. Last error: {last_exception}")
    raise last_exception
