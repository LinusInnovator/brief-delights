#!/usr/bin/env python3
"""
Subscriber Import Tool
Import subscribers from CSV exports (Tally, Typeform, Google Forms, etc.)
"""

import json
import csv
import sys
from datetime import datetime
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
SUBSCRIBERS_FILE = PROJECT_ROOT / "subscribers.json"

def load_existing_subscribers():
    """Load existing subscriber data"""
    if not SUBSCRIBERS_FILE.exists():
        return {"subscribers": [], "metadata": {
            "total_subscribers": 0,
            "active_subscribers": 0,
            "last_updated": datetime.now().strftime('%Y-%m-%d'),
            "segments": {"builders": 0, "leaders": 0, "innovators": 0}
        }}
    
    with open(SUBSCRIBERS_FILE, 'r') as f:
        return json.load(f)

def update_metadata(data):
    """Update metadata counts"""
    total = len(data['subscribers'])
    active = sum(1 for s in data['subscribers'] if s.get('status') == 'active')
    
    segments = {"builders": 0, "leaders": 0, "innovators": 0}
    for sub in data['subscribers']:
        if sub.get('status') == 'active':
            segment = sub.get('segment', 'leaders')
            segments[segment] = segments.get(segment, 0) + 1
    
    data['metadata'] = {
        "total_subscribers": total,
        "active_subscribers": active,
        "last_updated": datetime.now().strftime('%Y-%m-%d'),
        "segments": segments
    }

def import_from_csv(csv_file):
    """Import subscribers from CSV"""
    print(f"\n📥 Importing from {csv_file}")
    
    # Load existing
    data = load_existing_subscribers()
    existing_emails = {s['email'].lower() for s in data['subscribers']}
    
    # Read CSV
    new_count = 0
    duplicate_count = 0
    
    with open(csv_file, 'r') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            email = row.get('email', '').strip().lower()
            
            if not email:
                continue
            
            # Skip duplicates
            if email in existing_emails:
                print(f"⚠️  Skipping duplicate: {email}")
                duplicate_count += 1
                continue
            
            # Parse segment
            segment = row.get('segment', row.get('Segment', 'leaders')).lower()
            if segment not in ['builders', 'leaders', 'innovators']:
                segment = 'leaders'  # Default
            
            # Add new subscriber
            new_sub = {
                "email": email,
                "name": row.get('name', row.get('Name', '')),
                "subscribed_date": datetime.now().strftime('%Y-%m-%d'),
                "status": "active",
                "segment": segment,
                "preferences": {
                    "frequency": "daily",
                    "categories": ["all"]
                }
            }
            
            data['subscribers'].append(new_sub)
            existing_emails.add(email)
            new_count += 1
            print(f"✅ Added: {email} ({segment})")
    
    # Update metadata
    update_metadata(data)
    
    # Save
    with open(SUBSCRIBERS_FILE, 'w') as f:
        json.dump(data, f, indent=4)
    
    # Summary
    print(f"\n{'='*60}")
    print(f"📊 IMPORT SUMMARY")
    print(f"{'='*60}")
    print(f"  New subscribers: {new_count}")
    print(f"  Duplicates skipped: {duplicate_count}")
    print(f"  Total active subscribers: {data['metadata']['active_subscribers']}")
    print(f"  By segment:")
    for seg, count in data['metadata']['segments'].items():
        print(f"    {seg}: {count}")
    print(f"\n✅ Saved to {SUBSCRIBERS_FILE}")
    print(f"\nNext steps:")
    print(f"  git add {SUBSCRIBERS_FILE}")
    print(f"  git commit -m 'Import {new_count} new subscribers'")
    print(f"  git push")

def add_single_subscriber(email, name, segment):
    """Add a single subscriber manually"""
    print(f"\n➕ Adding subscriber: {email}")
    
    # Validate
    if not email or '@' not in email:
        print(f"❌ Invalid email: {email}")
        return False
    
    if segment not in ['builders', 'leaders', 'innovators']:
        print(f"❌ Invalid segment: {segment}. Use: builders, leaders, or innovators")
        return False
    
    # Load existing
    data = load_existing_subscribers()
    existing_emails = {s['email'].lower() for s in data['subscribers']}
    
    # Check duplicate
    if email.lower() in existing_emails:
        print(f"⚠️  Subscriber already exists: {email}")
        return False
    
    # Add
    data['subscribers'].append({
        "email": email,
        "name": name,
        "subscribed_date": datetime.now().strftime('%Y-%m-%d'),
        "status": "active",
        "segment": segment,
        "preferences": {
            "frequency": "daily",
            "categories": ["all"]
        }
    })
    
    # Update metadata
    update_metadata(data)
    
    # Save
    with open(SUBSCRIBERS_FILE, 'w') as f:
        json.dump(data, f, indent=4)
    
    print(f"✅ Added: {email} ({segment})")
    print(f"📊 Total active subscribers: {data['metadata']['active_subscribers']}")
    return True

def main():
    if len(sys.argv) < 2:
        print("""
📧 Subscriber Import Tool

Usage:
  # Import from CSV file
  python3 tools/import_subscribers.py subscribers.csv
  
  # Add single subscriber
  python3 tools/import_subscribers.py --add email@example.com "Name" segment
  
CSV Format:
  email,name,segment
  john@example.com,John Doe,builders
  jane@startup.com,Jane Smith,leaders
  
Segments: builders, leaders, innovators
        """)
        sys.exit(1)
    
    # Add single subscriber
    if sys.argv[1] == '--add':
        if len(sys.argv) < 5:
            print("Usage: python3 tools/import_subscribers.py --add email name segment")
            sys.exit(1)
        
        email = sys.argv[2]
        name = sys.argv[3]
        segment = sys.argv[4]
        
        add_single_subscriber(email, name, segment)
    
    # Import from CSV
    else:
        csv_file = sys.argv[1]
        if not Path(csv_file).exists():
            print(f"❌ File not found: {csv_file}")
            sys.exit(1)
        
        import_from_csv(csv_file)

if __name__ == '__main__':
    main()
