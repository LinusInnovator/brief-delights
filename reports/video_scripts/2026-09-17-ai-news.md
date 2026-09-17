---
episode_id: "ai-news-2026-09-17"
voice_profile: "alex_tech"
tools:
  - name: "CERA-MoA"
    url: "https://huggingface.co/papers/2609.18779"
    mode: "tool_drop"
    demo_anchor: "figure, table, .abstract, a[href*='huggingface.co/papers']"
    download_anchor: "a[href*='huggingface.co'], a[href*='github.com']"
    specs: "Research Paper | MoA Routing + Agent Co-Training | HF Daily Papers"
  - name: "Fathom"
    url: "https://huggingface.co/papers/2609.17652"
    mode: "paper_preview"
    demo_anchor: "figure, table, #architecture, .diagram"
    download_anchor: "a[href*='arxiv.org'], a[href*='huggingface.co']"
    specs: "Paper Only | 4-bit channel-major KV cache | Million-token agentic sessions"
  - name: "In-Context Robot Learning with VLM Agents"
    url: "https://huggingface.co/papers/2609.19138"
    mode: "tool_drop"
    demo_anchor: "video, canvas, .demo, figure"
    download_anchor: "a[href*='huggingface.co'], a[href*='github.com']"
    specs: "Research Paper | VLM-driven in-context robot adaptation | 12 HF upvotes"
---

# Intro
[excited] Today: Mixture-of-Agents that finally trains its own router, a KV cache that reads only what it needs, and robots that learn from context on the spot. Three papers, under three minutes. Let's go.

---

# Story 1: CERA-MoA
### Landing Page
[confident] Meet CERA-MoA — a Mixture-of-Agents framework where the router and the agents co-evolve instead of being trained in separate silos. The killer claim: routing adapts as agent capabilities improve.

### Demo
[amazed] Look at the architecture figure and benchmark table. The router gets reward signal from actual agent post-training, so specialization becomes data-driven — not hand-tuned. That's the synergy everyone keeps promising but rarely ships.

### Access
[friendly] It's on Hugging Face Daily Papers right now, paper 2609.18779. No weights yet, but the ranking results are worth your coffee break. Link's in the description.

---

# Story 2: Fathom
### Paper Preview
[curious] Fathom asks a simple question: why read every bit of every key, every single time? It's per-query read depth for sparse decoding over offloaded KV caches — million-token agentic sessions, many concurrent users.

### Architecture / Evidence
[skeptical] The K cache sits in host memory, channel-major, four bits per channel. Each query decides how many bits to pull. The scan traffic that used to bound your decode speed just collapses. Check Table 1 for the latency numbers.

### Release Horizon
[confident] Paper is up at 2609.17652 on Hugging Face, arXiv mirror inbound. No code yet, but if you're serving long-context agents, bookmark this one immediately.

---

# Story 3: In-Context Robot Learning
### Landing Page
[excited] Twelve upvotes — the crowd favorite today. VLM agents doing in-context robot learning. The claim: no finite demo set can cover reality, so let the robot learn from context at deployment.

### Demo
[amazed] Watch the rollout videos. Hand it a novel environment with a few in-context examples, and the VLM agent re-plans on the fly. That's the generalization gap embodied AI has been stuck on for years.

### Access
[friendly] Paper 2609.19138 is live on Hugging Face Daily Papers. Code and project page coming — check the links below before someone else does.

---

# Outro
[friendly] All project links and research papers are organized down in the description below. Hit subscribe to Brief Delights for your daily rundown, and I'll see you tomorrow.