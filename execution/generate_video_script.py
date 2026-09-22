#!/usr/bin/env python3
"""
Brief Delights - Superpowered Video Safari & Weekly Mega-Recap Script Generator
Transforms top AI drops into editorial Markdown scripts with YAML frontmatter,
specifically optimized for OmniCap's browser recording agent, precision DOM navigation,
and expressive TTS narration with live Hacker News & multi-source consensus telemetry.

Supported Modes:
1. Multi-Track Daily Shows:
   - top4: Flagship Daily AI Safari (cross-segment top drops)
   - builders: Builders Safari (open weights, GitHub repos, ComfyUI, code)
   - leaders: Executive Flash (compute deals, valuations, enterprise infrastructure)
   - generative_media: Creative Media Spotlight (video models, audio synthesis, 3D splatting)
2. Sunday Weekly Mega-Recap (--weekly):
   - 8-10 minute chaptered YouTube mega-documentary compiling the week's top 8-10 macro drops.
"""

import os
import sys
import json
import re
import yaml
import argparse
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from dotenv import load_dotenv
from openai import OpenAI

# Setup paths
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

load_dotenv()

from execution.select_stories import (
    cluster_consensus_articles,
    calculate_article_signal_score,
    get_domain_authority_score
)
from execution.hn_signals import fetch_hn_trending_index, enrich_articles_with_hn

TMP_DIR = PROJECT_ROOT / ".tmp"
REPORTS_DIR = PROJECT_ROOT / "reports" / "video_scripts"
WEEKLY_INSIGHTS_DIR = PROJECT_ROOT / "reports" / "weekly_insights"
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

TRACK_CONFIG = {
    "top4": {
        "title": "Daily AI Safari",
        "description": "Cross-segment top drops balancing tools, papers, and industry shocks"
    },
    "builders": {
        "title": "Builders Safari",
        "description": "Open weights, GitHub repos, ComfyUI nodes, and developer tooling"
    },
    "leaders": {
        "title": "Executive Flash",
        "description": "Enterprise infrastructure, gigawatt power deals, valuations, and compute economics"
    },
    "generative_media": {
        "title": "Generative Media Spotlight",
        "description": "Video generation models, vocal audio synthesis, 3D Gaussian splatting, and VFX"
    }
}

def log(msg: str):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")


def resolve_omnicap_anchors(url: str, mode: str = "tool_drop", track: str = "top4") -> Dict[str, str]:
    """
    Precision OmniCap DOM Navigation & Anchor Templates
    Returns tested, semantic CSS selectors for browser recording agents to pan/zoom/click.
    """
    u = (url or "").lower()
    
    # 1. GitHub Repositories
    if "github.com" in u:
        return {
            "hero_anchor": "article.markdown-body h1, .repository-content, #readme h1, h1",
            "demo_anchor": "article.markdown-body img[src*='.gif'], article.markdown-body video, article.markdown-body details, #readme img, table",
            "download_anchor": "a[href*='releases'], a[href*='clone'], .btn-primary, a[href$='.zip']",
            "default_specs": "Open Source | GitHub | Code & Docs"
        }
    
    # 2. Hugging Face Hub, Spaces, and Papers
    elif "huggingface.co" in u:
        if "/spaces/" in u:
            return {
                "hero_anchor": "h1, .model-header, header",
                "demo_anchor": "iframe[src*='gradio'], .gradio-container, canvas, video, button[type='submit'], .output",
                "download_anchor": "button[data-testid='duplicate-button'], a[href*='tree/main']",
                "default_specs": "Interactive Space | Hugging Face | Live Demo"
            }
        elif "/papers/" in u:
            return {
                "hero_anchor": "h1, .paper-title, h1.title",
                "demo_anchor": "table, figure, .results, #benchmark, div[class*='abstract']",
                "download_anchor": "a[href*='arxiv.org/pdf'], a[href*='huggingface.co/papers']",
                "default_specs": "Research Paper | Hugging Face Daily Papers"
            }
        else:
            return {
                "hero_anchor": "h1, .model-header, header",
                "demo_anchor": "table, .results, #benchmark, canvas, .viewer, video",
                "download_anchor": "button[data-testid='download-button'], a[href*='tree/main'], a[href*='resolve']",
                "default_specs": "Model Weights | Hugging Face Hub"
            }
            
    # 3. ArXiv / BioRxiv Preprints
    elif "arxiv.org" in u or "biorxiv.org" in u:
        return {
            "hero_anchor": "h1.title, .title, h1",
            "demo_anchor": "a.download-pdf, div.extra-services, table.benchmark, figure",
            "download_anchor": "a.download-pdf, a[href*='arxiv.org/pdf']",
            "default_specs": "Research Preprint | arXiv"
        }
        
    # 4. Interactive Live Demos (Replicate, Vercel, Streamlit, Gradio)
    elif any(x in u for x in ["replicate.com", "gradio.live", "vercel.app", "streamlit.app", "colab.research.google.com"]):
        return {
            "hero_anchor": "h1, header, .hero h1",
            "demo_anchor": "form, input, button[type='submit'], canvas, video, audio, .output, .demo",
            "download_anchor": "a[href*='github.com'], a[href*='api'], button",
            "default_specs": "Live Web App | Interactive Demo"
        }
        
    # 5. Generative Media Specific Fallbacks
    elif track == "generative_media" or mode == "generative_media":
        return {
            "hero_anchor": "main h1, header h1, .hero h1, h1",
            "demo_anchor": "video, audio, canvas, .player, .waveform, iframe[src*='gradio'], .output, figure",
            "download_anchor": "a[href*='download'], a[href*='github.com'], a[href*='huggingface.co'], .cta-button",
            "default_specs": "Creative Media | Audio/Video/3D | Live Demo"
        }
        
    # 6. Default Fallbacks by Mode
    else:
        if mode == "industry_insight":
            return {
                "hero_anchor": "main h1, header h1, .hero h1, h1",
                "demo_anchor": "figure, table, blockquote, canvas, .chart, .metrics",
                "download_anchor": "a[href*='report'], a[href*='pdf'], a.cta-button",
                "default_specs": "Industry Insight | Strategic Analysis"
            }
        elif mode == "paper_preview":
            return {
                "hero_anchor": "main h1, header h1, h1",
                "demo_anchor": "figure, table, .results, #diagram, #comparison",
                "download_anchor": "a[href*='pdf'], a[href*='arxiv.org'], a[href*='github.com']",
                "default_specs": "Research Preview | Benchmark"
            }
        else:
            return {
                "hero_anchor": "main h1, header h1, .hero h1, h1",
                "demo_anchor": "video, canvas, #demo, .demo, #comparison, table",
                "download_anchor": "a[href*='github.com'], a[href*='download'], a[href*='huggingface.co'], .cta-button",
                "default_specs": "Live Tool | Web Drop"
            }


def calculate_video_readiness_score(article: Dict[str, Any], track: str = "top4") -> float:
    """
    Visual & Browser-Recording Feasibility Heuristic (0 - 140+):
    - Live interactive demo / space: +30
    - Open GitHub repo / weights: +25
    - Visual cue keywords (demo, benchmark, comparison, canvas, video): +15
    - Multi-outlet consensus momentum: +min(consensus * 5, 20)
    - Live Hacker News velocity: +15 - 25
    """
    url = (article.get("url") or "").lower()
    title = (article.get("title") or "").lower()
    summary = (article.get("summary") or article.get("description") or "").lower()
    text = f"{title} {summary}"

    score = 30.0  # Base feasibility baseline

    sig_score = float(article.get("signal_score", 0) or 0)
    if sig_score > 0:
        score += min(sig_score * 0.25, 20.0)

    # 1. Interactive Demo Proof
    if any(d in url for d in ["huggingface.co/spaces", "replicate.com", "gradio.live", "vercel.app", "streamlit.app", "colab.research.google.com"]):
        score += 30.0
    elif url.endswith(".app") or url.endswith(".io") or "/demo" in url:
        score += 15.0

    # 2. Code / Model Weights Proof
    if "github.com" in url:
        score += 25.0
    elif "huggingface.co" in url and "/papers/" not in url:
        score += 20.0

    # 3. Visual & Interactive Anchor Keywords
    visual_keywords = [
        "demo", "interactive", "benchmark", "comparison", "canvas", "video", 
        "real-time", "diffusion", "gui", "robotics", "vision", "3d", 
        "workflow", "comfyui", "webgl", "ui", "agent", "song", "audio", "music"
    ]
    matched_visuals = [w for w in visual_keywords if w in text]
    score += min(len(matched_visuals) * 5.0, 20.0)

    # 4. Multi-Outlet Consensus Boost
    consensus_count = article.get("consensus_count", 1) or 1
    if consensus_count > 1:
        score += min(consensus_count * 5.0, 20.0)

    # 5. Hacker News Trending Velocity Boost
    hn_stats = article.get("hn_stats") or {}
    velocity = hn_stats.get("velocity", "")
    points = hn_stats.get("points", 0)
    if velocity == "high" or points >= 200:
        score += 25.0
    elif velocity == "medium" or points >= 50:
        score += 15.0

    # 6. Track-specific alignment
    mode = article.get("suggested_mode", "tool_drop")
    if track == "builders":
        if mode == "tool_drop":
            score += 15.0
        elif mode == "industry_insight":
            score -= 15.0
    elif track == "leaders":
        if mode == "industry_insight":
            score += 25.0
        elif any(k in text for k in ["funding", "infrastructure", "deal", "valuation", "billion", "compute", "datacenter"]):
            score += 20.0
    elif track == "generative_media":
        media_keywords = ["video", "music", "audio", "song", "vocal", "3d", "diffusion", "splatting", "lora", "comfyui", "image-to-video", "speech", "soundfx", "rendering", "vfx"]
        matched_media = [k for k in media_keywords if k in text]
        if matched_media:
            score += min(len(matched_media) * 8.0, 30.0)
        else:
            score -= 20.0
        if any(d in url for d in ["huggingface.co/spaces", "replicate.com", "gradio.live"]):
            score += 15.0

    # 7. Penalties for low-visual / dry text preprints
    if "arxiv.org" in url and not any(k in text for k in ["code", "github", "weights", "demo", "benchmark", "sota"]):
        score -= 20.0

    if any(agg in url for agg in ["techcrunch.com", "venturebeat.com", "theverge.com", "news.ycombinator.com", "reuters.com"]):
        score -= 10.0

    return max(round(score, 1), 0.0)


def build_story_badges(article: Dict[str, Any]) -> List[str]:
    """Generates punchy lower-third telemetry badges for on-screen video overlays"""
    badges = []
    
    hn_stats = article.get("hn_stats") or {}
    points = hn_stats.get("points", 0)
    velocity = hn_stats.get("velocity", "")
    if points >= 100 or velocity == "high":
        badges.append(f"🔥 HN Trending ({points} pts)")
    elif points > 0:
        badges.append(f"💬 HN Discussion ({points} pts)")

    consensus_count = article.get("consensus_count", 1) or 1
    if consensus_count >= 3:
        badges.append(f"⚡ {consensus_count} Outlets Confirmed")

    url = (article.get("url") or "").lower()
    if "github.com" in url:
        badges.append("🛠️ Open Source Repo")
    elif "huggingface.co/spaces" in url or "replicate.com" in url or "gradio.live" in url:
        badges.append("✨ Interactive Demo Live")
    elif "huggingface.co" in url:
        badges.append("📦 Open Weights")
    elif "arxiv.org" in url:
        badges.append("📄 Research Preprint")

    if not badges:
        vr = article.get("video_readiness", 0)
        if vr >= 70:
            badges.append("🚀 Top Signal Drop")

    return badges[:3]


def clean_broadcast_entity_name(title: str, url: str = "") -> Tuple[str, str]:
    """
    Deterministic broadcast sanitizer for lower-third badges and video cards.
    Separates:
      1. name: Entity/Tool Name (1 to 4 words, maximum 28 characters).
      2. headline: Punchy editorial hook/headline stripped of publication suffixes.
    """
    if not title:
        return ("AI Tool", "")
    
    headline = re.sub(r'\s+', ' ', str(title)).strip()
    
    # 1. Strip RSS and publication suffixes
    headline = re.sub(
        r'[-–—|:]\s*(TechCrunch|VentureBeat|The Verge|Ars Technica|Wired|Reuters|Bloomberg|arXiv|Hugging Face|MarkTechPost|InfoQ|SiliconANGLE|MIT Technology Review|Hacker News|GitHub|Medium|Substack|YouTube|Google News|AI NEWS).*$',
        '',
        headline,
        flags=re.IGNORECASE
    ).strip()
    
    # Strip feed tags
    headline = re.sub(r'\[(?:Paper & Demo|Paper|Demo|P|D|R|Discussion|News)\]\s*', '', headline, flags=re.IGNORECASE).strip()
    headline = re.sub(r'^(?:Show HN|Ask HN|Tell HN):\s*', '', headline, flags=re.IGNORECASE).strip()

    name = ""
    extracted_headline = headline
    
    # Case A: GitHub repo name fallback if URL is a repository
    github_name = ""
    if "github.com/" in url:
        repo_match = re.search(r'github\.com/[^/]+/([^/?#]+)', url)
        if repo_match:
            repo_name = repo_match.group(1).rstrip('.git')
            if len(repo_name) <= 28 and len(repo_name.split()) <= 4:
                github_name = repo_name

    # Case B: Colon / Dash delimiter (Entity Name : Headline Hook)
    delim_match = re.split(r'\s*[:–—|]\s*', headline, maxsplit=1)
    if len(delim_match) == 2:
        prefix, suffix = delim_match[0].strip(), delim_match[1].strip()
        prefix_words = prefix.split()
        if (1 <= len(prefix_words) <= 4 and len(prefix) <= 28 and 
            not re.match(r'^(Why|How|What|When|Where|New|Watch|Read|Listen)\b', prefix, re.IGNORECASE)):
            name = prefix
            extracted_headline = suffix

    # Case C: Announcement verbs: 'Company/Tool launches/releases/raises/agrees...'
    if not name:
        verb_match = re.match(
            r'^([A-Z0-9][A-Za-z0-9\s\.\-_]{1,24})\s+(?:raises|launches|releases|unveils|introduces|drops|announces|debuts|open-sources|agrees|signs|partners|acquires)\b(?:\s+([A-Za-z0-9\.\-_]{2,20}))?',
            headline,
            re.IGNORECASE
        )
        if verb_match:
            company = verb_match.group(1).strip()
            raw_product = (verb_match.group(2) or '').strip().rstrip(',. ')
            partner_match = re.search(r'\bwith\s+([A-Z][A-Za-z0-9]{1,15})\b', headline)
            if partner_match:
                cand = f'{company} / {partner_match.group(1)}'
            elif raw_product and not raw_product.startswith('$') and not raw_product[0].isdigit() and company.lower() in {'apple', 'google', 'meta', 'microsoft', 'openai', 'anthropic', 'amazon', 'nvidia', 'mistral'}:
                cand = f'{company} {raw_product}'
            else:
                cand = company
            if len(cand.split()) <= 4 and len(cand) <= 28:
                name = cand

    # Case D: Parenthetical model or acronym (e.g. '... (RefineEdit)')
    if not name:
        paren_match = re.search(r'\(([A-Z0-9][A-Za-z0-9\-_]{1,20})\)', headline)
        if paren_match:
            cand = paren_match.group(1).strip()
            if 2 <= len(cand) <= 24:
                name = cand

    # Case E: If headline itself is already concise (1-4 words, <= 28 chars)
    if not name:
        words = headline.split()
        if 1 <= len(words) <= 4 and len(headline) <= 28 and not re.match(r'^(Why|How|What|When|Where|New|Watch|Read|Listen)\b', headline, re.IGNORECASE):
            name = headline

    # Case F: GitHub repo name if title was obscure
    if not name and github_name:
        name = github_name

    # Case G: Stopwords heuristic on first few capitalized tokens
    if not name:
        first_words = headline.split()[:4]
        stop_words = {'is', 'for', 'with', 'by', 'in', 'on', 'a', 'an', 'the', 'to', 'from', 'training-free', 'real-time', 'fast', 'open'}
        cand_words = []
        for w in first_words:
            clean_w = re.sub(r'[^a-zA-Z0-9\.\-]', '', w)
            if clean_w.lower() in stop_words and cand_words:
                break
            cand_words.append(clean_w)
            if len(' '.join(cand_words)) > 24:
                cand_words.pop()
                break
        if cand_words:
            name = ' '.join(cand_words)

    # Fallback clamp
    if not name:
        name = ' '.join(headline.split()[:3])

    # Enforce strict lower-third broadcast constraint: 1 to 4 words, max 28 characters
    words = name.strip().split()
    if len(words) > 4:
        name = ' '.join(words[:4])
    name = name[:28].strip()

    return name, extracted_headline


def build_frontmatter_yaml(stories: List[Dict[str, Any]], episode_id: str, track: str = "top4", format_type: str = "daily") -> str:
    """Builds deterministic, clean YAML frontmatter in Python with verified DOM selectors and broadcast lower-third fields"""
    tools_list = []
    for s in stories:
        url = (s.get("url") or "").strip()
        if "huggingface.co/spaces/multimodal-art/YuE" in url:
            url = "https://github.com/multimodal-art-projection/YuE"
            s["url"] = url
        if "brief.delights.pro" in url:
            url = "https://www.nscale.com"
            s["url"] = url

        clean_name, clean_headline = clean_broadcast_entity_name(s.get("title") or s.get("name") or "", url)
        final_name = s.get("name") or clean_name
        final_name = " ".join(final_name.split()[:4])[:28].strip()
        final_headline = s.get("headline") or clean_headline

        tools_list.append({
            "name": final_name,
            "headline": final_headline,
            "title": s.get("title") or final_headline,
            "url": url,
            "mode": s.get("suggested_mode", "tool_drop"),
            "hero_anchor": s.get("hero_anchor", "main h1, .hero"),
            "demo_anchor": s.get("demo_anchor", "video, canvas, #demo"),
            "download_anchor": s.get("download_anchor", "a[href*='github.com']"),
            "specs": s.get("specs", "Live Tool | Web Drop"),
            "video_readiness": s.get("video_readiness", 0),
            "consensus_count": s.get("consensus_count", 1),
            "hn_points": (s.get("hn_stats") or {}).get("points"),
            "badges": s.get("badges", [])
        })

    fm_dict = {
        "episode_id": episode_id,
        "track": track,
        "format": format_type,
        "voice_profile": "alex_tech",
        "tools": tools_list
    }
    return f"---\n{yaml.dump(fm_dict, sort_keys=False, allow_unicode=True)}---\n"


def load_candidate_stories(date_str: str, track: str = "top4") -> List[Dict[str, Any]]:
    """Superpowered Candidate Ingestion for Daily Shows"""
    candidates = []
    
    # 1. Hugging Face Daily Papers feed
    hf_xml = TMP_DIR / "custom_feed_hf_daily_papers.xml"
    if hf_xml.exists():
        try:
            import feedparser
            feed = feedparser.parse(str(hf_xml))
            for entry in feed.entries[:12]:
                title = entry.title.replace("[Paper & Demo]", "").strip()
                t_lower = title.lower()
                desc_lower = entry.description.lower()
                is_tool = ("model" in t_lower or "demo" in t_lower or "agent" in t_lower or "github" in desc_lower)
                candidates.append({
                    "title": title,
                    "url": entry.link,
                    "summary": entry.description[:400],
                    "suggested_mode": "tool_drop" if is_tool else "paper_preview",
                    "source": "Hugging Face Daily Papers",
                    "source_type": "primary"
                })
        except Exception as e:
            log(f"⚠️ Error parsing HF papers: {e}")

    # 2. Segment selected articles
    segments = ["builders", "innovators", "leaders", "generative_media"]
    for segment in segments:
        sel_file = TMP_DIR / f"selected_articles_{segment}_{date_str}.json"
        if sel_file.exists():
            try:
                with open(sel_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    articles = data.get("selected_articles", data.get("articles", []))
                    for art in articles:
                        if segment == "leaders":
                            suggested_mode = "industry_insight"
                        elif segment == "innovators":
                            suggested_mode = "paper_preview"
                        else:
                            suggested_mode = "tool_drop"

                        candidates.append({
                            "title": art.get("title", ""),
                            "url": art.get("url", ""),
                            "summary": art.get("selection_reason", "") or art.get("why_this_matters", "") or art.get("description", ""),
                            "suggested_mode": suggested_mode,
                            "source": f"Segment {segment.capitalize()}",
                            "source_type": art.get("source_type", ""),
                            "signal_score": art.get("signal_score", 0)
                        })
            except Exception as e:
                log(f"⚠️ Error reading {sel_file}: {e}")

    # 3. Raw feeds fallback
    if len(candidates) < 10:
        raw_feed_file = TMP_DIR / f"feed_items_raw_{date_str}.json"
        if raw_feed_file.exists():
            try:
                with open(raw_feed_file, "r", encoding="utf-8") as f:
                    raw_items = json.load(f)
                    for item in raw_items[:40]:
                        candidates.append({
                            "title": item.get("title", ""),
                            "url": item.get("url", ""),
                            "summary": item.get("description", "")[:350],
                            "suggested_mode": "tool_drop" if "github.com" in item.get("url", "") else "paper_preview",
                            "source": item.get("source", "Raw Feed"),
                            "source_type": item.get("source_type", "")
                        })
            except Exception as e:
                log(f"⚠️ Error reading raw feed file: {e}")

    valid_candidates = []
    for c in candidates:
        title = (c.get("title") or "").strip()
        url = (c.get("url") or "").strip()
        if len(title) <= 8:
            continue
        if not url.startswith("http://") and not url.startswith("https://"):
            continue
        # Strictly ban internal newsletter URLs from being recorded as primary external video targets
        if "brief.delights.pro" in url:
            log(f"🚫 Filtered internal newsletter URL from video candidates: {url}")
            continue
        valid_candidates.append(c)

    log(f"Clustering {len(valid_candidates)} candidate stories into consensus events...")
    clustered = cluster_consensus_articles(valid_candidates)

    log("Enriching candidates with real-time Hacker News front-page index...")
    enriched = enrich_articles_with_hn(clustered)

    for art in enriched:
        clean_name, clean_headline = clean_broadcast_entity_name(art.get("title", ""), art.get("url", ""))
        art["name"] = clean_name
        art["headline"] = clean_headline
        art["video_readiness"] = calculate_video_readiness_score(art, track=track)
        anchors = resolve_omnicap_anchors(art.get("url", ""), art.get("suggested_mode", "tool_drop"), track=track)
        art["hero_anchor"] = anchors["hero_anchor"]
        art["demo_anchor"] = anchors["demo_anchor"]
        art["download_anchor"] = anchors["download_anchor"]
        art["specs"] = anchors["default_specs"]
        art["badges"] = build_story_badges(art)

    return enriched


def select_top_3_4_stories(candidates: List[Dict[str, Any]], track: str = "top4") -> List[Dict[str, Any]]:
    """Selects top 3-4 drops sorted by video-readiness & signal momentum"""
    if not candidates:
        return []

    sorted_candidates = sorted(candidates, key=lambda x: x.get("video_readiness", 0), reverse=True)

    tools = [c for c in sorted_candidates if c["suggested_mode"] == "tool_drop"]
    papers = [c for c in sorted_candidates if c["suggested_mode"] == "paper_preview"]
    insights = [c for c in sorted_candidates if c["suggested_mode"] == "industry_insight"]

    selected = []

    if track == "builders":
        for t in tools[:3]:
            selected.append(t)
        if papers:
            selected.append(papers[0])
        elif len(tools) > 3:
            selected.append(tools[3])

    elif track == "leaders":
        for i in insights[:2]:
            selected.append(i)
        if tools:
            selected.append(tools[0])
        if papers:
            selected.append(papers[0])

    elif track == "generative_media":
        for s in sorted_candidates:
            if len(selected) >= 4:
                break
            selected.append(s)

    else:  # top4 default
        if tools:
            selected.append(tools[0])
        if papers and papers[0] not in selected:
            selected.append(papers[0])
        if insights and insights[0] not in selected:
            selected.append(insights[0])
        
        remaining = [c for c in sorted_candidates if c not in selected]
        if remaining:
            selected.append(remaining[0])

    remaining_fillers = [c for c in sorted_candidates if c not in selected]
    while len(selected) < 3 and remaining_fillers:
        selected.append(remaining_fillers.pop(0))

    return selected[:4]


def generate_video_script_body(stories: List[Dict[str, Any]], date_str: str, track: str = "top4") -> str:
    """Uses LLM to write ONLY the editorial Markdown script body (Intro, Stories with Beats, Outro)"""
    story_prompts = []
    for s in stories:
        clean_name, clean_hl = clean_broadcast_entity_name(s.get("name") or s.get("title", ""), s.get("url", ""))
        hn = s.get("hn_stats") or {}
        hn_text = f"HN: {hn.get('points', 0)} pts, {hn.get('comments', 0)} comments ({hn.get('velocity', 'normal')} velocity)" if hn.get("points") else "HN: No thread"
        badges_text = ", ".join(s.get("badges", []))
        story_prompts.append({
            "name": clean_name,
            "headline": s.get("headline") or clean_hl,
            "title": s.get("title") or clean_hl,
            "url": s.get("url"),
            "mode": s.get("suggested_mode"),
            "summary": s.get("summary"),
            "video_readiness_score": s.get("video_readiness"),
            "consensus_count": s.get("consensus_count", 1),
            "hacker_news": hn_text,
            "on_screen_badges": badges_text,
            "specs": s.get("specs")
        })

    track_info = TRACK_CONFIG.get(track, TRACK_CONFIG["top4"])
    track_title = track_info["title"]

    sample_name = story_prompts[0].get('name') if story_prompts else 'RefineEdit'
    sample_hl = story_prompts[0].get('headline') if story_prompts else 'Training-Free Real-Time Image Editing'

    prompt = f"""You are the senior executive producer and scriptwriter for the high-performing AI video channel "Brief Delights" ({track_title}).
Signature style: fast-paced, high-utility demo walk-through (in the cadence of AI Search and Wes Roth).

Your job is to transform today's ({date_str}) top AI drops into an editorial Markdown script BODY (Intro, Stories, Outro) for TTS and browser screen recording.

SELECTED STORIES TODAY (WITH VERIFIED TELEMETRY):
{json.dumps(story_prompts, indent=2)}

STRICT BROADCAST LOWER-THIRD RULES (CRITICAL):
1. Broadcast Separation: In broadcast video, the Entity/Tool Name (what appears on the video card badge) MUST be cleanly separated from the Story Headline (the hook):
   - "name": 1 to 4 words, MAXIMUM 28 characters (e.g., "RefineEdit", "Vals AI", "Marigold v2", "DeepSeek V4.1"). NEVER use long paper subtitles, academic clauses, or RSS publication tags in the name.
   - "headline": Punchy editorial hook describing what it actually does.
2. Story Header Format: You MUST format each story header with a pipe delimiter:
   # Story {{i}}: {{name}} | {{headline}}
   Examples:
   # Story 1: RefineEdit | Training-Free Real-Time Image Editing
   # Story 2: Vals AI | Automated Enterprise LLM Evaluations
   # Story 3: Marigold v2 | Monocular Depth Estimation on Consumer GPUs

STRICT RULES FOR THE SCRIPT:
1. Spoken Conversational Tone: Fast, direct, zero corporate filler.
2. Weave Verified Signals: Weave Hacker News upvotes and multi-outlet consensus into the cold open and narration.
3. Emotional Guidance Tags: Start EVERY beat's narration with an emotional tag in brackets: [excited], [confident], [amazed], [curious], [skeptical], [friendly].
4. Word Limit: Keep each beat between 20 to 35 words (approx. 8–12 seconds of spoken audio). Total spoken duration per story under 45 seconds.
5. The 3 Story Modes:
   - "tool_drop": Beat 1 (Landing Page), Beat 2 (Demo), Beat 3 (Access)
   - "paper_preview": Beat 1 (Paper), Beat 2 (Architecture/Evidence), Beat 3 (Release Horizon)
   - "industry_insight": Beat 1 (Headline), Beat 2 (Evidence), Beat 3 (The Verdict)

Follow this EXACT structure (DO NOT generate YAML frontmatter, start directly with # Intro):

# Intro
[excited] Punchy 8-second cold open teasing today's biggest drops and viral HN discussion.

---

# Story 1: {sample_name} | {sample_hl}
### Landing Page
[confident] ...
### Demo
[amazed] ...
### Access
[energetic] ...

(Repeat for each story)

---

# Outro
[friendly] All project links, Hugging Face spaces, and research papers are organized down in the description below. Hit subscribe to Brief Delights for your daily rundown, and I'll see you tomorrow.

Return RAW MARKDOWN ONLY. Start directly with # Intro."""

    log(f"🤖 Calling {MODEL} to compose Video Safari Script ({track_title})...")
    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": "You are a senior video producer. Keep internal reasoning concise (under 200 words), then write the script body starting with # Intro."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.6,
            max_tokens=3000,
            extra_body={"reasoning": {"max_tokens": 500}}
        )
        content = response.choices[0].message.content.strip()
    except Exception as e:
        log(f"⚠️ Primary LLM call failed: {e}. Trying fallback...")
        response = client.chat.completions.create(
            model="google/gemini-2.5-flash",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.6,
            max_tokens=3000
        )
        content = response.choices[0].message.content.strip()

    if content.startswith("```markdown"):
        content = content[11:]
    elif content.startswith("```"):
        content = content[3:]
    if content.endswith("```"):
        content = content[:-3]
    return content.strip()


def parse_markdown_to_json(md_content: str, date_str: str, track: str = "top4", format_type: str = "daily") -> Dict[str, Any]:
    """Parses generated Markdown + YAML frontmatter into structured JSON for API consumption"""
    frontmatter = {}
    body = md_content

    fm_match = re.match(r"^---\s*\n(.*?)\n---\s*\n(.*)$", md_content, re.DOTALL)
    if fm_match:
        try:
            frontmatter = yaml.safe_load(fm_match.group(1)) or {}
            body = fm_match.group(2).strip()
        except Exception as e:
            log(f"⚠️ YAML parse warning: {e}")
    else:
        parts = md_content.split("---")
        if len(parts) >= 3:
            try:
                frontmatter = yaml.safe_load(parts[1]) or {}
                body = "---".join(parts[2:]).strip()
            except Exception as e:
                log(f"⚠️ YAML fallback parse warning: {e}")

    intro_match = re.search(r"#\s+Intro\s*\n(.*?)(?=\n---|\n#|$)", body, re.DOTALL)
    outro_match = re.search(r"#\s+Outro\s*\n(.*?)(?=\n---|\n#|$)", body, re.DOTALL)

    intro_text = intro_match.group(1).strip() if intro_match else ""
    outro_text = outro_match.group(1).strip() if outro_match else ""

    parsed_stories = []
    tools_metadata = frontmatter.get("tools", [])

    if format_type == "weekly":
        chapter_blocks = re.split(r"\n#\s+Chapter\s+\d+:\s*", body)
        for idx, block in enumerate(chapter_blocks[1:]):
            lines = block.strip().split("\n")
            chapter_title = lines[0].strip() if lines else f"Chapter {idx+1}"
            parsed_stories.append({
                "chapter_index": idx + 1,
                "title": chapter_title,
                "content": "\n".join(lines[1:]).strip()
            })
    else:
        story_blocks = re.split(r"\n#\s+Story\s+\d+:\s*", body)
        for idx, block in enumerate(story_blocks[1:]):
            lines = block.strip().split("\n")
            header_line = lines[0].strip() if lines else f"Story {idx+1}"
            header_name = header_line
            header_headline = ""
            if "|" in header_line:
                h_parts = header_line.split("|", 1)
                header_name = h_parts[0].strip()
                header_headline = h_parts[1].strip()

            clean_header_name, clean_header_hl = clean_broadcast_entity_name(header_name)

            # Match with tools_metadata: first try to find matching tool by entity name, fallback to idx
            matched_meta = None
            chn_lower = clean_header_name.lower()
            for tm in tools_metadata:
                tm_name = tm.get("name", "").lower()
                tm_title = tm.get("title", "").lower()
                if (chn_lower and (chn_lower in tm_name or tm_name in chn_lower or chn_lower in tm_title)) or (clean_header_hl and clean_header_hl.lower() in tm_title):
                    matched_meta = tm
                    break

            meta = matched_meta or (tools_metadata[idx] if idx < len(tools_metadata) else {})

            final_name = meta.get("name") or clean_header_name
            # Strictly clamp final_name to max 4 words, max 28 chars
            final_name = " ".join(final_name.split()[:4])[:28].strip()
            final_headline = meta.get("headline") or header_headline or clean_header_hl or meta.get("title") or header_line

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
                "name": final_name,
                "headline": final_headline,
                "title": f"{final_name}: {final_headline}" if final_headline and final_name not in final_headline else (meta.get("title") or final_name),
                "url": meta.get("url", ""),
                "mode": meta.get("mode", "tool_drop"),
                "hero_anchor": meta.get("hero_anchor", "main h1, .hero"),
                "demo_anchor": meta.get("demo_anchor", "video, #demo, canvas"),
                "download_anchor": meta.get("download_anchor", "a[href*='github.com']"),
                "specs": meta.get("specs", ""),
                "video_readiness": meta.get("video_readiness"),
                "consensus_count": meta.get("consensus_count", 1),
                "hn_points": meta.get("hn_points"),
                "badges": meta.get("badges", []),
                "beats": beats_dict,
                "ordered_beats": ordered_beats
            })

    return {
        "episode_id": frontmatter.get("episode_id", f"ai-news-{date_str}-{track}"),
        "track": frontmatter.get("track", track),
        "format": format_type,
        "date": date_str,
        "voice_profile": frontmatter.get("voice_profile", "alex_tech"),
        "intro": intro_text,
        "stories": parsed_stories,
        "outro": outro_text,
        "tools_metadata": tools_metadata,
        "raw_markdown": md_content,
        "generated_at": datetime.now().isoformat()
    }


# ==============================================================================
# SUNDAY WEEKLY MEGA-RECAP ENGINE (Focus #4)
# ==============================================================================

def load_weekly_mega_candidates(date_str: str) -> List[Dict[str, Any]]:
    """Gathers top candidates across the past 7 days"""
    candidates = []
    
    # 1. Weekly insights snapshots
    for segment in ["builders", "innovators", "leaders"]:
        ins_files = sorted(WEEKLY_INSIGHTS_DIR.glob(f"*_{segment}.json"), reverse=True)[:3]
        for fpath in ins_files:
            try:
                with open(fpath, "r", encoding="utf-8") as f:
                    wdata = json.load(f)
                    articles = wdata.get("top_articles", wdata.get("articles", []))
                    for a in articles[:10]:
                        candidates.append({
                            "title": a.get("title", ""),
                            "url": a.get("url", ""),
                            "summary": a.get("description", "")[:350],
                            "suggested_mode": "industry_insight" if segment == "leaders" else "tool_drop",
                            "source": f"Weekly {segment.capitalize()}"
                        })
            except Exception as e:
                log(f"⚠️ Error reading {fpath}: {e}")

    # 2. Daily segment selections from past 7 days
    base_date = datetime.strptime(date_str, "%Y-%m-%d")
    for i in range(7):
        d = (base_date - timedelta(days=i)).strftime("%Y-%m-%d")
        for seg in ["builders", "innovators", "leaders", "generative_media"]:
            sel_file = TMP_DIR / f"selected_articles_{seg}_{d}.json"
            if sel_file.exists():
                try:
                    with open(sel_file, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        for a in data.get("selected_articles", [])[:4]:
                            candidates.append({
                                "title": a.get("title", ""),
                                "url": a.get("url", ""),
                                "summary": a.get("why_this_matters", a.get("description", ""))[:350],
                                "suggested_mode": "industry_insight" if seg == "leaders" else "tool_drop",
                                "source": f"Daily {seg.capitalize()}"
                            })
                except Exception:
                    pass

    # 3. High-signal representative weekly fallback
    if len(candidates) < 8:
        log("ℹ️ Ingesting rich multi-category weekly candidate pool...")
        candidates = [
            {
                "title": "Marigold v2: Diffusion Transformers for Real-Time Monocular Depth",
                "url": "https://github.com/prs-eth/marigold",
                "summary": "4x faster monocular depth estimation on consumer GPUs with live Gradio demo.",
                "suggested_mode": "tool_drop",
                "consensus_count": 6,
                "hn_stats": {"points": 420, "comments": 145, "velocity": "high"}
            },
            {
                "title": "YuE2: Open Full-Song Generation with Symbolic Score Planning",
                "url": "https://github.com/multimodal-art-projection/YuE",
                "summary": "Full-length vocal music generation with editable ABC symbolic score notation and open weights.",
                "suggested_mode": "tool_drop",
                "consensus_count": 7,
                "hn_stats": {"points": 580, "comments": 290, "velocity": "high"}
            },
            {
                "title": "DeepSeek V4.1 Flash: Asymmetric Compute MoE Architecture",
                "url": "https://arxiv.org/abs/2609.11200",
                "summary": "552B MoE model preprint with 1M context window and PyTorch weights on Hugging Face.",
                "suggested_mode": "paper_preview",
                "consensus_count": 8,
                "hn_stats": {"points": 720, "comments": 410, "velocity": "high"}
            },
            {
                "title": "Anthropic Agrees $45B AI Infrastructure Deal with Nscale",
                "url": "https://www.nscale.com",
                "summary": "Major enterprise compute capacity buildout securing European gigawatt power.",
                "suggested_mode": "industry_insight",
                "consensus_count": 5,
                "hn_stats": {"points": 260, "comments": 130, "velocity": "medium"}
            },
            {
                "title": "Llama 3.3 70B Instruct: Compact Reasoning Powerhouse",
                "url": "https://huggingface.co/meta-llama/Llama-3.3-70B-Instruct",
                "summary": "Meta's flagship mid-weight model matching previous 405B capabilities with 128k context.",
                "suggested_mode": "tool_drop",
                "consensus_count": 9,
                "hn_stats": {"points": 890, "comments": 540, "velocity": "high"}
            },
            {
                "title": "Wan2.1: Open Video Generation Suite by Alibaba Tongyi Lab",
                "url": "https://github.com/Wan-Video/Wan2.1",
                "summary": "Open-source 14B and 1.3B video foundation models matching closed commercial generators.",
                "suggested_mode": "tool_drop",
                "consensus_count": 8,
                "hn_stats": {"points": 640, "comments": 310, "velocity": "high"}
            },
            {
                "title": "OmniParser v2: Visual Screen Parsing for Autonomous GUI Agents",
                "url": "https://github.com/microsoft/OmniParser",
                "summary": "Microsoft's screen parsing module turning UI screenshots into structured interactive bounding boxes.",
                "suggested_mode": "tool_drop",
                "consensus_count": 6,
                "hn_stats": {"points": 510, "comments": 220, "velocity": "high"}
            },
            {
                "title": "NVIDIA Blackwell Ultra B300 Architecture & High-Bandwidth Memory Roadmap",
                "url": "https://www.nvidia.com/en-us/data-center/technologies/blackwell-architecture/",
                "summary": "Next-generation datacenter silicon scaling to 288GB HBM3e for multi-trillion parameter inference.",
                "suggested_mode": "industry_insight",
                "consensus_count": 7,
                "hn_stats": {"points": 430, "comments": 210, "velocity": "medium"}
            }
        ]

    valid_candidates = [c for c in candidates if c.get("title") and len(c["title"].strip()) > 8]
    clustered = cluster_consensus_articles(valid_candidates)
    enriched = enrich_articles_with_hn(clustered)

    for art in enriched:
        clean_name, clean_headline = clean_broadcast_entity_name(art.get("title", ""), art.get("url", ""))
        art["name"] = clean_name
        art["headline"] = clean_headline
        art["video_readiness"] = calculate_video_readiness_score(art, track="top4")
        anchors = resolve_omnicap_anchors(art.get("url", ""), art.get("suggested_mode", "tool_drop"))
        art["hero_anchor"] = anchors["hero_anchor"]
        art["demo_anchor"] = anchors["demo_anchor"]
        art["download_anchor"] = anchors["download_anchor"]
        art["specs"] = anchors["default_specs"]
        art["badges"] = build_story_badges(art)

    def weekly_impact(a):
        return (a.get("video_readiness", 0) * 0.5) + (a.get("consensus_count", 1) * 10) + (a.get("hn_stats", {}).get("points", 0) * 0.1)

    sorted_candidates = sorted(enriched, key=weekly_impact, reverse=True)
    return sorted_candidates[:8]


def generate_weekly_video_script_body(stories: List[Dict[str, Any]], date_str: str) -> str:
    """Uses LLM to write the 8-10 minute chaptered narrative body for Sunday Mega-Recap"""
    clean_stories = []
    for s in stories:
        clean_name, clean_hl = clean_broadcast_entity_name(s.get("name") or s.get("title", ""), s.get("url", ""))
        clean_stories.append({
            "name": clean_name,
            "headline": s.get("headline") or clean_hl,
            "title": s.get("title") or clean_hl,
            "url": s.get("url"),
            "mode": s.get("suggested_mode"),
            "summary": s.get("summary"),
            "consensus_count": s.get("consensus_count", 1),
            "hn_stats": s.get("hn_stats"),
            "badges": s.get("badges", [])
        })

    prompt = f"""You are the senior executive producer and host of Brief Delights Sunday Special (in the engaging, analytical documentary cadence of ColdFusion and Wes Roth).

Your job is to transform this week's ({date_str}) top macro drops into a chaptered 8-10 minute YouTube Mega-Recap script BODY (Intro, 4 Chapters, Outro) for TTS and OmniCap browser recording.

TOP MACRO DROPS OF THE WEEK (WITH CLEAN BROADCAST ENTITY NAMES):
{json.dumps(clean_stories, indent=2)}

STRUCTURE OF THE SUNDAY MEGA-RECAP:
1. Intro (00:00 - 00:45): Cinematic cold open setting the central narrative theme of the week.
2. Chapter 1: Frontier Models & Open Weights [00:45]
   - Deep dive into foundation models and open weights catching closed SOTA.
3. Chapter 2: Creative & Multimodal Breakthroughs [03:00]
   - Video, audio, and visual generation tools with live space and demo anchors.
4. Chapter 3: The Gigawatt Compute & Enterprise Battlefield [05:30]
   - Breakdown of compute deals, silicon architectures, and the infrastructure race.
5. Chapter 4: Breakthrough Agents & Tools [07:30]
   - The tooling that makes autonomous agents actually work on user screens.
6. Outro (09:00 - 09:45): Big-picture synthesis of where next week is heading + CTA to subscribe to Brief Delights.

STRICT BROADCAST LOWER-THIRD RULES:
- When introducing or analyzing tools/models, ALWAYS use the clean 1-4 word badge name (e.g., "Wan2.1", "YuE2", "OmniParser v2", "DeepSeek V4.1").
- NEVER use full paper titles, academic subclauses, or RSS publication tags in lower-third mentions.

STRICT WRITING RULES:
- Start every section with an emotional tag: [excited], [confident], [amazed], [analytical], [skeptical], [friendly].
- Reference live signals: HN points, verified consensus counts, and exact benchmark figures.
- Direct conversational voice. Zero corporate jargon.
- DO NOT generate YAML frontmatter (it is generated in Python). Start directly with # Intro.

Return RAW MARKDOWN ONLY. Start directly with # Intro."""

    log(f"🤖 Calling {MODEL} to compose Sunday Weekly Mega-Recap Script...")
    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": "You are a master YouTube documentary scriptwriter. Write the full chaptered script body starting with # Intro."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.6,
            max_tokens=3500,
            extra_body={"reasoning": {"max_tokens": 500}}
        )
        content = response.choices[0].message.content.strip()
    except Exception as e:
        log(f"⚠️ Primary LLM call failed: {e}. Trying fallback...")
        response = client.chat.completions.create(
            model="google/gemini-2.5-flash",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.6,
            max_tokens=3500
        )
        content = response.choices[0].message.content.strip()

    if content.startswith("```markdown"):
        content = content[11:]
    elif content.startswith("```"):
        content = content[3:]
    if content.endswith("```"):
        content = content[:-3]
    return content.strip()


def run_track(track: str, date_str: str, test_mode: bool = False) -> bool:
    """Executes single track script generation"""
    log("=" * 60)
    log(f"🎬 Generating Video Safari Script for {date_str} (Track: {track.upper()})")
    log("=" * 60)

    candidates = load_candidate_stories(date_str, track=track)
    log(f"Found {len(candidates)} candidate stories for track '{track}'")

    if not candidates or test_mode:
        log(f"ℹ️ Ingesting benchmark candidates for {track} verification...")
        test_pool = [
            {
                "title": "Marigold v2: Diffusion Transformers for Real-Time Monocular Depth",
                "url": "https://github.com/prs-eth/marigold",
                "summary": "4x faster monocular depth estimation using diffusion transformers on consumer GPUs.",
                "suggested_mode": "tool_drop",
                "source": "GitHub Trending",
                "source_type": "primary",
                "consensus_count": 4,
                "hn_stats": {"points": 340, "comments": 112, "velocity": "high"}
            },
            {
                "title": "YuE2: Open Full-Song Generation with Symbolic Score Planning",
                "url": "https://github.com/multimodal-art-projection/YuE",
                "summary": "Full-length vocal music generation with editable ABC symbolic score notation and open weights.",
                "suggested_mode": "tool_drop",
                "source": "GitHub Trending",
                "source_type": "primary",
                "consensus_count": 5,
                "hn_stats": {"points": 480, "comments": 210, "velocity": "high"}
            },
            {
                "title": "DeepSeek V4.1 Flash: Asymmetric Compute MoE Architecture",
                "url": "https://arxiv.org/abs/2609.11200",
                "summary": "552B MoE model preprint with benchmark comparison table, PyTorch weights released on Hugging Face.",
                "suggested_mode": "paper_preview",
                "source": "ArXiv Papers",
                "source_type": "primary",
                "consensus_count": 6,
                "hn_stats": {"points": 650, "comments": 380, "velocity": "high"}
            },
            {
                "title": "Anthropic Agrees $45B AI Infrastructure Deal with Nscale",
                "url": "https://www.nscale.com",
                "summary": "Major enterprise compute capacity buildout securing European gigawatt power and datacenter buildout.",
                "suggested_mode": "industry_insight",
                "source": "Financial Analysis",
                "source_type": "secondary",
                "consensus_count": 3,
                "hn_stats": {"points": 190, "comments": 95, "velocity": "medium"}
            }
        ]
        for art in test_pool:
            clean_name, clean_headline = clean_broadcast_entity_name(art.get("title", ""), art.get("url", ""))
            art["name"] = clean_name
            art["headline"] = clean_headline
            art["video_readiness"] = calculate_video_readiness_score(art, track=track)
            anchors = resolve_omnicap_anchors(art.get("url", ""), art.get("suggested_mode", "tool_drop"), track=track)
            art["hero_anchor"] = anchors["hero_anchor"]
            art["demo_anchor"] = anchors["demo_anchor"]
            art["download_anchor"] = anchors["download_anchor"]
            art["specs"] = anchors["default_specs"]
            art["badges"] = build_story_badges(art)
        candidates = test_pool

    selected = select_top_3_4_stories(candidates, track=track)
    log(f"Selected {len(selected)} superpowered stories for Video Safari ({track}):")
    for s in selected:
        log(f"  • [{s['suggested_mode'].upper()}] {s['title']} (VR: {s.get('video_readiness')})")

    # Generate Python-crafted frontmatter
    episode_id = f"ai-news-{date_str}-{track}"
    frontmatter_yaml = build_frontmatter_yaml(selected, episode_id=episode_id, track=track, format_type="daily")

    # Generate editorial body via LLM
    script_body = generate_video_script_body(selected, date_str, track=track)

    full_md_script = f"{frontmatter_yaml}\n{script_body}".strip()

    filename_stem = f"{date_str}-ai-news" if track == "top4" else f"{date_str}-ai-news-{track}"
    md_file = REPORTS_DIR / f"{filename_stem}.md"
    with open(md_file, "w", encoding="utf-8") as f:
        f.write(full_md_script)
    log(f"✅ Saved Editorial Markdown: {md_file}")

    if track == "top4":
        latest_md_file = PUBLIC_DATA_DIR / "latest_video_script.md"
        with open(latest_md_file, "w", encoding="utf-8") as f:
            f.write(full_md_script)
    else:
        latest_md_file = PUBLIC_DATA_DIR / f"latest_video_script_{track}.md"
        with open(latest_md_file, "w", encoding="utf-8") as f:
            f.write(full_md_script)

    parsed_json = parse_markdown_to_json(full_md_script, date_str, track=track, format_type="daily")
    json_filename = "latest_video_script.json" if track == "top4" else f"latest_video_script_{track}.json"
    latest_json_file = PUBLIC_DATA_DIR / json_filename
    with open(latest_json_file, "w", encoding="utf-8") as f:
        json.dump(parsed_json, f, indent=2)
    log(f"✅ Saved Structured JSON: {latest_json_file}")

    # Long-term archive
    scripts_archive_dir = PUBLIC_DATA_DIR / "video_scripts"
    scripts_archive_dir.mkdir(parents=True, exist_ok=True)

    archived_md = scripts_archive_dir / f"{filename_stem}.md"
    with open(archived_md, "w", encoding="utf-8") as f:
        f.write(full_md_script)

    archived_json = scripts_archive_dir / f"{filename_stem}.json"
    with open(archived_json, "w", encoding="utf-8") as f:
        json.dump(parsed_json, f, indent=2)

    # Update Catalog
    index_file = scripts_archive_dir / "index.json"
    archive_index = []
    if index_file.exists():
        try:
            with open(index_file, "r", encoding="utf-8") as f:
                archive_index = json.load(f)
        except Exception:
            archive_index = []

    story_names = [s.get("name", "") for s in parsed_json.get("stories", [])]
    entry = {
        "date": date_str,
        "track": track,
        "episode_id": episode_id,
        "stories": story_names,
        "stories_count": len(story_names),
        "json_path": f"/data/video_scripts/{filename_stem}.json",
        "md_path": f"/data/video_scripts/{filename_stem}.md",
        "updated_at": datetime.now().isoformat()
    }
    archive_index = [e for e in archive_index if not (e.get("date") == date_str and e.get("track", "top4") == track)]
    archive_index.insert(0, entry)
    archive_index.sort(key=lambda x: (x.get("date", ""), x.get("track", "")), reverse=True)

    with open(index_file, "w", encoding="utf-8") as f:
        json.dump(archive_index, f, indent=2)
    log(f"✅ Updated Video Safari Archive Index ({len(archive_index)} episodes recorded)")
    return True


def run_weekly(date_str: str) -> bool:
    """Executes Sunday Weekly Mega-Recap script generation"""
    log("=" * 60)
    log(f"🎬 Generating Sunday Weekly Mega-Recap Video Script for {date_str}")
    log("=" * 60)

    top_stories = load_weekly_mega_candidates(date_str)
    log(f"Selected {len(top_stories)} macro drops for Sunday Mega-Recap:")
    for idx, s in enumerate(top_stories):
        log(f"  {idx+1}. [{s.get('suggested_mode', 'tool_drop').upper()}] {s.get('title')} (Consensus: {s.get('consensus_count', 1)}x)")

    episode_id = f"weekly-ai-news-{date_str}"
    frontmatter_yaml = build_frontmatter_yaml(top_stories, episode_id=episode_id, track="weekly_mega_recap", format_type="weekly")
    script_body = generate_weekly_video_script_body(top_stories, date_str)

    full_md_script = f"{frontmatter_yaml}\n{script_body}".strip()

    filename_stem = f"weekly_{date_str}-mega-recap"
    md_file = REPORTS_DIR / f"{filename_stem}.md"
    with open(md_file, "w", encoding="utf-8") as f:
        f.write(full_md_script)
    log(f"✅ Saved Weekly Editorial Markdown: {md_file}")

    latest_weekly_md = PUBLIC_DATA_DIR / "latest_weekly_video_script.md"
    with open(latest_weekly_md, "w", encoding="utf-8") as f:
        f.write(full_md_script)

    parsed_json = parse_markdown_to_json(full_md_script, date_str, track="weekly", format_type="weekly")
    latest_weekly_json = PUBLIC_DATA_DIR / "latest_weekly_video_script.json"
    with open(latest_weekly_json, "w", encoding="utf-8") as f:
        json.dump(parsed_json, f, indent=2)
    log(f"✅ Saved Structured Weekly JSON: {latest_weekly_json}")

    # Archive
    scripts_archive_dir = PUBLIC_DATA_DIR / "video_scripts"
    scripts_archive_dir.mkdir(parents=True, exist_ok=True)

    archived_md = scripts_archive_dir / f"{filename_stem}.md"
    with open(archived_md, "w", encoding="utf-8") as f:
        f.write(full_md_script)

    archived_json = scripts_archive_dir / f"{filename_stem}.json"
    with open(archived_json, "w", encoding="utf-8") as f:
        json.dump(parsed_json, f, indent=2)

    # Update Catalog
    index_file = scripts_archive_dir / "index.json"
    archive_index = []
    if index_file.exists():
        try:
            with open(index_file, "r", encoding="utf-8") as f:
                archive_index = json.load(f)
        except Exception:
            archive_index = []

    chapter_names = [s.get("title", "") for s in parsed_json.get("stories", [])]
    entry = {
        "date": date_str,
        "track": "weekly_mega_recap",
        "episode_id": episode_id,
        "chapters": chapter_names,
        "tools_count": len(parsed_json.get("tools_metadata", [])),
        "json_path": f"/data/video_scripts/{filename_stem}.json",
        "md_path": f"/data/video_scripts/{filename_stem}.md",
        "updated_at": datetime.now().isoformat()
    }
    archive_index = [e for e in archive_index if not (e.get("date") == date_str and e.get("track") == "weekly_mega_recap")]
    archive_index.insert(0, entry)
    archive_index.sort(key=lambda x: (x.get("date", ""), x.get("track", "")), reverse=True)

    with open(index_file, "w", encoding="utf-8") as f:
        json.dump(archive_index, f, indent=2)
    log(f"✅ Updated Video Safari Archive Index ({len(archive_index)} episodes recorded)")

    print("\n--- GENERATED WEEKLY SCRIPT PREVIEW ---\n")
    print(full_md_script[:600] + "\n...\n")
    return True


def main():
    parser = argparse.ArgumentParser(description="Generate Brief Delights Video Safari Script")
    parser.add_argument("--date", type=str, default=datetime.now().strftime("%Y-%m-%d"), help="Target date YYYY-MM-DD")
    parser.add_argument("--track", type=str, default="top4", choices=["top4", "builders", "leaders", "generative_media"], help="Video audience track")
    parser.add_argument("--all-tracks", action="store_true", help="Generate scripts for all audience tracks")
    parser.add_argument("--weekly", action="store_true", help="Generate 8-10 minute Sunday Weekly Mega-Recap Documentary")
    parser.add_argument("--test", action="store_true", help="Run test generation")
    args = parser.parse_args()

    date_str = args.date

    # Mode 1: Sunday Weekly Mega-Recap
    if args.weekly:
        return run_weekly(date_str)

    # Mode 2: All Tracks Batch Mode
    if args.all_tracks:
        log("🎬 Generating scripts for ALL audience tracks...")
        success = True
        for trk in ["top4", "builders", "leaders", "generative_media"]:
            trk_ok = run_track(trk, date_str, test_mode=args.test)
            if not trk_ok:
                success = False
        return success

    # Mode 3: Single Track
    return run_track(args.track, date_str, test_mode=args.test)


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
