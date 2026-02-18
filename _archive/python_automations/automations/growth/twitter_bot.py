"""
Twitter Bot - Auto-tweet daily newsletter highlights

Posts top stories from each segment to grow subscriber base.
"""

import os
import json
from datetime import datetime
from pathlib import Path
import sys

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent.parent))

from automations.base_module import AutomationModule


class TwitterBot(AutomationModule):
    """Automatically tweet daily newsletter highlights"""
    
    def __init__(self):
        super().__init__(name="twitter_bot")
        self.api_key = os.getenv('TWITTER_API_KEY')
        self.api_secret = os.getenv('TWITTER_API_SECRET')
        self.access_token = os.getenv('TWITTER_ACCESS_TOKEN')
        self.access_secret = os.getenv('TWITTER_ACCESS_SECRET')
    
    def run(self) -> dict:
        """Main execution - tweet today's highlights"""
        
        # Get today's newsletters
        newsletters = self._load_today_newsletters()
        
        if not newsletters:
            self.log("⚠️  No newsletters found for today", level="warning")
            return {"status": "skipped", "reason": "no_newsletters"}
        
        # Generate tweets for each segment
        tweets = self._generate_tweets(newsletters)
        
        if self.dry_run:
            self.log(f"🧪 DRY RUN: Would post {len(tweets)} tweets")
            for i, tweet in enumerate(tweets, 1):
                self.log(f"Tweet {i}: {tweet[:100]}...")
            return {"tweetsGenerated": len(tweets), "dry_run": True}
        
        # Actually post tweets
        posted = self._post_tweets(tweets)
        
        return {"tweetsPosted": len(posted)}
    
    def _load_today_newsletters(self) -> dict:
        """Load today's generated newsletters from public folder"""
        today = datetime.now().strftime('%Y-%m-%d')
        newsletters_dir = Path(__file__).parent.parent.parent.parent / 'landing' / 'public' / 'newsletters'
        
        newsletters = {}
        segments = self.config.get('segments', ['builders', 'innovators', 'leaders'])
        
        for segment in segments:
            filename = f"newsletter_{segment}_{today}.html"
            filepath = newsletters_dir / filename
            
            if filepath.exists():
                with open(filepath, 'r') as f:
                    newsletters[segment] = f.read()
                self.log(f"✅ Loaded newsletter for {segment}")
            else:
                self.log(f"⚠️  Newsletter not found: {filename}", level="warning")
        
        return newsletters
    
    def _generate_tweets(self, newsletters: dict) -> list:
        """
        Generate engaging tweets from newsletters
        
        TODO: Use LLM to extract top story and create engaging tweet
        For now, using simple template
        """
        tweets = []
        base_url = "https://brief.delights.pro"
        
        for segment, html_content in newsletters.items():
            # Simple extraction (TODO: improve with LLM)
            headline = self._extract_first_headline(html_content)
            
            tweet = f"""🔥 Top insight for {segment} today:

{headline}

Get your daily Brief → {base_url}

#tech #newsletter #{segment}"""
            
            tweets.append(tweet)
        
        return tweets
    
    def _extract_first_headline(self, html: str) -> str:
        """Extract first headline from HTML (simple version)"""
        # TODO: Use proper HTML parsing
        # For now, just return placeholder
        return "Latest tech insights curated just for you"
    
    def _post_tweets(self, tweets: list) -> list:
        """Post tweets to Twitter API"""
        posted = []
        
        # Check if API credentials are set
        if not all([self.api_key, self.api_secret, self.access_token, self.access_secret]):
            self.log("❌ Twitter API credentials not set", level="error")
            return posted
        
        try:
            # TODO: Implement actual Twitter API calls using tweepy
            # For now, just log them
            self.log(f"📤 Would post {len(tweets)} tweets to Twitter")
            posted = tweets
            
        except Exception as e:
            self.log(f"❌ Error posting tweets: {e}", level="error")
        
        return posted


if __name__ == "__main__":
    """Test the Twitter bot locally"""
    bot = TwitterBot()
    result = bot.safe_run()
    print(f"\\nResult: {json.dumps(result, indent=2)}")
