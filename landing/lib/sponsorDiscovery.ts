/**
 * Sponsor Discovery Engine
 * TypeScript port of the Python monetization pipeline.
 * 
 * Flow: article_clicks → detect incumbents → find challengers → score → price → email draft → write to sponsor_leads
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Re-export for callers that need the type
export type { SupabaseClient } from '@supabase/supabase-js';

// Default browser client (used by admin page)
function getDefaultClient(): SupabaseClient {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    return createClient(url, key);
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DiscoveryResult {
    status: 'success' | 'error';
    articlesAnalyzed: number;
    incumbentsDetected: string[];
    challengersFound: number;
    leadsWritten: number;
    error?: string;
}

interface ArticleAggregate {
    article_url: string;
    article_title: string;
    source_domain: string;
    segment: string;
    total_clicks: number;
}

interface ChallengerCompany {
    name: string;
    domain: string;
    description: string;
    stage: string;
    age: number;
    team: number;
    raised_m: number;
}

interface SponsorLead {
    company_name: string;
    domain: string;
    industry: string;
    matched_topic: string;
    matched_segment: string;
    match_score: number;
    eagerness_score: number;
    match_reason: string;
    competitor_mentioned: string | null;
    discovery_method: string;
    competitive_context: Record<string, unknown> | null;
    related_article_title: string;
    related_article_url: string;
    article_clicks: number;
    dream_outcome: string;
    offer_price: number;
    suggested_price_cents: number;
    pricing_tier: string;
    guaranteed_clicks: number;
    offer_stack: string[];
    email_draft: EmailDraft | null;
    status: string;
}

export interface EmailDraft {
    subject_competitive: string;
    subject_data_driven: string;
    body: string;
    follow_up_1: string;
    follow_up_2: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** Incumbent → Challenger mapping */
const COMPETITIVE_MAP: Record<string, { name: string; challengers: ChallengerCompany[] }> = {
    'docker.com': {
        name: 'Docker',
        challengers: [
            { name: 'Railway', domain: 'railway.app', description: 'Infrastructure platform', stage: 'series_a', age: 3, team: 25, raised_m: 30 },
            { name: 'Render', domain: 'render.com', description: 'Cloud platform', stage: 'series_b', age: 5, team: 50, raised_m: 85 },
            { name: 'Fly.io', domain: 'fly.io', description: 'Edge compute', stage: 'series_a', age: 4, team: 30, raised_m: 70 },
        ],
    },
    'aws.amazon.com': {
        name: 'AWS',
        challengers: [
            { name: 'Vercel', domain: 'vercel.com', description: 'Frontend cloud', stage: 'series_b', age: 6, team: 100, raised_m: 150 },
            { name: 'Railway', domain: 'railway.app', description: 'Infrastructure platform', stage: 'series_a', age: 3, team: 25, raised_m: 30 },
            { name: 'Render', domain: 'render.com', description: 'Cloud platform', stage: 'series_b', age: 5, team: 50, raised_m: 85 },
            { name: 'Fly.io', domain: 'fly.io', description: 'Edge compute', stage: 'series_a', age: 4, team: 30, raised_m: 70 },
        ],
    },
    'openai.com': {
        name: 'OpenAI',
        challengers: [
            { name: 'Anthropic', domain: 'anthropic.com', description: 'AI safety research', stage: 'series_c', age: 3, team: 150, raised_m: 1500 },
            { name: 'Perplexity', domain: 'perplexity.ai', description: 'AI search', stage: 'series_b', age: 2, team: 20, raised_m: 73 },
            { name: 'Together AI', domain: 'together.ai', description: 'Open-source AI platform', stage: 'series_a', age: 2, team: 40, raised_m: 100 },
        ],
    },
    'kubernetes.io': {
        name: 'Kubernetes',
        challengers: [
            { name: 'Railway', domain: 'railway.app', description: 'Infrastructure platform', stage: 'series_a', age: 3, team: 25, raised_m: 30 },
            { name: 'Render', domain: 'render.com', description: 'Cloud platform', stage: 'series_b', age: 5, team: 50, raised_m: 85 },
        ],
    },
    'github.com': {
        name: 'GitHub',
        challengers: [
            { name: 'GitLab', domain: 'gitlab.com', description: 'DevSecOps platform', stage: 'public', age: 12, team: 2000, raised_m: 426 },
            { name: 'Gitpod', domain: 'gitpod.io', description: 'Cloud dev environments', stage: 'series_a', age: 4, team: 30, raised_m: 25 },
        ],
    },
    'microsoft.com': {
        name: 'Microsoft',
        challengers: [
            { name: 'Vercel', domain: 'vercel.com', description: 'Frontend cloud', stage: 'series_b', age: 6, team: 100, raised_m: 150 },
            { name: 'Supabase', domain: 'supabase.com', description: 'Open-source Firebase', stage: 'series_b', age: 4, team: 30, raised_m: 116 },
        ],
    },
};

/** Topic-based sponsor database for direct matches */
const TOPIC_SPONSORS: Record<string, ChallengerCompany[]> = {
    'DevOps': [
        { name: 'Vercel', domain: 'vercel.com', description: 'Frontend hosting', stage: 'series_b', age: 6, team: 100, raised_m: 150 },
        { name: 'Render', domain: 'render.com', description: 'Cloud platform', stage: 'series_b', age: 5, team: 50, raised_m: 85 },
        { name: 'Railway', domain: 'railway.app', description: 'Infrastructure', stage: 'series_a', age: 3, team: 25, raised_m: 30 },
        { name: 'Fly.io', domain: 'fly.io', description: 'Edge compute', stage: 'series_a', age: 4, team: 30, raised_m: 70 },
    ],
    'AI/ML': [
        { name: 'Anthropic', domain: 'anthropic.com', description: 'AI safety', stage: 'series_c', age: 3, team: 150, raised_m: 1500 },
        { name: 'Perplexity', domain: 'perplexity.ai', description: 'AI search', stage: 'series_b', age: 2, team: 20, raised_m: 73 },
        { name: 'Together AI', domain: 'together.ai', description: 'AI platform', stage: 'series_a', age: 2, team: 40, raised_m: 100 },
        { name: 'Modal', domain: 'modal.com', description: 'Serverless AI', stage: 'series_a', age: 3, team: 15, raised_m: 16 },
        { name: 'Replicate', domain: 'replicate.com', description: 'ML deployment', stage: 'series_b', age: 4, team: 25, raised_m: 60 },
    ],
    'Cloud': [
        { name: 'Supabase', domain: 'supabase.com', description: 'Database platform', stage: 'series_b', age: 4, team: 30, raised_m: 116 },
        { name: 'Neon', domain: 'neon.tech', description: 'Serverless Postgres', stage: 'series_b', age: 2, team: 35, raised_m: 104 },
        { name: 'PlanetScale', domain: 'planetscale.com', description: 'MySQL platform', stage: 'series_b', age: 4, team: 50, raised_m: 105 },
        { name: 'Turso', domain: 'turso.tech', description: 'Edge database', stage: 'series_a', age: 2, team: 8, raised_m: 10 },
    ],
    'Developer Tools': [
        { name: 'Clerk', domain: 'clerk.com', description: 'Auth for developers', stage: 'series_b', age: 3, team: 35, raised_m: 55 },
        { name: 'Resend', domain: 'resend.com', description: 'Email API', stage: 'series_a', age: 2, team: 12, raised_m: 3 },
        { name: 'Inngest', domain: 'inngest.com', description: 'Workflow engine', stage: 'series_a', age: 2, team: 15, raised_m: 6 },
    ],
    'Leadership': [
        { name: 'Pavilion', domain: 'joinpavilion.com', description: 'Executive network', stage: 'series_b', age: 3, team: 40, raised_m: 35 },
    ],
};

/** Topic keywords for article classification */
const TOPIC_KEYWORDS: Record<string, string[]> = {
    'DevOps': ['docker', 'kubernetes', 'k8s', 'devops', 'ci/cd', 'container', 'infrastructure', 'deploy'],
    'AI/ML': ['ai', 'ml', 'gpt', 'agent', 'machine learning', 'neural', 'llm', 'openai', 'anthropic'],
    'Cloud': ['cloud', 'aws', 'azure', 'vercel', 'netlify', 'hosting', 'database', 'serverless'],
    'Developer Tools': ['api', 'framework', 'library', 'sdk', 'tool', 'code', 'auth'],
    'Leadership': ['leadership', 'management', 'ceo', 'executive', 'team', 'hiring'],
};

// ─── Scoring Functions ───────────────────────────────────────────────────────

function calculateEagernessScore(company: ChallengerCompany): number {
    let score = 0;

    // Funding stage (0-40)
    const stageScores: Record<string, number> = {
        series_a: 40, series_b: 35, series_c: 30,
        seed: 20, series_d: 15, public: 5, acquired: 5, unknown: 25,
    };
    score += stageScores[company.stage] ?? 0;

    // Company age (0-25) — younger = hungrier
    if (company.age <= 2) score += 25;
    else if (company.age <= 5) score += 15;
    else if (company.age <= 10) score += 5;

    // Team size (0-20) — small teams move fast
    if (company.team >= 10 && company.team <= 50) score += 20;
    else if (company.team <= 200) score += 10;
    else if (company.team <= 500) score += 5;

    // Budget capacity (0-15)
    if (company.raised_m >= 50) score += 15;
    else if (company.raised_m >= 10) score += 10;
    else if (company.raised_m >= 3) score += 5;

    return Math.min(score, 100);
}

function calculateMatchScore(clicks: number, segment: string): number {
    let score = 70;
    if (clicks > 20) score += 20;
    else if (clicks > 15) score += 10;
    else if (clicks > 5) score += 5;
    if (segment === 'builders') score += 10;
    return Math.min(score, 100);
}

/**
 * Dynamic Pricing Engine
 * 
 * Formula: price = baseCPM × reachMultiplier × engagementMultiplier × proofMultiplier × recencyDecay
 * 
 * This replaces the old 3-tier static pricing with a continuous, data-driven model.
 * Mirrors the Python SmartPricingCalculator but adds recency decay.
 */

interface DynamicPricingInputs {
    clicks: number;           // Article clicks (proof)
    subscribers?: number;     // Segment subscriber count (reach)
    segmentClickRate?: number; // Average segment CTR % (engagement)
    daysSinceArticle?: number; // Recency of the trigger article
}

interface PricingOutput {
    priceCents: number;
    tier: string;
    guaranteedClicks: number;
    cpm: number;             // Effective CPM
    reachMultiplier: number;
    engagementMultiplier: number;
    proofMultiplier: number;
    recencyDecay: number;
    priceBreakdown: string;  // Human-readable reasoning
}

function calculatePricing(clicks: number, opts?: Partial<DynamicPricingInputs>): PricingOutput {
    const subscribers = opts?.subscribers ?? 50;   // Default 50 if unknown
    const segmentCTR = opts?.segmentClickRate ?? 5; // Default 5% CTR
    const daysSince = opts?.daysSinceArticle ?? 3;  // Default 3 days

    // ── Base CPM: $40 per 1,000 impressions (premium dev audience) ──
    const baseCPM = 4000; // in cents

    // ── Reach multiplier (0.5x – 3x) based on subscriber count ──
    let reachMultiplier: number;
    if (subscribers <= 25) reachMultiplier = 0.5;
    else if (subscribers <= 50) reachMultiplier = 1.0;
    else if (subscribers <= 100) reachMultiplier = 1.5;
    else if (subscribers <= 200) reachMultiplier = 2.0;
    else reachMultiplier = Math.min(3.0, 2.0 + (subscribers - 200) / 200);

    // ── Engagement multiplier (0.7x – 2x) based on segment CTR ──
    let engagementMultiplier: number;
    if (segmentCTR < 3) engagementMultiplier = 0.7;
    else if (segmentCTR < 5) engagementMultiplier = 0.9;
    else if (segmentCTR < 7) engagementMultiplier = 1.1;
    else if (segmentCTR < 10) engagementMultiplier = 1.5;
    else engagementMultiplier = Math.min(2.0, 1.5 + (segmentCTR - 10) / 10);

    // ── Proof multiplier (0.8x – 2x) based on actual article clicks ──
    let proofMultiplier: number;
    if (clicks < 5) proofMultiplier = 0.8;
    else if (clicks < 10) proofMultiplier = 0.9;
    else if (clicks < 15) proofMultiplier = 1.1;
    else if (clicks < 20) proofMultiplier = 1.5;
    else proofMultiplier = Math.min(2.0, 1.5 + (clicks - 20) / 20);

    // ── Recency decay (1.0 for fresh, decays to 0.6 over 14 days) ──
    const recencyDecay = Math.max(0.6, 1.0 - (daysSince / 35));

    // ── Final price calculation ──
    const rawPrice = (baseCPM / 100) * reachMultiplier * engagementMultiplier * proofMultiplier * recencyDecay;

    // Round to nearest $5
    const roundedPrice = Math.round(rawPrice / 5) * 5;
    const priceCents = Math.max(5000, roundedPrice * 100); // Floor: $50

    // Effective CPM
    const cpm = subscribers > 0 ? Math.round((priceCents / subscribers) * 1000) : 0;

    // ── Tier assignment ──
    let tier: string;
    if (priceCents >= 200000) tier = 'enterprise';
    else if (priceCents >= 100000) tier = 'premium';
    else if (priceCents >= 60000) tier = 'standard';
    else tier = 'starter';

    // ── Guaranteed clicks = 70% of expected clicks ──
    const expectedClicks = Math.max(5, Math.round(subscribers * segmentCTR / 100));
    const guaranteedClicks = Math.max(5, Math.round(expectedClicks * 0.7));

    // ── Price breakdown for transparency ──
    const priceBreakdown = [
        `$${(priceCents / 100).toFixed(0)} ${tier}`,
        `${subscribers} subs × ${segmentCTR}% CTR`,
        `${clicks} proof clicks`,
        `${guaranteedClicks}+ guaranteed`,
    ].join(' · ');

    return {
        priceCents,
        tier,
        guaranteedClicks,
        cpm,
        reachMultiplier,
        engagementMultiplier,
        proofMultiplier,
        recencyDecay,
        priceBreakdown,
    };
}

/**
 * Fetch real-time pricing inputs from Supabase.
 * Call this before calculatePricing for live data.
 */
export async function fetchPricingInputs(segment: string, supabaseClient?: SupabaseClient): Promise<DynamicPricingInputs> {
    const supabase = supabaseClient ?? getDefaultClient();

    // Get subscriber count for this segment
    const { count: subscribers } = await supabase
        .from('subscribers')
        .select('*', { count: 'exact', head: true })
        .eq('segments', segment)
        .eq('status', 'verified');

    // Get average click rate for this segment (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0];

    const { data: recentClicks } = await supabase
        .from('article_clicks')
        .select('newsletter_date')
        .eq('segment', segment)
        .gte('newsletter_date', thirtyDaysAgo);

    // Calculate approximate CTR
    const totalClicks = recentClicks?.length ?? 0;
    const uniqueDates = new Set(recentClicks?.map(c => c.newsletter_date) ?? []);
    const sendCount = uniqueDates.size * (subscribers ?? 50);
    const segmentClickRate = sendCount > 0 ? (totalClicks / sendCount) * 100 : 5;

    return {
        clicks: 0, // Set per-article
        subscribers: subscribers ?? 50,
        segmentClickRate: Math.round(segmentClickRate * 10) / 10,
        daysSinceArticle: 3,
    };
}

function detectTopic(title: string, domain: string): string {
    const text = `${title} ${domain}`.toLowerCase();
    for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
        if (keywords.some(kw => text.includes(kw))) return topic;
    }
    return 'General';
}

function buildDreamOutcome(companyName: string, clicks: number, segment: string, articleTitle: string): string {
    return `Get ${companyName} in front of ${clicks}+ ${segment} who clicked "${articleTitle}" this week`;
}

function buildValueStack(companyName: string, segment: string): string[] {
    return [
        `Featured article about ${companyName} written by our team`,
        `Sent ONLY to ${segment} segment (decision-makers in your space)`,
        'Social amplification (Twitter + LinkedIn post)',
        '24-hour performance report with clicks and engagement',
        'Content rights — repurpose our article anywhere',
        'Click guarantee — if <10 clicks, we rerun for free',
    ];
}

// ─── Email Generation ────────────────────────────────────────────────────────

export function generateEmailDraft(
    companyName: string,
    competitor: string | null,
    clicks: number,
    segment: string,
    articleTitle: string,
    pricing: { priceCents: number; tier: string; guaranteedClicks: number },
): EmailDraft {
    const price = `$${(pricing.priceCents / 100).toFixed(0)}`;

    const subjectCompetitive = competitor
        ? `${competitor} was in our newsletter. Show readers why ${companyName} is better?`
        : `Your competitors are getting attention from ${segment}. Want in?`;

    const subjectDataDriven = `${clicks} ${segment} clicked ${competitor ?? 'content in your space'}. Want to reach them?`;

    const introLine = competitor
        ? `Last week, we featured an article about ${competitor} in our newsletter. ${clicks} ${segment} clicked on it — proof that this audience cares deeply about your space.`
        : `This week, ${clicks} ${segment} in our audience engaged with content in your space.`;

    const body = `Hi there,

${introLine}

${companyName} is the natural next article to show these readers.

Here's what we'd offer:
- Featured article about ${companyName}, written by our team
- Sent to our ${segment} segment (${clicks}+ engaged readers)
- Social amplification across Twitter & LinkedIn
- 24-hour performance report with full click data
- Click guarantee: ${pricing.guaranteedClicks}+ clicks or we rerun for free

Investment: ${price} (${pricing.tier} tier)

Interested? Reply and I'll reserve your slot for next week.

Best,
Brief Delights Team`;

    const followUp1 = `Hi — just following up on my note about reaching ${clicks}+ ${segment} who engage with ${competitor ?? 'content in your space'}. 

Happy to share sample performance data if helpful. We have a slot open next week.`;

    const followUp2 = `Last note on this — we're filling next week's ${segment} segment. 

If ${companyName} wants the spot, just reply "yes" and I'll lock it in. Otherwise I'll offer it to another company in your space.`;

    return {
        subject_competitive: subjectCompetitive,
        subject_data_driven: subjectDataDriven,
        body,
        follow_up_1: followUp1,
        follow_up_2: followUp2,
    };
}

// ─── Main Discovery Engine ──────────────────────────────────────────────────

async function fetchChallengersFromLLM(domain: string, title: string, segment: string): Promise<ChallengerCompany[]> {
    const apiKey = process.env.OPENROUTER_API_KEY || process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
    if (!apiKey) return [];
    
    // Quick heuristic: ignore major news sites to save tokens
    const IGNORED = ['techcrunch.com', 'bloomberg.com', 'wsj.com', 'nytimes.com', 'wired.com', 'theverge.com', 'cnbc.com', 'forbes.com', 'reuters.com'];
    if (IGNORED.some(ig => domain.includes(ig))) return [];

    const prompt = `You are a B2B SaaS startup researcher. A tech newsletter just drove significant engagement from the "${segment}" audience to an article titled: "${title}" published on/about ${domain}.

We need to find sponsors who want to steal attention from this incumbent.
Identify 2-3 aggressive, hungry Series A or Series B startups that directly compete with ${domain} or provide a modern alternative to their core offering.
Do NOT suggest massive public companies (like Microsoft, Google, AWS) as challengers. We want hungry startups.

Return ONLY a valid JSON object with a "challengers" array containing objects with this exact structure:
{
  "challengers": [
    {
      "name": "StartupName",
      "domain": "startupdomain.com",
      "description": "Short 3-4 word description",
      "stage": "series_a", // enum: seed, series_a, series_b, series_c
      "age": 3,
      "team": 25,
      "raised_m": 15
    }
  ]
}`;

    try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://brief.delights.pro',
                'X-Title': 'Sponsor Discovery Engine'
            },
            body: JSON.stringify({
                model: 'anthropic/claude-3-haiku',
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: "json_object" }
            })
        });
        const data = await res.json();
        if (!data.choices || !data.choices[0]) return [];
        const content = data.choices[0].message.content;
        const parsed = JSON.parse(content);
        return Array.isArray(parsed.challengers) ? parsed.challengers : [];
    } catch (e) {
        console.error('LLM fetch failed:', e);
        return [];
    }
}

export async function discoverSponsors(supabaseClient?: SupabaseClient): Promise<DiscoveryResult> {
    try {
        const supabase = supabaseClient ?? getDefaultClient();

        // 1. Get article clicks from last 7 days
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            .toISOString().split('T')[0];

        const { data: clicks, error: clicksError } = await supabase
            .from('article_clicks')
            .select('article_url, article_title, source_domain, segment')
            .gte('newsletter_date', sevenDaysAgo);

        if (clicksError) throw clicksError;
        if (!clicks || clicks.length === 0) {
            return { status: 'success', articlesAnalyzed: 0, incumbentsDetected: [], challengersFound: 0, leadsWritten: 0 };
        }

        // 2. Aggregate clicks by article
        const articleMap = new Map<string, ArticleAggregate>();
        for (const click of clicks) {
            const key = click.article_url;
            if (!articleMap.has(key)) {
                articleMap.set(key, {
                    article_url: click.article_url,
                    article_title: click.article_title,
                    source_domain: click.source_domain,
                    segment: click.segment,
                    total_clicks: 0,
                });
            }
            articleMap.get(key)!.total_clicks += 1;
        }

        const articles = Array.from(articleMap.values())
            .sort((a, b) => b.total_clicks - a.total_clicks);

        // 3. Detect incumbents and find competitive challengers
        const incumbentsDetected: string[] = [];
        const allLeads: SponsorLead[] = [];
        const seenDomains = new Set<string>();

        // Get existing leads to avoid duplicates
        const { data: existingLeads } = await supabase
            .from('sponsor_leads')
            .select('domain');
        const existingDomains = new Set((existingLeads ?? []).map((l: { domain: string }) => l.domain));

        for (const article of articles) {
            const domain = article.source_domain;
            const topic = detectTopic(article.article_title, article.source_domain);

            let incumbentName = domain;
            let challengers: ChallengerCompany[] = [];

            // 1. Check static map
            if (COMPETITIVE_MAP[domain]) {
                const incumbent = COMPETITIVE_MAP[domain];
                incumbentName = incumbent.name;
                challengers = incumbent.challengers;
                incumbentsDetected.push(incumbent.name);
            } 
            // 2. Dynamic LLM discovery (if strong signal and not in static map)
            else if (article.total_clicks >= 5 && topic !== 'General' && domain.includes('.')) {
                // Fast domain formatting
                incumbentName = domain.replace('www.', '').split('.')[0];
                incumbentName = incumbentName.charAt(0).toUpperCase() + incumbentName.slice(1);
                
                // Fetch from LLM
                try {
                    const llmChallengers = await fetchChallengersFromLLM(domain, article.article_title, article.segment);
                    if (llmChallengers.length > 0) {
                        challengers = llmChallengers;
                        incumbentsDetected.push(`${incumbentName} (Auto-Discovered)`);
                    }
                } catch (e) {
                    console.error('LLM discovery failed:', e);
                }
            }

            // 3. Process challengers if any
            if (challengers.length > 0) {
                for (const challenger of challengers) {
                    if (seenDomains.has(challenger.domain) || existingDomains.has(challenger.domain)) continue;
                    seenDomains.add(challenger.domain);

                    const eagerness = calculateEagernessScore(challenger);
                    const matchScore = calculateMatchScore(article.total_clicks, article.segment);
                    const finalScore = Math.round(eagerness * 0.5 + matchScore * 0.3 + (challenger.raised_m >= 50 ? 100 : challenger.raised_m >= 10 ? 80 : 60) * 0.2);
                    const pricing = calculatePricing(article.total_clicks);

                    const emailDraft = generateEmailDraft(
                        challenger.name, incumbentName, article.total_clicks,
                        article.segment, article.article_title, pricing,
                    );

                    allLeads.push({
                        company_name: challenger.name,
                        domain: challenger.domain,
                        industry: challenger.description,
                        matched_topic: topic,
                        matched_segment: article.segment,
                        match_score: finalScore,
                        eagerness_score: eagerness,
                        match_reason: `${incumbentName} article got ${article.total_clicks} clicks from ${article.segment}. ${challenger.name} is a hungry ${challenger.stage.replace('_', ' ')} challenger.`,
                        competitor_mentioned: incumbentName,
                        discovery_method: 'competitive_challenger',
                        competitive_context: {
                            incumbent_name: incumbentName,
                            incumbent_domain: domain,
                            pitch_angle: 'beat_the_incumbent',
                            trigger_article: article.article_title,
                            trigger_clicks: article.total_clicks,
                        },
                        related_article_title: article.article_title,
                        related_article_url: article.article_url,
                        article_clicks: article.total_clicks,
                        dream_outcome: buildDreamOutcome(challenger.name, article.total_clicks, article.segment, article.article_title),
                        offer_price: pricing.priceCents,
                        suggested_price_cents: pricing.priceCents,
                        pricing_tier: pricing.tier,
                        guaranteed_clicks: pricing.guaranteedClicks,
                        offer_stack: buildValueStack(challenger.name, article.segment),
                        email_draft: emailDraft,
                        status: 'matched',
                    });
                }
            }

            // Also do topic-based matching for non-incumbent articles
            if (topic !== 'General' && TOPIC_SPONSORS[topic]) {
                for (const sponsor of TOPIC_SPONSORS[topic]) {
                    if (seenDomains.has(sponsor.domain) || existingDomains.has(sponsor.domain)) continue;
                    // Don't add topic matches for companies already found as challengers
                    seenDomains.add(sponsor.domain);

                    const eagerness = calculateEagernessScore(sponsor);
                    const matchScore = calculateMatchScore(article.total_clicks, article.segment);
                    const finalScore = Math.round(eagerness * 0.5 + matchScore * 0.3 + (sponsor.raised_m >= 50 ? 100 : sponsor.raised_m >= 10 ? 80 : 60) * 0.2);
                    const pricing = calculatePricing(article.total_clicks);

                    const emailDraft = generateEmailDraft(
                        sponsor.name, null, article.total_clicks,
                        article.segment, article.article_title, pricing,
                    );

                    allLeads.push({
                        company_name: sponsor.name,
                        domain: sponsor.domain,
                        industry: sponsor.description,
                        matched_topic: topic,
                        matched_segment: article.segment,
                        match_score: finalScore,
                        eagerness_score: eagerness,
                        match_reason: `${article.total_clicks} ${article.segment} clicked "${article.article_title}". ${sponsor.name} is a strong fit for ${topic} audience.`,
                        competitor_mentioned: null,
                        discovery_method: 'content_analysis',
                        competitive_context: null,
                        related_article_title: article.article_title,
                        related_article_url: article.article_url,
                        article_clicks: article.total_clicks,
                        dream_outcome: buildDreamOutcome(sponsor.name, article.total_clicks, article.segment, article.article_title),
                        offer_price: pricing.priceCents,
                        suggested_price_cents: pricing.priceCents,
                        pricing_tier: pricing.tier,
                        guaranteed_clicks: pricing.guaranteedClicks,
                        offer_stack: buildValueStack(sponsor.name, article.segment),
                        email_draft: emailDraft,
                        status: 'matched',
                    });
                }
            }
        }

        // Sort by match score desc
        allLeads.sort((a, b) => b.match_score - a.match_score);

        // 4. Write to Supabase
        if (allLeads.length > 0) {
            const { error: insertError } = await supabase
                .from('sponsor_leads')
                .upsert(allLeads, { onConflict: 'domain', ignoreDuplicates: true });

            if (insertError) throw insertError;
        }

        return {
            status: 'success',
            articlesAnalyzed: articles.length,
            incumbentsDetected: [...new Set(incumbentsDetected)],
            challengersFound: allLeads.filter(l => l.discovery_method === 'competitive_challenger').length,
            leadsWritten: allLeads.length,
        };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('Discovery error:', message);
        return { status: 'error', articlesAnalyzed: 0, incumbentsDetected: [], challengersFound: 0, leadsWritten: 0, error: message };
    }
}

/**
 * Generate/regenerate an email draft for a specific lead and save it to Supabase
 */
export async function generateAndSaveEmailDraft(leadId: string, supabaseClient?: SupabaseClient): Promise<EmailDraft | null> {
    try {
        const supabase = supabaseClient ?? getDefaultClient();
        const { data: lead, error } = await supabase
            .from('sponsor_leads')
            .select('*')
            .eq('id', leadId)
            .single();

        if (error || !lead) return null;

        const pricing = calculatePricing(lead.article_clicks ?? 0);
        const draft = generateEmailDraft(
            lead.company_name,
            lead.competitor_mentioned,
            lead.article_clicks ?? 0,
            lead.matched_segment,
            lead.related_article_title ?? '',
            pricing,
        );

        await supabase
            .from('sponsor_leads')
            .update({ email_draft: draft })
            .eq('id', leadId);

        return draft;
    } catch {
        return null;
    }
}
