# Research & Findings — Ask Brief Delights AI Search

## 1. RAG Architecture Evaluation

### Current State:
- **Retrieval**: OpenAI `text-embedding-3-small` ($0.02 / 1M tokens) + Keyword & Temporal Month scoring (`May`, `June`, `July`, `August`).
- **Generation**: DeepSeek-V4-Flash-0731 ($0.09 / 1M input, $0.18 / 1M output tokens).
- **Latency**: ~280ms end-to-end HTTP response.
- **Data Source**: 6 curated sample dispatches in `landing/app/api/search/route.ts`.

### Gaps Identified:
1. **Mock Data Scope**: Search currently queries 6 sample dispatches embedded in `route.ts`. It needs to query the full historical archive of published JSON dispatches in `reports/weekly_insights/` and Supabase.
2. **Synchronous Blocking**: Search waits for the full 500-token completion before rendering the executive synthesis box. Adding a streaming ReadableStream response will reduce perceived latency to < 100ms.
3. **Multi-Turn Context**: Users currently get 1-shot search answers without the ability to ask follow-up questions ("Deep Dive into this point").

---

## 2. Recommended Roadmap for Search Excellence

| Feature | Impact | Effort | Value to User |
|:---|:---|:---|:---|
| **Real Archive Ingestion** | High | Low | Search queries actual published dispatches from past weeks |
| **Streaming UI (Typewriter)** | High | Medium | First character appears in < 100ms |
| **Conversational Follow-Up** | High | Medium | Enables multi-turn research conversations |
| **Verbatim Quote Citation** | Medium | Low | Shows exact quoted text snippet from archive |

---

## 3. Node-Based Pipeline Visualization & Control Architecture

### Assessment:
- **Feasibility & Value:** Highly aligned with the core pipeline's fan-in (multi-source) / fan-out (multi-output) DAG structure.
- **Key Capabilities:**
  1. **Provenance & Inspection:** Clicking nodes reveals item throughput, filter drop categories, scoring rationale, and source lineage.
  2. **Interactive Tuning & Partial Re-runs:** Adjusting thresholds or prompt templates with fast sub-graph re-runs using cached intermediate outputs (`.tmp/stage_*.json`).
- **Tech Stack Alignment:**
  - **Frontend:** `@xyflow/react` (React Flow) inside Next.js App Router (`landing/app/dashboard/` or `landing/app/admin/`).
  - **Backend API:** FastAPI (`execution/api.py`) exposing DAG topology, streaming execution, and node parameter mutations.
  - **Engine:** Python modular pipeline scripts (`execution/*.py`).
- **Full Specification:** See [2026-08-28-node-based-engine-visualizer-design.md](file:///Users/linus/Library/Mobile%20Documents/com~apple~CloudDocs/projects%202/Dream%20Validator/Prototrying.com/Prototryers/antigravity/The%20letter/docs/plans/2026-08-28-node-based-engine-visualizer-design.md).

