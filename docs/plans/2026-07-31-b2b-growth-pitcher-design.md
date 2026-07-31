# B2B Growth Pitcher & Auto-Lead Engine Design Specification
Date: 2026-07-31
Author: Brief Delights Growth & Engineering Team

## Executive Overview
The **B2B Growth Pitcher Engine** is an autonomous SaaS lead generation and white-label pitch platform. It scrapes SaaS target domains, extracts logos and brand palettes, auto-incubates custom niche feeds, enforces the **≥85/100 Matrix Score Quality Gate**, generates live co-branded newsletter preview links (`brief.delights.pro/preview/{slug}`), and executes personalized outreach via Resend.

It features a **Trust Switch (Review First vs Auto-Pilot)** accessible directly via our Web Studio at `brief.delights.pro/admin/b2b-pitcher`.

---

## 🏛️ System Architecture & Pipeline Steps

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 1. SaaS Brand & Lead Scraper (scrape_saas_brand.py)                                     │
│    • Scrapes target domain URL.                                                        │
│    • Extracts Logo URL, primary CSS brand colors, ICP description, & founder contact.  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 2. Auto-Niche Feed Scouting & Matrix Quality Gate (scout_niche_sources.py)            │
│    • Auto-discovers 15 candidate feeds for target ICP.                                 │
│    • Runs eval_matrix.py. Matrix Score MUST be ≥ 85/100 to qualify prospect!           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 3. Co-Branded Live Preview Renderer (generate_cobranded_pitch.py)                      │
│    • Renders live co-branded HTML preview co-branded with target logo & accent colors. │
│    • Hosts preview page at brief.delights.pro/preview/{saas_slug}.                      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 4. The Trust Switch (Review Queue vs Auto-Pilot Pitch)                                │
│    • Review Mode: Adds qualified prospect to Web UI queue at /admin/b2b-pitcher.        │
│    • Auto-Pilot Mode: Sends personalized pitch email automatically via Resend API.     │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🎨 Web Studio UI Specs (`landing/app/admin/b2b-pitcher/page.tsx`)

### Tab 1: On-Demand SaaS Pitch Generator
- Input: SaaS Website URL (e.g. `https://posthog.com`), Contact Email.
- Action: Runs 1-click brand extraction, matrix validation, preview generation, and pitch delivery.

### Tab 2: Lead Hunter & Queue Management
- Live Table Columns: `SaaS Target` | `Domain` | `Matrix Score` | `Live Preview` | `Status` | `Action`
- Trust Switch: Toggle `[ AUTO-PILOT OUTREACH: ON / OFF ]`.

---

## 🔒 Quality & Security Firewall
- **Matrix Quality Firewall**: If `eval_matrix.py` returns <85/100 for a prospect, the pitch is automatically blocked from sending, protecting 100% of brand credibility.
