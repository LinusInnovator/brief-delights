# Auto-Niche Discovery & Source Scout Design Specification
Date: 2026-07-31
Author: Brief Delights Engineering Team

## Executive Overview
The **Auto-Niche Discovery & Source Scout Engine** (`execution/scout_niche_sources.py`) is an autonomous subsystem for discovering, probing, and validating high-signal RSS/Substack/GitHub feeds for any specified niche or exploding tech trend. 

It decouples niche discovery from production newsletter generation, ensuring zero risk to core delivery while enabling 1-click incubation of new vertical publications.

---

## 🏗️ System Architecture & Data Flow

```
┌─────────────────────────┐     ┌──────────────────────────┐     ┌─────────────────────────┐
│ 1. Niche Topic Request  │ ──► │ 2. Auto Feed Discovery   │ ──► │ 3. Dry-Run Evaluation   │
│ ("Agentic Workflows")   │     │ (Substack, RSS, GitHub)  │     │ (eval_matrix.py > 85?)  │
└─────────────────────────┘     └──────────────────────────┘     └────────────┬────────────┘
                                                                              │
                                                                              ▼
                                                                 ┌─────────────────────────┐
                                                                 │ 4. Auto-Niche Generated │
                                                                 │ (feeds_agentic.json)    │
                                                                 └─────────────────────────┘
```

---

## 🛠️ CLI Interface Specifications

### 1. On-Demand Niche Scouting Mode
```bash
python3 execution/scout_niche_sources.py --niche "Agentic AI Workflows"
```
* **Behavior**: Prompts OpenRouter for 15 candidate feeds on `"Agentic AI Workflows"`, probes each URL for active RSS/Atom status, collects 48 hours of articles, and runs `eval_matrix.py`.
* **Artifact Output**: If Matrix Score > 85/100, writes `feeds_config/feeds_agentic_ai_workflows.json`.

### 2. Autonomous Trend Discovery Mode
```bash
python3 execution/scout_niche_sources.py --auto-scout
```
* **Behavior**: Queries GitHub Trending and HackerNews top stories to discover exploding 2026 tech trends, selects the top 2 trends, and runs the incubation pipeline automatically.

---

## 🔬 Core Components

1. **`LLMFeedProber`**: Prompts OpenRouter (`OPENROUTER_API_KEY`) to suggest direct RSS, Substack, and GitHub Release Atom feeds for any keyword.
2. **`FeedValidator`**: Uses `requests` with browser `User-Agent` headers and `feedparser` to verify:
   - HTTP Status 200 / 301.
   - Valid RSS/Atom XML structure.
   - Contains recent articles within the 48-hour lookback window.
3. **`MatrixQualityGate`**: Ingests dry-run articles into `eval_matrix.py` and enforces the **>85/100 Matrix Score Gate**.

---

## 💼 Business & Monetization Architecture
* **B2B White-Label Briefs**: High-margin daily digests generated for enterprise clients ($299-$999/mo per client).
* **Micro-Media Portfolio**: Scalable portfolio of niche publications built at <$1/month operating cost per niche.
