"""
Automation Runner - Orchestrates all automation modules

Runs after newsletter generation to handle growth, monetization, and analytics.
Each module runs independently with error isolation.
"""

import sys
from pathlib import Path

# Add current directory to path for imports
sys.path.append(str(Path(__file__).parent))

# Import automation modules
from automations.growth.twitter_bot import TwitterBot
from automations.growth.reddit_bot import RedditBot
from automations.monetization.content_sponsor_discovery import ContentSponsorDiscovery
# from automations.growth.reddit_poster import RedditPoster  # TODO: implement
# from automations.monetization.sponsor_matcher import SponsorMatcher  # Future: weekly batch matching


def run_all_automations():
    """
    Run all enabled automation modules
    
    Each module:
    - Checks if it's enabled via feature flags
    - Runs in dry-run mode unless explicitly enabled
    - Handles its own errors (won't crash other modules)
    - Logs results for monitoring
    """
    print("=" * 60)
    print("🤖 BRIEF DELIGHTS - AUTOMATION RUNNER")
    print("=" * 60)
    print()
    
    # List of all automation modules
    modules = [
        TwitterBot(),
        RedditBot(),
        ContentSponsorDiscovery(),  # NEW: Auto-discover sponsors from content
        # Add more modules here as we build them
        # LinkedInEngager(),
        # SourceDiscovery(),  # Future: auto-discover RSS sources
        # AffiliateInjector(),
    ]
    
    results = []
    
    for module in modules:
        print(f"\\n{'─' * 60}")
        print(f"Running: {module.name}")
        print(f"{'─' * 60}")
        
        result = module.safe_run()
        results.append({
            'module': module.name,
            'result': result
        })
    
    print(f"\\n{'=' * 60}")
    print("✅ AUTOMATION RUNNER COMPLETED")
    print(f"{'=' * 60}")
    print()
    print("Summary:")
    for r in results:
        status = r['result'].get('status', 'unknown')
        emoji = {
            'success': '✅',
            'error': '❌',
            'skipped': '⏸️'
        }.get(status, '❓')
        print(f"  {emoji} {r['module']}: {status}")
    
    print()
    return results


if __name__ == "__main__":
    """Run when called directly"""
    run_all_automations()
