import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { query, email, token, search_attempt = 1 } = await request.json();

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Search query is required' },
        { status: 400 }
      );
    }

    const cleanQuery = query.trim().toLowerCase();
    const today = new Date().toISOString().split('T')[0];

    // GUEST GATING LOGIC:
    // Attempt 1: Allow 3 unlocked results + AI summary teaser
    // Attempt 2+: Require email
    const isGuest = !email && !token;

    if (isGuest && search_attempt >= 2) {
      return NextResponse.json({
        success: false,
        limit_reached: true,
        reason: 'email_required',
        message: 'Ask Brief Delights AI is reserved for subscribers. Enter your work email below to unlock 5 free monthly AI search credits.'
      });
    }

    // SUBSCRIBER CREDIT LOGIC:
    let creditsRemaining = 5;
    let isPro = false;

    if (!isGuest) {
      // Mock / database credit check (5 credits / month)
      // In production, synced with Supabase subscribers search_credits_used
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

    // LOAD LOCAL/STORED ARTICLES Across All 3 Segments
    const projectRoot = path.resolve(process.cwd(), '..');
    const tmpDir = path.join(projectRoot, '.tmp');
    const segments = ['leaders', 'builders', 'innovators'];
    const matchingArticles: any[] = [];

    for (const seg of segments) {
      try {
        const files = fs.readdirSync(tmpDir).filter(f => f.startsWith(`summaries_${seg}_`));
        if (files.length > 0) {
          files.sort().reverse();
          const latestFile = path.join(tmpDir, files[0]);
          const content = JSON.parse(fs.readFileSync(latestFile, 'utf8'));
          const articles = content.articles || [];

          for (const art of articles) {
            const title = art.title || '';
            const summary = art.summary || '';
            const keyTakeaway = art.key_takeaway || '';

            const fullText = `${title} ${summary} ${keyTakeaway}`.toLowerCase();
            const queryWords = cleanQuery.split(/\s+/).filter(w => w.length > 2);

            // Match score based on keyword overlap
            let score = 0;
            for (const word of queryWords) {
              if (fullText.includes(word)) score += 1;
            }

            if (score > 0 || matchingArticles.length < 5) {
              matchingArticles.push({
                ...art,
                segment: seg,
                score
              });
            }
          }
        }
      } catch (e) {
        console.error(`Error loading articles for ${seg}:`, e);
      }
    }

    // Sort by relevance score
    matchingArticles.sort((a, b) => b.score - a.score);
    const topArticles = matchingArticles.slice(0, 6);

    // CALL DEEPSEEK-V4-FLASH-0731 for Synthesis
    let aiSynthesis = '';
    const openrouterKey = process.env.OPENROUTER_API_KEY;

    if (openrouterKey && openrouterKey !== 'dummy_or_env_key') {
      try {
        const promptContext = topArticles.map((a, i) => `[${i + 1}] ${a.title}: ${a.summary}`).join('\n');
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
                content: 'You are Brief Delights AI, an executive intelligence synthesizer. Summarize the answer to the user query in 2 sharp paragraphs based on the provided articles. Use concise, high-signal language.'
              },
              {
                role: 'user',
                content: `Query: "${cleanQuery}"\n\nArticles:\n${promptContext}`
              }
            ],
            temperature: 0.3,
            max_tokens: 400
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

    // Fallback AI synthesis if API key is not configured locally
    if (!aiSynthesis) {
      aiSynthesis = `Based on recent Brief Delights dispatches regarding "${query}", key developments highlight emerging operational and architectural shifts across enterprise tech stack infrastructure and AI model benchmarks. Decision-makers are evaluating vendor reliance and latency trade-offs.`;
    }

    // Format final response payload
    return NextResponse.json({
      success: true,
      query: cleanQuery,
      ai_synthesis: aiSynthesis,
      total_matches: matchingArticles.length,
      unlocked_count: isGuest ? 3 : topArticles.length,
      is_teaser: isGuest,
      credits_remaining: isGuest ? 0 : creditsRemaining,
      is_pro: isPro,
      articles: topArticles.map((art, idx) => ({
        id: art.article_id || idx,
        title: art.title,
        summary: art.summary,
        key_takeaway: art.key_takeaway,
        why_it_matters: art.why_it_matters || art.why_this_matters,
        source: art.source || 'Brief Delights Intelligence',
        segment: art.segment,
        url: art.url || `https://brief.delights.pro/archive/${today}-${art.segment}`,
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
