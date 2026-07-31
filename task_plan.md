# Task Plan: Bullet-Proof & Future-Proof Newsletter Pipeline

## Goal
Fix all LLM API errors, RSS feed parsing failures, schema validation errors, and model fallbacks to ensure the automated daily newsletter pipeline executes 100% reliably and bullet-proof.

## Tasks & Phases

### Phase 1: Comprehensive Failure Analysis & Diagnostics
- [x] Analyze GitHub Actions run #208 logs
- [x] Identify OpenRouter model ID errors (`google/gemini-flash-latest` 400 Bad Request)
- [x] Identify Pydantic/OpenAI strict schema validation error (`additionalProperties: false` 400 Bad Request)
- [x] Identify RSS feed parsing failures (synthetic feed paths & 403 blocks)

### Phase 2: OpenRouter Model Routing & Schema Compliance Fixes
- [x] Fix OpenRouter model IDs across all scripts (`google/gemini-2.5-flash`, `openai/gpt-4o-mini`, `anthropic/claude-3.5-sonnet:beta`)
- [x] Implement robust Pydantic JSON schema sanitizer (`additionalProperties: false` injector for strict mode)
- [x] Add JSON repair / raw prompt fallback when structured output APIs return provider errors

### Phase 3: RSS Feed Resilience & Path Mismatch Fixes
- [x] Fix path resolution for synthetic custom RSS feeds (CloudDocs vs deployment container paths)
- [x] Implement user-agent headers and timeout handling for external RSS feeds (Nature, DeepMind, HBR, Bloomberg, WSJ, Gartner)
- [x] Gracefully handle feed parsing failures without crashing pipeline stages

### Phase 4: Verification & Automated Pipeline Validation
- [x] Run unit tests and local pipeline execution (7,254 unique articles aggregated in 26.67s)
- [x] Pushed fixes to GitHub origin/main ([Commit 4f36bff])
- [x] Updated task_plan.md, findings.md, and progress.md

## Errors & Discoveries
| Error | Attempt | Resolution |
|-------|---------|------------|
| `google/gemini-flash-latest is not a valid model ID` | 1 | Use explicit OpenRouter model IDs (`google/gemini-2.5-flash`, `openai/gpt-4o-mini`) |
| `additionalProperties: false is required` | 1 | Add recursive JSON schema post-processor to set `additionalProperties: False` |
| `Failed to parse feed: /Users/linus/.../.tmp/...` | 1 | Use relative `PROJECT_ROOT / ".tmp"` path for synthetic feeds |
