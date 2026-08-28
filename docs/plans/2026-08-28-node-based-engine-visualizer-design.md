# Design Spec — Node-Based Visualizer & Interactive Pipeline Engine

## 1. Executive Summary & Vision

The Brief Delights autonomous intelligence engine continuously ingests thousands of daily inputs (news feeds, research, community signals), filters noise, ranks relevance, clusters developments, and synthesizes them into high-value insights.

To elevate this architecture into a world-class autonomous intelligence platform, we are introducing a **Node-Based DAG (Directed Acyclic Graph) Visualizer & Interactive Control Engine**. 

This system provides two major capabilities:
1. **Full Provenance & Inspection:** Visualizing data throughput, drop rates, scoring rationale, and lineage from raw feed items to finished output.
2. **Interactive Pipeline Tuning & Re-running:** Adjusting stage parameters (scoring thresholds, prompt templates, model selection) and executing partial sub-graph re-runs without repeating expensive ingestion.

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   HIGH-LEVEL PIPELINE DAG                                   │
│                                                                                             │
│  [ Ingestion Sources ] ──> [ Noise & Relevance ] ──> [ Significance ] ──> [ Topic Cluster ] │
│  (RSS, Reddit, APIs)       (Filter & Dedup)          (Scoring Matrix)     (Vector Space)    │
│                                                                                  │          │
│                                           ┌──────────────────────────────────────┴───────┐  │
│                                           ▼                                              ▼  │
│                                  [ Newsletter Synthesizer ]                     [ Briefing Report ] │
│                                           │                                              │  │
│                                           ▼                                              ▼  │
│                                   [ HTML & Email Sink ]                         [ PDF / Slack Sink] │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Architectural Principles

### A. The "Visual DAG" vs. "Visual Programming Trap"
* **What We Avoid (The Trap):** We do **not** build a low-level visual programming language with raw math nodes, variable assignments, or microscopic conditionals.
* **What We Build (Domain DAG):** A high-level declarative pipeline where each node maps to a concrete pipeline stage in `execution/*.py`. Nodes expose high-impact parameters (thresholds, prompt templates, model pickers, enable/disable switches) and data inspector drawers.

### B. Two Operating Modes
1. **Live Inspection & Telemetry Mode:**
   * Visualizes real-time or historical runs.
   * Displays item throughput counters on each node (e.g., `3,420 in` ➔ `48 passed` ➔ `12 clusters` ➔ `10 selected`).
   * Clicking a node opens an **Inspector Drawer** displaying drop reasons, scoring distributions, and token usage.
2. **Interactive Configuration & Partial Re-Run Mode:**
   * Tweak weights (e.g., `relevance_threshold: 0.80`, `novelty_weight: 0.40`) or prompt templates directly in the node properties.
   * **Sub-graph Re-run:** Re-executing from a specific node (e.g., re-synthesizing the newsletter) utilizing cached intermediate outputs (`.tmp/stage_*.json`) rather than re-fetching thousands of feeds.

---

## 3. Tech Stack Integration ("Fits Like a Glove")

The architecture leverages our existing tech stack without adding redundant services:

| Layer | Technology | Role & Integration |
|---|---|---|
| **Canvas UI** | `@xyflow/react` (React Flow) | Renders the interactive node canvas, handles custom node components, handles zoom/pan, minimap, and edge routing inside Next.js App Router. |
| **Frontend Framework** | **Next.js 14+ / React / Tailwind** | Native placement at `landing/app/dashboard/pipeline/page.tsx` or `landing/app/admin/engine/page.tsx`. Uses existing `lucide-react` icons and editorial styling. |
| **API Gateway** | **FastAPI (`execution/api.py`)** | Exposes DAG topology endpoints, configuration mutations, and real-time streaming execution via `StreamingResponse`. |
| **Engine Core** | **Python Pipeline (`execution/*.py`)** | Modular scripts (`aggregate_feeds.py`, `select_stories.py`, `summarize_articles.py`, `compose_newsletter.py`) instrumented to emit structured stage snapshots to `.tmp/` and Supabase. |
| **State & Lineage** | **Supabase & JSON Ledger** | Persists pipeline run logs, story provenance maps, and segment configuration overrides. |

---

## 4. Pipeline Node Taxonomy

```
[ Ingest Node ] ──> [ Filter Node ] ──> [ Rank Node ] ──> [ Cluster Node ] ──> [ Synthesis Node ] ──> [ Output Sink ]
```

### 1. Ingestion Nodes (`SourceNode`)
* **Underlying Scripts:** `execution/aggregate_feeds.py`, `execution/radar_scanner.py`, `execution/hn_signals.py`.
* **Controls:** Active feed toggles, lookback window (e.g. 24h), rate limit guards.
* **Output Payload:** Array of raw article objects (`title`, `url`, `body`, `published_at`, `source_id`).

### 2. Filtering & Deduplication Nodes (`FilterNode`)
* **Underlying Scripts:** `execution/scrape_articles.py`, `execution/enrich_articles.py`.
* **Controls:** Readability threshold, duplicate similarity cutoff (cosine distance), minimum word count.
* **Telemetry:** Items in vs. items dropped with drop category breakdown (spam, paywall, non-tech, duplicate).

### 3. Significance & Evaluation Nodes (`RankNode`)
* **Underlying Scripts:** `execution/eval_matrix.py`, `execution/select_stories.py`, `execution/detect_contrarian.py`.
* **Controls:** 
  * Sliders for *Strategic Impact*, *Technological Novelty*, and *Actionability*.
  * LLM Evaluator model switch (`gpt-4o-mini`, `gemini-2.5-flash`, `deepseek-v4-flash`).
* **Inspector:** Distribution histogram of scores across the input pool.

### 4. Topic Clustering & Trend Nodes (`ClusterNode`)
* **Underlying Scripts:** `execution/detect_trends.py`, `execution/track_story_arcs.py`.
* **Controls:** Clustering distance threshold, maximum cluster count, min cluster size.
* **Payload:** Grouped story clusters with centroid headlines and narrative momentum flags.

### 5. Synthesis & Editorial Nodes (`SynthesisNode`)
* **Underlying Scripts:** `execution/summarize_articles.py`, `execution/compose_newsletter.py`, `execution/synthesize_weekly_insights.py`.
* **Controls:** System prompt editor, editorial tone selector (Executive, Deep-Dive, Punchy), target word count, model selector.
* **Payload:** Structured story summaries, key takeaways, contrarian angle, and editorial narrative.

### 6. Output Sink Nodes (`OutputSinkNode`)
* **Underlying Scripts:** `execution/send_newsletter.py`, `execution/repurpose_newsletter.py`, `execution/save_social_posts.py`.
* **Controls:** Target destination (HTML Email via Resend, Markdown Archive, Social Thread, PDF Report), test-send button.

---

## 5. API Contracts (`execution/api.py`)

### `GET /api/pipeline/graph`
Returns the active DAG topology, node positions, connections, and current parameter values:
```json
{
  "nodes": [
    {
      "id": "node_ingest_rss",
      "type": "sourceNode",
      "position": { "x": 100, "y": 200 },
      "data": { "label": "Tech Feeds Ingestion", "sourceCount": 38, "status": "idle" }
    },
    {
      "id": "node_rank_matrix",
      "type": "rankNode",
      "position": { "x": 500, "y": 200 },
      "data": { "label": "Significance Scoring", "threshold": 0.78, "model": "gemini-2.5-flash" }
    }
  ],
  "edges": [
    { "id": "e_ingest_to_filter", "source": "node_ingest_rss", "target": "node_filter" }
  ]
}
```

### `POST /api/pipeline/run-node`
Runs an individual stage or downstream path with optional parameter overrides:
```json
{
  "nodeId": "node_synthesis_newsletter",
  "fromCache": true,
  "overrideConfig": {
    "editorialTone": "Sharp Executive",
    "model": "deepseek-v4-flash"
  }
}
```

### `GET /api/pipeline/node/:id/payload`
Fetches intermediate payload and telemetry data for the inspector drawer.

---

## 6. Implementation Roadmap

```
Phase 1: Visual DAG Canvas & Topology (React Flow + FastAPI graph endpoint)
    │
    ▼
Phase 2: Stage Checkpoints & Live Telemetry Inspector (Payload drawers, drop reasons)
    │
    ▼
Phase 3: Interactive Parameter Overrides & Sub-Graph Re-Runs (Cached stage execution)
    │
    ▼
Phase 4: Multi-Sink Branching (Connect new outputs: Pod scripts, Social, White-label)
```
