#!/usr/bin/env python3
"""
Newsletter Send Script - Segment-Based Version
Sends segmented newsletters via Resend API.

NEW: Includes fallback to yesterday's newsletter if today's fails.
"""

import json
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path
from collections import defaultdict
import time
import re
from dotenv import load_dotenv
import resend
from supabase import create_client, Client

# Add utils to path
UTILS_DIR = Path(__file__).parent / "utils"
sys.path.insert(0, str(UTILS_DIR))

from newsletter_archive import NewsletterArchive

# Load environment variables
load_dotenv()

# Configuration
PROJECT_ROOT = Path(__file__).parent.parent
TMP_DIR = PROJECT_ROOT / ".tmp"
TODAY = datetime.now().strftime("%Y-%m-%d")

SUBSCRIBERS_FILE = PROJECT_ROOT / "subscribers.json"
SEGMENTS_CONFIG_FILE = PROJECT_ROOT / "segments_config.json"
LOG_FILE = TMP_DIR / f"send_log_{TODAY}.json"

# Resend configuration
resend.api_key = os.getenv("RESEND_API_KEY")
EMAIL_SENDER = os.getenv("EMAIL_SENDER", "brief@send.dreamvalidator.com")

# Supabase configuration
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

# Newsletter config
NEWSLETTER_NAME = "Briefly"
BATCH_SIZE = 100
RATE_LIMIT_DELAY = 1  # seconds between batches


def log(message: str):
    """Log to console"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {message}")


def load_subscribers():
    """Load and group subscribers by segment"""
    with open(SUBSCRIBERS_FILE, 'r') as f:
        data = json.load(f)
    
    # Group active subscribers by segment
    by_segment = defaultdict(list)
    for sub in data['subscribers']:
        if sub.get('status') == 'active':
            segment = sub.get('segment', 'leaders')  # Default to leaders
            by_segment[segment].append(sub)
    
    return dict(by_segment)


def load_segments_config():
    """Load segment configurations"""
    with open(SEGMENTS_CONFIG_FILE, 'r') as f:
        return json.load(f)


def load_newsletter_html(segment_id: str, weekly: bool = False, use_fallback: bool = True) -> tuple[str, bool]:
    """Load segment-specific newsletter HTML with fallback support
    
    Returns:
        tuple: (html_content, is_fallback)
    """
    if weekly:
        newsletter_file = TMP_DIR / f"newsletter_weekly_{segment_id}_{TODAY}.html"
    else:
        newsletter_file = TMP_DIR / f"newsletter_{segment_id}_{TODAY}.html"
    
    # Try today's newsletter first
    if newsletter_file.exists():
        with open(newsletter_file, 'r') as f:
            return f.read(), False
    
    # If not found and fallback enabled, try yesterday's
    if use_fallback:
        log(f"⚠️ Today's newsletter not found for {segment_id}, trying fallback...")
        archive = NewsletterArchive(TMP_DIR)
        fallback_path = archive.get_fallback_newsletter(segment_id)
        
        if fallback_path:
            with open(fallback_path, 'r') as f:
                html = f.read()
            
            # Extract date from fallback filename
            fallback_date = fallback_path.stem.split('_')[-1]
            modified_html = archive.modify_fallback_header(html, fallback_date)
            
            log(f"✅ Using fallback newsletter from {fallback_date}")
            return modified_html, True
    
    raise FileNotFoundError(f"Newsletter not found for segment {segment_id} and no fallback available")


def get_sponsor_for_segment(segment_id: str) -> dict | None:
    """Fetch scheduled or default sponsor from Supabase for today's segment"""
    if not SUPABASE_URL or not SUPABASE_KEY:
        log("⚠️ Supabase not configured, skipping sponsor injection")
        return None
    
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        result = supabase.rpc('get_sponsor_for_newsletter', {
            'target_date': TODAY,
            'target_segment': segment_id
        }).execute()
        
        if result.data and len(result.data) > 0:
            sponsor = result.data[0]
            is_default = sponsor.get('is_default', False)
            log(f"  💰 Sponsor: {sponsor['company']} ({'default' if is_default else 'scheduled'})")
            return sponsor
        else:
            log(f"  ℹ️ No sponsor found for {segment_id} on {TODAY}")
            return None
    except Exception as e:
        log(f"  ⚠️ Sponsor lookup failed: {e}")
        return None


def inject_sponsor(html_content: str, sponsor: dict | None) -> str:
    """Inject sponsor template variables into newsletter HTML"""
    if not sponsor:
        # Remove the sponsor section entirely if no sponsor
        html_content = re.sub(
            r'\{%\s*if\s+sponsor_headline\s*%\}.*?\{%\s*endif\s*%\}',
            '',
            html_content,
            flags=re.DOTALL
        )
        return html_content
    
    # Replace template variables
    replacements = {
        '{{ sponsor_headline }}': sponsor.get('headline', ''),
        '{{ sponsor_description }}': sponsor.get('description', ''),
        '{{ sponsor_cta_text }}': sponsor.get('cta_text', 'Learn More →'),
        '{{ sponsor_cta_url }}': sponsor.get('cta_url', '#'),
    }
    
    for key, value in replacements.items():
        html_content = html_content.replace(key, value)
    
    # Remove the Jinja if/endif wrappers (they're not processed by a template engine here)
    html_content = re.sub(r'\{%\s*if\s+sponsor_headline\s*%\}', '', html_content)
    html_content = re.sub(r'\{%\s*endif\s*%\}', '', html_content)
    
    return html_content


def mark_sponsor_sent(sponsor: dict, segment_id: str):
    """Update sponsor_schedule status to sent after newsletter is delivered"""
    schedule_id = sponsor.get('schedule_id')
    if not schedule_id or not SUPABASE_URL or not SUPABASE_KEY:
        return
    
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        supabase.table('sponsor_schedule').update({
            'status': 'sent',
            'newsletter_slug': f"{segment_id}_{TODAY}"
        }).eq('id', schedule_id).execute()
        log(f"  ✅ Sponsor schedule marked as sent")
    except Exception as e:
        log(f"  ⚠️ Failed to update sponsor schedule: {e}")


def send_email(subscriber: dict, html_content: str, segment_name: str) -> dict:
    """Send email to individual subscriber"""
    try:
        response = resend.Emails.send({
            "from": EMAIL_SENDER,
            "to": subscriber['email'],
            "subject": f"Brief Delights for {segment_name.split()[0]} - {datetime.now().strftime('%B %d, %Y')}",
            "html": html_content
        })
        
        return {
            "email": subscriber['email'],
            "status": "success",
            "message_id": response.get('id'),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        return {
            "email": subscriber['email'],
            "status": "failed",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }


def send_to_segment(segment_id: str, subscribers: list, html_content: str, segment_name: str) -> dict:
    """Send newsletter to all subscribers in a segment"""
    log(f"\n📧 Sending to {segment_name} segment ({len(subscribers)} subscribers)")
    
    results = {
        "sent": 0,
        "failed": 0,
        "details": []
    }
    
    # Process in batches
    for i in range(0, len(subscribers), BATCH_SIZE):
        batch = subscribers[i:i + BATCH_SIZE]
        batch_num = (i // BATCH_SIZE) + 1
        total_batches = (len(subscribers) + BATCH_SIZE - 1) // BATCH_SIZE
        
        log(f"  Batch {batch_num}/{total_batches} ({len(batch)} emails)")
        
        for subscriber in batch:
            result = send_email(subscriber, html_content, segment_name)
            results['details'].append(result)
            
            if result['status'] == 'success':
                results['sent'] += 1
                log(f"    ✅ {subscriber['email']}")
            else:
                results['failed'] += 1
                log(f"    ❌ {subscriber['email']}: {result['error']}")
        
        # Rate limiting between batches
        if i + BATCH_SIZE < len(subscribers):
            time.sleep(RATE_LIMIT_DELAY)
    
    return results


def save_send_log(all_results: dict):
    """Save complete send log"""
    output = {
        "date": TODAY,
        "timestamp": datetime.now().isoformat(),
        "total_sent": sum(r['sent'] for r in all_results.values()),
        "total_failed": sum(r['failed'] for r in all_results.values()),
        "segments": all_results
    }
    
    with open(LOG_FILE, 'w') as f:
        json.dump(output, f, indent=2)
    
    log(f"\n📝 Send log saved to {LOG_FILE}")


def main():
    """Main execution"""
    import argparse
    parser = argparse.ArgumentParser(description='Send newsletters')
    parser.add_argument('--segment', help='Specific segment to send (optional)')
    parser.add_argument('--weekly', action='store_true', help='Send weekly insights instead of daily')
    args = parser.parse_args()
    
    start_time = datetime.now()
    
    try:
        log("=" * 60)
        if args.weekly:
            log("Starting Weekly Insights Delivery")
        else:
            log("Starting Segment-Based Newsletter Delivery")
        log("=" * 60)
        
        # Load segments and subscribers
        segments_data = load_segments_config()
        segments_by_sub = load_subscribers()
        
        log(f"\n📊 Found subscribers in {len(segments_by_sub)} segments:")
        for seg_id, subs in segments_by_sub.items():
            log(f"  {seg_id}: {len(subs)} subscribers")
        
        # Send to each segment
        all_results = {}
        fallback_used = {}  # Track which segments used fallback
        
        for segment_id, subscribers in segments_by_sub.items():
            try:
                segment_config = segments_data['segments'][segment_id]
                segment_name = f"{segment_config['name']} {segment_config['emoji']}"
                
                # Load segment-specific newsletter (with fallback support)
                html_content, is_fallback = load_newsletter_html(segment_id, weekly=args.weekly, use_fallback=True)
                fallback_used[segment_id] = is_fallback
                
                # Inject sponsor content
                sponsor = get_sponsor_for_segment(segment_id)
                html_content = inject_sponsor(html_content, sponsor)
                
                # Send to this segment
                results = send_to_segment(segment_id, subscribers, html_content, segment_name)
                results['used_fallback'] = is_fallback
                results['sponsor'] = sponsor.get('company', 'none') if sponsor else 'none'
                all_results[segment_id] = results
                
                # Mark sponsor as sent
                if sponsor:
                    mark_sponsor_sent(sponsor, segment_id)
                
            except Exception as e:
                log(f"❌ Failed to send to segment {segment_id}: {str(e)}")
                all_results[segment_id] = {
                    "sent": 0,
                    "failed": len(subscribers),
                    "error": str(e),
                    "details": []
                }
        
        # Save complete log
        save_send_log(all_results)
        
        # Summary
        total_sent = sum(r['sent'] for r in all_results.values())
        total_failed = sum(r['failed'] for r in all_results.values())
        
        log("\n" + "=" * 60)
        log("📊 DELIVERY SUMMARY")
        log("=" * 60)
        log(f"  Total sent: {total_sent}")
        log(f"  Total failed: {total_failed}")
        
        # Check if any fallbacks were used
        fallbacks_count = sum(1 for r in all_results.values() if r.get('used_fallback', False))
        if fallbacks_count > 0:
            log(f"  ⚠️ Fallback newsletters used: {fallbacks_count} segments")
        
        for segment_id, results in all_results.items():
            fallback_indicator = " (FALLBACK)" if results.get('used_fallback', False) else ""
            log(f"  {segment_id}: {results['sent']} sent, {results['failed']} failed{fallback_indicator}")
        
        # Log execution time
        elapsed = (datetime.now() - start_time).total_seconds()
        log(f"\n⏱️ Total execution time: {elapsed:.2f} seconds")
        
        return True
        
    except Exception as e:
        log(f"\n❌ FATAL ERROR: {str(e)}")
        import traceback
        log(traceback.format_exc())
        return False


if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
