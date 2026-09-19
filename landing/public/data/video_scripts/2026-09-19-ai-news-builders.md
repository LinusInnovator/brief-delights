---
episode_id: ai-news-2026-09-19-builders
track: builders
format: daily
voice_profile: alex_tech
tools:
- name: 'YuE2: Open Full-Song Generation with Symbolic Score Planning'
  url: https://huggingface.co/spaces/multimodal-art/YuE
  mode: tool_drop
  hero_anchor: h1, .model-header, header
  demo_anchor: iframe[src*='gradio'], .gradio-container, canvas, video, button[type='submit'],
    .output
  download_anchor: button[data-testid='duplicate-button'], a[href*='tree/main']
  specs: Interactive Space | Hugging Face | Live Demo
  video_readiness: 150.0
  consensus_count: 5
  hn_points: 480
  badges:
  - 🔥 HN Trending (480 pts)
  - ⚡ 5 Outlets Confirmed
  - ✨ Interactive Demo Live
- name: 'Marigold v2: Diffusion Transformers for Real-Time Monocular Depth'
  url: https://github.com/prs-eth/marigold
  mode: tool_drop
  hero_anchor: 'article.markdown-body h1, .repository-content, #readme h1, h1'
  demo_anchor: 'article.markdown-body img[src*=''.gif''], article.markdown-body video,
    article.markdown-body details, #readme img, table'
  download_anchor: a[href*='releases'], a[href*='clone'], .btn-primary, a[href$='.zip']
  specs: Open Source | GitHub | Code & Docs
  video_readiness: 125.0
  consensus_count: 4
  hn_points: 340
  badges:
  - 🔥 HN Trending (340 pts)
  - ⚡ 4 Outlets Confirmed
  - 🛠️ Open Source Repo
- name: 'DeepSeek V4.1 Flash: Asymmetric Compute MoE Architecture'
  url: https://arxiv.org/abs/2609.11200
  mode: paper_preview
  hero_anchor: h1.title, .title, h1
  demo_anchor: a.download-pdf, div.extra-services, table.benchmark, figure
  download_anchor: a.download-pdf, a[href*='arxiv.org/pdf']
  specs: Research Preprint | arXiv
  video_readiness: 85.0
  consensus_count: 6
  hn_points: 650
  badges:
  - 🔥 HN Trending (650 pts)
  - ⚡ 6 Outlets Confirmed
  - 📄 Research Preprint
---

# Intro
[excited] Three drops just hit, and Hacker News is on fire — YuE2 generates full songs, Marigold v2 does real-time depth, and DeepSeek's 552-billion-parameter MoE preprint is already at 650 points.

---

# Story 1: YuE2: Open Full-Song Generation with Symbolic Score Planning
### Landing Page
[confident] YuE2 just landed on Hugging Face, and it's trending at 480 points with 210 comments. Five outlets confirmed it: full-length vocal songs, not loops — actual structured tracks with verses.

### Demo
[amazed] Here's the wild part — it plans songs through editable ABC symbolic score notation. You can literally rewrite the melody in text before the model sings it. That's compositional control, live in the Space right now.

### Access
[excited] The interactive demo is live and free. Click the link below, type a prompt, tweak the score, and generate a full track. Open full-song generation just became a browser tab.

---

# Story 2: Marigold v2: Diffusion Transformers for Real-Time Monocular Depth
### Landing Page
[confident] Marigold v2 is sitting at 340 points on Hacker News with four outlets confirming. It's a GitHub repo, fully open source, and it's rewriting what depth estimation costs you.

### Demo
[amazed] Diffusion transformers, four times faster, running monocular depth on consumer GPUs. Real-time depth from a single camera — that's robotics, AR, and video pipelines getting a massive speed unlock.

### Access
[excited] Code and docs are on GitHub right now. Clone it, run it on your own GPU, and check the benchmarks yourself. No waitlist, no API key — just a repo.

---

# Story 3: DeepSeek V4.1 Flash: Asymmetric Compute MoE Architecture
### Paper
[curious] DeepSeek V4.1 Flash is the loudest thing on Hacker News today — 650 points, 380 comments, six outlets confirmed. It's a preprint, not a product, so let's read it carefully.

### Architecture/Evidence
[skeptical] 552 billion parameters in a Mixture-of-Experts, but the twist is asymmetric compute — uneven budget across experts. The benchmark table looks strong, though independent replication is still pending.

### Release Horizon
[confident] PyTorch weights are already on Hugging Face, which is unusually fast for a preprint. Expect fine-tunes within days. The real question is whether the efficiency claims survive outside DeepSeek's own harness.

---

# Outro
[friendly] All project links, Hugging Face spaces, and research papers are organized down in the description below. Hit subscribe to Brief Delights for your daily rundown, and I'll see you tomorrow.