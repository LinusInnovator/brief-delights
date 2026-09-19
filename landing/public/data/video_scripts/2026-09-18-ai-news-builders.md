---
episode_id: "ai-news-2026-09-18-builders"
track: "builders"
voice_profile: "alex_tech"
tools:
  - name: "YuE2"
    url: "https://huggingface.co/spaces/multimodal-art/YuE"
    mode: "tool_drop"
    hero_anchor: ".gradio-container"
    demo_anchor: "canvas, button[type='submit'], .output"
    download_anchor: "button[data-testid='duplicate-button'], a[href*='tree/main']"
    specs: "Live HF Space | Full-Song Vocals | Editable ABC Symbolic Score"
    video_readiness: 140.0
    consensus_count: 5
    hn_points: 480
    badges:
      - "🔥 HN Trending (480 pts)"
      - " 5 Outlets Confirmed"
      - "✨ Interactive Demo Live"
  - name: "Marigold v2"
    url: "https://github.com/prs-eth/marigold"
    mode: "tool_drop"
    hero_anchor: "article.markdown-body img[src*='.gif'], #readme img"
    demo_anchor: "article.markdown-body video, article.markdown-body details, table"
    download_anchor: "a[href*='releases'], a[href*='clone'], .btn-primary, a[href$='.zip']"
    specs: "Open Source | GitHub | 4x Faster Depth"
    video_readiness: 135.0
    consensus_count: 4
    hn_points: 340
    badges:
      - "🔥 HN Trending (340 pts)"
      - " 4 Outlets Confirmed"
      - "🛠️ Open Source Repo"
  - name: "DeepSeek V4.1 Flash"
    url: "https://arxiv.org/abs/2609.11200"
    mode: "paper_preview"
    hero_anchor: "div.extra-services, figure"
    demo_anchor: "table.benchmark, figure"
    download_anchor: "a.download-pdf, a[href*='arxiv.org/pdf']"
    specs: "Research Preprint | arXiv | 552B MoE"
    video_readiness: 85.0
    consensus_count: 6
    hn_points: 650
    badges:
      - "🔥 HN Trending (650 pts)"
      - " 6 Outlets Confirmed"
      - "📄 Research Preprint"
---

# Intro
[excited] Three drops today, and Hacker News is on fire: a full-song generator at 480 upvotes, real-time depth at 340, and DeepSeek's 552-billion-parameter preprint clearing 650 points and 380 comments. Let's go.

---

# Story 1: YuE2
### Landing Page
[confident] YuE2 generates complete songs with vocals, not loops. Five outlets confirmed it, and it's trending on Hacker News at 480 points with 210 comments moving fast.

### Demo
[amazed] Scroll the Gradio space and hit submit. It plans the track as editable ABC symbolic score notation, so you actually rewrite the melody and structure before you render audio.

### Access
[excited] The live Space is linked below, plus the duplicate button if you want your own copy. Clone the repo, swap your lyrics in, and ship a track tonight.

---

# Story 2: Marigold v2
### Landing Page
[confident] Marigold v2 does monocular depth estimation four times faster, using diffusion transformers. It's sitting at 340 upvotes on Hacker News, confirmed across four outlets, and it runs on consumer GPUs.

### Demo
[amazed] Watch the README GIFs and video clips. One RGB frame in, a clean depth map out, edge-stable on hair, glass, and thin structures where older depth models smear into mush.

### Access
[energetic] Everything's open source on GitHub: code, docs, and downloadable checkpoints in the releases tab. Clone it, run the demo locally on your own card, and fine-tune on your data.

---

# Story 3: DeepSeek V4.1 Flash
### Paper Preview
[curious] DeepSeek V4.1 Flash is a 552-billion-parameter mixture-of-experts preprint. It's the biggest signal today: 650 Hacker News points, 380 comments, and six outlets confirming the release.

### Architecture & Evidence
[skeptical] The core claim is asymmetric compute allocation across experts. Jump to the benchmark table and the architecture figure, then pull the PDF and check how the sparse routing math actually holds up.

### Release Horizon
[confident] The full preprint is on arXiv with the download PDF link below, and PyTorch weights are already on Hugging Face. Expect community benchmarks within days, so watch this space closely.

---

# Outro
[friendly] All project links, Hugging Face spaces, and research papers are organized down in the description below. Hit subscribe to Brief Delights for your daily rundown, and I'll see you tomorrow.