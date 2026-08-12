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
from dotenv import load_dotenv

# Configuration
PROJECT_ROOT = Path(__file__).parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
load_dotenv(dotenv_path=PROJECT_ROOT / ".env")
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
    """Run a Python script with visible output"""
    script_path = EXECUTION_DIR / script_name
    cmd = [sys.executable, str(script_path)]
    if args:
        cmd.extend(args)
    
    try:
        # Stream output to console so errors are visible in CI logs
        result = subprocess.run(
            cmd,
            cwd=PROJECT_ROOT,
            capture_output=False,
            text=True,
            timeout=timeout,
            env=os.environ
        )
        
        if result.returncode == 0:
            return True
        else:
            log(f"❌ Script failed with exit code {result.returncode}", "ERROR")
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
    has_openrouter = bool(os.environ.get("OPENROUTER_API_KEY"))
    has_resend = bool(os.environ.get("RESEND_API_KEY"))
    has_api_keys = has_env_file or (has_openrouter and has_resend)
    
    checks = {
        "API keys (.env or OPENROUTER_API_KEY + RESEND_API_KEY secrets)": has_api_keys,
        "feeds_config": (PROJECT_ROOT / "feeds_config").exists() or (PROJECT_ROOT / "feeds_config.json").exists(),
        "subscribers.json": (PROJECT_ROOT / "subscribers.json").exists(),
        "segments_config.json": SEGMENTS_CONFIG_FILE.exists()
    }
    
    all_passed = True
    for check_name, passed in checks.items():
        if passed:
            log(f"  ✅ {check_name}")
        else:
            log(f"  ❌ {check_name}", "ERROR")
            if check_name.startswith("API keys") and not has_env_file:
                if not has_openrouter:
                    log("     ⚠️ Missing GitHub Secret: OPENROUTER_API_KEY", "ERROR")
                if not has_resend:
                    log("     ⚠️ Missing GitHub Secret: RESEND_API_KEY", "ERROR")
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


def run_phase_1(segments_data: dict) -> bool:
    """Phase 1: Core Email Generation & Dispatch (High Priority, Fast ~4-6 min)"""
    log("\n" + "="*70)
    log("🚀 PHASE 1: CORE EMAIL GENERATION & DISPATCH", "INFO")
    log("="*70)
    
    segment_ids = list(segments_data.keys())
    
    # STEP 0: Generate Custom Feeds (v2.1)
    log("\n\n▶️  Step 0/5: Generate Custom RSS Feeds")
    log("─"*70)
    if not run_script("generate_custom_feeds.py", timeout=60):
        log("⚠️ Custom feed generation failed or timed out (continuing with existing)", "WARN")
        
    # STEP 1: Aggregate RSS Feeds (same for all segments)
    log("\n\n▶️  Step 1/5: Aggregate RSS Feeds")
    log("─"*70)
    raw_articles_file = TMP_DIR / f"raw_articles_{TODAY}.json"
    
    should_aggregate = True
    if raw_articles_file.exists():
        try:
            with open(raw_articles_file, 'r') as f:
                existing_data = json.load(f)
                if len(existing_data.get('articles', [])) >= 100:
                    should_aggregate = False
        except Exception:
            should_aggregate = True

    if should_aggregate:
        log("📡 Aggregating fresh RSS feeds for today...")
        if not run_script("aggregate_feeds.py", timeout=120):
            log("❌ Pipeline failed at aggregation", "ERROR")
            return False
    else:
        log("✅ Skipping aggregation: valid raw articles pool already exists")
    
    raw_articles_file = TMP_DIR / f"raw_articles_{TODAY}.json"
    if not raw_articles_file.exists():
        log(f"❌ CRITICAL: Raw articles file not found: {raw_articles_file}", "ERROR")
        return False
    
    try:
        with open(raw_articles_file, 'r') as f:
            data = json.load(f)
            article_count = len(data.get('articles', []))
            if article_count == 0:
                log("❌ CRITICAL: No articles found in raw_articles file", "ERROR")
                return False
            log(f"✅ Aggregation complete: {article_count} articles collected")
    except Exception as e:
        log(f"❌ CRITICAL: Failed to read raw articles: {str(e)}", "ERROR")
        return False
    
    # STEP 2: Select Stories (for all segments)
    log("\n\n▶️  Step 2/5: Select Top Stories (All Segments)")
    log("─"*70)
    
    all_selections_exist = True
    for segment_id in segment_ids:
        if not (TMP_DIR / f"selected_articles_{segment_id}_{TODAY}.json").exists():
            all_selections_exist = False
            break
            
    if not all_selections_exist:
        if not run_script("select_stories.py", timeout=600):  # 10 minute timeout for LLM analysis
            log("❌ Pipeline failed at story selection", "ERROR")
            return False
    else:
        log("✅ Skipping story selection: files already exist for all segments")
    
    missing_segments = []
    for segment_id in segment_ids:
        selected_file = TMP_DIR / f"selected_articles_{segment_id}_{TODAY}.json"
        if not selected_file.exists():
            missing_segments.append(segment_id)
            log(f"❌ Missing selection file for {segment_id}: {selected_file}", "ERROR")
    
    if missing_segments:
        log(f"❌ CRITICAL: Story selection failed for segments: {', '.join(missing_segments)}", "ERROR")
        return False
    log("✅ Story selection complete for all segments")
    
    # STEP 2b: Accuracy & Smartness Matrix Evaluation
    log("\n\n▶️  Step 2b/5: Accuracy & Smartness Matrix Evaluation")
    log("─"*70)
    run_script("eval_matrix.py", timeout=30)
    
    # STEP 3 & 4: Summarize and Compose for each segment
    for i, segment_id in enumerate(segment_ids, 1):
        segment_name = segments_data[segment_id]['name']
        
        log(f"\n\n▶️  Step 3.{i}: Summarize Articles ({segment_name})")
        log("─"*70)
        summaries_file = TMP_DIR / f"summaries_{segment_id}_{TODAY}.json"
        if not summaries_file.exists():
            if not run_script("summarize_articles.py", timeout=180, args=["--segment", segment_id]):
                log(f"❌ Failed to summarize for {segment_id}", "ERROR")
                continue
            log(f"✅ Summarization complete for {segment_name}")
        else:
            log(f"✅ Skipping summarization: already exists for {segment_name}")
        
        log(f"\n\n▶️  Step 3.{i}b: Detect Contrarian ({segment_name})")
        log("─"*70)
        if not run_script("detect_contrarian.py", timeout=60, args=["--segment", segment_id]):
            log(f"⚠️ Contrarian detection failed for {segment_id} (non-blocking)", "WARN")
        
        log(f"\n\n▶️  Step 4.{i}: Compose Newsletter ({segment_name})")
        log("─"*70)
        newsletter_file = TMP_DIR / f"newsletter_{segment_id}_{TODAY}.html"
        
        if not newsletter_file.exists():
            if not run_script("compose_newsletter.py", timeout=90, args=["--segment", segment_id]):
                log(f"❌ Failed to compose for {segment_id}", "ERROR")
                continue
            log(f"✅ Newsletter composed for {segment_name}")
        else:
            log(f"✅ Skipping composition: already exists for {segment_name}")
            
        log(f"\n   🔍 Quality Gate ({segment_name}):")
        if not run_script("validate_newsletter.py", timeout=15, args=["--segment", segment_id]):
            log(f"   🩺 Quality gate failed — attempting self-healing...", "WARN")
            if run_script("heal_newsletter.py", timeout=60, args=["--segment", segment_id, "--create-issue"]):
                log(f"   ✅ Self-healed for {segment_name}")
            else:
                log(f"   ❌ Self-healing FAILED for {segment_id} — newsletter will NOT be sent", "ERROR")
                continue
        
        newsletter_file = TMP_DIR / f"newsletter_{segment_id}_{TODAY}.html"
        if newsletter_file.exists():
            try:
                sys.path.insert(0, str(PROJECT_ROOT / "execution" / "utils"))
                from newsletter_archive import NewsletterArchive
                archive = NewsletterArchive(TMP_DIR)
                archive.archive_newsletter(segment_id, newsletter_file)
            except Exception as e:
                log(f"⚠️ Failed to archive newsletter: {str(e)}", "WARN")
    
    # STEP 5: Send Newsletters to Subscribers
    log("\n\n▶️  Step 5/5: Send Newsletters to Subscribers")
    log("─"*70)
    if not run_script("send_newsletter.py", 300):
        log("⚠️ Send newsletters failed - check logs", "ERROR")
        return False

    # STEP 5b: Persist Social Breakdown Posts for Admin UI
    log("\n\n▶️  Step 5b: Persist Social Breakdown Posts")
    log("─"*70)
    run_script("save_social_posts.py", 30)

    log("✅ Phase 1: Core Email Delivery & Social Post Generation complete")
    return True


def run_phase_2(segments_data: dict) -> bool:
    """Phase 2: Growth, Social Teasers, Reddit & Distribution (Non-blocking post-processing)"""
    log("\n" + "="*70)
    log("📈 PHASE 2: GROWTH, SOCIAL TEASERS & DISTRIBUTION ENGINE", "INFO")
    log("="*70)
    
    segment_ids = list(segments_data.keys())
    
    # STEP 6: Aggregate Weekly Trends
    log("\n" + "=" * 60)
    log("STEP 6: Aggregating Weekly Trends", "INFO")
    log("=" * 60)
    for segment_id in ["builders", "leaders", "innovators"]:
        if not run_script("aggregate_weekly_trends.py", 30, [segment_id]):
            log(f"⚠️ Weekly aggregation failed for {segment_id}", "WARN")
    
    # STEP 7: Generate Social Media Teasers & Reddit Posts
    log("\n" + "=" * 60)
    log("STEP 7: Generating Daily Social Teasers & Reddit Posts", "INFO")
    log("=" * 60)
    if not run_script("generate_social_teasers.py", 30):
        log("⚠️ Social teaser generation failed or skipped", "WARN")
    else:
        log("✅ Daily social teasers ready in .tmp/social_posts_YYYY-MM-DD.txt")

    run_script("save_social_posts.py", 30)
        
    if not run_script("post_to_reddit.py", 120):
        log("⚠️ Reddit post preparation or Playwright auto-posting skipped", "WARN")
    else:
        log("✅ Reddit strategic post published / 1-Click link ready")


    if datetime.now().weekday() == 6:  # 6 = Sunday
        log("\n" + "=" * 60)
        log("STEP 6b: Source Auto-Improvement (Sunday Maintenance)", "INFO")
        log("=" * 60)
        if not run_script("auto_improve_sources.py", 600):
            log("⚠️ Source auto-improvement failed (non-blocking)", "WARN")
        else:
            log("✅ Source auto-improvement complete")
    
    # STEP 8: Growth Engine (drip, win-back, repurposing)
    log("\n" + "=" * 60)
    log("STEP 8: Growth Engine", "INFO")
    log("=" * 60)
    
    log("💧 Running welcome drip sequence...")
    if not run_script("send_drip_sequence.py", 60):
        log("⚠️ Drip sequence failed (non-blocking)", "WARN")
    
    log("🧹 Running win-back engine...")
    if not run_script("winback_sequence.py", 60):
        log("⚠️ Win-back engine failed (non-blocking)", "WARN")
    
    log("♻️  Running content repurposing...")
    for segment_id in segment_ids:
        if not run_script("repurpose_newsletter.py", 60, ["--segment", segment_id]):
            log(f"⚠️ Repurposing failed for {segment_id} (non-blocking)", "WARN")
    
    log("✅ Growth engine complete")
    
    # STEP 9: Sponsor Discovery
    log("\n" + "=" * 60)
    log("STEP 9: Sponsor Discovery", "INFO")
    log("=" * 60)
    site_url = os.environ.get("SITE_URL", "https://brief.delights.pro")
    cron_secret = os.environ.get("CRON_SECRET", os.environ.get("SUPABASE_SERVICE_KEY", ""))
    
    if cron_secret:
        try:
            import urllib.request
            req = urllib.request.Request(
                f"{site_url}/api/cron/discover-sponsors",
                data=b'{}',
                headers={
                    'Content-Type': 'application/json',
                    'x-cron-secret': cron_secret,
                },
                method='POST',
            )
            with urllib.request.urlopen(req, timeout=30) as resp:
                result = json.loads(resp.read())
                leads = result.get('leadsWritten', 0)
                log(f"✅ Sponsor discovery: {leads} new leads")
        except Exception as e:
            log(f"⚠️ Sponsor discovery failed (non-blocking): {e}", "WARN")
            
    log("✅ Phase 2: Growth & Distribution complete")
    return True


def main():
    """Main pipeline execution supporting --phase 1, --phase 2, or --phase all"""
    import argparse
    parser = argparse.ArgumentParser(description="Multi-segment Newsletter Pipeline Orchestrator")
    parser.add_argument("--phase", choices=["1", "2", "all"], default="all", help="Execution phase: 1 (Core Email), 2 (Growth & Distribution), or all")
    args = parser.parse_args()

    start_time = datetime.now()
    print_banner()
    
    if not check_prerequisites():
        log("\n❌ Prerequisites check failed", "ERROR")
        return False
    
    log("\n✅ All prerequisites passed")
    segments = load_segments()

    success = True

    if args.phase in ("1", "all"):
        success_p1 = run_phase_1(segments)
        if not success_p1 and args.phase == "1":
            return False
        success = success and success_p1

    if args.phase in ("2", "all"):
        success_p2 = run_phase_2(segments)
        success = success and success_p2

    generate_summary(segments)
    elapsed = (datetime.now() - start_time).total_seconds()
    
    log(f"\n✅ PIPELINE (Phase {args.phase}) COMPLETED", "SUCCESS")
    log(f"⏱️  Total execution time: {elapsed:.2f} seconds ({elapsed/60:.1f} minutes)")
    log(f"📝 Full log saved to: {PIPELINE_LOG}")
    
    return success


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

