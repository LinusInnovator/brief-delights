# Directive: Sponsor Management

## Goal
Manage the full sponsor lifecycle: discovery → outreach → creative management → scheduling → delivery → analytics. This spans both the Python automation layer and the Next.js admin dashboard.

## Components

### 1. Automated Discovery (Python)
Scripts in `execution/automations/monetization/` that run periodically:

| Script | Purpose |
|--------|---------|
| `sponsor_matcher.py` | Match newsletter content themes to potential sponsors |
| `content_sponsor_discovery.py` | Discover sponsor prospects via web search |
| `smart_pricing.py` | Calculate suggested pricing based on audience size |
| `outreach_email_generator.py` | Generate personalized outreach emails |
| `content_examples_generator.py` | Create example ad placements for prospects |
| `proactive_placement.py` | Auto-suggest sponsor placements based on content |
| `demo_outreach.py` | Send demo/sample outreach emails |

### 2. Admin Dashboard (Next.js)
Located at `/admin/sponsors` with 4 tabs:

| Tab | API Route | Purpose |
|-----|-----------|---------|
| **Library** | `/api/admin/sponsors/content` | CRUD sponsor creatives |
| **Schedule** | `/api/admin/sponsors/schedule` | Assign sponsors to date × segment slots |
| **Pipeline** | `/api/admin/sponsors` | View auto-discovered prospects |
| **Stats** | `/api/admin/sponsors/stats` | Performance metrics (impressions, clicks, CTR) |

### 3. Email Injection (Python)
In `execution/send_newsletter.py`:
- `get_sponsor_for_newsletter(date, segment)` — Supabase RPC to find scheduled sponsor
- `inject_sponsor(html, sponsor, segment_id)` — Replace template placeholders
- CTA URL wrapped with `/api/track?url=...&sponsor_schedule_id=...`

### 4. Click Tracking (Next.js)
In `landing/app/api/track/route.ts`:
- Accepts `sponsor_schedule_id` parameter
- Calls `increment_sponsor_clicks` Supabase RPC
- Redirects subscriber to sponsor URL

## Database Schema

```
sponsor_leads        — Auto-discovered prospects
  ├── company_name, domain, contact_email
  ├── relevance_score, suggested_price_cents
  └── status (discovered → contacted → responded → active → churned)

sponsor_content      — Ad creatives
  ├── sponsor_id, headline, description
  ├── cta_text, cta_url, segments[]
  └── status (draft → active → paused → archived)

sponsor_schedule     — Calendar assignments
  ├── content_id, segment, scheduled_date
  ├── impressions, clicks
  └── status (scheduled → sent → completed)
```

## Sponsor Delivery Flow
```
1. Admin schedules sponsor creative for date + segment (via dashboard)
2. Pipeline runs → send_newsletter.py queries Supabase for today's sponsor
3. inject_sponsor() replaces placeholders in newsletter HTML
4. CTA URL wrapped with tracking redirect
5. Email sent with sponsor block visible
6. Subscriber clicks → /api/track → increment_sponsor_clicks RPC
7. Stats tab shows real-time impressions/clicks/CTR
```

## Pricing Model
- `smart_pricing.py` calculates `suggested_price_cents` based on:
  - Subscriber count per segment
  - Average open rate
  - Average CTR
  - Industry benchmarks

## Known Issues & Learnings

### $NaN in pipeline tab (Feb 16, 2026)
- **Root cause:** `formatPrice()` didn't handle null `suggested_price_cents`
- **Fix:** Added null guard returning '—'
- **Prevention:** Always guard formatting functions against null

### Click tracking not wired up initially (Feb 16, 2026)
- **Root cause:** `/api/track` route didn't accept `sponsor_schedule_id`
- **Fix:** Extended route + added `increment_sponsor_clicks` RPC
- **Prevention:** Tracking should be part of initial feature design, not bolted on

## Next Steps
- A/B test sponsor placement positions (top vs. middle vs. bottom)
- Implement sponsor performance alerts (low CTR notification)
- Add sponsor self-serve portal for creative upload
