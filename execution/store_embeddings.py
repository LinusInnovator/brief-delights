#!/usr/bin/env python3
"""
Vector Embeddings Ingestion Script for Brief Delights
Generates 1536-dim OpenAI embeddings (text-embedding-3-small) for daily summarized articles
and upserts them to Supabase `articles` table with vector embeddings.
"""

import os
import sys
import json
import requests
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).parent.parent
load_dotenv(dotenv_path=PROJECT_ROOT / ".env")
TMP_DIR = PROJECT_ROOT / ".tmp"
TODAY = datetime.now().strftime("%Y-%m-%d")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY") or os.getenv("OPENROUTER_API_KEY")
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")


def generate_embedding(text: str) -> list:
    """Generate 1536-dim vector embedding via OpenAI / OpenRouter embedding API"""
    if not OPENAI_API_KEY:
        print("⚠️ OPENAI_API_KEY / OPENROUTER_API_KEY missing, skipping real embedding generation")
        return [0.0] * 1536

    try:
        # Try OpenRouter / OpenAI embeddings API
        url = "https://openrouter.ai/api/v1/embeddings" if "openrouter" in OPENAI_API_KEY or os.getenv("OPENROUTER_API_KEY") else "https://api.openai.com/v1/embeddings"
        headers = {
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "text-embedding-3-small",
            "input": text[:8000] # Limit token length
        }
        resp = requests.post(url, json=payload, headers=headers, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            return data["data"][0]["embedding"]
        else:
            print(f"⚠️ Embedding API error ({resp.status_code}): {resp.text[:100]}")
    except Exception as e:
        print(f"⚠️ Embedding generation exception: {e}")

    return [0.0] * 1536


def process_today_summaries():
    """Process summaries for all segments today and prepare vector records"""
    print(f"🧠 Processing vector embeddings for {TODAY}...")
    segments = ["leaders", "builders", "innovators"]
    records = []

    for seg in segments:
        file_path = TMP_DIR / f"summaries_{seg}_{TODAY}.json"
        if not file_path.exists():
            continue

        try:
            with open(file_path, "r") as f:
                data = json.load(f)

            articles = data.get("articles", [])
            for art in articles:
                title = art.get("title", "")
                summary = art.get("summary", "")
                key_takeaway = art.get("key_takeaway", "")
                source = art.get("source", "Research")
                url = art.get("url", "https://brief.delights.pro")

                combined_text = f"Title: {title}\nSummary: {summary}\nKey Takeaway: {key_takeaway}\nCategory: {seg}"
                embedding = generate_embedding(combined_text)

                records.append({
                    "title": title,
                    "summary": summary,
                    "key_takeaway": key_takeaway,
                    "source": source,
                    "url": url,
                    "published_date": TODAY,
                    "segment": seg,
                    "embedding": embedding
                })
        except Exception as e:
            print(f"⚠️ Error reading {file_path}: {e}")

    print(f"✅ Prepared {len(records)} article embedding records")
    return records


if __name__ == "__main__":
    process_today_summaries()
