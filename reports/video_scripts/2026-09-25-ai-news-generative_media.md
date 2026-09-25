---
episode_id: ai-news-2026-09-25-generative_media
track: generative_media
format: daily
voice_profile: alex_tech
tools:
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
  video_readiness: 61.0
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
  demo_anchor: video, audio, canvas, .player, .waveform, iframe[src*='gradio'], .output,
    figure
  download_anchor: a[href*='download'], a[href*='github.com'], a[href*='huggingface.co'],
    .cta-button
  specs: Creative Media | Audio/Video/3D | Live Demo
  video_readiness: 61.0
  consensus_count: 2
  hn_points: null
  badges: []
- name: DeltaWAM
  headline: Delta World Action Models for Bimanual Manipulation
  title: 'DeltaWAM: Delta World Action Models for Bimanual Manipulation'
  url: https://huggingface.co/papers/2609.28811
  mode: tool_drop
  hero_anchor: h1, .paper-title, h1.title
  demo_anchor: 'table, figure, .results, #benchmark, div[class*=''abstract'']'
  download_anchor: a[href*='arxiv.org/pdf'], a[href*='huggingface.co/papers']
  specs: Research Paper | Hugging Face Daily Papers
  video_readiness: 58.0
  consensus_count: 2
  hn_points: null
  badges:
  - 📦 Open Weights
---

# Intro
[excited] OpenAI just collapsed diffusion from dozens of steps to one, shipped a steerable voice API, and two open-weight papers dropped on Hugging Face. None have Hacker News threads yet, so you're early. Let's go.

---

# Story 1: Consistency Models | One-Step Generation for Image, Audio, and Video
### Landing Page
[confident] OpenAI's Consistency Models attack diffusion's core bottleneck, that slow iterative sampling loop, and replace it with single-step generation across image, audio, and video.
### Demo
[amazed] The spec sheet lists a live demo spanning creative media, audio, video, and 3D, so expect the same prompt, radically fewer compute passes, near-instant output.
### Access
[excited] It scores a sixty-nine on our video-readiness index, the highest drop today. Head to the link and run the live demo yourself before everyone else catches on.

---

# Story 2: ViRDM | Few-Step Causal Video Generation Without a Teacher
### Paper
[curious] ViRDM asks a sharp question: do few-step autoregressive video diffusion models really need a massive pretrained teacher plus an online critic to distill distributional matching?
### Architecture
[confident] Their representation distribution matching skips the resource-intensive teacher-critic setup entirely, targeting low-latency streaming video generation with far fewer sampling steps.
### Release Horizon
[friendly] It's flagged Open Weights on Hugging Face Daily Papers with one upvote so far. Early, but if the results hold, this is streaming video's missing piece.

---

# Story 3: OpenAI Audio API | Steerable Text-to-Speech You Can Direct
### Landing Page
[excited] OpenAI's next-generation audio models are live in the API, and the headline feature is instructable delivery, meaning you describe the tone and the voice actually delivers it.
### Demo
[amazed] This is a direct shot across ElevenLabs' bow: steerable text-to-speech, two-outlet consensus behind it, and voice control sitting right inside your existing API calls.
### Access
[confident] It's in the API now, no waitlist theater. Swap your model name, pass an instruction, and your agent's voice stops sounding like a GPS unit.

---

# Story 4: DeltaWAM | Delta World Action Models for Bimanual Robots
### Landing Page
[confident] DeltaWAM wants to fix world-action models that waste training on dense future frames, re-modeling content that barely changes while coupling actions to nuisance appearance.
### Demo
[amazed] Instead it models deltas, transferring visual and motion priors from pretrained video generators straight into bimanual manipulation control, tighter and cheaper at inference.
### Access
[friendly] Open weights, Hugging Face Daily Papers, consensus count of two. Robotics folks, this is the one to fork this weekend.

---

# Outro
[friendly] All project links, Hugging Face spaces, and research papers are organized down in the description below. Hit subscribe to Brief Delights for your daily rundown, and I'll see you tomorrow.