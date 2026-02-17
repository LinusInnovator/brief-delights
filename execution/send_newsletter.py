#!/usr/bin/env python3
"""
Newsletter Send Script - Segment-Based Version
Sends segmented newsletters via Resend API.

NEW: Includes fallback to yesterday's newsletter if today's fails.
"""

import json
import os
import sys
from datetime import datetime, timedelta, timezone as dt_timezone
from pathlib import Path
from collections import defaultdict
import time
import re
import random
from zoneinfo import ZoneInfo
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
EMAIL_SENDER = os.getenv("EMAIL_SENDER", "Brief Delights <hello@send.dreamvalidator.com>")

# Supabase configuration
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

# Newsletter config
NEWSLETTER_NAME = "Briefly"
BATCH_SIZE = 100
RATE_LIMIT_DELAY = 1  # seconds between batches

# A/B subject line variants
SUBJECT_VARIANTS = {
    "A": "Brief Delights for {segment} - {date}",
    "B": "📬 {segment}: your daily tech brief is here",
}


def log(message: str):
    """Log to console"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {message}")


def load_subscribers():
    """Load and group subscribers by segment from Supabase (with JSON fallback)"""
    # Try Supabase first (primary source)
    if SUPABASE_URL and SUPABASE_KEY:
        try:
            supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
            result = supabase.table('subscribers').select('email, segment, referral_code, referral_count, timezone').eq('status', 'confirmed').execute()
            
            if result.data and len(result.data) > 0:
                by_segment = defaultdict(list)
                for sub in result.data:
                    segment = sub.get('segment', 'leaders')
                    by_segment[segment].append(sub)
                log(f"📊 Loaded {len(result.data)} subscribers from Supabase")
                return dict(by_segment)
            else:
                log("⚠️ No confirmed subscribers found in Supabase")
        except Exception as e:
            log(f"⚠️ Supabase subscriber fetch failed: {e}, falling back to JSON")
    
    # Fallback to subscribers.json
    if SUBSCRIBERS_FILE.exists():
        log("📄 Using subscribers.json fallback")
        with open(SUBSCRIBERS_FILE, 'r') as f:
            data = json.load(f)
        
        by_segment = defaultdict(list)
        for sub in data.get('subscribers', []):
            if sub.get('status') in ('active', 'confirmed'):
                segment = sub.get('segment', 'leaders')
                by_segment[segment].append(sub)
        
        return dict(by_segment)
    
    log("❌ No subscriber source available")
    return {}


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


def inject_sponsor(html_content: str, sponsor: dict | None, segment_id: str = '') -> str:
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
    
    # Wrap sponsor CTA URL with click tracking
    cta_url = sponsor.get('cta_url', '#')
    schedule_id = sponsor.get('schedule_id')
    if schedule_id:
        # Route through tracking endpoint for click counting
        from urllib.parse import urlencode, quote
        track_params = urlencode({
            'url': cta_url,
            'segment': segment_id,
            'sponsor_schedule_id': schedule_id
        })
        tracked_url = f"https://brief.delights.pro/api/track?{track_params}"
    else:
        tracked_url = cta_url
    
    # Replace template variables
    replacements = {
        '{{ sponsor_headline }}': sponsor.get('headline', ''),
        '{{ sponsor_description }}': sponsor.get('description', ''),
        '{{ sponsor_cta_text }}': sponsor.get('cta_text', 'Learn More →'),
        '{{ sponsor_cta_url }}': tracked_url,
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


# Referral tier definitions
REFERRAL_TIERS = [
    (1, "Founding Reader badge"),
    (3, "Sunday Deep Dive access"),
    (5, "All 3 segments unlocked"),
    (10, "Newsletter shoutout"),
]


def personalize_referral(html_content: str, subscriber: dict) -> str:
    """Replace referral placeholders with subscriber-specific data"""
    code = subscriber.get('referral_code', '')
    count = subscriber.get('referral_count', 0) or 0
    
    # Find next milestone
    next_milestone = 10
    next_reward = "Newsletter shoutout"
    for tier_count, tier_reward in REFERRAL_TIERS:
        if count < tier_count:
            next_milestone = tier_count
            next_reward = tier_reward
            break
    
    plural = "s" if count != 1 else ""
    remaining = max(next_milestone - count, 0)
    
    # Calculate progress bar width (capped at 100%)
    progress_width = min(count * 10, 100)
    
    # Milestone style: highlight achieved milestones
    achieved_style = "color: #4f46e5; font-weight: 600;"
    
    html = html_content
    html = html.replace('{{ referral_code }}', code or 'NONE')
    html = html.replace('{{ referral_count }}', str(count))
    html = html.replace('{{ referral_count_plural }}', plural)
    html = html.replace('{{ referral_next_milestone }}', str(next_milestone))
    html = html.replace('{{ referral_next_reward }}', next_reward)
    
    # Replace the "X more to unlock" expression
    html = html.replace('{{ referral_remaining }}', str(remaining))
    
    # Replace milestone styles
    html = html.replace('MILESTONE_1_STYLE', achieved_style if count >= 1 else '')
    html = html.replace('MILESTONE_3_STYLE', achieved_style if count >= 3 else '')
    html = html.replace('MILESTONE_5_STYLE', achieved_style if count >= 5 else '')
    html = html.replace('MILESTONE_10_STYLE', achieved_style if count >= 10 else '')
    
    # Replace progress bar width
    html = html.replace('PROGRESS_BAR_WIDTH', str(progress_width))
    
    return html


def send_email(subscriber: dict, html_content: str, segment_name: str, ab_enabled: bool = True) -> dict:
    """Send email to individual subscriber"""
    try:
        # Personalize referral section for this subscriber
        personalized_html = personalize_referral(html_content, subscriber)
        
        # A/B subject line
        date_str = datetime.now().strftime('%B %d, %Y')
        segment_short = segment_name.split()[0]
        if ab_enabled:
            variant = random.choice(['A', 'B'])
            subject = SUBJECT_VARIANTS[variant].format(segment=segment_short, date=date_str)
        else:
            variant = 'none'
            subject = SUBJECT_VARIANTS['A'].format(segment=segment_short, date=date_str)
        
        response = resend.Emails.send({
            "from": EMAIL_SENDER,
            "to": subscriber['email'],
            "subject": subject,
            "html": personalized_html
        })
        
        return {
            "email": subscriber['email'],
            "status": "success",
            "message_id": response.get('id'),
            "subject_variant": variant,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        return {
            "email": subscriber['email'],
            "status": "failed",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }


def send_to_segment(segment_id: str, subscribers: list, html_content: str, segment_name: str, ab_enabled: bool = True) -> dict:
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
            result = send_email(subscriber, html_content, segment_name, ab_enabled=ab_enabled)
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
    parser.add_argument('--no-ab', action='store_true', help='Disable A/B subject line testing')
    parser.add_argument('--send-window', type=int, default=None,
                       help='Target local hour for send (e.g. 8 = send to subscribers where it is ~8 AM). Omit to send to everyone.')
    args = parser.parse_args()
    
    start_time = datetime.now()
    
    try:
        log("=" * 60)
        if args.weekly:
            log("Starting Weekly Insights Delivery")
        else:
            log("Starting Segment-Based Newsletter Delivery")
        log("=" * 60)
        
        ab_enabled = not getattr(args, 'no_ab', False)
        if ab_enabled:
            log("📊 A/B subject line testing: ENABLED")
        
        # Load segments and subscribers
        segments_data = load_segments_config()
        segments_by_sub = load_subscribers()
        
        log(f"\n📊 Found subscribers in {len(segments_by_sub)} segments:")
        for seg_id, subs in segments_by_sub.items():
            log(f"  {seg_id}: {len(subs)} subscribers")
        
        # Timezone-based send window filtering
        if args.send_window is not None:
            target_hour = args.send_window
            utc_now = datetime.now(dt_timezone.utc)
            filtered_by_sub = {}
            total_filtered = 0
            for seg_id, subs in segments_by_sub.items():
                eligible = []
                for s in subs:
                    tz_name = s.get('timezone', 'UTC') or 'UTC'
                    try:
                        local_hour = utc_now.astimezone(ZoneInfo(tz_name)).hour
                    except Exception:
                        local_hour = utc_now.hour  # fallback to UTC
                    # ±1 hour window
                    if abs(local_hour - target_hour) <= 1 or abs(local_hour - target_hour) >= 23:
                        eligible.append(s)
                if eligible:
                    filtered_by_sub[seg_id] = eligible
                total_filtered += len(subs) - len(eligible)
            log(f"\n🕐 Send window: {target_hour}:00 local time (±1h)")
            log(f"   {sum(len(s) for s in filtered_by_sub.values())} eligible, {total_filtered} deferred")
            segments_by_sub = filtered_by_sub
        
        # Send to each segment
        all_results = {}
        fallback_used = {}  # Track which segments used fallback
        
        # Weekly gating: minimum referrals to receive Deep Dive
        WEEKLY_REFERRAL_GATE = 3
        TEASER_TEMPLATE = PROJECT_ROOT / "newsletter_teaser_weekly.html"
        
        for segment_id, subscribers in segments_by_sub.items():
            try:
                segment_config = segments_data['segments'][segment_id]
                segment_name = f"{segment_config['name']} {segment_config['emoji']}"
                
                # Load segment-specific newsletter (with fallback support)
                html_content, is_fallback = load_newsletter_html(segment_id, weekly=args.weekly, use_fallback=True)
                fallback_used[segment_id] = is_fallback
                
                # Inject sponsor content
                sponsor = get_sponsor_for_segment(segment_id)
                html_content = inject_sponsor(html_content, sponsor, segment_id)
                
                if args.weekly:
                    # Gate weekly Deep Dive behind referral count
                    unlocked = [s for s in subscribers if (s.get('referral_count') or 0) >= WEEKLY_REFERRAL_GATE]
                    locked = [s for s in subscribers if (s.get('referral_count') or 0) < WEEKLY_REFERRAL_GATE]
                    
                    log(f"\n🔓 Weekly gate: {len(unlocked)} unlocked, {len(locked)} locked (need {WEEKLY_REFERRAL_GATE}+ referrals)")
                    
                    # Send full Deep Dive to unlocked subscribers
                    results = send_to_segment(segment_id, unlocked, html_content, segment_name, ab_enabled=ab_enabled)
                    
                    # Send teaser to locked subscribers
                    if locked and TEASER_TEMPLATE.exists():
                        teaser_html = TEASER_TEMPLATE.read_text(encoding='utf-8')
                        # Inject segment name into teaser
                        teaser_html = teaser_html.replace('{{ segment_name }}', segment_name)
                        teaser_results = send_to_segment(segment_id, locked, teaser_html, f"{segment_name} (teaser)", ab_enabled=ab_enabled)
                        results['sent'] += teaser_results['sent']
                        results['failed'] += teaser_results['failed']
                        results['details'].extend(teaser_results['details'])
                        results['teaser_sent'] = teaser_results['sent']
                    elif locked:
                        log(f"  ⚠️ Teaser template not found, skipping {len(locked)} locked subscribers")
                else:
                    # Daily: send to everyone
                    results = send_to_segment(segment_id, subscribers, html_content, segment_name, ab_enabled=ab_enabled)
                
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
