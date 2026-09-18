---
episode_id: "ai-news-2026-09-18"
voice_profile: "alex_tech"
tools:
  - name: "ActObs"
    url: "https://huggingface.co/papers/2609.20715"
    mode: "tool_drop"
    demo_anchor: ".hero, table, #comparison, .demo"
    download_anchor: "a[href*='github.com'], a[href*='huggingface.co']"
    specs: "RL fine-tuning recipe | Paper + Code | Observation-supervised SFT"
  - name: "VākQA"
    url: "https://huggingface.co/papers/2609.19879"
    mode: "paper_preview"
    demo_anchor: "table, figure, #benchmark-table"
    download_anchor: "a[href*='arxiv.org'], a[href*='huggingface.co']"
    specs: "2,001 Telugu QA pairs | Spoken QA | Benchmark Only"
  - name: "Srijika"
    url: "https://huggingface.co/papers/2609.05661"
    mode: "paper_preview"
    demo_anchor: "figure, table, #glyph-grid"
    download_anchor: "a[href*='arxiv.org'], a[href*='github.com']"
    specs: "9 Brahmic scripts | OpenType output | Paper Only"
  - name: "MiniMax-H3"
    url: "https://huggingface.co/papers/2609.18323"
    mode: "tool_drop"
    demo_anchor: "video, canvas, .demo, #outputs"
    download_anchor: "a[href*='huggingface.co'], a[href*='github.com']"
    specs: "Omni-modal | Joint audio-visual | Weights + Eval"

---

# Intro
[excited] Four drops today: agents that learn from what the world says back, a Telugu spoken-QA benchmark, fonts for nine Indic scripts, and MiniMax-H3's grip on physical reality. Let's go.

---

# Story 1: ActObs
### Landing Page
[confident] Standard fine-tuning only scores the agent's actions and ignores observations. ActObs flips that, supervising predictions on environment feedback too — and it changes how agents explore under RL.

### Demo
[amazed] Check the comparison table and training curves. Same model, same compute, just observation-supervised SFT — and the RL warm start looks nothing like the baseline.

### Access
[excited] Paper and code are linked on the Hugging Face page. If you're pretraining an agent for RL, this is a cheap initialization change worth testing this week.

---

# Story 2: VākQA
### Paper Preview
[curious] VākQA asks a simple question: does spoken question answering actually work outside English? The authors built 2,001 Telugu factoid pairs to find out.

### Architecture
[skeptical] Here's the interesting part. They didn't just score models — they quantified how reliable automatic evaluation even is in this spoken setting. Look at the human-versus-auto agreement numbers.

### Release Horizon
[confident] It's on arXiv now, benchmark-focused. If you work on Indic speech or low-resource QA, this gives you a real diagnostic instead of a vibe check.

---

# Story 3: Srijika
### Paper Preview
[amazed] Srijika doesn't generate fonts from nothing. It restyles glyph outlines from shaping-complete templates — keeping the cmap, GSUB and GPOS intact across nine Brahmic scripts.

### Architecture
[curious] That's the trick. Reusing OpenType layout means Devanagari, Tamil, Bengali, Telugu and five more keep correct shaping out of the box, instead of breaking the moment you restyle.

### Release Horizon
[confident] Paper's up now. For anyone shipping Indic typography, this is the pipeline to watch when code lands.

---

# Story 4: MiniMax-H3
### Landing Page
[excited] MiniMax-H3 is a unified omni-modal model — text, image, video, audio in one latent space. The eval asks the real question: does that alignment buy physical-world reasoning?

### Demo
[amazed] Watch the generated clips. Joint audio-visual output, same latent framework, and the paper tests whether understanding and generation actually reinforce each other.

### Access
[confident] Paper, eval details and model links are on the Hugging Face page. Test it against your own physical reasoning prompts before you believe the headline number.

---

# Outro
[friendly] All project links and research papers are organized down in the description below. Hit subscribe to Brief Delights for your daily rundown, and I'll see you tomorrow.