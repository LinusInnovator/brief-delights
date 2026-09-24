---
episode_id: ai-news-2026-09-24-builders
track: builders
format: daily
voice_profile: alex_tech
tools:
- name: Amazon EC2 R9g and
  headline: Amazon EC2 R9g and R9gd instances powered by AWS Graviton5 processors
    are now generally available
  title: Amazon EC2 R9g and R9gd instances powered by AWS Graviton5 processors are
    now generally available
  url: https://aws.amazon.com/blogs/aws/amazon-ec2-r9g-and-r9gd-instances-powered-by-aws-graviton5-processors-are-now-generally-available/
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
- name: Consistency Models
  headline: Consistency Models
  title: Consistency Models
  url: https://openai.com/index/consistency-models
  mode: tool_drop
  hero_anchor: main h1, header h1, .hero h1, h1
  demo_anchor: 'video, canvas, #demo, .demo, #comparison, table'
  download_anchor: a[href*='github.com'], a[href*='download'], a[href*='huggingface.co'],
    .cta-button
  specs: Live Tool | Web Drop
  video_readiness: 60.0
  consensus_count: 1
  hn_points: null
  badges: []
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
  video_readiness: 50.0
  consensus_count: 1
  hn_points: null
  badges:
  - 📦 Open Weights
---

# Intro
[excited] Today AWS fires up Graviton5, OpenAI drops steerable audio plus a diffusion speedup, and a new paper says video rules every other modality. Let's go.

---

# Story 1: AWS Graviton5 | EC2 R9g Instances Hit General Availability
### Landing Page
[confident] AWS just flipped EC2 R9g and R9gd to generally available, powered by the new Graviton5 processors. Two outlets already flagged it, and it's the biggest compute refresh builders get this quarter.

### Demo
[amazed] Think more cores, better memory bandwidth, and cheaper per-hour throughput for the same workloads. If you're running inference or video encoding at scale, this is a straight line to lower bills.

### Access
[energetic] It's live in the console right now. Check your region, spin up an R9g, and benchmark against your current fleet before you commit to a migration.

---

# Story 2: OpenAI Audio API | Steerable Text-to-Speech with Natural-Language Direction
### Landing Page
[excited] OpenAI just shipped next-generation audio models in the API, and the headline feature is steerable text-to-speech. You direct the performance in plain English instead of fiddling with sliders.

### Demo
[curious] Tell it to sound warmer, slower, more skeptical, and it just does it. That's a direct shot at ElevenLabs' territory, and it lands inside the same API key you already have.

### Access
[confident] Available now through the API. Port one of your existing voice prompts over, A/B it against your current provider, and listen for where the prosody holds up.

---

# Story 3: Consistency Models | One-Step Generation for Diffusion Pipelines
### Landing Page
[confident] OpenAI's Consistency Models page is back in circulation, and it attacks the real bottleneck: the slow iterative sampling loop that makes diffusion feel sluggish.

### Demo
[amazed] Instead of twenty-plus denoising steps, you map noise directly to data in one or two. Same family of outputs, a fraction of the latency for image, audio, and video generation.

### Access
[skeptical] It's a research page, not a product launch, so treat it as a blueprint. Read the method, then check whether your inference stack already exposes a consistency sampler.

---

# Story 4: Joint Video Gen | Closing the Cross-Attention Gap
### Paper
[curious] New on Hugging Face Daily Papers: "All modalities are equal, but video is more equal." Five upvotes so far, but the claim is sharp — joint diffusion transformers are lopsided.

### Architecture
[amazed] Video carries appearance, geometry, motion, and time. Audio and 3D motion only capture slices of the same event. So companion modalities learn strong mappings to video, and video barely learns back.

### Release Horizon
[friendly] Open weights are flagged, so expect code soon. If you're building multimodal generation, watch this one — fixing that asymmetry is where the next quality jump lives.

---

# Outro
[friendly] All project links, Hugging Face spaces, and research papers are organized down in the description below. Hit subscribe to Brief Delights for your daily rundown, and I'll see you tomorrow.