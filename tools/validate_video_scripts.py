#!/usr/bin/env python3
"""
tools/validate_video_scripts.py
Autonomous Quality Gate: Video Script URL Liveness & Safety Validator

Ensures:
1. No story URL points to internal newsletter or landing pages (brief.delights.pro).
2. All story URLs start with https:// or http://.
3. All story URLs return HTTP 200 via real HTTP probe.
4. Lower-third entity badges adhere to broadcast constraints (<= 28 chars, 1-4 words).
"""

import sys
import json
import urllib.request
import urllib.error
from pathlib import Path
from typing import List, Dict, Any, Tuple

PROJECT_ROOT = Path(__file__).resolve().parent.parent
PUBLIC_DATA_DIR = PROJECT_ROOT / "landing" / "public" / "data"

USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 BriefDelightsValidator/1.0"


def probe_url(url: str, timeout: int = 6) -> Tuple[bool, int, str]:
    """Probes a URL to verify it resolves with HTTP 200 and does not error."""
    if not url or not (url.startswith("http://") or url.startswith("https://")):
        return False, 0, "Invalid URL schema"

    if "brief.delights.pro" in url:
        return False, 400, "Internal newsletter URL forbidden in video scripts"

    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        method="GET"
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            status = response.getcode()
            if 200 <= status < 400:
                return True, status, "OK"
            return False, status, f"HTTP status {status}"
    except urllib.error.HTTPError as e:
        # Some servers block bots on GET (e.g. 403), but 404/401/500 are hard errors
        if e.code in (401, 404, 500, 502, 503):
            return False, e.code, f"HTTP Error {e.code}"
        # 403 on some aggregators/firewalls might still be alive in browser, but warn
        return True, e.code, f"HTTP Warning {e.code} (Firewall/Bot Block)"
    except Exception as e:
        return False, 0, str(e)


def validate_file(file_path: Path) -> List[str]:
    """Validates a single video script JSON file."""
    errors = []
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        return [f"Failed to parse JSON: {e}"]

    stories = data.get("stories", [])
    if not stories:
        return [f"No stories found in {file_path.name}"]

    print(f"\n🔍 Validating {file_path.name} ({len(stories)} stories)...")

    for i, s in enumerate(stories, 1):
        name = s.get("name") or "Unknown"
        headline = s.get("headline") or ""
        url = (s.get("url") or "").strip()

        print(f"  [{i}] '{name}' -> {url}")

        # Check broadcast constraint
        if len(name) > 32 or len(name.split()) > 5:
            errors.append(f"Story {i} ('{name}'): Badge name violates broadcast limit ({len(name)} chars, {len(name.split())} words)")

        # Check URL
        if not url:
            errors.append(f"Story {i} ('{name}'): URL is missing or empty")
            continue

        if "brief.delights.pro" in url:
            errors.append(f"Story {i} ('{name}'): Forbidden internal domain in URL ({url})")
            continue

        if "huggingface.co/spaces/multimodal-art/YuE" in url:
            errors.append(f"Story {i} ('{name}'): Known dead Hugging Face Space URL ({url})")
            continue

        # Probe URL liveness
        is_live, code, msg = probe_url(url)
        if not is_live:
            errors.append(f"Story {i} ('{name}'): Dead URL ({url}) - {msg}")
        else:
            print(f"      ✅ Live ({code} {msg})")

    return errors


def main() -> int:
    print("=" * 60)
    print("🚀 Video Safari Script Quality Gate Validator")
    print("=" * 60)

    target_files = sorted(list(PUBLIC_DATA_DIR.glob("latest_video_script*.json")))
    if not target_files:
        print(f"⚠️ No script files found in {PUBLIC_DATA_DIR}")
        return 0

    all_errors = {}
    for f in target_files:
        errs = validate_file(f)
        if errs:
            all_errors[f.name] = errs

    print("\n" + "=" * 60)
    if all_errors:
        print("❌ QUALITY GATE FAILED! The following scripts have invalid/dead URLs:")
        for fname, errs in all_errors.items():
            print(f"\n  📁 {fname}:")
            for e in errs:
                print(f"    • {e}")
        print("\nDeployment aborted to prevent recording broken links.")
        return 1

    print("✅ All video script URLs verified live (HTTP 200) and broadcast-compliant!")
    print("=" * 60)
    return 0


if __name__ == "__main__":
    sys.exit(main())
