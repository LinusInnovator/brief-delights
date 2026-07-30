import os
import json
import asyncio
import sys
import urllib.parse
from pathlib import Path
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Ensure environment variables are loaded
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig
from crawl4ai.extraction_strategy import LLMExtractionStrategy
from crawl4ai.async_configs import LLMConfig

class Creator(BaseModel):
    name: str = Field(description="Name of the creator or publication")
    urls: list[str] = Field(description="Array of direct URLs to their active platforms (Must prioritize YouTube, Substack, LinkedIn. Include X/Twitter last)")
    vibe: str = Field(description="Short description of their content style and topics")
    match_score: int = Field(description="Score from 1-100 on how closely they match the anchor creator")

async def scout_for_creators(anchor_name: str, niche_topic: str):
    """
    Uses Crawl4AI to search the web and extract verified URLs of similar creators.
    """
    print(f"🕵️‍♂️ SCOUT AGENT INITIATED")
    print(f"🎯 Anchor: {anchor_name}")
    print(f"📚 Topic: {niche_topic}")
    
    # Use standard DuckDuckGo search or Google search
    query = f"top creators like {anchor_name} {niche_topic} twitter newsletter"
    encoded_query = urllib.parse.quote_plus(query)
    search_url = f"https://duckduckgo.com/?q={encoded_query}"
    
    print(f"🔍 Crawling search aggregator: {search_url}")
    
    instruction = f"""
    You are an expert Media Researcher. Look at these search results and identify up to 5 specific creators, 
    newsletters, or publications that are highly similar to '{anchor_name}' and talk about '{niche_topic}'.
    For each creator, extract an array of their active profile URLs. 
    Crucially, prioritize finding their YouTube channel, Substack, or LinkedIn over Twitter/X.
    Ignore generic sites like pinterest or unrelated aggregators. We need the actual source URLs.
    """

    # We use the OpenRouter API key to power Crawl4AI's extraction strategy
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        raise ValueError("OPENROUTER_API_KEY is missing from .env")

    extraction_strategy = LLMExtractionStrategy(
        llm_config=LLMConfig(
            provider="openrouter/openai/gpt-4o",
            api_token=api_key,
        ),
        schema=Creator.model_json_schema(),
        extraction_type="schema",
        instruction=instruction,
        extra_args={"temperature": 0.1} # Low temp for accurate data extraction
    )

    # Advanced Stealth Configuration
    browser_config = BrowserConfig(
        headless=True,
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9",
        }
    )

    run_config = CrawlerRunConfig(
        extraction_strategy=extraction_strategy,
        bypass_cache=True,
        magic=True,                  # Core bot bypass
        simulate_user=True,          # Mouse movements
        override_navigator=True,     # Spoof webdriver properties
        delay_before_return_html=3.0 # Wait for JS search results to render
    )

    async with AsyncWebCrawler(config=browser_config, verbose=True) as crawler:
        result = await crawler.arun(
            url=search_url,
            config=run_config
        )
        
        if not result.success:
            print(f"❌ Crawl failed: {result.error_message}")
            return None
            
        print("\n✅ CRAWL COMPLETE. Extracted Data:")
        # LLMExtractionStrategy returns a JSON string representation of a list of the Pydantic models
        try:
            creators = json.loads(result.extracted_content)
            print(json.dumps(creators, indent=2))
            return creators
        except Exception as e:
            print("Failed to parse extracted JSON.")
            print(result.extracted_content)
            return None

if __name__ == "__main__":
    anchor = sys.argv[1] if len(sys.argv) > 1 else "Greg Isenberg"
    topic = sys.argv[2] if len(sys.argv) > 2 else "startup ideas and community building"
    
    asyncio.run(scout_for_creators(anchor, topic))
