---
episode_id: ai-news-2026-09-19-top4
track: top4
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
  video_readiness: 135.0
  consensus_count: 5
  hn_points: 480
  badges:
  - 🔥 HN Trending (480 pts)
  - ⚡ 5 Outlets Confirmed
  - ✨ Interactive Demo Live
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
- name: Anthropic Agrees $45B AI Infrastructure Deal with Nscale
  url: https://brief.delights.pro/newsletters/newsletter_leaders_2026-08-28.html
  mode: industry_insight
  hero_anchor: main h1, header h1, .hero h1, h1
  demo_anchor: figure, table, blockquote, canvas, .chart, .metrics
  download_anchor: a[href*='report'], a[href*='pdf'], a.cta-button
  specs: Industry Insight | Strategic Analysis
  video_readiness: 65.0
  consensus_count: 3
  hn_points: 190
  badges:
  - 🔥 HN Trending (190 pts)
  - ⚡ 3 Outlets Confirmed
- name: 'Marigold v2: Diffusion Transformers for Real-Time Monocular Depth'
  url: https://github.com/prs-eth/marigold
  mode: tool_drop
  hero_anchor: 'article.markdown-body h1, .repository-content, #readme h1, h1'
  demo_anchor: 'article.markdown-body img[src*=''.gif''], article.markdown-body video,
    article.markdown-body details, #readme img, table'
  download_anchor: a[href*='releases'], a[href*='clone'], .btn-primary, a[href$='.zip']
  specs: Open Source | GitHub | Code & Docs
  video_readiness: 110.0
  consensus_count: 4
  hn_points: 340
  badges:
  - 🔥 HN Trending (340 pts)
  - ⚡ 4 Outlets Confirmed
  - 🛠️ Open Source Repo
---

# Intro
[excited] Four drops today, and Hacker News is on fire — DeepSeek's 552-billion-parameter preprint just hit 650 points, while YuE2's open music Space sits at 480 and climbing. Let's move.

---

# Story 1: YuE2: Open Full-Song Generation with Symbolic Score Planning
### Landing Page
[confident] YuE2 generates complete songs — vocals, lyrics, instrumentation — and it's completely open. Five outlets confirmed it, and it's trending on Hacker News at 480 points with 210 comments.

### Demo
[amazed] Here's the magic: it plans your track as editable ABC symbolic score notation first, then renders audio. You actually rewrite the melody instead of rerolling a slot machine.

### Access
[friendly] The interactive Space is live on Hugging Face right now — no install, no waitlist. Click the link below, type a prompt, and you're producing full tracks in about a minute.

---

# Story 2: DeepSeek V4.1 Flash: Asymmetric Compute MoE Architecture
### Paper
[confident] DeepSeek V4.1 Flash just landed as a preprint — 552 billion parameters of mixture-of-experts, and Hacker News pushed it to 650 points with 380 comments. Six outlets confirmed it.

### Architecture / Evidence
[curious] The trick is asymmetric compute: experts get wildly different budgets, so most tokens route through cheap paths. Their benchmark table shows frontier-adjacent scores at a fraction of the inference cost.

### Release Horizon
[excited] PyTorch weights are already on Hugging Face, so this isn't vaporware. Expect fine-tunes and quantized builds flooding in within days — grab the base weights while they're hot.

---

# Story 3: Anthropic Agrees $45B AI Infrastructure Deal with Nscale
### Headline
[skeptical] Forty-five billion dollars. Anthropic just signed a massive infrastructure deal with Nscale, locking down European gigawatt power and datacenter capacity. Three outlets confirmed, 190 points on HN.

### Evidence
[confident] This isn't just GPUs — it's power contracts and physical buildout. Gigawatt-scale commitments take years to energize, which means Anthropic is betting on demand staying hot well into the 2030s.

### The Verdict
[curious] The compute land grab is now a real-estate and energy game. If you're building on frontier models, expect capacity to be the bottleneck — and pricing to reflect whoever owns the megawatts.

---

# Story 4: Marigold v2: Diffusion Transformers for Real-Time Monocular Depth
### Landing Page
[excited] Marigold v2 turns any single photo into a depth map, four times faster than before, on consumer GPUs. It's open source, sitting at 340 points on Hacker News with four outlets confirming.

### Demo
[amazed] Watch this — one image in, a clean depth field out, in real time. Diffusion transformers doing what used to need a render farm, now running on the card already in your desktop.

### Access
[friendly] Code, weights, and docs are all on GitHub under the prs-eth repo. Clone it, run the demo script, and you've got instant depth for 3D, AR, or video pipelines.

---

# Outro
[friendly] All project links, Hugging Face spaces, and research papers are organized down in the description below. Hit subscribe to Brief Delights for your daily rundown, and I'll see you tomorrow.