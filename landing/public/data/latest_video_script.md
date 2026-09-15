---
episode_id: "ai-news-2026-09-15"
voice_profile: "alex_tech"
tools:
  - name: "Dynin-Omni"
    url: "https://huggingface.co/papers/2609.13053"
    mode: "tool_drop"
    demo_anchor: "video, canvas, .demo, #trajectory"
    download_anchor: "a[href*='huggingface.co']"
    specs: "Omnimodal masked-diffusion VLA | Paper + Weights | Robot Policy"
  - name: "Expert-Space Exploration (MoE RL)"
    url: "https://huggingface.co/papers/2609.13058"
    mode: "paper_preview"
    demo_anchor: "table, figure, .architecture, #benchmark"
    download_anchor: "a[href*='arxiv.org']"
    specs: "Paper Only | MoE Post-Training | RL Routing"
  - name: "LynnReal-Omni"
    url: "https://huggingface.co/papers/2609.15863"
    mode: "tool_drop"
    demo_anchor: "video, canvas, #comparison, .demo"
    download_anchor: "a[href*='huggingface.co'], a[href*='github.com']"
    specs: "Agentic Video Gen | Multi-Modal | Demo Clips"
---

# Intro
[excited] Three drops today: a robot brain that predicts its own future, an RL trick that rewires how Mixture-of-Experts models think, and video generation you can actually control. Let's go.

---

# Story 1: Dynin-Omni
### Landing Page
[confident] Dynin Robotics just released Dynin-Omni, an omnimodal masked-diffusion backbone that fuses language, vision, and action into one shared trajectory model for robot policies.

### Demo
[amazed] Scroll to the demo section, where you'll see video, canvas, and trajectory rollouts showing the model predicting both the goal outcome and every action-dependent scene change.

### Access
[excited] Head to the Hugging Face paper page, hit the download anchor, and grab weights, configs, and the full training recipe. This is the VLA stack you want to watch.

---

# Story 2: Expert-Space Exploration
### Paper Preview
[curious] Next up, Expert-Space Exploration in MoE Reinforcement Learning. The hypothesis is bold: expert routing isn't fixed plumbing, it's a search space you should actively explore.

### Architecture and Evidence
[skeptical] The architecture diagram shows routing treated as a trainable variable rather than a static component. Then jump to the benchmark table comparing standard MoE RL against their exploration strategy.

### Release Horizon
[confident] It's live on Hugging Face papers right now, with no code repo yet. Expect weights and training scripts within a few weeks if the benchmark numbers hold up.

---

# Story 3: LynnReal-Omni
### Landing Page
[amazed] Thirty-five upvotes, and deserved. LynnReal Omni is native multi-modal video generation built for agentic visual workflows, with the killer claim that you finally get control.

### Demo
[excited] The demo section is the pitch: split-screen comparison clips, canvas renders, and side-by-side video showing drift-free long-horizon scenes against baseline diffusion output.

### Access
[friendly] Check the Hugging Face page and GitHub link in the description. Explicit references, editable 3D scenes, and executable game states give you stable, repeatable generation instead of lucky sampling.

---

# Outro
[friendly] All project links and research papers are organized down in the description below. Hit subscribe to Brief Delights for your daily rundown, and I'll see you tomorrow.