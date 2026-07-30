import os
import json
import asyncio
from openai import OpenAI
from pathlib import Path
from dotenv import load_dotenv
import sys

# Ensure imports work when executed from anywhere
sys.path.insert(0, str(Path(__file__).parent.parent))
from execution.omni_scraper import extract_markdown_from_source

env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.environ.get("OPENROUTER_API_KEY")
)

async def apply_lens(markdown_content: str, lens_instruction: str, tone: str, format_type: str) -> str:
    """Passes the raw signal markdown through the cognitive Lens"""
    print(f"🔍 Applying Lens: Formatting for [{format_type}]...")
    
    # Define JSON schema based on format_type
    if format_type == "shortform_video_script":
        system_prompt = f"""You are a master content packager.
Tone: {tone}
Instruction: {lens_instruction}

You MUST return a JSON object with this exact schema:
{{
  "hook": "The first 3 seconds to capture attention",
  "b_roll_suggestions": ["visual cue 1", "visual cue 2"],
  "script_body": "The main narration text",
  "call_to_action": "The final sign-off"
}}"""
    elif format_type == "newsletter_html":
        system_prompt = f"""You are a master content packager.
Tone: {tone}
Instruction: {lens_instruction}

You MUST return a JSON object with this exact schema:
{{
  "headline": "Punchy email subject/header",
  "summary_html": "A fully formatted HTML string (using <p>, <strong>, <ul>) representing the newsletter segment"
}}"""
    elif format_type == "x_thread":
        system_prompt = f"""You are a master content packager.
Tone: {tone}
Instruction: {lens_instruction}

You MUST return a JSON object with this exact schema:
{{
  "tweets": ["Tweet 1 text", "Tweet 2 text", "Tweet 3 text"]
}}"""
    else:
        system_prompt = f"""You are a master content packager.
Tone: {tone}
Instruction: {lens_instruction}

Return a generic JSON extraction:
{{ "content": "Extracted text based on instruction" }}"""

    response = client.chat.completions.create(
        model="openai/gpt-4o", # Can be replaced with Snell SDK routing logic
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"RAW SIGNAL CONTENT:\n\n{markdown_content}"}
        ]
    )
    
    return json.loads(response.choices[0].message.content)

async def process_signal_route(source_url: str, source_type: str, lens_instruction: str, lens_tone: str, package_type: str):
    """End-to-end execution of a single DAG route (Signal -> Lens -> Package)"""
    print(f"\n🚀 [PRISM ENGINE START] Processing route for {source_url}")
    
    # 1. Scrape
    source_def = {"url": source_url, "type": source_type}
    markdown = await extract_markdown_from_source(source_def)
    
    if not markdown:
        print("❌ Scraper failed to retrieve content.")
        return {"error": "Scrape failed"}
        
    print(f"✅ Signal Extracted: {len(markdown)} chars of markdown.")
    
    # 2. Apply Lens & Package (coupled for now in the LLM call)
    package_data = await apply_lens(
        markdown_content=markdown[:15000], # Context limit safety
        lens_instruction=lens_instruction,
        tone=lens_tone,
        format_type=package_type
    )
    
    print(f"✅ Package Generated ({package_type})")
    return package_data

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="https://news.ycombinator.com/item?id=398658")
    parser.add_argument("--lens", default="Extract the core contrarian take.")
    parser.add_argument("--tone", default="Punchy, analytical")
    parser.add_argument("--package", default="shortform_video_script")
    parser.add_argument("--json", action="store_true", help="Output only JSON for API consumption")
    args = parser.parse_args()
    
    if not args.json:
        print("==================================================")
        print("🧪 PRISM ROUTER: DAG SIMULATOR")
        print("==================================================")
    
    result = asyncio.run(process_signal_route(
        source_url=args.url,
        source_type="website",
        lens_instruction=args.lens,
        lens_tone=args.tone,
        package_type=args.package
    ))
    
    if args.json:
        # We need to print *only* the json object, bypassing the prints inside the functions.
        # So we'll emit a special delimiter.
        print("---JSON_START---")
        print(json.dumps(result))
        print("---JSON_END---")
    else:
        print("\n📦 FINAL OUTPUT PACKAGE:")
        print(json.dumps(result, indent=2))
