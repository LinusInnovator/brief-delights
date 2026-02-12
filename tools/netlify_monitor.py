#!/usr/bin/env python3
"""
Netlify Build Monitor - Automated build status checker and log viewer

Usage:
    python3 netlify_monitor.py                  # Check latest build
    python3 netlify_monitor.py --watch          # Continuous monitoring
    python3 netlify_monitor.py --logs           # Show full build logs
"""

import subprocess
import sys
import time
import json
from datetime import datetime
from pathlib import Path

# Check if Netlify CLI is installed
def check_netlify_cli():
    """Verify Netlify CLI is installed"""
    try:
        result = subprocess.run(['netlify', '--version'], 
                              capture_output=True, text=True, timeout=5)
        if result.returncode == 0:
            print(f"✅ Netlify CLI installed: {result.stdout.strip()}")
            return True
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass
    
    print("❌ Netlify CLI not found!")
    print("\nTo install:")
    print("  npm install -g netlify-cli")
    print("\nThen login:")
    print("  netlify login")
    return False

def get_site_info():
    """Get current Netlify site info"""
    try:
        result = subprocess.run(['netlify', 'status', '--json'],
                              capture_output=True, text=True, 
                              cwd=Path(__file__).parent.parent / 'landing',
                              timeout=10)
        if result.returncode == 0:
            data = json.loads(result.stdout)
            return data
        else:
            print(f"⚠️ Could not get site info: {result.stderr}")
            return None
    except Exception as e:
        print(f"⚠️ Error getting site info: {e}")
        return None

def get_latest_deploy():
    """Get latest deploy status"""
    try:
        result = subprocess.run(['netlify', 'api', 'listSiteDeployments',
                               '--data', '{"site_id": "auto"}'],
                              capture_output=True, text=True,
                              cwd=Path(__file__).parent.parent / 'landing',
                              timeout=10)
        
        if result.returncode == 0:
            deploys = json.loads(result.stdout)
            if deploys:
                latest = deploys[0]
                return {
                    'id': latest.get('id'),
                    'state': latest.get('state'),
                    'created_at': latest.get('created_at'),
                    'published_at': latest.get('published_at'),
                    'deploy_url': latest.get('deploy_url'),
                    'error_message': latest.get('error_message'),
                    'context': latest.get('context', 'production')
                }
        return None
    except Exception as e:
        print(f"⚠️ Error getting deploy info: {e}")
        return None

def get_deploy_logs(deploy_id=None):
    """Stream deploy logs for a specific deploy"""
    try:
        cmd = ['netlify', 'logs:deploy']
        if deploy_id:
            cmd.extend(['--deploy-id', deploy_id])
        
        result = subprocess.run(cmd,
                              capture_output=True, text=True,
                              cwd=Path(__file__).parent.parent / 'landing',
                              timeout=30)
        return result.stdout
    except Exception as e:
        print(f"⚠️ Error getting logs: {e}")
        return None

def parse_build_error(logs):
    """Extract build errors from logs"""
    if not logs:
        return None
    
    errors = []
    lines = logs.split('\n')
    
    # Look for common error patterns
    error_started = False
    error_context = []
    
    for i, line in enumerate(lines):
        # Detect error start
        if any(marker in line.lower() for marker in ['error:', 'module not found', 'build error', 'failed with']):
            error_started = True
            error_context = []
        
        if error_started:
            error_context.append(line)
            
            # Stop at certain patterns
            if any(marker in line for marker in ['Error location', 'Resolved config', 'at <unknown>']):
                errors.append('\n'.join(error_context))
                error_started = False
                error_context = []
    
    return errors if errors else None

def display_deploy_status(deploy):
    """Pretty print deploy status"""
    if not deploy:
        print("❌ No deploy found")
        return
    
    state = deploy['state']
    created = datetime.fromisoformat(deploy['created_at'].replace('Z', '+00:00'))
    
    # Status emoji
    status_emoji = {
        'ready': '✅',
        'building': '🔄',
        'error': '❌',
        'failed': '❌',
        'new': '🆕',
        'pending': '⏳'
    }.get(state, '❓')
    
    print(f"\n{status_emoji} Deploy Status: {state.upper()}")
    print(f"   ID: {deploy['id']}")
    print(f"   Created: {created.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"   Context: {deploy['context']}")
    
    if deploy.get('deploy_url'):
        print(f"   Preview: {deploy['deploy_url']}")
    
    if state in ['error', 'failed'] and deploy.get('error_message'):
        print(f"\n❌ Error Message:")
        print(f"   {deploy['error_message']}")

def monitor_build(watch=False, show_logs=False):
    """Main monitoring function"""
    print("🔍 Netlify Build Monitor")
    print("=" * 50)
    
    # Check prerequisites
    if not check_netlify_cli():
        return
    
    print("\n📡 Fetching site info...")
    site_info = get_site_info()
    
    if site_info:
        print(f"   Site: {site_info.get('site_name', 'Unknown')}")
        print(f"   URL: {site_info.get('site_url', 'N/A')}")
    
    print("\n🚀 Fetching latest deploy...")
    deploy = get_latest_deploy()
    display_deploy_status(deploy)
    
    # If errored, get logs
    if deploy and deploy['state'] in ['error', 'failed'] and show_logs:
        print("\n📜 Fetching build logs...")
        logs = get_deploy_logs(deploy['id'])
        
        if logs:
            errors = parse_build_error(logs)
            if errors:
                print("\n🔴 Build Errors Found:")
                print("=" * 50)
                for i, error in enumerate(errors, 1):
                    print(f"\nError {i}:")
                    print(error)
                print("=" * 50)
            else:
                print("\n📄 Full logs:")
                print(logs)
    
    # Watch mode
    if watch:
        print("\n👀 Watching for changes (Ctrl+C to stop)...")
        last_deploy_id = deploy['id'] if deploy else None
        
        try:
            while True:
                time.sleep(30)  # Check every 30 seconds
                current_deploy = get_latest_deploy()
                
                if current_deploy and current_deploy['id'] != last_deploy_id:
                    print(f"\n🆕 New deploy detected at {datetime.now().strftime('%H:%M:%S')}")
                    display_deploy_status(current_deploy)
                    last_deploy_id = current_deploy['id']
                    
                    # Auto-fetch logs for errors
                    if current_deploy['state'] in ['error', 'failed']:
                        print("\n📜 Auto-fetching error logs...")
                        logs = get_deploy_logs(current_deploy['id'])
                        if logs:
                            errors = parse_build_error(logs)
                            if errors:
                                print("\n🔴 Build Errors:")
                                for error in errors:
                                    print(error)
                else:
                    print(f"⏳ Still {deploy['state']} - {datetime.now().strftime('%H:%M:%S')}", end='\r')
        except KeyboardInterrupt:
            print("\n\n👋 Monitoring stopped")

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Monitor Netlify builds')
    parser.add_argument('--watch', action='store_true', 
                       help='Continuous monitoring mode')
    parser.add_argument('--logs', action='store_true',
                       help='Show full build logs if failed')
    
    args = parser.parse_args()
    
    try:
        monitor_build(watch=args.watch, show_logs=args.logs)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)
