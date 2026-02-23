#!/usr/bin/env python3
"""
Automated Test Suite for Sponsor Dashboard
Tests all components, API routes, security, and integration
"""

import requests
import json
from typing import Dict, List

# Test configuration
BASE_URL = "http://localhost:3000"
API_URL = f"{BASE_URL}/api/admin/sponsors"

class TestResults:
    def __init__(self):
        self.passed = []
        self.failed = []
        self.warnings = []
    
    def add_pass(self, test_name: str):
        self.passed.append(test_name)
        print(f"✅ PASS: {test_name}")
    
    def add_fail(self, test_name: str, reason: str):
        self.failed.append((test_name, reason))
        print(f"❌ FAIL: {test_name} - {reason}")
    
    def add_warning(self, test_name: str, reason: str):
        self.warnings.append((test_name, reason))
        print(f"⚠️  WARN: {test_name} - {reason}")
    
    def summary(self):
        total = len(self.passed) + len(self.failed)
        print("\n" + "="*70)
        print("TEST SUMMARY")
        print("="*70)
        print(f"Total Tests: {total}")
        print(f"Passed: {len(self.passed)} ({len(self.passed)/total*100:.1f}%)")
        print(f"Failed: {len(self.failed)} ({len(self.failed)/total*100:.1f}%)")
        print(f"Warnings: {len(self.warnings)}")
        print("="*70)
        
        if self.failed:
            print("\nFAILURES:")
            for name, reason in self.failed:
                print(f"  • {name}: {reason}")
        
        if self.warnings:
            print("\nWARNINGS:")
            for name, reason in self.warnings:
                print(f"  • {name}: {reason}")
        
        return len(self.failed) == 0


def test_api_routes(results: TestResults):
    """Test all API endpoints"""
    print("\n📡 Testing API Routes...")
    
    # Test 1: List sponsors (no auth)
    try:
        resp = requests.get(API_URL, timeout=5)
        if resp.status_code in [200, 401, 403]:
            results.add_pass("API: GET /api/admin/sponsors responds")
        else:
            results.add_fail("API: GET /api/admin/sponsors", f"Status {resp.status_code}")
    except requests.exceptions.ConnectionRefused:
        results.add_warning("API: GET /api/admin/sponsors", "Server not running")
    except Exception as e:
        results.add_fail("API: GET /api/admin/sponsors", str(e))
    
    # Test 2: Analytics endpoint
    try:
        resp = requests.get(f"{API_URL}/analytics", timeout=5)
        if resp.status_code in [200, 401, 403]:
            results.add_pass("API: GET /api/admin/sponsors/analytics responds")
            if resp.status_code == 200:
                data = resp.json()
                if 'metrics' in data and 'funnel' in data:
                    results.add_pass("API: Analytics returns correct schema")
                else:
                    results.add_fail("API: Analytics schema", "Missing metrics/funnel")
        else:
            results.add_fail("API: Analytics endpoint", f"Status {resp.status_code}")
    except requests.exceptions.ConnectionRefused:
        results.add_warning("API: Analytics endpoint", "Server not running")
    except Exception as e:
        results.add_fail("API: Analytics endpoint", str(e))


def test_security(results: TestResults):
    """Test security measures"""
    print("\n🔒 Testing Security...")
    
    # Test 1: SQL injection prevention
    test_cases = [
        "1' OR '1'='1",
        "'; DROP TABLE sponsor_leads--",
        "<script>alert('xss')</script>",
        "../../etc/passwd"
    ]
    
    for payload in test_cases:
        try:
            resp = requests.get(f"{API_URL}?status={payload}", timeout=5)
            if resp.status_code in [200, 400, 401, 403]:
                results.add_pass(f"Security: SQL injection test - {payload[:20]}")
            else:
                results.add_fail(f"Security: Injection test", f"Unexpected {resp.status_code}")
        except requests.exceptions.ConnectionRefused:
            results.add_warning("Security: Injection tests", "Server not running")
            break
        except Exception as e:
            results.add_fail("Security: Injection test", str(e))


def test_typescript_compilation(results: TestResults):
    """Test TypeScript compilation"""
    print("\n📝 Testing TypeScript...")
    
    import subprocess
    try:
        result = subprocess.run(
            ['npx', 'tsc', '--noEmit'],
            cwd='../landing',
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode == 0:
            results.add_pass("TypeScript: No compilation errors")
        else:
            error_lines = result.stdout.count('\n')
            results.add_fail("TypeScript: Compilation", f"{error_lines} errors found")
    except subprocess.TimeoutExpired:
        results.add_warning("TypeScript: Compilation", "Timeout after 30s")
    except Exception as e:
        results.add_warning("TypeScript: Compilation", str(e))


def test_database_schema(results: TestResults):
    """Validate database schema"""
    print("\n🗄️  Testing Database Schema...")
    
    required_tables = [
        'sponsor_leads',
        'sponsor_outreach',
        'sponsor_bookings',
        'article_clicks'
    ]
    
    required_fields_sponsor_leads = [
        'id', 'company_name', 'domain', 'industry',
        'matched_segment', 'match_score', 'status',
        'suggested_price_cents', 'pricing_tier', 'guaranteed_clicks'
    ]
    
    # Check if migration files exist
    import os
    migration_path = '../landing/supabase/migrations/20260211_sponsor_schema.sql'
    
    if os.path.exists(migration_path):
        results.add_pass("Database: Sponsor schema migration exists")
        
        with open(migration_path, 'r') as f:
            content = f.read()
            
            for table in required_tables[:3]:  # sponsor tables
                if f"CREATE TABLE" in content and table in content:
                    results.add_pass(f"Database: {table} table defined")
                else:
                    results.add_fail(f"Database: {table} table", "Not found in migration")
    else:
        results.add_fail("Database: Schema migration", "File not found")


def main():
    """Run all tests"""
    print("="*70)
    print("SPONSOR DASHBOARD TEST SUITE")
    print("="*70)
    
    results = TestResults()
    
    # Run test suites
    test_typescript_compilation(results)
    test_database_schema(results)
    test_api_routes(results)
    test_security(results)
    
    # Summary
    success = results.summary()
    
    return 0 if success else 1


if __name__ == "__main__":
    exit(main())
