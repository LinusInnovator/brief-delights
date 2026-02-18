#!/usr/bin/env python3
"""
Newsletter Quality Gate
Validates composed newsletters BEFORE sending. Catches bugs that would
embarrass us in subscribers' inboxes.

Run after compose, before send. Fails the pipeline if critical checks fail.

Checks:
  1. LINKS:       Every tracked_url contains a valid URL (not a publisher name)
  2. READ TIME:   Read times vary across articles (not all identical)
  3. CONTENT:     Summaries exist and aren't empty/identical
  4. TEMPLATE:    No unrendered {{ placeholders }} in final HTML
  5. METADATA:    Dynamic values (scanned count) aren't hardcoded
  6. STRUCTURE:   Required sections present (header, footer, unsubscribe)
  7. SIZE:        Email under Gmail clip threshold (102KB)
  8. URLS:        All URLs in href attributes are syntactically valid
"""

import json
import re
import sys
import argparse
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from collections import Counter

PROJECT_ROOT = Path(__file__).parent.parent
TMP_DIR = PROJECT_ROOT / ".tmp"
TODAY = datetime.now().strftime("%Y-%m-%d")


class QualityReport:
    """Collects pass/fail/warn results and decides go/no-go."""

    def __init__(self, segment: str):
        self.segment = segment
        self.checks = []  # list of (status, check_name, detail)
        self.critical_failures = 0
        self.warnings = 0

    def ok(self, name: str, detail: str = ""):
        self.checks.append(("PASS", name, detail))

    def fail(self, name: str, detail: str):
        self.checks.append(("FAIL", name, detail))
        self.critical_failures += 1

    def warn(self, name: str, detail: str):
        self.checks.append(("WARN", name, detail))
        self.warnings += 1

    def passed(self) -> bool:
        return self.critical_failures == 0

    def print_report(self):
        print(f"\n{'='*60}")
        print(f"  🔍 QUALITY GATE — {self.segment}")
        print(f"{'='*60}")

        for status, name, detail in self.checks:
            icon = {"PASS": "✅", "FAIL": "❌", "WARN": "⚠️"}[status]
            line = f"  {icon} {name}"
            if detail:
                line += f" — {detail}"
            print(line)

        print(f"\n{'─'*60}")
        if self.passed():
            print(f"  ✅ QUALITY GATE PASSED ({len(self.checks)} checks, {self.warnings} warnings)")
        else:
            print(f"  ❌ QUALITY GATE FAILED — {self.critical_failures} critical failure(s)")
        print(f"{'='*60}\n")


def validate_newsletter(segment_id: str, date: str = None) -> QualityReport:
    """Run all quality checks on a composed newsletter."""
    date = date or TODAY
    report = QualityReport(segment_id)

    newsletter_file = TMP_DIR / f"newsletter_{segment_id}_{date}.html"
    summaries_file = TMP_DIR / f"summaries_{segment_id}_{date}.json"

    # ─── CHECK 0: Files exist ───
    if not newsletter_file.exists():
        report.fail("File exists", f"Newsletter HTML not found: {newsletter_file.name}")
        return report

    if not summaries_file.exists():
        report.fail("File exists", f"Summaries JSON not found: {summaries_file.name}")
        return report

    report.ok("Files exist")

    html = newsletter_file.read_text(encoding="utf-8")
    with open(summaries_file) as f:
        data = json.load(f)
    articles = data.get("articles", [])

    # ─── CHECK 1: Links — tracked URLs contain valid URLs ───
    broken_links = []
    for article in articles:
        tracked = article.get("tracked_url", "")
        if not tracked or tracked == "#":
            broken_links.append(f"Missing tracked_url: '{article.get('title', '?')[:40]}'")
            continue

        # Parse the tracking URL and extract the 'url' parameter
        try:
            parsed = urlparse(tracked)
            params = parse_qs(parsed.query)
            target_url = params.get("url", [None])[0]

            if not target_url:
                broken_links.append(f"No 'url' param: '{article.get('title', '?')[:40]}'")
                continue

            # Validate the target URL is a real URL, not a publisher name
            target_parsed = urlparse(target_url)
            if not target_parsed.scheme or not target_parsed.netloc:
                broken_links.append(f"Invalid URL '{target_url[:50]}' for '{article.get('title', '?')[:30]}'")
        except Exception as e:
            broken_links.append(f"Parse error for '{article.get('title', '?')[:40]}': {e}")

    if broken_links:
        report.fail("Article links", f"{len(broken_links)} broken: {broken_links[0]}")
    else:
        report.ok("Article links", f"All {len(articles)} articles have valid tracked URLs")

    # ─── CHECK 2: Read times vary ───
    read_times = [a.get("read_time_minutes", 0) for a in articles]
    unique_times = set(read_times)

    if len(articles) > 2 and len(unique_times) == 1:
        report.fail("Read time variance", f"All {len(articles)} articles have identical read time: {read_times[0]} min")
    elif len(unique_times) == 1 and len(articles) > 1:
        report.warn("Read time variance", f"All articles are {read_times[0]} min — may be legitimate but suspicious")
    else:
        report.ok("Read time variance", f"{len(unique_times)} distinct values across {len(articles)} articles")

    # ─── CHECK 3: Content quality ───
    empty_summaries = [a for a in articles if not a.get("summary", "").strip()]
    if empty_summaries:
        report.fail("Summary content", f"{len(empty_summaries)} articles have empty summaries")
    else:
        # Check for duplicate summaries (copy-paste errors)
        summary_counts = Counter(a.get("summary", "") for a in articles)
        dupes = {s: c for s, c in summary_counts.items() if c > 1}
        if dupes:
            report.warn("Summary content", f"{len(dupes)} duplicate summaries found")
        else:
            report.ok("Summary content", f"All {len(articles)} summaries unique and non-empty")

    # ─── CHECK 4: No unrendered template placeholders ───
    unrendered = re.findall(r'\{\{[^}]+\}\}', html)
    if unrendered:
        report.fail("Template rendering", f"{len(unrendered)} unrendered placeholders: {unrendered[:3]}")
    else:
        report.ok("Template rendering", "No unrendered {{ }} placeholders")

    # ─── CHECK 5: Dynamic values not hardcoded ───
    # Check total_scanned isn't a suspicious static value
    hardcoded_patterns = [
        (r'1,340\+?\s*news', "Hardcoded '1,340' article count"),
        (r'~400\s*analyzed', "Hardcoded '~400' enrichment count"),
    ]
    for pattern, description in hardcoded_patterns:
        if re.search(pattern, html, re.IGNORECASE):
            report.warn("Dynamic values", description)
            break
    else:
        report.ok("Dynamic values", "No hardcoded counts detected")

    # ─── CHECK 6: Required structure ───
    required = {
        "Unsubscribe link": r'(?i)unsubscribe',
        "Footer branding": r'brief\s*delights',
        "Date header": date.replace("-", ""),  # At least the date appears somewhere
    }
    missing_elements = []
    for name, pattern in required.items():
        if not re.search(pattern, html, re.IGNORECASE):
            # For date, try multiple formats
            if name == "Date header":
                formatted = datetime.strptime(date, "%Y-%m-%d").strftime("%B %d, %Y")
                if formatted not in html and date not in html:
                    missing_elements.append(name)
            else:
                missing_elements.append(name)

    if missing_elements:
        report.fail("Required structure", f"Missing: {', '.join(missing_elements)}")
    else:
        report.ok("Required structure", "Header, footer, unsubscribe all present")

    # ─── CHECK 7: Email size ───
    size_kb = len(html.encode("utf-8")) / 1024
    if size_kb > 102:
        report.warn("Email size", f"{size_kb:.1f}KB exceeds Gmail clip threshold (102KB)")
    elif size_kb < 1:
        report.fail("Email size", f"Suspiciously small: {size_kb:.1f}KB")
    else:
        report.ok("Email size", f"{size_kb:.1f}KB (under 102KB Gmail limit)")

    # ─── CHECK 8: All href URLs syntactically valid ───
    href_urls = re.findall(r'href=["\']([^"\']+)["\']', html)
    invalid_hrefs = []
    for href in href_urls:
        if href.startswith(("#", "mailto:", "tel:")):
            continue  # These are fine
        if href.startswith(("http://", "https://", "/")):
            try:
                parsed = urlparse(href)
                if href.startswith("http") and not parsed.netloc:
                    invalid_hrefs.append(href[:60])
            except Exception:
                invalid_hrefs.append(href[:60])
        else:
            # Not a recognized scheme
            if not href.startswith("{"):  # Ignore any remaining template vars (caught above)
                invalid_hrefs.append(href[:60])

    if invalid_hrefs:
        report.warn("HTML href validity", f"{len(invalid_hrefs)} suspicious href(s): {invalid_hrefs[0]}")
    else:
        report.ok("HTML href validity", f"All {len(href_urls)} href attributes valid")

    return report


def main():
    parser = argparse.ArgumentParser(description="Newsletter Quality Gate")
    parser.add_argument("--segment", required=True, help="Segment ID")
    parser.add_argument("--date", default=TODAY, help="Date to check (default: today)")
    parser.add_argument("--warn-only", action="store_true",
                        help="Treat failures as warnings (don't block pipeline)")
    args = parser.parse_args()

    report = validate_newsletter(args.segment, args.date)
    report.print_report()

    if not report.passed():
        if args.warn_only:
            print("⚠️  --warn-only mode: proceeding despite failures")
            sys.exit(0)
        else:
            print("💡 Fix the issues above, or pass --warn-only to bypass")
            sys.exit(1)

    sys.exit(0)


if __name__ == "__main__":
    main()
