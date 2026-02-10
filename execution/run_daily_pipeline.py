#!/usr/bin/env python3
"""
Daily Newsletter Pipeline - Multi-Segment Version
Master orchestration script for segmented newsletter workflow.
"""

import os
import sys
import subprocess
import json
from datetime import datetime
from pathlib import Path

# Configuration
PROJECT_ROOT = Path(__file__).parent.parent
EXECUTION_DIR = PROJECT_ROOT / "execution"
TMP_DIR = PROJECT_ROOT / ".tmp"
TMP_DIR.mkdir(exist_ok=True)

TODAY = datetime.now().strftime("%Y-%m-%d")
PIPELINE_LOG = TMP_DIR / f"pipeline_log_{TODAY}.txt"
SEGMENTS_CONFIG_FILE = PROJECT_ROOT / "segments_config.json"


def log(message: str, level: str = "INFO"):
    """Log to both console and file"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_entry = f"[{timestamp}] [{level}] {message}"
    print(log_entry)
    
    with open(PIPELINE_LOG, "a") as f:
        f.write(log_entry + "\n")


def print_banner():
    """Print startup banner"""
    banner = f"""
{'='*70}
    📬 AUTOMATED NEWSLETTER PIPELINE (Multi-Segment)
    Date: {datetime.now().strftime('%B %d, %Y')}
    Time: {datetime.now().strftime('%H:%M:%S')}
{'='*70}
"""
    log(banner, "INFO")


def run_script(script_name: str, timeout: int, args: list = None) -> bool:
    """Run a Python script"""
    script_path = EXECUTION_DIR / script_name
    cmd = [sys.executable, str(script_path)]
    if args:
        cmd.extend(args)
    
    try:
        result = subprocess.run(
            cmd,
            cwd=PROJECT_ROOT,
            capture_output=True,
            text=True,
            timeout=timeout
        )
        
        if result.returncode == 0:
            return True
        else:
            log(f"❌ Script failed with exit code {result.returncode}", "ERROR")
            if result.stderr:
                for line in result.stderr.split('\n')[:10]:  # First 10 lines
                    if line.strip():
                        log(f"   {line}", "ERROR")
            return False
            
    except subprocess.TimeoutExpired:
        log(f"❌ Script timed out after {timeout}s", "ERROR")
        return False
    except Exception as e:
        log(f"❌ Script crashed: {str(e)}", "ERROR")
        return False


def load_segments():
    """Load segment configurations"""
    with open(SEGMENTS_CONFIG_FILE, 'r') as f:
        data = json.load(f)
    return data['segments']


def check_prerequisites() -> bool:
    """Verify prerequisites"""
    log("\n🔍 Checking prerequisites...")
    
    # Check for API keys: either from .env file OR environment variables
    has_env_file = (PROJECT_ROOT / ".env").exists()
    has_env_vars = os.environ.get("OPENROUTER_API_KEY") and os.environ.get("RESEND_API_KEY")
    
    checks = {
        "API keys (.env or env vars)": has_env_file or has_env_vars,
        "feeds_config.json": (PROJECT_ROOT / "feeds_config.json").exists(),
        "subscribers.json": (PROJECT_ROOT / "subscribers.json").exists(),
        "segments_config.json": SEGMENTS_CONFIG_FILE.exists()
    }
    
    all_passed = True
    for check_name, passed in checks.items():
        if passed:
            log(f"  ✅ {check_name}")
        else:
            log(f"  ❌ {check_name}", "ERROR")
            all_passed = False
    
    return all_passed


def generate_summary(segments: dict):
    """Generate execution summary"""
    log("\n" + "="*70)
    log("📊 PIPELINE SUMMARY", "INFO")
    log("="*70)
    
    # Check segment outputs
    for segment_id in segments.keys():
        log(f"\n🔧 Segment: {segment_id}")
        files = {
            "Selected": TMP_DIR / f"selected_articles_{segment_id}_{TODAY}.json",
            "Summaries": TMP_DIR / f"summaries_{segment_id}_{TODAY}.json",
            "Newsletter": TMP_DIR / f"newsletter_{segment_id}_{TODAY}.html"
        }
        
        for name, path in files.items():
            if path.exists():
                size = path.stat().st_size
                log(f"  ✅ {name}: {size:,} bytes")
            else:
                log(f"  ❌ {name}: NOT FOUND")
    
    # Delivery log
    send_log_path = TMP_DIR / f"send_log_{TODAY}.json"
    if send_log_path.exists():
        try:
            with open(send_log_path, 'r') as f:
                send_data = json.load(f)
            
            log("\n📧 Email Delivery:")
            log(f"  Total sent: {send_data.get('total_sent', 0)}")
            log(f"  Total failed: {send_data.get('total_failed', 0)}")
            
            if 'segments' in send_data:
                for seg_id, seg_results in send_data['segments'].items():
                    log(f"  {seg_id}: {seg_results.get('sent', 0)} sent, {seg_results.get('failed', 0)} failed")
        except:
            pass
    
    log("="*70)


def main():
    """Main pipeline execution"""
    start_time = datetime.now()
    
    print_banner()
    
    # Prerequisites
    if not check_prerequisites():
        log("\n❌ Prerequisites check failed", "ERROR")
        return False
    
    log("\n✅ All prerequisites passed")
    
    # Load segments
    segments = load_segments()
    segment_ids = list(segments.keys())
    log(f"\n📋 Configured segments: {', '.join(segment_ids)}")
    
    # STEP 1: Aggregate RSS Feeds (same for all segments)
    log("\n\n▶️  Step 1/5: Aggregate RSS Feeds")
    log("─"*70)
    if not run_script("aggregate_feeds.py", timeout=120):
        log("❌ Pipeline failed at aggregation", "ERROR")
        return False
    log("✅ Aggregation complete")
    
    # STEP 2: Select Stories (for all segments)
    log("\n\n▶️  Step 2/5: Select Top Stories (All Segments)")
    log("─"*70)
    if not run_script("select_stories.py", timeout=300):  # Increased from 120s - LLM calls can take 2-3min with large datasets
        log("❌ Pipeline failed at story selection", "ERROR")
        return False
    log("✅ Story selection complete for all segments")
    
    # STEP 3 & 4: Summarize and Compose for each segment
    for i, segment_id in enumerate(segment_ids, 1):
        segment_name = segments[segment_id]['name']
        
        # Summarize
        log(f"\n\n▶️  Step 3.{i}: Summarize Articles ({segment_name})")
        log("─"*70)
        if not run_script("summarize_articles.py", timeout=90, args=["--segment", segment_id]):
            log(f"❌ Failed to summarize for {segment_id}", "ERROR")
            continue
        log(f"✅ Summarization complete for {segment_name}")
        
        # Compose
        log(f"\n\n▶️  Step 4.{i}: Compose Newsletter ({segment_name})")
        log("─"*70)
        if not run_script("compose_newsletter.py", timeout=30, args=["--segment", segment_id]):
            log(f"❌ Failed to compose for {segment_id}", "ERROR")
            continue
        log(f"✅ Newsletter composed for {segment_name}")
    
    # STEP 5: Send (handles all segments)
    # ========================================
    # STEP 5: Send Newsletters
    # ========================================
    if not run_script("send_newsletter.py", 300):
        log("⚠️ Send newsletters failed - check logs", "ERROR")
        return False # This return False was missing in the provided snippet, but is crucial for pipeline integrity.
    log("✅ Delivery complete")
    
    # ========================================
    # STEP 6: Aggregate Weekly Trends (for Sunday insights)
    # ========================================
    log("\n" + "=" * 60)
    log("STEP 6: Aggregating Weekly Trends", "INFO")
    log("=" * 60)
    log("📊 Saving today's trends for Sunday synthesis...")
    
    # Run aggregation for each segment
    for segment_id in ["builders", "leaders", "innovators"]:
        if not run_script("aggregate_weekly_trends.py", 30, [segment_id]):
            log(f"⚠️ Weekly aggregation failed for {segment_id}", "WARN")
    
    log("✅ Weekly trend aggregation complete")
    
    # Summary
    generate_summary(segments)
    
    # Total time
    elapsed = (datetime.now() - start_time).total_seconds()
    
    log(f"\n✅ PIPELINE COMPLETED SUCCESSFULLY", "SUCCESS")
    log(f"⏱️  Total execution time: {elapsed:.2f} seconds ({elapsed/60:.1f} minutes)")
    log(f"📝 Full log saved to: {PIPELINE_LOG}")
    
    return True


if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        log("\n\n⚠️  Pipeline interrupted by user", "WARN")
        sys.exit(1)
    except Exception as e:
        log(f"\n\n❌ FATAL ERROR: {str(e)}", "ERROR")
        import traceback
        log(traceback.format_exc(), "ERROR")
        sys.exit(1)
