#!/usr/bin/env python3
"""
Newsletter Self-Healing Engine
When the quality gate fails, this script analyzes the failures,
applies deterministic fixes, and retries compose + validate.

Architecture:
  compose → validate → FAIL → heal → re-compose → re-validate → PASS → send
                                                              → FAIL → alert

Healable failures (deterministic fixes, no AI needed):
  1. Broken links     → regenerate tracked_url from article['url']
  2. Read time stuck  → recalculate from raw_content word count
  3. Empty summaries  → re-run summarizer for failed articles only
  4. Hardcoded values → patch compose_newsletter at runtime (unlikely after fix)

Unhealable failures (need human/AI):
  - Template rendering bugs
  - Missing required structure
  - Novel failure patterns

After max retries, creates a GitHub Issue with full diagnostics.
"""

import json
import os
import re
import sys
import subprocess
import urllib.parse
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Tuple

PROJECT_ROOT = Path(__file__).parent.parent
EXECUTION_DIR = PROJECT_ROOT / "execution"
TMP_DIR = PROJECT_ROOT / ".tmp"
TODAY = datetime.now().strftime("%Y-%m-%d")

MAX_HEAL_ATTEMPTS = 2


def log(message: str, level: str = "INFO"):
    timestamp = datetime.now().strftime("%H:%M:%S")
    icon = {"INFO": "🔧", "WARN": "⚠️", "ERROR": "❌", "OK": "✅"}
    print(f"[{timestamp}] {icon.get(level, '•')} {message}")


# ──────────────────────────────────────────────────────────
# HEALERS: each fixes one class of failure
# ──────────────────────────────────────────────────────────

def heal_broken_links(articles: List[Dict], segment_id: str) -> Tuple[bool, str]:
    """Fix tracked_url using article['url'] instead of article['source']."""
    base_url = "https://brief.delights.pro/api/track"
    fixed = 0

    for article in articles:
        url = article.get('url', '')
        if not url:
            continue

        # Check if current tracked_url is broken
        tracked = article.get('tracked_url', '')
        if tracked and tracked != '#':
            try:
                from urllib.parse import urlparse, parse_qs
                parsed = urlparse(tracked)
                params = parse_qs(parsed.query)
                target = params.get('url', [None])[0]
                if target:
                    target_parsed = urlparse(target)
                    if target_parsed.scheme and target_parsed.netloc:
                        continue  # This link is fine
            except Exception:
                pass

        # Rebuild tracking URL from article['url']
        params = {
            'url': url,
            's': segment_id,
            'd': TODAY,
            't': article.get('title', '')[:100]
        }
        article['tracked_url'] = f"{base_url}?{urllib.parse.urlencode(params)}"
        fixed += 1

    if fixed > 0:
        return True, f"Fixed {fixed} broken tracked URLs"
    return False, "No broken links found to fix"


def heal_read_times(articles: List[Dict]) -> Tuple[bool, str]:
    """Fix missing or zero read times. Preserves values already set by the summarizer,
    which has access to richer content than the raw RSS snippet available here."""
    fixed = 0

    for article in articles:
        old = article.get('read_time_minutes', 0) or 0
        if old > 0:
            continue  # Summarizer already set a valid value

        raw = article.get('raw_content', '') or article.get('description', '')
        word_count = len(raw.split())

        if word_count == 0:
            new = 1
        else:
            new = max(1, min(round(word_count / 200), 15))

        article['read_time_minutes'] = new
        fixed += 1

    if fixed > 0:
        return True, f"Fixed {fixed} read times"
    return False, "Read times already correct"


def heal_empty_summaries(articles: List[Dict]) -> Tuple[bool, str]:
    """Fill empty summaries with article description as fallback."""
    fixed = 0

    for article in articles:
        summary = article.get('summary', '').strip()
        if not summary:
            # Use description or first 200 chars of raw_content
            fallback = article.get('description', '') or article.get('raw_content', '')
            if fallback:
                # Take first 2 sentences
                sentences = fallback.split('. ')
                article['summary'] = '. '.join(sentences[:2]).strip()
                if not article['summary'].endswith('.'):
                    article['summary'] += '.'
                fixed += 1

    if fixed > 0:
        return True, f"Filled {fixed} empty summaries with fallback content"
    return False, "All summaries present"


# ──────────────────────────────────────────────────────────
# ORCHESTRATION
# ──────────────────────────────────────────────────────────

def run_quality_gate(segment_id: str, date: str) -> Tuple[bool, str]:
    """Run validate_newsletter.py and capture output."""
    script = EXECUTION_DIR / "validate_newsletter.py"
    result = subprocess.run(
        [sys.executable, str(script), "--segment", segment_id, "--date", date],
        capture_output=True, text=True, timeout=15, cwd=PROJECT_ROOT
    )
    output = result.stdout + result.stderr
    passed = result.returncode == 0
    return passed, output


def detect_failures(gate_output: str) -> List[str]:
    """Parse quality gate output to identify failure types."""
    failures = []
    if "Article links" in gate_output and "❌" in gate_output.split("Article links")[0].split('\n')[-1]:
        failures.append("broken_links")
    if re.search(r'❌.*Article links', gate_output):
        failures.append("broken_links")
    if re.search(r'❌.*Read time', gate_output):
        failures.append("read_times")
    if re.search(r'❌.*Summary content', gate_output):
        failures.append("empty_summaries")
    if re.search(r'❌.*Template rendering', gate_output):
        failures.append("template_bug")  # unhealable
    if re.search(r'❌.*Required structure', gate_output):
        failures.append("structure_missing")  # unhealable
    if re.search(r'❌.*Email size.*small', gate_output):
        failures.append("empty_email")  # unhealable

    # Deduplicate
    return list(set(failures))


def heal_and_recompose(segment_id: str, date: str) -> bool:
    """
    Main healing loop:
    1. Load the summaries JSON
    2. Apply healers for detected failures
    3. Save healed summaries
    4. Re-run compose
    5. Re-validate
    """
    summaries_file = TMP_DIR / f"summaries_{segment_id}_{date}.json"

    if not summaries_file.exists():
        log(f"Cannot heal: summaries file not found", "ERROR")
        return False

    # Load articles
    with open(summaries_file) as f:
        data = json.load(f)
    articles = data.get('articles', [])

    if not articles:
        log("Cannot heal: no articles in summaries", "ERROR")
        return False

    # Run quality gate to detect failures
    passed, gate_output = run_quality_gate(segment_id, date)
    if passed:
        log("Quality gate already passes — no healing needed", "OK")
        return True

    failures = detect_failures(gate_output)
    log(f"Detected failures: {', '.join(failures) or 'unknown'}")

    # Check for unhealable failures
    unhealable = {'template_bug', 'structure_missing', 'empty_email'}
    if unhealable & set(failures):
        unhealable_found = unhealable & set(failures)
        log(f"Unhealable failure(s): {', '.join(unhealable_found)} — need human fix", "ERROR")
        return False

    for attempt in range(1, MAX_HEAL_ATTEMPTS + 1):
        log(f"\n{'─'*50}")
        log(f"Healing attempt {attempt}/{MAX_HEAL_ATTEMPTS}")
        log(f"{'─'*50}")

        healed_any = False

        # Apply healers
        if 'broken_links' in failures:
            success, msg = heal_broken_links(articles, segment_id)
            log(f"  Links: {msg}", "OK" if success else "WARN")
            healed_any = healed_any or success

        if 'read_times' in failures:
            success, msg = heal_read_times(articles)
            log(f"  Read times: {msg}", "OK" if success else "WARN")
            healed_any = healed_any or success

        if 'empty_summaries' in failures:
            success, msg = heal_empty_summaries(articles)
            log(f"  Summaries: {msg}", "OK" if success else "WARN")
            healed_any = healed_any or success

        if not healed_any:
            log("No fixes applied — nothing more to try", "WARN")
            break

        # Save healed summaries
        data['articles'] = articles
        data['healed_at'] = datetime.now().isoformat()
        data['heal_attempt'] = attempt

        with open(summaries_file, 'w') as f:
            json.dump(data, f, indent=2)
        log(f"  Saved healed summaries")

        # Re-compose newsletter
        log(f"  Re-composing newsletter...")
        result = subprocess.run(
            [sys.executable, str(EXECUTION_DIR / "compose_newsletter.py"),
             "--segment", segment_id],
            capture_output=True, text=True, timeout=30, cwd=PROJECT_ROOT
        )

        if result.returncode != 0:
            log(f"  Re-compose failed: {result.stderr[:200]}", "ERROR")
            continue

        # Re-validate
        passed, gate_output = run_quality_gate(segment_id, date)
        if passed:
            log(f"\n✅ SELF-HEALED after {attempt} attempt(s)!", "OK")
            return True

        # Update failure list for next attempt
        failures = detect_failures(gate_output)
        log(f"  Still failing: {', '.join(failures)}")

    log(f"\n❌ Self-healing exhausted after {MAX_HEAL_ATTEMPTS} attempts", "ERROR")
    return False


def create_github_issue(segment_id: str, gate_output: str, heal_log: str):
    """Create a GitHub Issue with failure diagnostics when self-healing fails."""
    github_token = os.environ.get("GITHUB_TOKEN", "")
    repo = os.environ.get("GITHUB_REPOSITORY", "LinusInnovator/brief-delights")

    if not github_token:
        log("No GITHUB_TOKEN — cannot create issue. Printing diagnostics instead:", "WARN")
        print(f"\n{'='*60}")
        print(f"  📋 FAILURE DIAGNOSTIC — {segment_id} ({TODAY})")
        print(f"{'='*60}")
        print(gate_output)
        print(f"\nHeal attempts:\n{heal_log}")
        return

    import urllib.request

    title = f"🚨 Newsletter quality gate failed: {segment_id} ({TODAY})"
    body = f"""## Newsletter Quality Gate Failure

**Segment:** {segment_id}
**Date:** {TODAY}
**Self-healing:** Failed after {MAX_HEAL_ATTEMPTS} attempts

### Quality Gate Output
```
{gate_output}
```

### Healing Log
```
{heal_log}
```

### Next Steps
1. Check the failure type above
2. Review `execution/compose_newsletter.py` and `execution/summarize_articles.py`
3. If a new failure pattern, add a healer to `execution/heal_newsletter.py`
"""

    data = json.dumps({"title": title, "body": body, "labels": ["bug", "pipeline"]}).encode()
    req = urllib.request.Request(
        f"https://api.github.com/repos/{repo}/issues",
        data=data,
        headers={
            "Authorization": f"token {github_token}",
            "Accept": "application/vnd.github.v3+json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req) as resp:
            issue = json.loads(resp.read())
            log(f"Created GitHub Issue #{issue['number']}: {issue['html_url']}", "OK")
    except Exception as e:
        log(f"Failed to create GitHub Issue: {e}", "ERROR")


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Newsletter Self-Healing Engine")
    parser.add_argument("--segment", required=True, help="Segment ID")
    parser.add_argument("--date", default=TODAY)
    parser.add_argument("--create-issue", action="store_true",
                        help="Create GitHub Issue if healing fails")
    args = parser.parse_args()

    log(f"🩺 Self-healing engine for {args.segment} ({args.date})")

    # Capture output for issue creation
    import io
    old_stdout = sys.stdout
    captured = io.StringIO()
    sys.stdout = io.TextIOWrapper(io.BytesIO(), write_through=True) if False else sys.stdout

    success = heal_and_recompose(args.segment, args.date)

    if success:
        sys.exit(0)
    else:
        if args.create_issue:
            # Re-run gate to get final output for the issue
            _, gate_output = run_quality_gate(args.segment, args.date)
            create_github_issue(args.segment, gate_output, "See pipeline logs")

        sys.exit(1)


if __name__ == "__main__":
    main()
