#!/usr/bin/env python3
"""
Welcome Drip Sequence
5-email automated sequence over 14 days to build trust and drive referrals.

Cost: $0 (uses Resend API, already paying for it)

Sequence:
  Day 0: Welcome (already sent by verify.ts — this script handles Day 2+)
  Day 2: "Here's what makes us different" + segment preference
  Day 5: Best article from last month + referral ask
  Day 10: Feature education (contrarian signals, story arcs)
  Day 14: Feedback poll + referral nudge

Usage:
    python execution/send_drip_sequence.py          # Send due drips
    python execution/send_drip_sequence.py --dry-run  # Preview only
"""

import json
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional
from dotenv import load_dotenv

load_dotenv()

PROJECT_ROOT = Path(__file__).parent.parent
TMP_DIR = PROJECT_ROOT / ".tmp"

RESEND_API_KEY = os.getenv("RESEND_API_KEY")
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

# Try to import supabase
try:
    from supabase import create_client
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None
except ImportError:
    supabase = None


def log(message: str):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")


# ── Email Templates ──

DRIP_EMAILS = {
    2: {
        'subject': '🎯 What makes Brief Delights different',
        'body': lambda segment: f"""
<div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="font-size: 48px; margin: 0;">Brief</h1>
  <p style="font-size: 18px; color: #666; letter-spacing: 0.2em;">delights</p>
  
  <p style="font-size: 16px; line-height: 1.6;">Hey there 👋</p>
  
  <p style="font-size: 16px; line-height: 1.6;">
    You've been getting Brief Delights for a couple days now. Here's what makes us different from other tech newsletters:
  </p>
  
  <ul style="font-size: 16px; line-height: 1.8;">
    <li><strong>AI-curated, not human-curated.</strong> We scan 1,340+ articles daily. No editor bias — the algorithm finds what matters.</li>
    <li><strong>Segment-specific.</strong> You're in the <strong>{segment}</strong> track. Every story is filtered for relevance to your role.</li>
    <li><strong>"Why This Matters" on every article.</strong> We don't just summarize — we tell you what to <em>do</em> differently.</li>
    <li><strong>Contrarian signals.</strong> When 80% of sources agree, we surface the 20% that disagree.</li>
  </ul>
  
  <p style="font-size: 16px; line-height: 1.6;">
    <strong>Quick question:</strong> Are you in the right segment? If you'd prefer a different lens, just reply with "switch to builders/leaders/innovators" and we'll update you instantly.
  </p>
  
  <hr style="border: none; border-top: 1px solid #e8e8e8; margin: 32px 0;" />
  <p style="font-size: 14px; color: #999;">Reply to this email anytime — a real person reads every reply.</p>
</div>
""",
    },
    5: {
        'subject': '⭐ Our most-clicked article last month (+ a gift)',
        'body': lambda segment: f"""
<div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="font-size: 48px; margin: 0;">Brief</h1>
  <p style="font-size: 18px; color: #666; letter-spacing: 0.2em;">delights</p>
  
  <p style="font-size: 16px; line-height: 1.6;">
    Our {segment} readers clicked this article more than any other last month. Thought you'd want to see it:
  </p>
  
  <div style="background: #f8f7ff; border-left: 4px solid #4f46e5; padding: 16px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
    <p style="margin: 0; font-size: 16px;">
      Check your latest Brief Delights edition for our all-time top picks.
    </p>
  </div>
  
  <p style="font-size: 16px; line-height: 1.6;">
    <strong>🎁 Want access to our curated RSS feed list?</strong><br/>
    We scan 200+ sources daily. Share Brief Delights with just 1 friend and we'll send you the complete list:
  </p>
  
  <div style="background: #1e1b4b; color: white; padding: 20px 24px; border-radius: 12px; text-align: center; margin: 20px 0;">
    <p style="margin: 0 0 8px; font-size: 18px; font-weight: 700;">Share your personal link</p>
    <p style="margin: 0; font-size: 14px; opacity: 0.8;">Just 1 referral unlocks the toolkit.</p>
  </div>
  
  <hr style="border: none; border-top: 1px solid #e8e8e8; margin: 32px 0;" />
  <p style="font-size: 14px; color: #999;">Your referral link is at the bottom of every newsletter we send you.</p>
</div>
""",
    },
    10: {
        'subject': '🧠 Did you know Brief Delights does this?',
        'body': lambda segment: f"""
<div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="font-size: 48px; margin: 0;">Brief</h1>
  <p style="font-size: 18px; color: #666; letter-spacing: 0.2em;">delights</p>
  
  <p style="font-size: 16px; line-height: 1.6;">
    Most readers don't know about these features. Here's what you're getting beyond the daily brief:
  </p>
  
  <div style="display: grid; gap: 16px; margin: 20px 0;">
    <div style="background: #f0fdf4; padding: 16px 20px; border-radius: 12px;">
      <p style="margin: 0 0 4px; font-weight: 700;">🤔 "The Other Side"</p>
      <p style="margin: 0; font-size: 14px; color: #666;">When most sources agree on a narrative, we surface the contrarian view. Last week we found 5 active narrative tensions in tech.</p>
    </div>
    <div style="background: #eff6ff; padding: 16px 20px; border-radius: 12px;">
      <p style="margin: 0 0 4px; font-weight: 700;">📡 Developing Stories</p>
      <p style="margin: 0; font-size: 14px; color: #666;">We track how stories evolve across days. When a theme keeps appearing, we connect the dots so you see the bigger picture.</p>
    </div>
    <div style="background: #fdf4ff; padding: 16px 20px; border-radius: 12px;">
      <p style="margin: 0 0 4px; font-weight: 700;">📊 Sunday Synthesis</p>
      <p style="margin: 0; font-size: 14px; color: #666;">Every Sunday, our AI analyzes the full week and surfaces trends, patterns, and strategic insights you won't find elsewhere.</p>
    </div>
  </div>
  
  <p style="font-size: 16px; line-height: 1.6;">
    All of this is automated — our AI scans 1,340+ articles daily to surface what matters to <strong>{segment}</strong>.
  </p>
  
  <hr style="border: none; border-top: 1px solid #e8e8e8; margin: 32px 0;" />
  <p style="font-size: 14px; color: #999;">Know someone who'd love this? Your referral link is in every newsletter.</p>
</div>
""",
    },
    14: {
        'subject': '📋 Quick 10-second survey (+ reminder)',
        'body': lambda segment: f"""
<div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="font-size: 48px; margin: 0;">Brief</h1>
  <p style="font-size: 18px; color: #666; letter-spacing: 0.2em;">delights</p>
  
  <p style="font-size: 16px; line-height: 1.6;">
    You've been reading for 2 weeks! Quick question — how's it going?
  </p>
  
  <div style="display: flex; gap: 12px; margin: 24px 0; justify-content: center;">
    <a href="mailto:hello@dreamvalidator.com?subject=Feedback: Love it&body=I love Brief Delights!" style="text-decoration: none; padding: 12px 24px; border-radius: 8px; background: #f0fdf4; font-size: 24px;">😍</a>
    <a href="mailto:hello@dreamvalidator.com?subject=Feedback: It's OK&body=Brief Delights is OK." style="text-decoration: none; padding: 12px 24px; border-radius: 8px; background: #fffbeb; font-size: 24px;">😐</a>
    <a href="mailto:hello@dreamvalidator.com?subject=Feedback: Not for me&body=Brief Delights isn't for me." style="text-decoration: none; padding: 12px 24px; border-radius: 8px; background: #fef2f2; font-size: 24px;">👎</a>
  </div>
  
  <p style="font-size: 14px; color: #999; text-align: center;">
    Click one emoji — your email client will open with a pre-filled reply.
  </p>
  
  <hr style="border: none; border-top: 1px solid #e8e8e8; margin: 32px 0;" />
  
  <p style="font-size: 16px; line-height: 1.6;">
    <strong>Last reminder:</strong> Share Brief Delights with just 1 friend to unlock our curated 200-source RSS feed list. Your personal link is at the bottom of every newsletter. 🎁
  </p>
</div>
""",
    },
}


def get_subscribers_due_for_drip(dry_run: bool = False) -> List[Dict]:
    """Find subscribers who need drip emails based on their confirmed_at date"""
    if not supabase:
        log("⚠️  Supabase not available — using mock data for testing")
        return []
    
    try:
        result = supabase.table('subscribers').select(
            'id, email, segment, confirmed_at, referral_code'
        ).eq('status', 'confirmed').execute()
        
        subscribers = result.data or []
        due_list = []
        
        for sub in subscribers:
            confirmed = sub.get('confirmed_at')
            if not confirmed:
                continue
            
            try:
                confirmed_date = datetime.fromisoformat(confirmed.replace('Z', '+00:00')).replace(tzinfo=None)
            except (ValueError, TypeError):
                continue
            
            days_since = (datetime.now() - confirmed_date).days
            
            # Check which drip email they're due for
            for drip_day in sorted(DRIP_EMAILS.keys()):
                if days_since == drip_day:
                    due_list.append({
                        **sub,
                        'drip_day': drip_day,
                        'days_since_signup': days_since,
                    })
        
        return due_list
        
    except Exception as e:
        log(f"❌ Failed to query subscribers: {e}")
        return []


def send_drip_email(subscriber: Dict, drip_day: int) -> bool:
    """Send a specific drip email to a subscriber"""
    if not RESEND_API_KEY:
        log(f"  ⚠️  RESEND_API_KEY not set — would send Day {drip_day} to {subscriber['email']}")
        return False
    
    drip = DRIP_EMAILS[drip_day]
    segment = subscriber.get('segment', 'builders')
    
    try:
        import urllib.request
        
        payload = json.dumps({
            'from': 'Brief Delights <hello@send.dreamvalidator.com>',
            'to': subscriber['email'],
            'subject': drip['subject'],
            'html': drip['body'](segment),
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
            if resp.status == 200:
                return True
        
        return False
        
    except Exception as e:
        log(f"  ❌ Failed to send Day {drip_day} to {subscriber['email']}: {e}")
        return False


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Send welcome drip sequence')
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()
    
    log("💧 Welcome Drip Sequence Engine")
    log(f"   Drip schedule: Day {', '.join(str(d) for d in sorted(DRIP_EMAILS.keys()))}\n")
    
    due = get_subscribers_due_for_drip(args.dry_run)
    
    if not due:
        log("✅ No drip emails due today")
        return True
    
    log(f"📬 {len(due)} drip email(s) due:\n")
    
    sent = 0
    for sub in due:
        day = sub['drip_day']
        drip = DRIP_EMAILS[day]
        
        log(f"  Day {day} → {sub['email']} ({sub.get('segment', '?')})")
        log(f"    Subject: {drip['subject']}")
        
        if not args.dry_run:
            if send_drip_email(sub, day):
                sent += 1
                log(f"    ✅ Sent")
            else:
                log(f"    ❌ Failed")
        else:
            log(f"    🏃 Dry run — skipped")
    
    log(f"\n📊 {sent}/{len(due)} drip emails sent")
    return True


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
