import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import fs from 'fs';
import path from 'path';

// ============================================================
// AUTONOMOUS A/B ENGINE
// Runs nightly: Analyze → Promote → Kill → Generate → Notify
// ============================================================

const CONFIDENCE_THRESHOLD = 0.95;  // 95% probability of being better
const MIN_IMPRESSIONS_KILL = 50;    // Minimum impressions before killing
const MIN_IMPRESSIONS_PROMOTE = 100; // Minimum impressions before promoting

interface Variant {
    id: string;
    experiment_id: string;
    slot: string;
    weight: number;
    content: Record<string, string>;
    impressions: number;
    conversions: number;
    conversion_rate: number;
    confidence: number;
}

// ============================================================
// BAYESIAN A/B TESTING (Beta-Binomial Model)
// ============================================================

/**
 * Calculate probability that variant B is better than variant A
 * using Monte Carlo simulation of Beta distributions.
 * 
 * Prior: Beta(1, 1) = uniform (non-informative)
 */
function bayesianProbabilityBbetterA(
    conversionsA: number, impressionsA: number,
    conversionsB: number, impressionsB: number,
    samples: number = 10000
): number {
    let bWins = 0;

    for (let i = 0; i < samples; i++) {
        // Sample from Beta(alpha, beta) using the inverse CDF method
        const sampleA = betaSample(conversionsA + 1, impressionsA - conversionsA + 1);
        const sampleB = betaSample(conversionsB + 1, impressionsB - conversionsB + 1);

        if (sampleB > sampleA) bWins++;
    }

    return bWins / samples;
}

/**
 * Sample from Beta distribution using Jöhnk's algorithm
 * (simple, works well for small alpha/beta)
 */
function betaSample(alpha: number, beta: number): number {
    // Use gamma distribution sampling for Beta
    const x = gammaSample(alpha, 1);
    const y = gammaSample(beta, 1);
    return x / (x + y);
}

function gammaSample(shape: number, scale: number): number {
    // Marsaglia and Tsang's method for shape >= 1
    if (shape < 1) {
        const u = Math.random();
        return gammaSample(shape + 1, scale) * Math.pow(u, 1 / shape);
    }

    const d = shape - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);

    while (true) {
        let x: number, v: number;
        do {
            x = normalSample();
            v = 1 + c * x;
        } while (v <= 0);

        v = v * v * v;
        const u = Math.random();

        if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v * scale;
        if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v * scale;
    }
}

function normalSample(): number {
    // Box-Muller transform
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// ============================================================
// ENGINE STEPS
// ============================================================

async function analyzeVariants(): Promise<{
    champion: Variant | null;
    challengers: Variant[];
    explorers: Variant[];
}> {
    // Get all variants from the running experiment
    const { data: experiments } = await supabase
        .from('ab_experiments')
        .select('id')
        .eq('status', 'running')
        .limit(1);

    if (!experiments || experiments.length === 0) {
        return { champion: null, challengers: [], explorers: [] };
    }

    const experimentId = experiments[0].id;

    const { data: variants } = await supabase
        .from('ab_variants')
        .select('*')
        .eq('experiment_id', experimentId)
        .is('killed_at', null);

    if (!variants) return { champion: null, challengers: [], explorers: [] };

    const champion = variants.find((v: Variant) => v.slot === 'champion') || null;
    const challengers = variants.filter((v: Variant) => v.slot === 'challenger');
    const explorers = variants.filter((v: Variant) => v.slot === 'explorer');

    // Calculate confidence for each non-champion variant
    if (champion) {
        for (const variant of [...challengers, ...explorers]) {
            if (variant.impressions >= 20 && champion.impressions >= 20) {
                variant.confidence = bayesianProbabilityBbetterA(
                    champion.conversions, champion.impressions,
                    variant.conversions, variant.impressions
                );

                // Update confidence in DB
                await supabase
                    .from('ab_variants')
                    .update({ confidence: variant.confidence })
                    .eq('id', variant.id);
            }
        }
    }

    return { champion, challengers, explorers };
}

async function promoteWinners(
    champion: Variant,
    challengers: Variant[],
    explorers: Variant[]
): Promise<string[]> {
    const actions: string[] = [];

    // Check if any variant beats the champion
    const allVariants = [...challengers, ...explorers];

    for (const variant of allVariants) {
        if (
            variant.confidence >= CONFIDENCE_THRESHOLD &&
            variant.impressions >= MIN_IMPRESSIONS_PROMOTE
        ) {
            // PROMOTE: Swap slots
            const improvement = ((variant.conversion_rate - champion.conversion_rate) / champion.conversion_rate * 100).toFixed(1);

            // Demote old champion
            await supabase
                .from('ab_variants')
                .update({ slot: 'challenger', weight: 20 })
                .eq('id', champion.id);

            // Promote new champion
            await supabase
                .from('ab_variants')
                .update({ slot: 'champion', weight: 70, promoted_at: new Date().toISOString() })
                .eq('id', variant.id);

            // Log event
            await supabase.from('ab_events').insert({
                experiment_id: champion.experiment_id,
                variant_id: variant.id,
                event_type: 'promoted',
                details: {
                    old_champion_id: champion.id,
                    improvement_pct: improvement,
                    confidence: variant.confidence,
                    old_rate: champion.conversion_rate,
                    new_rate: variant.conversion_rate,
                },
            });

            actions.push(`🏆 PROMOTED: "${Object.values(variant.content)[0]?.substring(0, 50)}..." (+${improvement}% at ${(variant.confidence * 100).toFixed(1)}% confidence)`);
        }
    }

    return actions;
}

async function killLosers(
    champion: Variant,
    challengers: Variant[],
    explorers: Variant[]
): Promise<string[]> {
    const actions: string[] = [];

    for (const variant of [...challengers, ...explorers]) {
        // Kill if significantly worse after enough impressions
        if (
            variant.impressions >= MIN_IMPRESSIONS_KILL &&
            variant.confidence < 0.15 // Less than 15% chance of being better
        ) {
            await supabase
                .from('ab_variants')
                .update({ killed_at: new Date().toISOString() })
                .eq('id', variant.id);

            await supabase.from('ab_events').insert({
                experiment_id: champion.experiment_id,
                variant_id: variant.id,
                event_type: 'killed',
                details: {
                    confidence: variant.confidence,
                    conversion_rate: variant.conversion_rate,
                    impressions: variant.impressions,
                },
            });

            actions.push(`☠️ KILLED: "${Object.values(variant.content)[0]?.substring(0, 50)}..." (${(variant.confidence * 100).toFixed(1)}% confidence, ${variant.impressions} impressions)`);
        }
    }

    return actions;
}

async function generateNewVariants(
    champion: Variant,
    activeChallengers: number,
    activeExplorers: number
): Promise<string[]> {
    const actions: string[] = [];

    // Only generate if we're missing slots
    const needChallenger = activeChallengers === 0;
    const needExplorer = activeExplorers === 0;

    if (!needChallenger && !needExplorer) return actions;

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        actions.push('⚠️ No OPENROUTER_API_KEY — skipping variant generation');
        return actions;
    }

    const slotsToGenerate = [];
    if (needChallenger) slotsToGenerate.push('challenger');
    if (needExplorer) slotsToGenerate.push('explorer');

    for (const slot of slotsToGenerate) {
        const isExplorer = slot === 'explorer';

        const prompt = `You are an A/B testing copywriter for "Brief Delights", a daily AI-curated tech newsletter.

Current champion copy (what's working):
- Banner: "${champion.content.banner_text}"
- Badge: "${champion.content.badge_text}"
- Subheadline: "${champion.content.subheadline}"
- CTA: "${champion.content.cta_primary}"

Generate a ${isExplorer ? 'BOLD, creative, unconventional' : 'refined, incremental improvement'} variant.

${isExplorer ?
                'Be daring! Try unexpected angles: urgency, curiosity, social proof, contrarian takes, humor. Break conventions but stay professional.' :
                'Make subtle improvements: better word choices, stronger verbs, clearer value prop. Stay close to what works.'
            }

Brand rules:
- Never use "subscribe to our newsletter" — say "get your brief" or similar
- Keep it conversational, not corporate
- The headline is always "Brief" with accent "delights" — do NOT change these
- Emphasize: curated, role-specific, 14 stories daily, 1340+ scanned

Respond in JSON only:
{
    "banner_text": "...",
    "banner_cta": "...",
    "badge_text": "...",
    "headline": "Brief",
    "headline_accent": "delights",
    "subheadline": "...",
    "cta_primary": "...",
    "cta_secondary": "See Archive"
}`;

        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'X-Title': 'Brief Delights AB Engine',
                    'HTTP-Referer': 'https://brief.delights.pro',
                },
                body: JSON.stringify({
                    model: 'google/gemini-2.0-flash-001',
                    messages: [{ role: 'user', content: prompt }],
                    response_format: { type: 'json_object' },
                    temperature: isExplorer ? 0.9 : 0.4,
                }),
            });

            const data = await response.json();
            const content = JSON.parse(data.choices[0].message.content);

            // Ensure headline stays fixed
            content.headline = 'Brief';
            content.headline_accent = 'delights';
            content.cta_secondary = 'See Archive';

            // Get experiment ID
            const { data: experiments } = await supabase
                .from('ab_experiments')
                .select('id')
                .eq('status', 'running')
                .limit(1);

            if (experiments && experiments.length > 0) {
                const variantId = `var_${slot}_${Date.now().toString(36)}`;

                await supabase.from('ab_variants').insert({
                    id: variantId,
                    experiment_id: experiments[0].id,
                    slot,
                    weight: slot === 'challenger' ? 20 : 10,
                    content,
                });

                await supabase.from('ab_events').insert({
                    experiment_id: experiments[0].id,
                    variant_id: variantId,
                    event_type: 'generated',
                    details: { slot, content, model: 'gemini-2.0-flash' },
                });

                actions.push(`🧬 GENERATED ${slot}: "${content.subheadline?.substring(0, 60)}..."`);
            }
        } catch (error) {
            actions.push(`⚠️ Failed to generate ${slot}: ${error}`);
        }
    }

    return actions;
}

async function regenerateConfig(): Promise<void> {
    // Fetch active variants
    const { data: experiments } = await supabase
        .from('ab_experiments')
        .select('id')
        .eq('status', 'running')
        .limit(1);

    if (!experiments || experiments.length === 0) return;

    const { data: variants } = await supabase
        .from('ab_variants')
        .select('*')
        .eq('experiment_id', experiments[0].id)
        .is('killed_at', null);

    if (!variants || variants.length === 0) return;

    const config = {
        experiment_id: experiments[0].id,
        active: true,
        variants: {} as Record<string, { slot: string; weight: number; content: Record<string, string> }>,
        updated_at: new Date().toISOString(),
    };

    for (const v of variants) {
        config.variants[v.id] = {
            slot: v.slot,
            weight: v.weight,
            content: v.content,
        };
    }

    // Write to public/ab-config.json
    const configPath = path.join(process.cwd(), 'public', 'ab-config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

async function sendAdminDigest(actions: string[]): Promise<void> {
    if (actions.length === 0) return;

    const apiKey = process.env.RESEND_API_KEY;
    const adminEmail = process.env.ADMIN_EMAIL || 'hello@brief.delights.pro';

    if (!apiKey) return;

    const actionsList = actions.map(a => `<li>${a}</li>`).join('\n');

    try {
        await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: process.env.EMAIL_SENDER || 'Brief Delights <hello@brief.delights.pro>',
                to: [adminEmail],
                subject: `🧪 A/B Engine: ${actions.length} action(s) taken`,
                html: `
                    <h2>🧪 A/B Testing Engine Report</h2>
                    <p>The autonomous A/B engine made the following changes:</p>
                    <ul>${actionsList}</ul>
                    <p><a href="https://brief.delights.pro/admin/ab-testing">View Dashboard →</a></p>
                    <hr/>
                    <p style="color: #999; font-size: 12px;">This is an automated notification. No action required unless you want to override.</p>
                `,
            }),
        });
    } catch (error) {
        console.error('Failed to send admin digest:', error);
    }
}

// ============================================================
// MAIN HANDLER
// ============================================================

export async function POST(request: NextRequest) {
    // Verify cron secret
    const cronSecret = request.headers.get('x-cron-secret');
    const expectedSecret = process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_KEY;

    if (!cronSecret || cronSecret !== expectedSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allActions: string[] = [];

    try {
        console.log('🧪 A/B Engine starting...');

        // 1. ANALYZE
        const { champion, challengers, explorers } = await analyzeVariants();

        if (!champion) {
            return NextResponse.json({
                status: 'no_experiment',
                message: 'No running experiment found',
            });
        }

        console.log(`📊 Champion: ${champion.conversion_rate.toFixed(4)} (${champion.impressions} imp, ${champion.conversions} conv)`);
        for (const v of [...challengers, ...explorers]) {
            console.log(`   ${v.slot}: ${v.conversion_rate.toFixed(4)} (${v.impressions} imp, confidence: ${(v.confidence * 100).toFixed(1)}%)`);
        }

        // 2. PROMOTE winners
        const promotions = await promoteWinners(champion, challengers, explorers);
        allActions.push(...promotions);

        // 3. KILL losers
        const kills = await killLosers(champion, challengers, explorers);
        allActions.push(...kills);

        // 4. GENERATE new variants for empty slots
        const activeChallengers = challengers.filter(c => !kills.some(k => k.includes(c.id))).length;
        const activeExplorers = explorers.filter(e => !kills.some(k => k.includes(e.id))).length;
        const generations = await generateNewVariants(champion, activeChallengers, activeExplorers);
        allActions.push(...generations);

        // 5. REGENERATE config file
        await regenerateConfig();
        console.log('📝 Config regenerated');

        // 6. NOTIFY admin
        await sendAdminDigest(allActions);

        console.log(`🧪 A/B Engine complete: ${allActions.length} action(s)`);

        return NextResponse.json({
            status: 'ok',
            actions: allActions,
            stats: {
                champion_rate: champion.conversion_rate,
                champion_impressions: champion.impressions,
                variants_analyzed: challengers.length + explorers.length,
            },
        });
    } catch (error) {
        console.error('A/B Engine error:', error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
