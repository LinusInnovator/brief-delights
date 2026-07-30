import asyncio
from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig

async def extract_markdown_from_source(source_def: dict) -> str:
    """
    Extracts markdown from various source types (youtube, reddit, web) 
    using Crawl4AI.
    """
    # This acts as our omni-channel abstraction layer
    print(f"Scraping [{source_def['type']}]: {source_def['url']}")
    
    # Stealth Browser Configuration
    browser_config = BrowserConfig(
        headless=True,
        headers={
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9",
        }
    )

    # Aggressive Anti-Bot Bypass Run Configuration
    run_config = CrawlerRunConfig(
        magic=True,
        simulate_user=True,      # Simulates realistic mouse movements & scrolling
        override_navigator=True, # Overrides webdriver properties to look human
        bypass_cache=True,
        delay_before_return_html=2.0 # Allow time for JS-heavy anti-bot checks to resolve
    )

    async with AsyncWebCrawler(config=browser_config, verbose=True) as crawler:
        result = await crawler.arun(
            url=source_def['url'],
            config=run_config
        )
        
        if not result.success:
            print(f"Failed to scrape {source_def['url']}: {result.error_message}")
            return ""
            
        return result.markdown

# To test it manually
if __name__ == "__main__":
    source = {
        "type": "website",
        "url": "https://example.com",
        "extraction_goal": "article"
    }
    markdown = asyncio.run(extract_markdown_from_source(source))
    print(markdown)
