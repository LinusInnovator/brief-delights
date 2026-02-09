#!/usr/bin/env python3
"""
Newsletter Send Script - Segment-Based Version
Sends segmented newsletters via Resend API.
"""

import json
import os
from datetime import datetime
from pathlib import Path
from collections import defaultdict
import time
from dotenv import load_dotenv
import resend

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
EMAIL_SENDER = os.getenv("EMAIL_SENDER", "newsletter@send.dreamvalidator.com")

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


def load_newsletter_html(segment_id: str, weekly: bool = False) -> str:
    """Load segment-specific newsletter HTML"""
    if weekly:
        newsletter_file = TMP_DIR / f"newsletter_weekly_{segment_id}_{TODAY}.html"
    else:
        newsletter_file = TMP_DIR / f"newsletter_{segment_id}_{TODAY}.html"
    
    if not newsletter_file.exists():
        raise FileNotFoundError(f"Newsletter not found for segment {segment_id}: {newsletter_file}")
    
    with open(newsletter_file, 'r') as f:
        return f.read()


def send_email(subscriber: dict, html_content: str, segment_name: str) -> dict:
    """Send email to individual subscriber"""
    try:
        response = resend.Emails.send({
            "from": EMAIL_SENDER,
            "to": subscriber['email'],
            "subject": f"{NEWSLETTER_NAME} {segment_name} - {datetime.now().strftime('%B %d, %Y')}",
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
        
        for segment_id, subscribers in segments_by_sub.items():
            try:
                segment_config = segments_data['segments'][segment_id]
                segment_name = f"{segment_config['name']} {segment_config['emoji']}"
                
                # Load segment-specific newsletter
                html_content = load_newsletter_html(segment_id, weekly=args.weekly)
                
                # Send to this segment
                results = send_to_segment(segment_id, subscribers, html_content, segment_name)
                all_results[segment_id] = results
                
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
        
        for segment_id, results in all_results.items():
            log(f"  {segment_id}: {results['sent']} sent, {results['failed']} failed")
        
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
