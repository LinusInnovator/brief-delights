# Brief Delights - Project Configuration

**Last Updated:** February 10, 2026

---

## Critical Project Information

### Domain & Branding

**Production Domain:** `brief.delights.pro`  
⚠️ **NOT** briefdelights.com or any other variation

**Email Configuration:**
- Sender: `Brief Delights <brief@send.dreamvalidator.com>`
- Reply-to: `brief@send.dreamvalidator.com`

**Brand Name:**
- Full: "Brief Delights"
- Short: "Brief"
- Tagline: "delights" (lowercase, always)

---

## Environment Variables

### Required for Landing Page

```env
# Resend API (for emails)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx

# Email sender (verified domain)
EMAIL_SENDER=Brief Delights <brief@send.dreamvalidator.com>

# Production base URL
NEXT_PUBLIC_BASE_URL=https://brief.delights.pro
```

### Required for Newsletter Pipeline

```env
# OpenRouter (for Claude API)
OPENROUTER_API_KEY=sk-or-xxxxxxxxxxxxx

# Resend (for sending newsletters)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
EMAIL_SENDER=Brief Delights <brief@send.dreamvalidator.com>
```

---

## Tech Stack

### Landing Page
- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **Hosting:** Netlify
- **Email:** Resend API

### Newsletter Pipeline
- **Runtime:** Python 3.11+
- **AI:** Claude 3.5 Sonnet (via OpenRouter)
- **Scheduling:** Cron
- **Storage:** File-based (JSON)

---

## Directory Structure

```
The letter/
├── landing/                    # Next.js landing page
│   ├── app/                   # App router pages
│   │   ├── page.tsx          # Homepage
│   │   ├── archive/          # Newsletter archive
│   │   └── api/              # API endpoints
│   ├── components/           # React components
│   └── .env.local.example    # Environment template
│
├── execution/                 # Python pipeline
│   ├── aggregate_feeds.py    # RSS aggregation
│   ├── enrich_articles.py    # AI enrichment
│   ├── select_top_stories.py # Claude curation
│   ├── compose_newsletter.py # HTML generation
│   └── send_newsletters.py   # Email delivery
│
├── directives/               # Pipeline instructions
├── .tmp/                     # Generated files
└── subscribers.json          # Subscriber list
```

---

## Deployment Domains

| Environment | Domain | Purpose |
|-------------|--------|---------|
| Production | `brief.delights.pro` | Live newsletter site |
| Staging | TBD via Netlify | Testing before deploy |
| Development | `localhost:3000` | Local testing |

---

## Email Domains

| Domain | Purpose | Provider |
|--------|---------|----------|
| `send.dreamvalidator.com` | Transactional emails | Resend |
| `brief.delights.pro` | Website & branding | Netlify |

**Why separate domains?**
- Email deliverability best practice
- Keep sending reputation separate from web domain
- Easier to manage SPF/DKIM records

---

## Subscriber Segments

1. **🛠️ Builders** (Orange #f97316)
   - Engineers, developers, technical founders
   - Focus: Developer tools, infrastructure, open source

2. **💼 Leaders** (Blue #2563eb)
   - Executives, managers, product leads
   - Focus: Business strategy, leadership, market trends

3. **🚀 Innovators** (Purple #9333ea)
   - Early adopters, AI enthusiasts, startup operators
   - Focus: Cutting-edge AI, emerging tech, venture trends

---

## Newsletter Schedule

| Day | Newsletter | Segment | Stories |
|-----|-----------|---------|---------|
| Mon-Sat | Daily Brief | All 3 segments | 14 per segment |
| Sunday | Weekly Insights | All 3 segments | Analysis + charts |

**Delivery Time:** 7:00 AM recipient local time (planned)

---

## Key URLs

- **Homepage:** https://brief.delights.pro
- **Archive:** https://brief.delights.pro/archive
- **Signup API:** https://brief.delights.pro/api/subscribe
- **Email Verify:** https://brief.delights.pro/api/verify?token=xxx

---

## Critical Reminders

⚠️ **Always use `brief.delights.pro` - never `briefdelights.com`**

✅ Email sender is correct: `brief@send.dreamvalidator.com`

🔒 Never commit `.env.local` to git

📧 Test emails in staging before production

---

## Quick Reference

**Start dev server:**
```bash
cd landing && npm run dev
```

**Run newsletter pipeline:**
```bash
python execution/run_daily_pipeline.py
```

**Deploy to production:**
```bash
# Via Netlify (automatic on git push to main)
git push origin main
```

---

## Support Contacts

- **Domain Management:** Linus (owner)
- **Email Deliverability:** Resend support
- **Hosting:** Netlify support
- **AI API:** OpenRouter support
