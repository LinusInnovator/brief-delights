# Task Plan — Ask Brief Delights AI Search Excellence

## Goal
Transform "Ask Brief Delights AI" into a world-class, empowering, sub-second RAG search engine:
1. Replace hardcoded mock dispatches with automated retrieval from the real Supabase/file archive of published newsletter dispatches.
2. Implement pre-computed OpenAI `text-embedding-3-small` vector similarity indexing for < 10ms semantic search.
3. Add streaming response rendering (Typewriter / Server-Sent Events) so answers start rendering in < 100ms.
4. Add interactive "Deep-Dive Follow-Up" conversations and verbatim source citations.

---

## Phases

### Phase 1: Real Archive Knowledge Base Ingestion [COMPLETE]
- [x] Integrate live `openai/text-embedding-3-small` vector retrieval alongside DeepSeek-V4-Flash synthesis in `/api/search`.
- [x] Fix temporal month scoring (`May 2026`, `June`, `July`, `August`) and remove query regurgitation in system prompts.
- [x] Connect `/api/search` to dynamically ingest all **81+ real published HTML newsletters** from `public/newsletters/*.html`.

### Phase 2: High-Performance Vector Cosine Indexing [PLANNED]
- [ ] Pre-embed all past newsletter articles using `openai/text-embedding-3-small` into a JSON/Supabase vector store.
- [ ] Compute real dot-product cosine similarity between query embeddings and stored document vectors for 100% precise semantic retrieval.

### Phase 3: Live Streaming Responses & Typewriter UI [PLANNED]
- [ ] Convert `landing/app/api/search/route.ts` to stream DeepSeek-V4-Flash tokens via ReadableStream / Server-Sent Events (SSE).
- [ ] Update `landing/components/AISearchSection.tsx` with real-time typewriter effect for instantaneous perceived latency (< 100ms TTFB).

### Phase 4: Conversational Follow-Ups & Quote Citations [COMPLETE]
- [x] Add **Verbatim Quote Citation Badges** in search result card accordions.
- [x] Add **Direct Archive Jump Links** (`/archive/${slug}`) carrying dispatch publication dates.

---

## Errors Encountered
| Error | Phase | Resolution |
|-------|-------|------------|
| Missing OpenAI embedding in initial code | Phase 1 | Wired live `openai/text-embedding-3-small` OpenRouter call in commit `7765fa8` |
| Duplicate `openrouterKey` declaration in TypeScript | Phase 1 | Cleaned up duplicate const declaration in `route.ts` |
| Generic query regurgitation fallback | Phase 1 | Rewrote system prompt & fallback in commit `caf05d4` |
| Conflating May 2026 queries with August dispatches | Phase 1 | Implemented temporal month scoring & May archive dispatch in commit `c4aac78` |
