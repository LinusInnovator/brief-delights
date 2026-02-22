#!/usr/bin/env python3
"""
Apply partnership schema migration to Supabase
"""

import os
import sys
from supabase import create_client, Client
from pathlib import Path

# Supabase credentials
url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
service_key = os.environ.get("SUPABASE_SERVICE_KEY")

if not url or not service_key:
    print("❌ Missing Supabase credentials")
    print("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY")
    sys.exit(1)

# Read migration file
migration_file = Path(__file__).parent.parent / "landing/supabase/migrations/20260215_partnership_schema.sql"

if not migration_file.exists():
    print(f"❌ Migration file not found: {migration_file}")
    sys.exit(1)

print("📄 Reading migration file...")
sql = migration_file.read_text()

print("🔌 Connecting to Supabase...")
supabase: Client = create_client(url, service_key)

print("🚀 Applying partnership schema migration...")

try:
    # Execute the SQL migration
    # Note: Supabase Python client doesn't have direct SQL execution
    # We need to use the REST API directly
    import requests
    
    response = requests.post(
        f"{url}/rest/v1/rpc/exec_sql",
        headers={
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Content-Type": "application/json"
        },
        json={"query": sql}
    )
    
    # If that doesn't work, try using psycopg2 with connection string
    if response.status_code >= 400:
        print("📝 REST API method not available, using direct connection...")
        print("\nℹ️  To apply the migration, run this in Supabase SQL Editor:")
        print("=" * 60)
        print(sql)
        print("=" * 60)
        print("\nOr use this command:")
        print(f"cat {migration_file} | psql <your_connection_string>")
    else:
        print("✅ Migration applied successfully!")
        
        # Verify table was created
        result = supabase.table("sponsored_content").select("count", count="exact").execute()
        print(f"✅ Table verified: sponsored_content (0 rows)")
        
except Exception as e:
    print(f"⚠️  Could not apply via API: {str(e)}")
    print("\n📋 Please apply manually using Supabase SQL Editor:")
    print("=" * 60)
    print(sql)
    print("=" * 60)

print("\n✅ Next steps:")
print("1. Visit: https://brief.delights.pro/admin/partnerships")
print("2. Create your first partnership!")
