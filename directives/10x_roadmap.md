# 10x Features — Brief Delights Roadmap

> **Design principle:** Python does the heavy lifting (free), LLMs only make judgment calls (cheap). Every feature below follows this — most are 90% deterministic code, 10% LLM finesse.

---

## 🧠 Intelligence Layer

### 1. Narrative Arc Detection
**What it replaces:** Today's trend detection is keyword-matching (`detect_trends.py`) — it counts "agent" mentions but can't tell you *the story*. 

**The 10x version:** Track how stories evolve across days. When "OpenAI restructures" appears Monday, "employees leave" Tuesday, and "competitors respond" Wednesday — the system synthesizes: *"This is a 3-day arc about OpenAI's strategic shift. Here's what it means."*

**Impl:**
- `execution/track_story_arcs.py` — deterministic: embed article titles → cluster by cosine similarity across 7-day window → detect chains using simple vector overlap thresholds
- LLM call (1 per arc, ~$0.002 each): "Given these 4 linked articles, write a 2-sentence narrative synthesis"
- Surface in newsletters as **"📡 Developing Story"** section

**Effort:** Medium · 1 new Python script + newsletter template update

---

### 2. Contrarian Signal Detector
**What it is:** When 80% of sources say "AI will replace developers" — find the 20% that disagree and surface them as **"🤔 The Other Side"**. Readers get what everyone else *isn't* seeing.

**Why it's 10x:** Nobody else does this. Every other newsletter amplifies consensus. You show the dissent.

**Impl:**
- Already have HN signals (`hn_signals.py`) — extend with sentiment analysis on HN comments (many contrarian views surface there first)
- `detect_contrarian.py` — group articles by topic → flag where sentiment diverges from majority → rank by "surprise factor"
- Python handles grouping/clustering. Single LLM call per newsletter to pick the best contrarian angle.

**Effort:** Small · 1 new script, modify `compose_newsletter.py`

---

### 3. "The Signal" — Weekly Intelligence Brief
**What it is:** Every Friday, auto-generate a Google Slides executive brief: 3 charts, 5 bullets, 1 prediction. Designed to be forwarded to a team or board.

**Why it's 10x:** Turns passive readers into active distributors. "I forward The Signal to my team every Monday" = organic growth engine.

**Impl:**
- Already have `synthesize_weekly_insights.py` + `generate_weekly_charts.py`
- New: `generate_weekly_slides.py` — take the weekly synthesis → create 5-slide Google Slides deck using Slides API
- Charts are *already generated*. Just need to compose them into a template.
- Add "Forward to your team" CTA in newsletter

**Effort:** Medium · 1 new script + Google Slides template

---

## 💰 Monetization Engine

### 4. Dynamic Pricing from Click Data
**What it replaces:** Static pricing tiers in `smart_pricing.py`. Currently guesses "$50 standard, $80 pro."

**The 10x version:** Real-time pricing based on actual `article_clicks` + `subscriber_count` + segment engagement. When Docker content gets 200 clicks in a week, the pitch to Docker alternatives auto-updates: *"200 developers clicked Docker content. $120 CPM for 200 guaranteed eyeballs."*

**Impl:**
- `sponsorDiscovery.ts` already queries `article_clicks` — extend pricing formula: `price = base_cpm × actual_clicks × segment_multiplier × recency_decay`
- Show price history in admin Pipeline tab (sparkline)
- Auto-adjust pricing when new click data arrives (weekly cron via GitHub Actions)

**Effort:** Small · Modify existing `sponsorDiscovery.ts` + add Supabase function

---

### 5. Sponsor Content A/B Testing
**What it is:** For each sponsored placement, auto-generate 2 versions (different hooks) and split-test which gets more clicks. Report results to sponsors.

**Why it's 10x:** Sponsors see you optimizing *for them*. Makes renewal trivial. "Your Variant B got 40% more clicks. We'll use that style going forward."

**Impl:**
- Already have A/B testing infra (`check_ab_results.py`, `send_newsletter.py` supports variants)
- Extend to sponsor content: generate 2 hooks via LLM ($0.001), split 50/50, track via `/api/track`
- Auto-generate sponsor report card → save as PDF → attach to follow-up email
- Admin dashboard: new "Sponsor Reports" section showing CTR per variant

**Effort:** Medium · Extend existing A/B infra + new report generator

---

### 6. Predictive Sponsor Timing
**What it is:** Monitor when a company raises funding, launches a product, or gets negative press — auto-trigger outreach at the *perfect moment*.

**Impl:**
- `execution/monitor_funding_events.py` — daily scan of Crunchbase API (free tier: 200 calls/month) + Product Hunt API
- When Railway raises Series B → auto-create `sponsor_lead` with `discovery_method: 'funding_event'`, eagerness_score boosted
- Trigger email draft: "Congrats on the raise! 5,000 developers read us weekly..."
- Zero LLM cost — pure API monitoring + deterministic scoring

**Effort:** Small · 1 new Python script + webhook/cron

---

## 📡 Distribution & Growth

### 7. Subscriber Intelligence Graph
**What it is:** Don't just count subscribers — understand them. Which segments grow fastest? Where do subscribers come from? What content retains vs churns?

**The 10x dashboard:**
- **Cohort analysis:** Week-over-week retention by signup source
- **Segment migration:** "12 builders also read innovators" → cross-sell
- **Churn prediction:** Subscribers who haven't opened in 3 weeks → auto-trigger re-engagement sequence
- **Source attribution:** Track UTM params → know which Reddit post / tweet / share brought each subscriber

**Impl:**
- All data already in Supabase (`subscribers`, `article_clicks`, `email_opens`)
- New admin page: `/admin/intelligence` with charts (use Recharts, already in the project)
- `execution/automations/growth/churn_predictor.py` — deterministic: no opens in 21 days + declining click rate = churn risk
- Auto-send re-engagement email via Resend

**Effort:** Medium-Large · New admin page + 1 Python script + email sequence

---

### 8. Smart RSS Source Ranking
**What it replaces:** Static RSS feed list. Currently `aggregate_feeds.py` treats all sources equally.

**The 10x version:** Score sources by signal-to-noise ratio. Track which feeds produce articles that actually get *selected* by the LLM. Feeds that consistently produce Tier 1 articles get priority. Feeds that never get selected get flagged for removal.

**Impl:**
- `execution/rank_sources.py` — after each pipeline run, calculate: `source_score = selected_articles / total_articles × avg_urgency_score`
- Save to `source_rankings.json` → feed into `aggregate_feeds.py` to pre-filter
- Admin page: show source leaderboard with sparklines
- Zero LLM cost — pure statistics

**Effort:** Small · 1 new Python script + admin UI section

---

## 📬 Reader Experience

### 9. Personalized Frequency Control
**What it is:** Let readers choose their cadence: daily, 3x/week, or weekly digest. Weekly readers get a curated "best of" from the 5 daily editions they missed.

**Why it's 10x:** Reduces unsubscribes from "too many emails" (the #1 churn reason for daily newsletters). Keeps low-frequency readers engaged instead of losing them.

**Impl:**
- Add `frequency_preference` to `subscribers` table (daily | 3x_week | weekly)
- `execution/compose_digest.py` — aggregate the week's top stories by urgency score (already calculated!) into a single digest
- Modify `send_newsletter.py` to check frequency before sending
- Settings page on reader dashboard at `/dashboard`

**Effort:** Medium · 1 new script + modify send flow + UI update

---

### 10. "Why This Matters to You" Contextualizer  
**What it is:** After each article summary, add a single italic line explaining *why a specific segment cares*. Not generic — segment-specific context.

Example:
> **Kubernetes 1.32 drops Docker support**  
> *Summary: New release removes dockershim...*  
> *🔨 Builder context: If you're deploying containers, you need to switch to containerd by March.*

**Why it's 10x:** This is the difference between a news aggregator and an *intelligence* service. Readers don't just learn *what* happened — they learn *what to do about it*.

**Impl:**
- Already in `select_stories.py`: the LLM returns `audience_value` per article per segment
- Surface this in the newsletter template as a styled italic line
- Cost: $0 extra — the data already exists, just not displayed

**Effort:** Tiny · Template change only

---

## Priority Matrix

| # | Feature | Effort | Revenue Impact | Reader Impact | Build Order |
|---|---------|--------|---------------|--------------|-------------|
| 10 | Contextualizer | Tiny | — | ⭐⭐⭐⭐⭐ | **Now** |
| 8 | Source Ranking | Small | — | ⭐⭐⭐ | **Now** |
| 2 | Contrarian Signals | Small | — | ⭐⭐⭐⭐⭐ | **Now** |
| 4 | Dynamic Pricing | Small | ⭐⭐⭐⭐⭐ | — | **Next** |
| 6 | Predictive Timing | Small | ⭐⭐⭐⭐ | — | **Next** |
| 1 | Story Arcs | Medium | — | ⭐⭐⭐⭐⭐ | **Next** |
| 5 | Sponsor A/B Testing | Medium | ⭐⭐⭐⭐ | — | **Sprint 2** |
| 9 | Frequency Control | Medium | ⭐⭐⭐ | ⭐⭐⭐⭐ | **Sprint 2** |
| 3 | Weekly Slides | Medium | ⭐⭐ | ⭐⭐⭐⭐ | **Sprint 2** |
| 7 | Subscriber Intel | Med-Lg | ⭐⭐⭐ | ⭐⭐⭐ | **Sprint 3** |

> **The "Now" tier costs almost nothing to build and immediately differentiates.** Features #10, #8, and #2 can ship in a single day combined.
