# Design Spec: Agency White-Label Retainer Briefing Engine (NaaS)

**Date**: 2026-08-03  
**Status**: APPROVED  
**Target Audience**: Boutique Software Agencies, AI Consultancies, DevRel Studios, and Fractional CTOs ($99 / mo)  
**Core Purpose**: Protect $5k–$20k/mo client retainers by automatically delivering a co-branded weekly AI & tech signal digest to agency client lists with zero manual work.

---

## 1. Executive Summary & Value Proposition

Boutique agencies and fractional CTOs face constant client scrutiny over monthly retainer fees. Delivering a polished weekly intelligence briefing to clients demonstrates ongoing thought leadership and high-touch strategic value, but manually researching, writing, and formatting a weekly newsletter takes 4+ hours of valuable billable time.

The **Agency White-Label Retainer Briefing Engine** automates this end-to-end:
- **Instant Setup**: Agency inputs their domain URL (`agency.com`).
- **Brand Auto-Scrape**: Extracts logo mark, brand colors, and typography to render a bespoke co-branded newsletter template (*"[Agency Name] Weekly Signal Brief"*).
- **Automated Curation**: Harvests 1,300+ daily feeds, selecting top high-impact insights and role takeaways tailored for non-technical executives and tech leads.
- **Client List Delivery**: Dispatches every Monday at 8:00 AM directly to the agency's client recipient list with `reply-to` set to the agency founder.

---

## 2. Architecture & Technical Workflow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          AGENCIES & CONSULTANTS                         │
│               Input Domain (e.g. superhuman.studio) & Client List       │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    BRAND SCRAPING & TEMPLATE ENGINE                     │
│               • Extracts Logo Mark, Hex Accent, Typography              │
│               • Renders Co-Branded HTML Template                        │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    AUTOMATED CURATION & SYNTHESIS                       │
│               • Harvests 30+ Sources (AI, Eng, Product)                 │
│               • DeepSeek/Gemini 2-Sentence Summaries & Takeaway Boxes    │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    DELIVERY & ENGAGEMENT TRACKING                       │
│               • Friday 3:00 PM Optional Review Gate for Agency Founder  │
│               • Monday 8:00 AM Resend API Dispatch to Client CSV        │
│               • Direct Client Reply-To → Agency Founder Inbox           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Onboarding & Dashboard Management

1. **60-Second Onboarding**:
   - Land on `brief.delights.pro/agency`.
   - Enter agency domain (`superhuman.studio`) and admin email.
   - Real-time scrape generates live preview of their co-branded client brief.
   - 1-Click Stripe Checkout ($99/mo).

2. **Client Recipient List Management**:
   - Simple CSV upload or text area paste (up to 100 client contacts).
   - Custom `reply-to` header mapping to agency founder email.
   - Friday 3:00 PM optional 1-click email review link (*"Approve Monday's Client Dispatch"*).

---

## 4. Verification Plan

### Automated Verification:
- Validate brand scraping pipeline on 10 sample agency domains (`posthog.com`, `linear.app`, `supabase.com`, `superhuman.studio`, `tavus.io`).
- Run Quality Gate audit (`validate_newsletter.py`) on co-branded HTML generation.

### Manual Verification:
- Verify co-branded preview rendering in primary email clients (Gmail, Apple Mail, Outlook).
- Test `reply-to` header routing to ensure client replies hit the agency founder inbox directly.
