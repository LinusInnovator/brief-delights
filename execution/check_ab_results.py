#!/usr/bin/env python3
"""
A/B Subject Line Results Checker

Reads the most recent send_log from .tmp/ and calculates
A/B variant distribution. Open rate tracking requires 
Resend webhook integration (future enhancement).

Usage:
    python3 execution/check_ab_results.py
    python3 execution/check_ab_results.py --date 2026-02-17
"""

import json
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path
from collections import Counter

PROJECT_ROOT = Path(__file__).parent.parent
TMP_DIR = PROJECT_ROOT / ".tmp"


def find_send_log(target_date: str = None) -> Path:
    """Find the send log for a given date"""
    if target_date:
        log_file = TMP_DIR / f"send_log_{target_date}.json"
        if log_file.exists():
            return log_file
    
    # Find most recent send log
    logs = sorted(TMP_DIR.glob("send_log_*.json"), reverse=True)
    if logs:
        return logs[0]
    
    return None


def analyze_ab(log_file: Path):
    """Analyze A/B variant distribution from send log"""
    with open(log_file, 'r') as f:
        data = json.load(f)
    
    print(f"\n{'=' * 50}")
    print(f"📊 A/B SUBJECT LINE ANALYSIS")
    print(f"📄 Log: {log_file.name}")
    print(f"{'=' * 50}")
    
    for segment_id, results in data.items():
        details = results.get('details', [])
        if not details:
            continue
        
        # Count variants
        variant_counts = Counter()
        variant_success = Counter()
        
        for d in details:
            variant = d.get('subject_variant', 'unknown')
            variant_counts[variant] += 1
            if d.get('status') == 'success':
                variant_success[variant] += 1
        
        total = sum(variant_counts.values())
        
        print(f"\n📬 Segment: {segment_id}")
        print(f"   Total sent: {total}")
        
        for variant in sorted(variant_counts.keys()):
            count = variant_counts[variant]
            success = variant_success[variant]
            pct = (count / total * 100) if total > 0 else 0
            delivery_rate = (success / count * 100) if count > 0 else 0
            print(f"   Variant {variant}: {count} ({pct:.0f}%) — {delivery_rate:.0f}% delivered")
        
        # Note about open rates
        if any(v in ('A', 'B') for v in variant_counts):
            print(f"   💡 Open rates: integrate Resend webhooks for tracking")
    
    print(f"\n{'=' * 50}")
    print("Done.\n")


def main():
    import argparse
    parser = argparse.ArgumentParser(description='Check A/B test results')
    parser.add_argument('--date', help='Date to check (YYYY-MM-DD)')
    args = parser.parse_args()
    
    log_file = find_send_log(args.date)
    if not log_file:
        print("❌ No send log found")
        sys.exit(1)
    
    analyze_ab(log_file)


if __name__ == "__main__":
    main()
