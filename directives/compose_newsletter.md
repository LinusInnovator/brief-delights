# Directive: Compose Newsletter

## Goal
Assemble final HTML newsletter from summarized articles using Jinja2 templates. Creates a clean, scannable, mobile-responsive email per segment with 3-tier article structure and sponsor placeholders.

## Inputs
- `.tmp/summaries_{segment}_{YYYY-MM-DD}.json` — Articles with AI summaries (per segment)
- `newsletter_template.html` — Jinja2 base email template
- `segments_config.json` — Segment definitions and selection criteria

## Tool to Use
- **Script:** `execution/compose_newsletter.py`
- **Invocation:** `python3 execution/compose_newsletter.py --segment builders`

## Expected Outputs
- `.tmp/newsletter_{segment}_{YYYY-MM-DD}.html` — Final HTML email per segment
- Each newsletter includes:
  - Header with Brief Delights branding + segment emoji
  - **Full stories** (top 3-4) with deep summaries + "why this matters"
  - **Quick links** (5-8) with one-line summaries
  - **Trending** section with hot topics
  - Sponsor block (placeholders for injection by `send_newsletter.py`)
  - Footer with archive, unsubscribe, and contact links

## 3-Tier Article Structure

| Tier | Count | Format |
|------|-------|--------|
| **Full** | 3-4 | Headline + 2-3 sentence summary + "why this matters" + source link |
| **Quick Links** | 5-8 | Headline + one-line summary + source link |
| **Trending** | 3-5 | Topic name + brief context |

## Link Tracking
All article URLs are wrapped with the tracking redirect:
```
https://brief.delights.pro/api/track?url={encoded_url}&segment={segment}
```
This enables click analytics without breaking the reader experience.

## Sponsor Placeholders
The template includes these Jinja2 variables, replaced by `send_newsletter.py` at send time:
- `{{ sponsor_headline }}`
- `{{ sponsor_description }}`
- `{{ sponsor_cta_text }}`
- `{{ sponsor_cta_url }}`

If no sponsor is scheduled, the sponsor block is removed entirely.

## Footer Links (Hardcoded)
All footer links point to `brief.delights.pro`:
- **Sign Up:** `https://brief.delights.pro`
- **Advertise:** `mailto:sponsors@brief.delights.pro`
- **View Online:** `https://brief.delights.pro/archive/{date}-{segment}`
- **Unsubscribe:** `mailto:hello@brief.delights.pro?subject=Unsubscribe`
- **Contact:** `hello@brief.delights.pro`

## Footer Validation
`compose_newsletter.py` runs a `validate_footer()` check on rendered HTML:
```python
required_elements = ['Unsubscribe', 'brief delights', 'brief.delights.pro']
```
If any element is missing, the script logs a warning.

## Success Criteria
- ✅ All selected articles included in appropriate tier
- ✅ Organized by segment-specific categories
- ✅ Mobile-responsive design
- ✅ All links wrapped with tracking redirect
- ✅ Sponsor placeholders present for injection
- ✅ HTML under 102KB (Gmail clipping threshold)
- ✅ Footer validation passes

## Edge Cases & Error Handling
- **No articles for a tier:** Skip tier section, don't render empty
- **HTML exceeds 102KB:** Log warning (Gmail will clip)
- **Template not found:** Fall back to hardcoded minimal template
- **Segment unknown:** Abort with clear error

## Performance Expectations
- **Runtime:** <5 seconds per segment
- **Output size:** 50-90KB HTML

## Known Issues & Learnings

### Fixed: Jinja2 variables not rendering (Feb 16, 2026)
- **Root cause:** `{{ website_url }}` and `{{ unsubscribe_url }}` were template variables but `WEBSITE_URL` constant pointed to stale `send.dreamvalidator.com`
- **Fix:** Hardcoded all footer links to `brief.delights.pro` directly in template
- **Prevention:** Footer links should always be hardcoded, not dynamic — they don't change per-send

### Fixed: "View Online" link wrong format (Feb 16, 2026)
- **Root cause:** Template used `{{ website_url }}/{{ date }}` which produced a date-only path
- **Fix:** Changed to `brief.delights.pro/archive/{{ date }}-{{ segment }}` to match actual archive URL format
- **Prevention:** Archive URLs follow the pattern `/archive/{date}-{segment-name}`

## Next Step
After composition, proceed to `send_newsletter.md` for delivery.
