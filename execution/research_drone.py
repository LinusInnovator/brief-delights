#!/usr/bin/env python3
"""
Brief Engine x Forces OS Integration - Autonomous Research Drone
This daemon polls Supabase for new `research_missions`, executes deep 
Exa web scrapes, synthesizes spatial intelligence via Claude 3 Haiku, 
and delivers JSON payloads to the Forces OS webhook.
"""

import os
import json
import time
import requests
from dotenv import load_dotenv
from supabase import create_client, Client
from openai import OpenAI

# Load env variables
load_dotenv(dotenv_path=".env")
load_dotenv(dotenv_path="execution/.env")
load_dotenv(dotenv_path="landing/.env.local")

# Setup Local Supabase client (for reading the queue)
SUPABASE_URL: str = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Fatal: Missing Local Supabase credentials in environment.")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Setup Unified Forces Supabase client (for writing payload drops)
UNIFIED_SUPABASE_URL = "https://gyjqbdhyxywlyzvwnwff.supabase.co"
UNIFIED_SUPABASE_KEY = os.environ.get("UNIFIED_SUPABASE_KEY")
if not UNIFIED_SUPABASE_KEY:
    print("❌ Fatal: Missing SUPABASE_SERVICE_ROLE_KEY for Unified Vault.")
    exit(1)

unified_supabase: Client = create_client(UNIFIED_SUPABASE_URL, UNIFIED_SUPABASE_KEY)

# Setup OpenRouter / OpenAI client
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY")
if not OPENROUTER_API_KEY:
    print("❌ Fatal: Missing OPENROUTER_API_KEY.")
    exit(1)

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=OPENROUTER_API_KEY,
)

# Setup Exa
EXA_API_KEY = os.environ.get("EXA_API_KEY")
if not EXA_API_KEY:
    print("⚠️ Warning: EXA_API_KEY not found. Fallback/demo web scraping will fail or be limited.")

def fetch_exa_research(query: str, depth: str) -> str:
    """Uses Exa's powerful neural search to fetch live intelligence."""
    if not EXA_API_KEY:
        return f"Mocked data for query: {query}. (EXA_API_KEY missing)"
    
    headers = {"x-api-key": EXA_API_KEY, "Content-Type": "application/json"}
    payload = {
        "query": query,
        "useAutoprompt": True,
        "numResults": 5 if depth == "rapid" else 10,
        "contents": {"text": {"maxCharacters": 3000}}
    }
    
    try:
        res = requests.post("https://api.exa.ai/search", headers=headers, json=payload, timeout=30)
        res.raise_for_status()
        data = res.json()
        results = data.get("results", [])
        
        context = ""
        for r in results:
            context += f"Source: {r.get('url')}\nTitle: {r.get('title')}\nExtract: {r.get('text')}\n\n---\n\n"
        return context
    except Exception as e:
        print(f"   [!] Exa search error: {e}")
        return ""

def synthesize_spatial_payload(query: str, context: str) -> dict:
    """Synthesizes raw web data into Forces OS Spatial JSON format via LLM."""
    
    system_prompt = """You are the Active Sensory Cortex for an autonomous strategy swarm (Forces OS).
Your task is to analyze massive amounts of raw web scraping data and distill it into precise Spatial Intelligence.

You MUST return ONLY a valid JSON object matching exactly this schema (do not wrap in markdown tags like ```json):
{
  "core_thesis": "A 1-sentence executive summary of the gathered research.",
  "insights": [
    {
      "title": "Short catchy title",
      "description": "Deep tactical implication of the insight",
      "color": "blue"
    }
  ],
  "risks": [
    {
      "title": "Identified Risk",
      "description": "Details of the competitor/market risk",
      "color": "red"
    }
  ],
  "key_quotes": [
    "Raw text quote pulled directly from a Reddit AMA, G2 review, or technical doc."
  ],
  "anomalies": [
    {
      "title": "Weird Signal",
      "description": "Something strange noticed that doesn't fit standard narrative.",
      "color": "orange"
    }
  ]
}"""

    user_prompt = f"""Target Query: "{query}"

Raw Extracted Field Data:
=========================
{context}
=========================

Synthesize this data strictly into the required JSON schema."""

    try:
        response = client.chat.completions.create(
            model="anthropic/claude-3-haiku",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.3
        )
        content = response.choices[0].message.content
        return json.loads(content)
    except Exception as e:
        print(f"   [!] Synthesis error: {e}")
        return {
            "error": "Failed to synthesize data.",
            "core_thesis": "Data ingestion failed.",
            "insights": [],
            "risks": [],
            "key_quotes": [],
            "anomalies": []
        }

def process_mission(mission: dict):
    mission_id = mission['id']
    query = mission['query']
    node_id = mission['node_id']
    webhook_url = mission['webhook_url']
    depth = mission.get('depth', 'rapid')
    
    print(f"\n🛸 Drone Dispatched: Mission {mission_id}")
    print(f"   Target: '{query}'")
    
    # 1. Update status to processing
    try:
        supabase.table("research_missions").update({"status": "processing"}).eq("id", mission_id).execute()
    except Exception as e:
        print(f"   [!] Failed to update status to processing: {e}")
        
    # 2. Gather data
    print("   [1/3] Sweeping data arrays (Exa)...")
    context = fetch_exa_research(query, depth)
    
    # 3. Synthesize with LLM
    print("   [2/3] Synthesizing spatial geometry (Claude)...")
    spatial_data = synthesize_spatial_payload(query, context)
    
    # 4. Project direct drop into Unified Supabase
    print(f"   [3/3] Dropping payload natively into great_crm_brief_dossiers for node '{node_id}'...")
    
    status_to_set = "completed"
    try:
        # We drop the dataset into the Forces Vault
        res = unified_supabase.table('great_crm_brief_dossiers').insert({
            "node_id": node_id,
            "spatial_payload": spatial_data
        }).execute()
        print("   ✅ Insertion positive. Canvas eruption imminent.")
    except Exception as e:
        print(f"   ❌ Unified Vault drop failed: {e}")
        status_to_set = "failed"
        
    # 5. Mark Mission in DB
    try:
        supabase.table("research_missions").update({"status": status_to_set}).eq("id", mission_id).execute()
    except Exception as e:
        print(f"   [!] Failed to finalize mission status: {e}")

def run_daemon(poll_interval: int = 5):
    """Runs a continuous polling loop looking for pending missions."""
    print("📡 Brief Engine Base Station online.")
    print(f"   Drone array listening for Forces OS dispatch (Polling every {poll_interval}s)...")
    
    while True:
        try:
            res = supabase.table("research_missions").select("*").eq("status", "pending").order("created_at").limit(1).execute()
            if res.data and len(res.data) > 0:
                process_mission(res.data[0])
            else:
                time.sleep(poll_interval)
        except Exception as e:
            # Prevent rapid failure loops
            print(f"\n⚠️ Daemon polling error (Retrying in {poll_interval}s): {e}")
            time.sleep(poll_interval)

if __name__ == "__main__":
    run_daemon()
