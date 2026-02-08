# TLDR vs Briefly - Content Volume Analysis

## TLDR Structure (from example)

### Content Breakdown:
```
🚀 Headlines & Launches: 2 articles
   - Full summaries (~40 words each)
   - Read times shown

🧠 Deep Dives & Analysis: 2 articles  
   - Full summaries (~40 words each)
   - Read times shown

🧑‍💻 Engineering & Research: 2 articles
   - Full summaries (~40 words each)
   - Read times shown
   - 1 sponsor block interspersed

🎁 Miscellaneous: 2 articles
   - Full summaries (~40 words each)
   - Read times shown

⚡ Quick Links: 4 items
   - ONE LINE only (title + very short description)
   - These are the "in short" content
   - No full summaries
```

**Total: 8 full articles + 4 quick links = 12 items**

---

## Our Current Structure

```
🚀 AI & Innovation: 5 articles
   - All get full summaries
   - Read times shown

🔐 Security: 1 article
   - Full summary
   - Read time shown
```

**Total: 6 articles, all with full treatment**

---

## Key Differences

### 1. **Two-Tier Content System**
- **TLDR:** Mix of full articles + quick links
- **Us:** All articles get same treatment

### 2. **Volume**
- **TLDR:** 8 main + 4 quick = 12 total items
- **Us:** 6 articles total

### 3. **"Quick Links" Section Missing**
TLDR has a dedicated section for:
- Brief mentions
- Short noteworthy items
- Things that don't need full explanation

---

## Recommendations

### Option A: Match TLDR Exactly
- Select **8-10 main articles** (with full summaries)
- Add **3-4 quick links** at the bottom
- Total: ~12 items like TLDR

### Option B: Keep Current Volume, Add Quick Links
- Keep **5-7 main articles**
- Add **3-4 quick links** section
- Total: ~10 items

### Option C: Stay As-Is (Leaner)
- Keep **5-7 articles** all with full treatment
- Pros: Faster read, less overwhelming
- Cons: Less content variety

---

## Implementation for Quick Links

If we add Quick Links section, we'd need to:

1. **Update `select_stories.py`:**
   - Select 10-12 articles total
   - Tag 3-4 as "quick_link" tier
   - Tag 6-8 as "full_article" tier

2. **Update `summarize_articles.py`:**
   - Skip LLM for quick links (no summary needed)
   - Just use title + one-line description

3. **Update template:**
   ```html
   ⚡ Quick Links
   
   - Title (3 min read)
     Brief one-liner description.
   ```

---

## Current Selection Logic

Looking at `select_stories.py`:
- We select **5-7 articles per segment**
- All tagged with urgency scores
- No differentiation between "deep dive" vs "quick mention"

---

## My Recommendation

**Option B** - Keep lean main articles but add Quick Links:
- **6 main articles** with full summaries (current)
- **3-4 quick links** with one-liners
- **Total: ~10 items** (slightly less than TLDR's 12)

This gives variety without overwhelming readers, and maintains our "Briefly" brand promise of being concise.

---

## What do you think?

Should we:
1. ✅ Match TLDR's volume (~12 items with quick links)?
2. ✅ Add quick links but keep it lighter (~10 items)?
3. ✅ Stay lean with current approach (6-7 full articles)?
