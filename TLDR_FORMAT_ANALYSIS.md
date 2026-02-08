# TLDR Format Analysis

## Key Differences Between TLDR and Our Format

### TLDR Article Structure
```
📌 Title with Read Time
GPT-5.3-Codex (11 minute read)

📝 Concise Summary (1 paragraph)
OpenAI's GPT‑5.3‑Codex is a faster agentic coding model that combines 
GPT‑5.2‑Codex's coding performance with GPT‑5.2's reasoning and 
professional knowledge.
```

### Our Current Structure
```
📌 Title Only
Expert-level test is a head-scratcher for AI

📝 Longer Summary (2-3 sentences)
Conventional AI benchmarks are becoming less effective at assessing AI 
performance as systems improve. Researchers have developed a new 
multi-disciplinary test called Humanity's Last Exam (HLE) that challenges 
state-of-the-art language models, revealing a significant gap between 
their capabilities and expert human knowledge.
```

---

## What We Need to Change

### 1. **Add Read Time to Titles**
- TLDR format: `Title (X minute read)`
- Makes content scannable
- Sets expectations for depth

### 2. **Shorten Summaries**
- TLDR: **1 concise paragraph** (~30-40 words)
- Ours: **2-3 sentences** (~50-60 words)
- Need to be MORE concise

### 3. **Focus on "So What?"**
- TLDR tells you **what it is** and **why it matters** in one line
- We explain too much context

### 4. **Remove Redundant Info**
- Don't need "Researchers have developed" - just say what it is
- Cut fluff words

---

## Revised Format Example

### Before (Our Current):
```
Expert-level test is a head-scratcher for AI

Conventional AI benchmarks are becoming less effective at assessing AI 
performance as systems improve. Researchers have developed a new 
multi-disciplinary test called Humanity's Last Exam (HLE) that challenges 
state-of-the-art language models, revealing a significant gap between 
their capabilities and expert human knowledge.

Source: Computer science : nature.com subject feeds
```

### After (TLDR-Style):
```
Expert-level test is a head-scratcher for AI (4 minute read)

New multi-disciplinary benchmark called Humanity's Last Exam (HLE) 
reveals a significant gap between AI capabilities and expert human 
knowledge, showing current models still struggle with deep reasoning.

Source: Computer science : nature.com subject feeds
```

---

## Implementation Plan

### Phase 1: Update Template
- [x] Increase body text to 18px
- [ ] Add read time to article titles
- [ ] Adjust spacing if needed

### Phase 2: Update Summarization Prompt
- [ ] Instruct LLM to generate **shorter** summaries (30-40 words)
- [ ] Ask for estimated read time based on article length
- [ ] Focus on "so what?" rather than background

### Phase 3: Update Article Schema
- [ ] Add `read_time` field to article objects
- [ ] Modify compose script to show read time in title

---

## LLM Prompt Changes Needed

### Current Prompt (in summarize_articles.py):
```
Create a concise summary that explains the key points and why it matters...
```

### New Prompt:
```
Create an ultra-concise summary (30-40 words max) that:
1. States what this is in one sentence
2. Explains why it matters
3. Avoids background/setup - get straight to the point

Also estimate read time in minutes based on article length.
Format: Just the core insight, nothing more.
```

---

## Typography Comparison

| Element | TLDR | Ours (Old) | Ours (New) |
|---------|------|-----------|------------|
| Article Title | ~20px | 24px → 20px | ✅ 20px |
| Read Time | (in title) | N/A | 🔄 Need to add |
| Body Text | ~18px | 17px | ✅ 18px |
| Summary Length | 30-40 words | 50-60 words | 🔄 Need to shorten |

---

## Next Steps

1. ✅ Bump body text to 18px
2. 🔄 Update summarization script to:
   - Calculate read time
   - Generate shorter summaries
3. 🔄 Update template to show read time
4. 🔄 Test with new newsletter generation
