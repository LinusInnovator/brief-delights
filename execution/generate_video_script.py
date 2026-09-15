#!/usr/bin/env python3
"""
Brief Delights - Daily Video Safari Script Generator
Transforms today's top 3-4 AI drops into an editorial Markdown script with YAML frontmatter,
specifically designed for OmniCap's browser recording agent and expressive TTS engine.
"""

import os
import sys
import json
import re
import argparse
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any
from dotenv import load_dotenv
from openai import OpenAI

# Setup paths
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

load_dotenv()

TMP_DIR = PROJECT_ROOT / ".tmp"
REPORTS_DIR = PROJECT_ROOT / "reports" / "video_scripts"
PUBLIC_DATA_DIR = PROJECT_ROOT / "landing" / "public" / "data"

REPORTS_DIR.mkdir(parents=True, exist_ok=True)
PUBLIC_DATA_DIR.mkdir(parents=True, exist_ok=True)

# OpenRouter Client
client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENROUTER_API_KEY") or "dummy_key",
    default_headers={
        "HTTP-Referer": "https://brief.delights.pro",
        "X-Title": "Brief Delights Video Safari",
    }
)

MODEL = os.getenv("PRIMARY_LLM_MODEL", "deepseek/deepseek-v4.1-flash")

def log(msg: str):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")


def load_candidate_stories(date_str: str) -> List[Dict[str, Any]]:
    """Gather high-signal candidate stories from HF daily papers and segment selections"""
    candidates = []
    
    # 1. Check Hugging Face Daily Papers feed
    hf_xml = TMP_DIR / "custom_feed_hf_daily_papers.xml"
    if hf_xml.exists():
        try:
            import feedparser
            feed = feedparser.parse(str(hf_xml))
            for entry in feed.entries[:8]:
                title = entry.title.replace("[Paper & Demo]", "").strip()
                candidates.append({
                    "title": title,
                    "url": entry.link,
                    "summary": entry.description[:400],
                    "suggested_mode": "tool_drop" if ("model" in title.lower() or "demo" in title.lower() or "agent" in title.lower()) else "paper_preview",
                    "source": "Hugging Face Daily Papers"
                })
        except Exception as e:
            log(f"⚠️ Error parsing HF papers: {e}")

    # 2. Check segment selected articles (builders, innovators, leaders)
    for segment in ["builders", "innovators", "leaders"]:
        sel_file = TMP_DIR / f"selected_articles_{segment}_{date_str}.json"
        if sel_file.exists():
            try:
                with open(sel_file, "r") as f:
                    data = json.load(f)
                    articles = data.get("selected_articles", data.get("articles", []))
                    for art in articles[:4]:
                        suggested_mode = "industry_insight" if segment == "leaders" else ("paper_preview" if segment == "innovators" else "tool_drop")
                        candidates.append({
                            "title": art.get("title", ""),
                            "url": art.get("url", ""),
                            "summary": art.get("selection_reason", "") or art.get("why_this_matters", "") or art.get("description", ""),
                            "suggested_mode": suggested_mode,
                            "source": f"Segment {segment.capitalize()}"
                        })
            except Exception as e:
                log(f"⚠️ Error reading {sel_file}: {e}")

    # Fallback to social posts if candidates are low
    if len(candidates) < 3:
        social_json = PUBLIC_DATA_DIR / "social_posts_latest.json"
        if social_json.exists():
            try:
                with open(social_json, "r") as f:
                    s_data = json.load(f)
                    for post in s_data.get("posts", []):
                        candidates.append({
                            "title": post.get("article_title", ""),
                            "url": post.get("article_url", "https://brief.delights.pro"),
                            "summary": post.get("why_it_matters", post.get("takeaway", "")),
                            "suggested_mode": "industry_insight" if post.get("segment") == "leaders" else "tool_drop",
                            "source": "Social Posts"
                        })
            except Exception as e:
                log(f"⚠️ Error reading social posts: {e}")

    # Deduplicate by title
    seen_titles = set()
    unique_candidates = []
    for c in candidates:
        norm = c["title"].lower().strip()
        if norm and norm not in seen_titles:
            seen_titles.add(norm)
            unique_candidates.append(c)

    return unique_candidates[:12]


def select_top_3_4_stories(candidates: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Select 3-4 balanced stories balancing tool_drop, paper_preview, and industry_insight"""
    if not candidates:
        return []

    tools = [c for c in candidates if c["suggested_mode"] == "tool_drop"]
    papers = [c for c in candidates if c["suggested_mode"] == "paper_preview"]
    insights = [c for c in candidates if c["suggested_mode"] == "industry_insight"]

    selected = []
    if tools:
        selected.append(tools[0])
    if papers:
        selected.append(papers[0])
    if insights:
        selected.append(insights[0])
    
    # Fill remaining slot up to 3 or 4
    remaining = [c for c in candidates if c not in selected]
    while len(selected) < 3 and remaining:
        selected.append(remaining.pop(0))
    if len(selected) == 3 and tools and len(tools) > 1 and tools[1] not in selected:
        selected.append(tools[1])

    return selected[:4]


def generate_video_script(stories: List[Dict[str, Any]], date_str: str) -> str:
    """Uses DeepSeek V4.1 Flash to generate the production Markdown script with YAML frontmatter"""
    prompt = f"""You are the senior executive producer and scriptwriter for the high-performing AI video channel "Brief Delights" (in the signature fast-paced, high-utility demo style of AI Search and Wes Roth).

Your job is to transform today's ({date_str}) top AI stories into an editorial Markdown video script with YAML Frontmatter.

SELECTED STORIES FOR TODAY:
{json.dumps(stories, indent=2)}

STRICT RULES FOR THE SCRIPT:
1. Spoken Conversational Tone: Write as if speaking at your desk to an ambitious engineer or founder. Fast, direct, zero corporate filler.
2. Emotional Guidance Tags: Start EVERY beat's narration with an emotional tag in brackets: [excited], [confident], [amazed], [curious], [skeptical], [friendly]. The TTS voice engine parses these to modulate pitch and pacing.
3. Word Limit: Keep each beat between 20 to 35 words (approx. 8–12 seconds of spoken audio). Total spoken duration per tool must stay under 45 seconds.
4. The 3 Story Modes:
   - "tool_drop": For live tools, open-source weights, web apps.
     * Beat 1 (Landing Page): Headline, who built it, killer claim. Visual anchor: body > header, h1, .hero
     * Beat 2 (Demo): Point directly to the interactive proof. Comma-separated semantic visual anchor (e.g. video, canvas, #comparison, .demo, table)
     * Beat 3 (Access): Where to get it. Anchor (e.g. a[href*='huggingface.co'], a[href*='github.com'], .download)
   - "paper_preview": For unreleased models or research preprints.
     * Beat 1 (Paper): Title, authors, core hypothesis.
     * Beat 2 (Architecture/Evidence): Point to architecture diagram or Table 1 benchmark.
     * Beat 3 (Release Horizon): Where the paper is (arXiv) and expected code timeline.
   - "industry_insight": For business, mega-deals, chip compute economics.
     * Beat 1 (Headline): Core factual move & scale.
     * Beat 2 (Evidence): Key quote, chart, or balance-sheet number.
     * Beat 3 (The Verdict): The economic moat or strategic implication.

5. Frontmatter format:
---
episode_id: "ai-news-{date_str}"
voice_profile: "alex_tech"
tools:
  - name: "Exact Tool Name"
    url: "https://project-page-or-demo-url"
    mode: "tool_drop" | "paper_preview" | "industry_insight"
    demo_anchor: "video, canvas, #comparison, .demo"
    download_anchor: "a[href*='huggingface.co'], a[href*='github.com']"
    specs: "e.g. 12GB VRAM | Apache 2.0 | ComfyUI or Paper Only"
---

Follow this exact body template:
# Intro
[excited] Punchy 8-second cold open teasing today's biggest drops.

---

# Story 1: Tool Name
### Landing Page
[confident] ...
### Demo
[amazed] ...
### Access
[energetic] ...

(Repeat for each story)

---

# Outro
[friendly] All project links and research papers are organized down in the description below. Hit subscribe to Brief Delights for your daily rundown, and I'll see you tomorrow.

Return RAW MARKDOWN ONLY. Do NOT wrap in extra ```markdown code blocks. Start directly with ---."""

    log(f"🤖 Calling {MODEL} to compose Video Safari Script...")
    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": "You are a senior video producer. Keep internal reasoning concise (under 200 words), then immediately write the full Markdown script starting with ---."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.6,
            max_tokens=3500,
            extra_body={"reasoning": {"max_tokens": 600}}
        )
        
        raw_content = response.choices[0].message.content if response and response.choices and response.choices[0].message else None
        if not raw_content:
            raise ValueError(f"Empty completion content (finish_reason: {response.choices[0].finish_reason})")
            
        content = raw_content.strip()
    except Exception as e:
        log(f"⚠️ Primary LLM call failed or timed out: {e}. Trying fallback...")
        response = client.chat.completions.create(
            model="google/gemini-2.5-flash",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.6,
            max_tokens=3500
        )
        content = response.choices[0].message.content.strip()

    # Strip any accidental wrapping markdown backticks
    if content.startswith("```markdown"):
        content = content[11:]
    elif content.startswith("```"):
        content = content[3:]
    if content.endswith("```"):
        content = content[:-3]
    content = content.strip()

    # Ensure frontmatter is properly closed with '---' before '# Intro'
    if content.startswith("---"):
        # If there's only one '---' or if '# Intro' appears before second '---'
        intro_pos = content.find("# Intro")
        second_dash = content.find("---", 3)
        if intro_pos != -1 and (second_dash == -1 or second_dash > intro_pos):
            # Insert missing closing '---'
            pre_intro = content[:intro_pos].rstrip()
            post_intro = content[intro_pos:]
            content = f"{pre_intro}\n---\n\n{post_intro}"

    return content.strip()


def parse_markdown_to_json(md_content: str, date_str: str) -> Dict[str, Any]:
    """Parses the generated Markdown + YAML frontmatter into structured JSON for API consumption"""
    import yaml
    
    frontmatter = {}
    body = md_content

    # Robust frontmatter extraction
    fm_match = re.match(r"^---\s*\n(.*?)\n---\s*\n(.*)$", md_content, re.DOTALL)
    if fm_match:
        try:
            frontmatter = yaml.safe_load(fm_match.group(1)) or {}
            body = fm_match.group(2).strip()
        except Exception as e:
            log(f"⚠️ YAML parse warning: {e}")
    else:
        # Fallback split
        parts = md_content.split("---")
        if len(parts) >= 3:
            try:
                frontmatter = yaml.safe_load(parts[1]) or {}
                body = "---".join(parts[2:]).strip()
            except Exception as e:
                log(f"⚠️ YAML fallback parse warning: {e}")

    # Extract stories from body
    story_blocks = re.split(r"\n#\s+Story\s+\d+:\s*", body)
    intro_match = re.search(r"#\s+Intro\s*\n(.*?)(?=\n---|\n#|$)", body, re.DOTALL)
    outro_match = re.search(r"#\s+Outro\s*\n(.*?)(?=\n---|\n#|$)", body, re.DOTALL)

    intro_text = intro_match.group(1).strip() if intro_match else ""
    outro_text = outro_match.group(1).strip() if outro_match else ""

    parsed_stories = []
    tools_metadata = frontmatter.get("tools", [])

    for idx, block in enumerate(story_blocks[1:]):
        lines = block.strip().split("\n")
        story_name = lines[0].strip() if lines else f"Story {idx+1}"
        meta = tools_metadata[idx] if idx < len(tools_metadata) else {}

        # Dynamically extract all ### Beat sections (supports tool_drop, paper_preview, industry_insight)
        beat_matches = list(re.finditer(r"###\s+([^\n]+)\n(.*?)(?=\n###|\n---|\n#|$)", block, re.DOTALL))
        beats_dict = {}
        ordered_beats = []
        for b in beat_matches:
            b_title = b.group(1).strip()
            b_key = re.sub(r'[^a-z0-9]+', '_', b_title.lower()).strip('_')
            b_text = b.group(2).strip()
            beats_dict[b_key] = b_text
            ordered_beats.append({"title": b_title, "narration": b_text})

        parsed_stories.append({
            "name": meta.get("name", story_name),
            "url": meta.get("url", ""),
            "mode": meta.get("mode", "tool_drop"),
            "demo_anchor": meta.get("demo_anchor", "video, #demo, canvas"),
            "download_anchor": meta.get("download_anchor", "a[href*='github.com']"),
            "specs": meta.get("specs", ""),
            "beats": beats_dict,
            "ordered_beats": ordered_beats
        })

    return {
        "episode_id": frontmatter.get("episode_id", f"ai-news-{date_str}"),
        "date": date_str,
        "voice_profile": frontmatter.get("voice_profile", "alex_tech"),
        "intro": intro_text,
        "stories": parsed_stories,
        "outro": outro_text,
        "tools_metadata": tools_metadata,
        "raw_markdown": md_content,
        "generated_at": datetime.now().isoformat()
    }


def main():
    parser = argparse.ArgumentParser(description="Generate Brief Delights Video Safari Script")
    parser.add_argument("--date", type=str, default=datetime.now().strftime("%Y-%m-%d"), help="Target date YYYY-MM-DD")
    parser.add_argument("--test", action="store_true", help="Run test generation")
    args = parser.parse_args()

    date_str = args.date
    log("=" * 60)
    log(f"🎬 Generating Brief Delights Video Safari Script for {date_str}")
    log("=" * 60)

    # 1. Gather candidates
    candidates = load_candidate_stories(date_str)
    log(f"Found {len(candidates)} candidate stories")

    # If no candidates found locally, create diverse realistic fallback pool for testing
    if not candidates:
        log("ℹ️ Using representative candidate set for script generation...")
        candidates = [
            {
                "title": "Marigold v2: Diffusion Transformers for Real-Time Monocular Depth",
                "url": "https://marigold-depth.github.io/",
                "summary": "4x faster depth estimation using diffusion transformers on consumer GPUs.",
                "suggested_mode": "tool_drop",
                "source": "Hugging Face"
            },
            {
                "title": "YuE2: Open Full-Song Generation with Symbolic Score Planning",
                "url": "https://map-yue2.github.io/",
                "summary": "Full-length vocal music generation with editable ABC symbolic score notation.",
                "suggested_mode": "tool_drop",
                "source": "Hugging Face"
            },
            {
                "title": "DeepSeek V4.1 Flash: Asymmetric Compute MoE Architecture",
                "url": "https://www.deepseek.com/en/news/deepseek-v4-1-flash/",
                "summary": "552B MoE model with 1M context window and compressed 890-byte KV cache.",
                "suggested_mode": "paper_preview",
                "source": "DeepSeek News"
            },
            {
                "title": "Anthropic Agrees $45B AI Infrastructure Deal with Nscale",
                "url": "https://brief.delights.pro/newsletters/newsletter_leaders_2026-08-28.html",
                "summary": "Major enterprise compute capacity buildout securing European gigawatt power.",
                "suggested_mode": "industry_insight",
                "source": "Leaders Newsletter"
            }
        ]

    # 2. Select top 3-4 stories
    selected = select_top_3_4_stories(candidates)
    log(f"Selected {len(selected)} stories for Video Safari:")
    for s in selected:
        log(f"  • [{s['suggested_mode']}] {s['title']}")

    # 3. Generate Markdown script
    md_script = generate_video_script(selected, date_str)

    # 4. Save Markdown script
    md_file = REPORTS_DIR / f"{date_str}-ai-news.md"
    with open(md_file, "w", encoding="utf-8") as f:
        f.write(md_script)
    log(f"✅ Saved Editorial Markdown: {md_file}")

    # Copy to public data directory
    latest_md_file = PUBLIC_DATA_DIR / "latest_video_script.md"
    with open(latest_md_file, "w", encoding="utf-8") as f:
        f.write(md_script)

    # 5. Parse and save JSON representation for API consumption
    parsed_json = parse_markdown_to_json(md_script, date_str)
    latest_json_file = PUBLIC_DATA_DIR / "latest_video_script.json"
    with open(latest_json_file, "w", encoding="utf-8") as f:
        json.dump(parsed_json, f, indent=2)
    log(f"✅ Saved Structured JSON: {latest_json_file}")

    print("\n--- GENERATED SCRIPT PREVIEW ---\n")
    print(md_script[:600] + "\n...\n")
    return True


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
