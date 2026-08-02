# Design Spec — Ask Brief Delights AI (Vector RAG + Freemium-to-Pro Funnel)

## 1. Overview & Positioning
"Ask Brief Delights AI" transforms our 10,000+ daily scanned tech stories into an interactive semantic search engine. Positioned directly on the home landing page under the top launch banner, it drives newsletter email acquisition and converts power users into **Brief Delights Studio Pro** subscribers ($9.00 / month or $79 / year).

---

## 2. Multi-Tier Gating & Credit Ticker Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             GUEST (UNAUTHENTICATED)                         │
│  • Search #1: 3 Top Stories Unlocked + AI Synthesis. Results #4+ Blurred.   │
│  • Search #2: All Results Blurred -> "Enter Email for 5 Free Monthly AI Searches"│
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │ Email Validated
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             FREE SUBSCRIBER TIER                            │
│  • 5 Free AI Searches / Month.                                               │
│  • Micro-Ticker Pill in Search Bar: "🟢 5 / 5 Monthly Credits Remaining"     │
│  • Live Decrement: "🟢 5/5" ──> "🟡 2/5" ──> "🔴 0/5 Credits Remaining"      │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │ 0/5 Credits Reached
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             STUDIO PRO TIER ($9/MO or $79/YR)               │
│  • Unlimited AI Searches & Complete Archive Vector Synthesis.                │
│  • Full DeepSeek-V4-Flash 128k Analysis & Exportable PDF Reports.           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Architecture & Data Flow

```
[User Query] ──> [/api/search] ──> [OpenAI text-embedding-3-small]
                                             │
                                             ▼
[DeepSeek-V4 Synthesis] <── [Top 8 Matches] <── [Supabase pgvector match_articles]
```

1. **Ingestion Embeddings (`execution/store_embeddings.py`)**:
   - Computes 1,536-dim vector embeddings of `headline + summary + key_takeaway` for every scanned story.
   - Stores vector in Supabase `articles` table (`embedding vector(1536)`).

2. **Search API (`landing/app/api/search/route.ts`)**:
   - Accepts search query + subscriber token / email.
   - Checks monthly credit allowance (5 free / month for verified subscribers, 0 for depleted, unlimited for Pro).
   - Performs vector cosine similarity match against Supabase `match_articles` RPC function.
   - Passes top 5 matches to **DeepSeek-V4-Flash-0731** to generate a 2-paragraph executive AI answer with clickable citations.

3. **Front-End Search Component (`landing/components/AISearchSection.tsx`)**:
   - Positioned directly under the top launch banner on `landing/components/ClientPage.tsx`.
   - Displays live credit ticker pill (`🟢 5 / 5 AI Credits`).
   - Renders unlocked/blurred results and Pro Upgrade Card ($9.00/month or $79/year).

---

## 4. Detailed Component & UI Mockup

### Search Input Bar
- **Placeholder**: *"Ask Brief Delights AI: Search 10,000+ tech & AI insights..."*
- **Credit Ticker Pill**: `🟢 5 / 5 Credits Left This Month`
- **Sample Prompt Chips**:
  - `🚀 DeepSeek V4 Benchmark`
  - `🛡️ Kimwolf Botnet Threat`
  - `⚡ Next.js vs Vite Performance`

### Credit Exhaustion Unlock Card (0/5 Credits Left)
```text
┌────────────────────────────────────────────────────────────────────────────┐
│ 🔴 0 / 5 Free AI Search Credits Remaining This Month                      │
│                                                                            │
│ Upgrade to Brief Delights Studio Pro for Unlimited AI Search               │
│ • Unlimited DeepSeek-V4-Flash Semantic Queries                             │
│ • Full 10,000+ Historical Tech & AI Archive Access                         │
│ • Executive Weekly Synthesis Reports                                       │
│                                                                            │
│ [ $9.00 / month ]    [ $79.00 / year (Save 27%) ]                         │
│                                                                            │
│                     ⚡ Upgrade to Studio Pro Now →                         │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Supabase Database Schema

```sql
-- Enable pgvector extension
create extension if not exists vector;

-- Add embedding vector column to articles
alter table articles add column if not exists embedding vector(1536);

-- Add search credit tracking to subscribers
alter table subscribers add column if not exists search_credits_used int default 0;
alter table subscribers add column if not exists search_credits_reset_at timestamp with time zone default now();
alter table subscribers add column if not exists plan_tier text default 'free'; -- 'free' or 'pro'

-- Vector similarity search RPC function
create or replace function match_articles (
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  title text,
  summary text,
  key_takeaway text,
  source text,
  url text,
  published_date text,
  segment text,
  similarity float
)
language sql stable
as $$
  select
    articles.id,
    articles.title,
    articles.summary,
    articles.key_takeaway,
    articles.source,
    articles.url,
    articles.published_date,
    articles.segment,
    1 - (articles.embedding <=> query_embedding) as similarity
  from articles
  where 1 - (articles.embedding <=> query_embedding) > match_threshold
  order by articles.embedding <=> query_embedding
  limit match_count;
$$;
```
