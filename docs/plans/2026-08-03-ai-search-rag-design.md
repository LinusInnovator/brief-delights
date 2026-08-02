# Design Spec — Ask Brief Delights AI (Vector RAG + High-Conversion Gating)

## 1. Overview & Vision
"Ask Brief Delights AI" turns our 10,000+ daily scanned tech stories into an interactive semantic search engine. Placed directly under the launch banner on the home landing page, it acts as a primary lead-generation hook:
- **First Search (Guest)**: Displays top 3 unlocked story results + DeepSeek-V4 executive answer. Results 4+ are blurred with a subscription lock card.
- **Second Search (Guest)**: All results are blurred with a high-converting message: *"Ask Brief Delights AI is reserved for subscribers — Subscribe free to unlock unlimited AI search."*
- **Subscribers**: 100% unlimited search with zero blurring.

---

## 2. Architecture & Data Flow

```
[User Query] ──> [Next.js API /api/search] ──> [OpenAI text-embedding-3-small]
                                                        │
                                                        ▼
[DeepSeek-V4-Flash Synthesis] <── [Top 8 Matches] <── [Supabase pgvector / match_articles]
```

1. **Ingestion (`execution/enrich_articles.py` or `store_embeddings.py`)**:
   - For every daily scanned article, compute 1,536-dim vector embedding of `headline + summary + key_takeaway`.
   - Store vector embedding in Supabase `articles` table (`embedding vector(1536)`).

2. **Search Endpoint (`landing/app/api/search/route.ts`)**:
   - Computes embedding for user search query.
   - Performs vector cosine similarity match against Supabase `match_articles` RPC function.
   - Passes top 5 matches to **DeepSeek-V4-Flash-0731** to generate a 2-paragraph executive AI answer with clickable citations.

3. **Front-End Search Component (`landing/components/AISearchSection.tsx`)**:
   - Positioned on `landing/components/ClientPage.tsx` under the launch banner.
   - Manages client search attempts (`bd_search_count` in `localStorage`).
   - Renders unlocked/blurred results according to search attempt count.

---

## 3. Detailed Component & UI Mockup

### Top Search Bar (Landing Page & Header)
- **Input Placeholder**: *"Ask Brief Delights AI: Search 10,000+ tech & AI insights..."*
- **Sample Prompt Chips**:
  - `🚀 DeepSeek V4 Benchmark`
  - `🛡️ Kimwolf Botnet Threat`
  - `⚡ Next.js vs Vite Performance`

### Result Rendering Logic
- **Search Attempt #1**:
  - ✨ **AI Executive Synthesis** (DeepSeek-V4-Flash)
  - 📖 **Story 1 (Unlocked)**
  - 📖 **Story 2 (Unlocked)**
  - 📖 **Story 3 (Unlocked)**
  - 🔒 **Story 4+ (Blurred)** + Lock Card (*"Subscribe free to unlock all 10,000+ insights"*).

- **Search Attempt #2+**:
  - 🔒 **All Content Blurred** + High-converting card (*"Ask Brief Delights AI is for active subscribers. Enter your work email below to unlock unlimited search."*).

---

## 4. Supabase Database Schema

```sql
-- Enable pgvector extension
create extension if not exists vector;

-- Add embedding vector column to articles
alter table articles add column if not exists embedding vector(1536);

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
