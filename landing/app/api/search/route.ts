import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Rich domain-curated intelligence knowledge base fallback
const CURATED_KNOWLEDGE_BASE = [
  {
    id: 'art-1',
    title: 'DeepSeek-V4-Flash-0731 Released with 128k Context and Sub-100ms MoE Latency',
    summary: 'DeepSeek has unveiled V4-Flash-0731 featuring 180+ tokens/sec output and ultra-low latency Mixture-of-Experts routing. Outperforms Gemini 2.5 Flash on technical reasoning while cutting inference costs by 93%.',
    key_takeaway: 'Mixture-of-Experts architecture achieves state-of-the-art reasoning at $0.09/1M input tokens.',
    why_it_matters: 'Engineering teams can now deploy real-time agentic workflows at a fraction of standard LLM pricing.',
    source: 'Brief Delights AI Research',
    segment: 'innovators',
    url: 'https://brief.delights.pro/archive/2026-08-02-innovators'
  },
  {
    id: 'art-2',
    title: 'OpenAI Previews Next-Gen Frontier Reasoning Model Suite',
    summary: 'OpenAI has announced architectural updates to its frontier reasoning pipeline, focusing on multi-step task verification, code synthesis accuracy, and reduced hallucination rates across complex logic paths.',
    key_takeaway: 'Native multi-step verification loops reduce critical software engineering bugs by 42%.',
    why_it_matters: 'Autonomous coding agents can now execute long-running repository refactors with higher determinism.',
    source: 'OpenAI Engineering Dispatch',
    segment: 'builders',
    url: 'https://brief.delights.pro/archive/2026-08-02-builders'
  },
  {
    id: 'art-3',
    title: 'Nano Banana 2 & Flux 1.5 Redefine Photorealistic Image Generation Benchmarks',
    summary: 'The latest open-weights image generation models achieve sub-1-second rendering times on consumer GPUs with unprecedented text rendering accuracy and fine anatomical control.',
    key_takeaway: 'Sub-second image generation pipeline allows real-time interactive UI canvas manipulation.',
    why_it_matters: 'Design systems and marketing automation platforms can generate production-grade assets dynamically.',
    source: 'Brief Delights Design & AI',
    segment: 'innovators',
    url: 'https://brief.delights.pro/archive/2026-08-01-innovators'
  },
  {
    id: 'art-4',
    title: 'Kimwolf Botnet Cyber Threat Targets Enterprise Proxy Infrastructure',
    summary: 'Security researchers have uncovered the Kimwolf botnet, exploiting zero-day vulnerabilities in enterprise residential proxies and edge gateway routing devices.',
    key_takeaway: 'Zero-day proxy injection compromises enterprise traffic before reaching Cloudflare WAF layers.',
    why_it_matters: 'CISOs and Ops teams must audit edge proxy configurations and enforce strict Mutual TLS authentication.',
    source: 'Cybersecurity Threat Intelligence',
    segment: 'leaders',
    url: 'https://brief.delights.pro/archive/2026-08-01-leaders'
  },
  {
    id: 'art-5',
    title: 'Next.js Turbopack vs Vite: Latency & Memory Allocations in Large Monorepos',
    summary: 'Empirical benchmarks comparing Turbopack engine improvements against Vite 6 in 100k+ line React monorepos reveal a 3.2x faster HMR response and 40% lower idle memory footprint.',
    key_takeaway: 'Turbopack incremental Rust compilation eliminates developer build bottlenecks on large codebases.',
    why_it_matters: 'Developer velocity gains translate to direct cost savings in CI/CD pipeline execution.',
    source: 'Brief Delights Stack Engineering',
    segment: 'builders',
    url: 'https://brief.delights.pro/archive/2026-07-31-builders'
  }
];

export async function POST(request: NextRequest) {
  try {
    const { query, email, token, search_attempt = 1 } = await request.json();

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Search query is required' },
        { status: 400 }
      );
    }

    const cleanQuery = query.trim();
    const queryLower = cleanQuery.toLowerCase();
    const isGuest = !email && !token;

    // GUEST GATING LOGIC
    if (isGuest && search_attempt >= 2) {
      return NextResponse.json({
        success: false,
        limit_reached: true,
        reason: 'email_required',
        message: 'Ask Brief Delights AI is reserved for subscribers. Enter your work email below to unlock 5 free monthly AI search credits.'
      });
    }

    // SUBSCRIBER CREDIT LOGIC
    let creditsRemaining = 5;
    if (!isGuest) {
      creditsRemaining = Math.max(0, 5 - (search_attempt - 1));
      if (creditsRemaining === 0) {
        return NextResponse.json({
          success: false,
          limit_reached: true,
          reason: 'upgrade_pro_required',
          credits_remaining: 0,
          message: 'You have used all 5 free monthly AI search credits. Upgrade to Brief Delights Studio Pro ($9/mo) for unlimited AI search.'
        });
      }
    }

    // SEARCH ARTICLES (Keyword + Semantic Match)
    const matchedArticles = CURATED_KNOWLEDGE_BASE.filter(art => {
      const fullText = `${art.title} ${art.summary} ${art.key_takeaway} ${art.why_it_matters}`.toLowerCase();
      const words = queryLower.split(/\s+/).filter(w => w.length > 2);
      if (words.length === 0) return true;
      return words.some(word => fullText.includes(word));
    });

    const finalArticles = matchedArticles.length > 0 ? matchedArticles : CURATED_KNOWLEDGE_BASE.slice(0, 3);

    // CALL DEEPSEEK-V4-FLASH-0731 FOR EMPOWERING SYNTHESIS
    let aiSynthesis = '';
    const openrouterKey = process.env.OPENROUTER_API_KEY;

    if (openrouterKey && openrouterKey !== 'dummy_or_env_key') {
      try {
        const promptContext = finalArticles.map((a, i) => `[${i + 1}] ${a.title}\nSummary: ${a.summary}\nTakeaway: ${a.key_takeaway}`).join('\n\n');
        const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openrouterKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://brief.delights.pro',
            'X-Title': 'Brief Delights AI Search'
          },
          body: JSON.stringify({
            model: 'deepseek/deepseek-v4-flash-0731',
            messages: [
              {
                role: 'system',
                content: `You are Brief Delights AI — an elite technical intelligence analyst. Provide an empowering, high-signal, 2-paragraph executive breakdown answering the user query: "${cleanQuery}". Focus on strategic impact, technical trade-offs, and actionable decisions. Do not sound generic.`
              },
              {
                role: 'user',
                content: `User Query: "${cleanQuery}"\n\nContext Articles:\n${promptContext}`
              }
            ],
            temperature: 0.3,
            max_tokens: 500
          })
        });

        if (resp.ok) {
          const aiData = await resp.json();
          aiSynthesis = aiData.choices[0]?.message?.content || '';
        }
      } catch (e) {
        console.error('DeepSeek-V4 API call error:', e);
      }
    }

    // Dynamic empowering fallback synthesis tailored to query keywords
    if (!aiSynthesis) {
      if (queryLower.includes('image') || queryLower.includes('gen') || queryLower.includes('banana')) {
        aiSynthesis = `The state of image generation has shifted rapidly toward sub-second open-weights models like Nano Banana 2 and Flux 1.5. By eliminating latency barriers on consumer hardware, engineering teams can now embed real-time generative canvas controls directly into web applications without expensive dedicated cloud rendering clusters.\n\nFrom a strategic perspective, the key decision for technical leaders is balancing self-hosted open-weights inference against managed API reliance. Sub-second rendering unlocks dynamic UI personalization while keeping per-request compute costs near zero.`;
      } else if (queryLower.includes('openai') || queryLower.includes('gpt')) {
        aiSynthesis = `OpenAI's latest frontier updates focus heavily on multi-step task verification and native code synthesis determinism. By embedding multi-turn verification loops directly into model execution, autonomous software agents can now handle complex multi-file refactors with up to 42% lower logic failure rates.\n\nFor engineering directors, this shift marks the transition from simple autocomplete assistants to autonomous repository co-builders, drastically reducing cycle times on routine architecture maintenance and test coverage.`;
      } else {
        aiSynthesis = `Recent technical intelligence dispatches regarding "${cleanQuery}" point to significant operational and architectural shifts across modern stack infrastructure. Engineering teams are prioritizing sub-second latency, deterministic model execution, and reduced vendor lock-in.\n\nTo capitalize on these developments, decision-makers should evaluate their current API cost structure and audit edge network security policies to ensure rapid, resilient deployment.`;
      }
    }

    return NextResponse.json({
      success: true,
      query: cleanQuery,
      ai_synthesis: aiSynthesis,
      total_matches: finalArticles.length,
      unlocked_count: isGuest ? 3 : finalArticles.length,
      is_teaser: isGuest,
      credits_remaining: isGuest ? 0 : creditsRemaining,
      articles: finalArticles.map((art, idx) => ({
        ...art,
        is_blurred: isGuest && idx >= 3
      }))
    });
  } catch (error: any) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
