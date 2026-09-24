---
episode_id: ai-news-2026-09-24-generative_media
track: generative_media
format: daily
voice_profile: alex_tech
tools:
- name: All modalities are equal
  headline: 'All modalities are equal, but video is more equal: Closing the Cross-Attention
    Gap in Joint Video Generation'
  title: 'All modalities are equal, but video is more equal: Closing the Cross-Attention
    Gap in Joint Video Generation'
  url: https://huggingface.co/papers/2609.27901
  mode: paper_preview
  hero_anchor: h1, .paper-title, h1.title
  demo_anchor: 'table, figure, .results, #benchmark, div[class*=''abstract'']'
  download_anchor: a[href*='arxiv.org/pdf'], a[href*='huggingface.co/papers']
  specs: Research Paper | Hugging Face Daily Papers
  video_readiness: 80.0
  consensus_count: 1
  hn_points: null
  badges:
  - 📦 Open Weights
- name: Consistency Models
  headline: Consistency Models
  title: Consistency Models
  url: https://openai.com/index/consistency-models
  mode: tool_drop
  hero_anchor: main h1, header h1, .hero h1, h1
  demo_anchor: video, audio, canvas, .player, .waveform, iframe[src*='gradio'], .output,
    figure
  download_anchor: a[href*='download'], a[href*='github.com'], a[href*='huggingface.co'],
    .cta-button
  specs: Creative Media | Audio/Video/3D | Live Demo
  video_readiness: 69.0
  consensus_count: 1
  hn_points: null
  badges: []
- name: Introducing
  headline: Introducing next-generation audio models in the API
  title: Introducing next-generation audio models in the API
  url: https://openai.com/index/introducing-our-next-generation-audio-models
  mode: tool_drop
  hero_anchor: main h1, header h1, .hero h1, h1
  demo_anchor: video, audio, canvas, .player, .waveform, iframe[src*='gradio'], .output,
    figure
  download_anchor: a[href*='download'], a[href*='github.com'], a[href*='huggingface.co'],
    .cta-button
  specs: Creative Media | Audio/Video/3D | Live Demo
  video_readiness: 61.0
  consensus_count: 2
  hn_points: null
  badges: []
- name: Video generation models
  headline: Video generation models as world simulators
  title: Video generation models as world simulators
  url: https://openai.com/index/video-generation-models-as-world-simulators
  mode: tool_drop
  hero_anchor: main h1, header h1, .hero h1, h1
  demo_anchor: video, audio, canvas, .player, .waveform, iframe[src*='gradio'], .output,
    figure
  download_anchor: a[href*='download'], a[href*='github.com'], a[href*='huggingface.co'],
    .cta-button
  specs: Creative Media | Audio/Video/3D | Live Demo
  video_readiness: 56.0
  consensus_count: 1
  hn_points: null
  badges: []
---

# Intro
[excited] Today: joint video diffusion closes cross-attention gap, OpenAI's Consistency Models, steerable audio API, and Sora as world simulator. No HN threads yet, but consensus is building.

---

# Story 1: Joint Video DiT | Video Is More Equal in Cross-Attention
### Landing Page
[curious] Hugging Face paper: "All modalities are equal, but video is more equal." Five upvotes, one consensus. It finds joint multimodal diffusion transformers favor video in cross-modal correspondence.

### Demo
[amazed] Companion modalities like 3D motion and audio develop strong links to video, but video's richer appearance, geometry, motion, and temporal evolution dominate the shared attention space.

### Access
[confident] Open weights are flagged, so expect code and checkpoints soon. This could reshape how we train joint audio-video and motion models. Watch the repo for release.

---

# Story 2: Consistency Models | One-Step Diffusion Sampling
### Landing Page
[excited] OpenAI's Consistency Models attack the slow iterative sampling that bottlenecks diffusion image, audio, and video generation. One consensus signal, no HN thread yet, but this is core infrastructure.

### Demo
[amazed] The demo shows one-step or few-step generation, trading iterative denoising for direct consistency mapping. That means faster creative loops, real-time previews, and cheaper inference at scale.

### Access
[confident] Access is live on OpenAI's site with a creative media spec for audio, video, and 3D. If it ships in API, expect a new speed baseline.

---

# Story 3: OpenAI Audio API | Steerable Text-to-Speech
### Landing Page
[friendly] OpenAI's next-generation audio models land in the API with steerable text-to-speech and natural-language performance direction. Two consensus signals, no HN thread, but it's a direct shot at ElevenLabs.

### Demo
[excited] You can direct tone, pacing, emotion, and delivery with plain prompts. The demo feels like casting a voice actor inside a text box, not tweaking sliders.

### Access
[confident] Access is through OpenAI's API, live demo linked. For creators, this collapses voiceover iteration from hours to minutes. Test it before your next edit.

---

# Story 4: Sora | Video Models as World Simulators
### Landing Page
[curious] OpenAI's Sora technical report frames video generation models as world simulators. One consensus signal, no HN thread, but it's the definitive primary source on scaling video diffusion transformers.

### Demo
[amazed] It scales text-conditional diffusion transformers over spacetime patches, learning appearance, motion, and 3D consistency from raw video. The demo shows emergent simulation-like behavior.

### Access
[confident] Access is the public technical report and demo page. For builders, this is the blueprint behind modern video generation. Read it before your next model run.

---

# Outro
[friendly] All project links, Hugging Face spaces, and research papers are organized down in the description below. Hit subscribe to Brief Delights for your daily rundown, and I'll see you tomorrow.