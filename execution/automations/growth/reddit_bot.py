#!/usr/bin/env python3
"""
Reddit Auto-Poster Module
Automatically shares newsletter highlights to relevant subreddits.
"""

import os
import sys
import json
from pathlib import Path
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from automations.base_module import AutomationModule

# Try to import praw (Reddit API), but don't fail if not installed
try:
    import praw
    PRAW_AVAILABLE = True
except ImportError:
    PRAW_AVAILABLE = False


class RedditBot(AutomationModule):
    """Reddit auto-poster for newsletter highlights"""
    
    def __init__(self):
        super().__init__(name="reddit_bot")
        self.reddit = self._init_reddit_api()
        
        # Default subreddits if not in config
        self.subreddits = self.config.get('subreddits', [
            'programming',
            'entrepreneur', 
            'startups'
        ])
        self.max_posts_per_day = self.config.get('max_posts_per_day', 3)
    
    def _init_reddit_api(self):
        """Initialize Reddit API client"""
        if not self.enabled or not PRAW_AVAILABLE:
            return None
        
        try:
            reddit = praw.Reddit(
                client_id=os.getenv('REDDIT_CLIENT_ID'),
                client_secret=os.getenv('REDDIT_CLIENT_SECRET'),
                user_agent='BriefDelights/1.0',
                username=os.getenv('REDDIT_USERNAME'),
                password=os.getenv('REDDIT_PASSWORD')
            )
            return reddit
        except Exception as e:
            self.log(f"Failed to initialize Reddit API: {e}", level="error")
            return None
    
    def run(self) -> dict:
        """Main execution - post to Reddit"""
        if not PRAW_AVAILABLE:
            self.log("⚠️ praw not installed (pip install praw)", level="warning")
            return {"status": "skipped", "reason": "praw_not_installed"}
        
        if not self.reddit:
            self.log("⚠️ Reddit API not initialized", level="warning")
            return {"status": "skipped", "reason": "api_not_initialized"}
        
        # Load today's newsletters
        newsletters = self._load_today_newsletters()
        
        if not newsletters:
            self.log("⚠️ No newsletters found for today", level="warning")
            return {"status": "skipped", "reason": "no_newsletters"}
        
        # Generate Reddit posts
        posts = self._generate_posts(newsletters)
        
        # Limit posts per day
        posts = posts[:self.max_posts_per_day]
        
        if self.dry_run:
            self.log(f"🧪 DRY RUN: Would post {len(posts)} times to Reddit")
            for post in posts:
                self.log(f"  → r/{post['subreddit']}: {post['title'][:60]}...")
            return {"postsGenerated": len(posts), "dry_run": True}
        
        # Actually post to Reddit
        posted = self._post_to_reddit(posts)
        
        return {"postsCreated": len(posted)}
    
    def _load_today_newsletters(self) -> list:
        """Load today's generated newsletters"""
        today = datetime.now().strftime("%Y-%m-%d")
        newsletters_dir = Path(__file__).parent.parent.parent.parent / "landing" / "public" / "newsletters"
        
        newsletters = []
        
        for segment in ["builders", "innovators", "leaders"]:
            newsletter_file = newsletters_dir / f"newsletter_{segment}_{today}.html"
            
            if newsletter_file.exists():
                self.log(f"✅ Loaded newsletter for {segment}")
                
                # Read HTML to extract content
                with open(newsletter_file, 'r') as f:
                    html_content = f.read()
                
                newsletters.append({
                    'segment': segment,
                    'html': html_content,
                    'file': str(newsletter_file)
                })
            else:
                self.log(f"⚠️ Newsletter not found: {newsletter_file.name}")
        
        return newsletters
    
    def _generate_posts(self, newsletters: list) -> list:
        """Generate Reddit posts from newsletters"""
        posts = []
        
        # Post to programming subreddit (builders content)
        builders = next((n for n in newsletters if n['segment'] == 'builders'), None)
        if builders:
            posts.append({
                'subreddit': 'programming',
                'title': '🔧 Daily Tech Brief for Builders - Top Engineering Stories',
                'body': self._create_post_body(builders, 'builders'),
                'segment': 'builders'
            })
        
        # Post to entrepreneur (leaders content)
        leaders = next((n for n in newsletters if n['segment'] == 'leaders'), None)
        if leaders:
            posts.append({
                'subreddit': 'entrepreneur',
                'title': '💼 Daily Tech Brief for Leaders - Strategic Insights',
                'body': self._create_post_body(leaders, 'leaders'),
                'segment': 'leaders'
            })
        
        # Post to startups (innovators content)
        innovators = next((n for n in newsletters if n['segment'] == 'innovators'), None)
        if innovators:
            posts.append({
                'subreddit': 'startups',
                'title': '🚀 Daily Tech Brief for Innovators - Latest AI & Research',
                'body': self._create_post_body(innovators, 'innovators'),
                'segment': 'innovators'
            })
        
        return posts
    
    def _create_post_body(self, newsletter: dict, segment: str) -> str:
        """Create Reddit post body with newsletter highlights"""
        # TODO: Parse HTML and extract top 3 stories
        # For now, simple template
        
        today = datetime.now().strftime("%B %d, %Y")
        
        body = f"""Today's top tech stories curated for {segment}:

📬 **Brief Delights** - Your daily dose of tech insights

We scan 1,000+ articles daily and curate the top 8-10 stories that matter to you.

**Segments:**
- 🔧 Builders: Engineering, infrastructure, tools
- 💼 Leaders: Strategy, funding, market trends  
- 🚀 Innovators: AI research, breakthroughs, emerging tech

📖 Read full newsletter: https://brief.delights.pro/archive

💌 Subscribe: https://brief.delights.pro

---

*Automated curation powered by LLM. 100% free, no ads.*
"""
        
        return body
    
    def _post_to_reddit(self, posts: list) -> list:
        """Actually post to Reddit"""
        posted = []
        
        for post in posts:
            try:
                subreddit = self.reddit.subreddit(post['subreddit'])
                
                # Create post
                submission = subreddit.submit(
                    title=post['title'],
                    selftext=post['body']
                )
                
                self.log(f"✅ Posted to r/{post['subreddit']}: {submission.url}")
                posted.append({
                    'subreddit': post['subreddit'],
                    'url': submission.url,
                    'title': post['title']
                })
                
            except Exception as e:
                self.log(f"❌ Failed to post to r/{post['subreddit']}: {e}", level="error")
        
        return posted


if __name__ == "__main__":
    # Test locally
    bot = RedditBot()
    result = bot.safe_run()
    print(f"\nResult: {result}")
