import os
import json
import uuid
import sys
from openai import OpenAI
from pathlib import Path
from dotenv import load_dotenv

# Fix python path
sys.path.insert(0, str(Path(__file__).parent.parent))

env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.environ.get("OPENROUTER_API_KEY")
)

def scan_for_opportunities():
    print("📡 Initializing Market Fluidity Scanner...")
    
    prompt = """You are an advanced Market Arbitrage AI. 
    Analyze the current internet landscape (tech, business, culture, science) and identify 4 highly specific, UNEXPLOITED niches.
    We are looking for high signal velocity (trending topics) but low competitor density (few existing newsletters).
    
    Return exactly a JSON object with a key 'opportunities' containing an array of 4 objects matching this schema:
    {
      "id": "string (unique)",
      "title": "string (Punchy niche title)",
      "score": int (Arbitrage score from 80-99),
      "trend": "Rising" | "Emerging" | "Exploding",
      "color": "blue" | "purple" | "green" | "orange",
      "desc": "string (Short description of why this is a massive opportunity)"
    }
    """
    
    response = client.chat.completions.create(
        model="openai/gpt-4o",
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": prompt}
        ]
    )
    
    data = json.loads(response.choices[0].message.content)
    
    # Save to cache
    cache_dir = Path(__file__).parent.parent / "config"
    cache_dir.mkdir(parents=True, exist_ok=True)
    with open(cache_dir / 'radar_cache.json', 'w') as f:
        json.dump(data, f, indent=2)
        
    return data

if __name__ == "__main__":
    result = scan_for_opportunities()
    print("---JSON_START---")
    print(json.dumps(result))
    print("---JSON_END---")
