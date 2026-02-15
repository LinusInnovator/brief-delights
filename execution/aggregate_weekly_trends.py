#!/usr/bin/env python3
"""
Weekly Trend Aggregation Script
Collects and stores daily trend data for Sunday synthesis.
Run this AFTER daily trend detection to save data for the week.
"""

import json
import sys
from datetime import datetime
from pathlib import Path

# Configuration
PROJECT_ROOT = Path(__file__).parent.parent
TMP_DIR = PROJECT_ROOT / ".tmp"
# Store weekly insights in a committed directory (not .tmp which is gitignored)
WEEKLY_DIR = PROJECT_ROOT / "reports" / "weekly_insights"
TODAY = datetime.now().strftime("%Y-%m-%d")

def log(message: str):
    """Log to console"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {message}")

def ensure_weekly_directory():
    """Create weekly insights directory if it doesn't exist"""
    WEEKLY_DIR.mkdir(parents=True, exist_ok=True)
    log(f"✅ Weekly directory ready: {WEEKLY_DIR}")

def load_daily_trends(segment: str) -> dict:
    """Load today's trend synthesis data"""
    synthesis_file = TMP_DIR / f"trend_synthesis_{segment}_{TODAY}.json"
    
    if not synthesis_file.exists():
        log(f"⚠️  No trend synthesis found for {segment} on {TODAY}")
        return None
    
    with open(synthesis_file, 'r') as f:
        return json.load(f)

def load_daily_selections(segment: str) -> dict:
    """Load today's selected articles"""
    selections_file = TMP_DIR / f"selected_{segment}_{TODAY}.json"
    
    if not selections_file.exists():
        log(f"⚠️  No selections found for {segment} on {TODAY}")
        return None
    
    with open(selections_file, 'r') as f:
        return json.load(f)

def aggregate_daily_data(segment: str) -> dict:
    """Aggregate today's trend and selection data"""
    trends = load_daily_trends(segment)
    selections = load_daily_selections(segment)
    
    if not trends or not selections:
        return None
    
    return {
        "date": TODAY,
        "segment": segment,
        "trends": trends,
        "article_count": len(selections.get('selected', [])),
        "articles": selections.get('selected', [])
    }

def save_weekly_snapshot(segment: str, data: dict):
    """Save today's data to weekly collection"""
    output_file = WEEKLY_DIR / f"{TODAY}_{segment}.json"
    
    with open(output_file, 'w') as f:
        json.dump(data, f, indent=2)
    
    log(f"✅ Saved weekly snapshot: {output_file}")

def cleanup_old_snapshots(days_to_keep: int = 10):
    """Remove snapshots older than N days"""
    if not WEEKLY_DIR.exists():
        return
    
    cutoff = datetime.now().timestamp() - (days_to_keep * 24 * 60 * 60)
    removed = 0
    
    for file in WEEKLY_DIR.glob("*.json"):
        if file.stat().st_mtime < cutoff:
            file.unlink()
            removed += 1
    
    if removed > 0:
        log(f"🧹 Cleaned up {removed} old weekly snapshots")

def main():
    """Main execution"""
    if len(sys.argv) < 2:
        log("Usage: python3 aggregate_weekly_trends.py <segment>")
        sys.exit(1)
    
    segment = sys.argv[1]
    
    log("=" * 60)
    log(f"Aggregating Weekly Trends for {segment.upper()}")
    log("=" * 60)
    
    try:
        # Ensure directory exists
        ensure_weekly_directory()
        
        # Aggregate today's data
        log(f"\n📊 Collecting data for {TODAY}...")
        data = aggregate_daily_data(segment)
        
        if not data:
            log("❌ No data to aggregate (missing trends or selections)")
            return False
        
        # Save snapshot
        save_weekly_snapshot(segment, data)
        
        # Cleanup old files
        cleanup_old_snapshots()
        
        log(f"\n✅ Weekly aggregation complete")
        log(f"   Articles: {data['article_count']}")
        log(f"   Trends detected: {len(data['trends'].get('detected_trends', []))}")
        
        return True
        
    except Exception as e:
        log(f"\n❌ FATAL ERROR: {str(e)}")
        import traceback
        log(traceback.format_exc())
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
