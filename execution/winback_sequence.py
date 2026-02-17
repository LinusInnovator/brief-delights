#!/usr/bin/env python3
"""
Win-Back & List Hygiene Engine
Detects disengaged subscribers and either re-engages or cleans them.

Cost: $0 (Resend API already paid for)

Logic:
- 21 days no opens → Win-back email #1 ("Miss us?")
- 28 days no opens → Win-back email #2 ("Last chance")
- 35 days no opens → Auto-unsubscribe (improves deliverability)

Usage:
    python execution/winback_sequence.py             # Run win-back check
    python execution/winback_sequence.py --dry-run    # Preview only
"""

import json
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List
from dotenv import load_dotenv

load_dotenv()

PROJECT_ROOT = Path(__file__).parent.parent
TMP_DIR = PROJECT_ROOT / ".tmp"

RESEND_API_KEY = os.getenv("RESEND_API_KEY")
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

try:
    from supabase import create_client
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None
except ImportError:
    supabase = None


def log(message: str):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")


# ── Thresholds ──
WINBACK_1_DAYS = 21   # Days without open → first win-back
WINBACK_2_DAYS = 28   # Days without open → last chance
CLEANUP_DAYS = 35     # Days without open → auto-unsubscribe

# ── Email Templates ──

WINBACK_EMAIL_1 = {
    'subject': '👋 We miss you at Brief Delights',
    'body': lambda segment: f"""
<div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="font-size: 48px; margin: 0;">Brief</h1>
  <p style="font-size: 18px; color: #666; letter-spacing: 0.2em;">delights</p>
  
  <p style="font-size: 16px; line-height: 1.6;">Hey there 👋</p>
  
  <p style="font-size: 16px; line-height: 1.6;">
    We noticed you haven't opened Brief Delights in a while. No hard feelings — inboxes get busy!
  </p>
  
  <p style="font-size: 16px; line-height: 1.6;">
    A lot has changed since you last tuned in:
  </p>
  
  <ul style="font-size: 16px; line-height: 1.8;">
    <li>🤔 <strong>Contrarian Signals</strong> — we now surface the minority view when the herd agrees</li>
    <li>📡 <strong>Developing Stories</strong> — tracking how stories evolve across days</li>
    <li>🎯 <strong>200+ curated sources</strong> — our AI scans more feeds than ever</li>
  </ul>
  
  <div style="text-align: center; margin: 28px 0;">
    <a href="https://brief.delights.pro/archive" style="display: inline-block; background: #4f46e5; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px;">
      See what you've been missing →
    </a>
  </div>
  
  <p style="font-size: 14px; color: #999; line-height: 1.6;">
    If Brief Delights isn't for you anymore, no worries. You'll be automatically removed in 2 weeks if you don't open any emails. Or you can 
    <a href="mailto:hello@dreamvalidator.com?subject=Unsubscribe" style="color: #999;">unsubscribe now</a>.
  </p>
</div>
""",
}

WINBACK_EMAIL_2 = {
    'subject': '⏰ Last chance — staying subscribed?',
    'body': lambda segment: f"""
<div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="font-size: 48px; margin: 0;">Brief</h1>
  <p style="font-size: 18px; color: #666; letter-spacing: 0.2em;">delights</p>
  
  <p style="font-size: 16px; line-height: 1.6;">
    We're cleaning up our list to keep deliverability high for our active readers.
  </p>
  
  <p style="font-size: 16px; line-height: 1.6;">
    <strong>You'll be unsubscribed in 7 days</strong> unless you open one of our emails.
  </p>
  
  <div style="background: #fffbeb; border: 1px solid #fbbf24; border-radius: 12px; padding: 20px 24px; margin: 24px 0;">
    <p style="margin: 0; font-size: 16px; font-weight: 600;">Want to stay?</p>
    <p style="margin: 8px 0 0; font-size: 15px; color: #666;">
      Just open this email (you already have!) or click below to confirm.
    </p>
  </div>
  
  <div style="text-align: center; margin: 24px 0;">
    <a href="https://brief.delights.pro" style="display: inline-block; background: #4f46e5; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px;">
      Keep me subscribed ✓
    </a>
  </div>
  
  <hr style="border: none; border-top: 1px solid #e8e8e8; margin: 32px 0;" />
  <p style="font-size: 14px; color: #999;">
    We keep our list clean because it helps our emails actually reach inboxes. Thanks for understanding! 💚
  </p>
</div>
""",
}


def get_disengaged_subscribers() -> Dict[str, List[Dict]]:
    """Find subscribers who haven't opened emails recently"""
    if not supabase:
        log("⚠️  Supabase not available")
        return {'winback_1': [], 'winback_2': [], 'cleanup': []}
    
    try:
        # Get all confirmed subscribers
        result = supabase.table('subscribers').select(
            'id, email, segment, confirmed_at, last_open_at'
        ).eq('status', 'confirmed').execute()
        
        subscribers = result.data or []
        now = datetime.now()
        
        winback_1 = []  # 21 days without open
        winback_2 = []  # 28 days without open
        cleanup = []    # 35 days without open
        
        for sub in subscribers:
            # Use last_open_at if available, otherwise confirmed_at
            last_activity = sub.get('last_open_at') or sub.get('confirmed_at')
            if not last_activity:
                continue
            
            try:
                last_date = datetime.fromisoformat(last_activity.replace('Z', '+00:00')).replace(tzinfo=None)
            except (ValueError, TypeError):
                continue
            
            days_silent = (now - last_date).days
            
            if days_silent >= CLEANUP_DAYS:
                cleanup.append({**sub, 'days_silent': days_silent})
            elif days_silent >= WINBACK_2_DAYS:
                winback_2.append({**sub, 'days_silent': days_silent})
            elif days_silent >= WINBACK_1_DAYS:
                winback_1.append({**sub, 'days_silent': days_silent})
        
        return {
            'winback_1': winback_1,
            'winback_2': winback_2,
            'cleanup': cleanup,
        }
        
    except Exception as e:
        log(f"❌ Failed to query subscribers: {e}")
        return {'winback_1': [], 'winback_2': [], 'cleanup': []}


def send_email(to: str, subject: str, html: str) -> bool:
    """Send an email via Resend"""
    if not RESEND_API_KEY:
        return False
    
    try:
        import urllib.request
        
        payload = json.dumps({
            'from': 'Brief Delights <hello@send.dreamvalidator.com>',
            'to': to,
            'subject': subject,
            'html': html,
        }).encode('utf-8')
        
        req = urllib.request.Request(
            'https://api.resend.com/emails',
            data=payload,
            headers={
                'Authorization': f'Bearer {RESEND_API_KEY}',
                'Content-Type': 'application/json',
            },
            method='POST'
        )
        
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status == 200
        
    except Exception as e:
        log(f"  ❌ Send failed: {e}")
        return False


def unsubscribe(subscriber_id: str) -> bool:
    """Soft-unsubscribe by setting status to 'churned'"""
    if not supabase:
        return False
    
    try:
        supabase.table('subscribers').update({
            'status': 'churned',
        }).eq('id', subscriber_id).execute()
        return True
    except Exception as e:
        log(f"  ❌ Unsubscribe failed: {e}")
        return False


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Win-back & list hygiene engine')
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()
    
    log("🧹 Win-Back & List Hygiene Engine")
    log(f"   Thresholds: {WINBACK_1_DAYS}d → win-back #1 | {WINBACK_2_DAYS}d → #2 | {CLEANUP_DAYS}d → auto-unsub\n")
    
    groups = get_disengaged_subscribers()
    
    total = sum(len(g) for g in groups.values())
    
    if total == 0:
        log("✅ All subscribers are engaged! No action needed.")
        return True
    
    # Win-back email #1
    if groups['winback_1']:
        log(f"\n📧 Win-back #1 ({len(groups['winback_1'])} subscribers, {WINBACK_1_DAYS}+ days silent):")
        for sub in groups['winback_1']:
            log(f"  {sub['email']} — {sub['days_silent']}d silent")
            if not args.dry_run:
                segment = sub.get('segment', 'builders')
                send_email(sub['email'], WINBACK_EMAIL_1['subject'], WINBACK_EMAIL_1['body'](segment))
    
    # Win-back email #2
    if groups['winback_2']:
        log(f"\n⚠️  Win-back #2 ({len(groups['winback_2'])} subscribers, {WINBACK_2_DAYS}+ days silent):")
        for sub in groups['winback_2']:
            log(f"  {sub['email']} — {sub['days_silent']}d silent")
            if not args.dry_run:
                segment = sub.get('segment', 'builders')
                send_email(sub['email'], WINBACK_EMAIL_2['subject'], WINBACK_EMAIL_2['body'](segment))
    
    # Auto-unsubscribe
    if groups['cleanup']:
        log(f"\n🗑️  Auto-unsubscribe ({len(groups['cleanup'])} subscribers, {CLEANUP_DAYS}+ days silent):")
        for sub in groups['cleanup']:
            log(f"  {sub['email']} — {sub['days_silent']}d silent")
            if not args.dry_run:
                if unsubscribe(sub['id']):
                    log(f"    ✅ Unsubscribed (status → churned)")
    
    # Summary
    print(f"\n{'=' * 60}")
    print(f"🧹 LIST HYGIENE REPORT")
    print(f"{'=' * 60}")
    print(f"  Win-back #1 sent: {len(groups['winback_1'])}")
    print(f"  Win-back #2 sent: {len(groups['winback_2'])}")
    print(f"  Auto-unsubscribed: {len(groups['cleanup'])}")
    if args.dry_run:
        print(f"  ⚠️  Dry run — no actions taken")
    print(f"{'=' * 60}")
    
    return True


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
