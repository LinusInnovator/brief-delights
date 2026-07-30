#!/usr/bin/env python3
import os
import json
import uuid
from openai import OpenAI
import sys
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

# Fix python path
sys.path.insert(0, str(Path(__file__).parent.parent))
from config.niche_schema import NicheConfig

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.environ.get("OPENROUTER_API_KEY")
)

def generate_niche_config(prompt: str) -> dict:
    """Uses LLM to structure a new niche configuration based on a simple prompt"""
    print(f"🤖 Radar Agent spinning up config for: '{prompt}'...")
    
    response = client.chat.completions.create(
        model="openai/gpt-4o",
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "system", 
                "content": """You are a Master Media PaaS Architect. Convert the user's niche idea into a structured JSON configuration. 
You must return a valid JSON object matching this schema exactly:
{
  "niche_id": "string (lowercase, no spaces)",
  "niche_name": "string (The title of the newsletter)",
  "audience": "string (Target audience description)",
  "tone": "string (Editorial tone)",
  "sources": [
    {
      "type": "youtube_channel|subreddit|x_list|website",
      "url": "string (A REAL or realistic URL)",
      "extraction_goal": "string (what data to extract)"
    }
  ],
  "output_segments": [
    {
      "title": "string (Segment Title)",
      "type": "deep_dive|bullet_points|analysis",
      "max_words": int
    }
  ]
}

Ensure you generate exactly 4 high-signal sources (at least one subreddit, one youtube, and two websites). Generate exactly 3 output_segments.
"""
            },
            {"role": "user", "content": prompt}
        ]
    )
    
    config_data = json.loads(response.choices[0].message.content)
    # Ensure ID is formatted
    config_data['niche_id'] = str(uuid.uuid4())[:8] + "_" + config_data.get('niche_id', 'niche')
    
    # Save to disk
    niches_dir = Path(__file__).parent.parent / "config" / "niches"
    niches_dir.mkdir(parents=True, exist_ok=True)
    
    filepath = niches_dir / f"{config_data['niche_id']}.json"
    with open(filepath, 'w') as f:
        json.dump(config_data, f, indent=2)
        
    return config_data

if __name__ == "__main__":
    idea = sys.argv[1] if len(sys.argv) > 1 else "A high-end newsletter for Legal Tech startup founders"
    res = generate_niche_config(idea)
    print(f"\n✅ Magic complete! Spawned successfully to config/niches/{res['niche_id']}.json")
    print(json.dumps(res, indent=2))
