---
episode_id: ai-news-2026-09-25-builders
track: builders
format: daily
voice_profile: alex_tech
tools:
- name: DeltaWAM
  headline: Delta World Action Models for Bimanual Manipulation
  title: 'DeltaWAM: Delta World Action Models for Bimanual Manipulation'
  url: https://huggingface.co/papers/2609.28811
  mode: tool_drop
  hero_anchor: h1, .paper-title, h1.title
  demo_anchor: 'table, figure, .results, #benchmark, div[class*=''abstract'']'
  download_anchor: a[href*='arxiv.org/pdf'], a[href*='huggingface.co/papers']
  specs: Research Paper | Hugging Face Daily Papers
  video_readiness: 65.0
  consensus_count: 2
  hn_points: null
  badges:
  - 📦 Open Weights
- name: OmniEcho
  headline: Spatial Audio Understanding for Embodied Agents
  title: 'OmniEcho: Spatial Audio Understanding for Embodied Agents'
  url: https://huggingface.co/papers/2609.23407
  mode: tool_drop
  hero_anchor: h1, .paper-title, h1.title
  demo_anchor: 'table, figure, .results, #benchmark, div[class*=''abstract'']'
  download_anchor: a[href*='arxiv.org/pdf'], a[href*='huggingface.co/papers']
  specs: Research Paper | Hugging Face Daily Papers
  video_readiness: 60.0
  consensus_count: 1
  hn_points: null
  badges:
  - 📦 Open Weights
- name: Introducing
  headline: Introducing next-generation audio models in the API
  title: Introducing next-generation audio models in the API
  url: https://openai.com/index/introducing-our-next-generation-audio-models
  mode: tool_drop
  hero_anchor: main h1, header h1, .hero h1, h1
  demo_anchor: 'video, canvas, #demo, .demo, #comparison, table'
  download_anchor: a[href*='github.com'], a[href*='download'], a[href*='huggingface.co'],
    .cta-button
  specs: Live Tool | Web Drop
  video_readiness: 60.0
  consensus_count: 2
  hn_points: null
  badges: []
- name: ViRDM
  headline: Taming Representation Distribution Matching for Few-Step Causal Video
    Generation
  title: 'ViRDM: Taming Representation Distribution Matching for Few-Step Causal Video
    Generation'
  url: https://huggingface.co/papers/2609.28923
  mode: paper_preview
  hero_anchor: h1, .paper-title, h1.title
  demo_anchor: 'table, figure, .results, #benchmark, div[class*=''abstract'']'
  download_anchor: a[href*='arxiv.org/pdf'], a[href*='huggingface.co/papers']
  specs: Research Paper | Hugging Face Daily Papers
  video_readiness: 45.0
  consensus_count: 1
  hn_points: null
  badges:
  - 📦 Open Weights
---

# Intro
[excited] Four drops today: robot world-action models, spatial audio for embodied agents, OpenAI's new steerable voice API, and a teacher-free video diffusion trick. Upvotes are thin but the signal is loud. Let's go.

---

# Story 1: DeltaWAM | Delta World Action Models for Bimanual Manipulation
### Landing Page
[confident] DeltaWAM wants to fix what's broken in world-action models. Instead of predicting dense future frames every step, it models only the deltas — the actual changes — so robot actions stop drowning in static background noise.
### Demo
[amazed] The payoff is bimanual manipulation: two-armed robots learning from pretrained video generators, transferring visual and motion priors straight into control. Less compute per frame, tighter action-conditioned dynamics, and no wasted modeling of scenes that never move.
### Access
[energetic] It's open weights, sitting on Hugging Face Daily Papers with a fresh consensus score. One upvote so far, so this is early — check the description to grab the paper and weights before the crowd arrives.

---

# Story 2: OmniEcho | Spatial Audio Understanding for Embodied Agents
### Landing Page
[curious] Robots can see, but can they hear where things are? OmniEcho argues that's a real gap. It introduces OmniEchoBench, a unified benchmark for spatial audio-visual perception in embodied settings.
### Demo
[amazed] Humans localize a sound instantly and fuse it with sight. Embodied agents mostly can't. OmniEcho gives them the evaluation harness and the modeling recipe, so we can finally measure whether an agent knows the crash came from behind.
### Access
[confident] Open weights, Hugging Face Daily Papers, sixteen upvotes — today's strongest signal. This is the benchmark to watch if you're building multi-sensory robots. Links are down below.

---

# Story 3: OpenAI Audio API | Steerable Text-to-Speech with Instructable Delivery
### Landing Page
[excited] OpenAI just shipped next-generation audio models in the API. The headline feature: steerable text-to-speech — you instruct the delivery style in plain language, not dropdown presets.
### Demo
[amazed] That's a direct shot at ElevenLabs-class tooling. Need it whispered, sarcastic, or like a 1990s radio ad? You describe it. The model performs it. Voice synthesis is becoming a prompt-driven interface.
### Access
[confident] It's live in the API right now, no waitlist. If you build audio products, this is a same-day swap test on your stack. Web drop links are in the description.

---

# Story 4: ViRDM | Few-Step Causal Video Generation Without a Teacher
### Paper
[skeptical] Few-step autoregressive video diffusion usually needs two crutches: a giant pretrained teacher and an online critic. ViRDM asks the obvious question — can we throw both away?
### Architecture
[curious] It replaces teacher-critic distillation with representation distribution matching, aligning internal features instead of chasing diffusion scores. That means low-latency streaming video generation without the resource-hungry post-training rig.
### Release Horizon
[confident] Open weights, early on Hugging Face Daily Papers with a single upvote. If the claims hold, real-time causal video gets much cheaper to train. Paper link's below.

---

# Outro
[friendly] All project links, Hugging Face spaces, and research papers are organized down in the description below. Hit subscribe to Brief Delights for your daily rundown, and I'll see you tomorrow.