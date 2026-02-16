import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Use OpenRouter (already configured for the platform)
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

// Helper to normalize URL
function normalizeUrl(url: string): string {
    let normalized = url.trim();
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
        normalized = 'https://' + normalized;
    }
    return normalized;
}

// Helper to extract domain name as sponsor name
function extractSponsorName(domain: string): string {
    // Remove protocol and www
    let cleaned = domain.replace(/^https?:\/\/(www\.)?/, '');
    // Remove path and query
    cleaned = cleaned.split('/')[0];
    // Remove TLD
    const parts = cleaned.split('.');
    if (parts.length > 1) {
        cleaned = parts[0];
    }
    // Capitalize first letter of each word
    return cleaned
        .split(/[-_\.]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Fetch website metadata
async function fetchMetadata(url: string) {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; BriefDelights/1.0; +https://brief.delights.pro)'
            },
            signal: AbortSignal.timeout(10000) // 10 second timeout
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const html = await response.text();

        // Extract metadata using regex (simple approach)
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
        const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
        const ogDescMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);
        const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);

        return {
            title: ogTitleMatch?.[1] || titleMatch?.[1] || '',
            description: ogDescMatch?.[1] || descMatch?.[1] || '',
            image: ogImageMatch?.[1] || '',
        };
    } catch (error) {
        console.error('Metadata fetch error:', error);
        return {
            title: '',
            description: '',
            image: '',
        };
    }
}

// Generate content using OpenAI
async function generateContent(url: string, metadata: any) {
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!openaiKey) {
        // Fallback: use metadata as-is
        return {
            headline: metadata.title?.slice(0, 100) || 'Check Out This Amazing Tool',
            body: metadata.description?.slice(0, 500) || 'Powerful solution for modern builders.',
            cta_text: 'Learn More',
        };
    }

    try {
        const openai = new OpenAI({ apiKey: openaiKey });

        const prompt = `You are a master copywriter creating sponsored content for a technical newsletter read by builders and innovators.

Product URL: ${url}
Product Name: ${metadata.title || ''}
Description: ${metadata.description || ''}

Create compelling sponsored content:

HEADLINE (max 100 characters):
- Attention-grabbing
- Benefit-focused
- No hype, just value
- Make it exciting but credible

BODY (max 500 characters):
- Start with pain point or desire
- Show how product solves it
- Include specific value prop
- End with clear benefit
- Write for technical builders
- Conversational, enthusiastic tone
- NO marketing fluff

CTA_TEXT (3-5 words):
- Action-oriented
- Creates urgency or curiosity
Examples: "Try It Free", "Get Started", "See How It Works", "Join the Beta"

Output ONLY valid JSON in this exact format:
{
  "headline": "...",
  "body": "...",
  "cta_text": "..."
}`;

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'You are a master copywriter. Always respond with valid JSON only, no other text.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.8,
            max_tokens: 500,
        });

        const content = completion.choices[0]?.message?.content || '{}';
        const parsed = JSON.parse(content);

        return {
            headline: (parsed.headline || metadata.title || '').slice(0, 100),
            body: (parsed.body || metadata.description || '').slice(0, 500),
            cta_text: (parsed.cta_text || 'Learn More').slice(0, 50),
        };
    } catch (error) {
        console.error('AI generation error:', error);
        // Fallback to metadata
        return {
            headline: metadata.title?.slice(0, 100) || 'Check Out This Tool',
            body: metadata.description?.slice(0, 500) || 'Great solution for builders.',
            cta_text: 'Learn More',
        };
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { url } = body;

        if (!url) {
            return NextResponse.json(
                { error: 'URL is required' },
                { status: 400 }
            );
        }

        // Normalize URL
        const normalizedUrl = normalizeUrl(url);
        const urlObj = new URL(normalizedUrl);
        const domain = urlObj.hostname;

        // Extract sponsor name from domain
        const sponsorName = extractSponsorName(domain);

        // Fetch metadata
        const metadata = await fetchMetadata(normalizedUrl);

        // Generate content with AI
        const generated = await generateContent(normalizedUrl, metadata);

        // Build logo URL (try favicon)
        const logoUrl = `${urlObj.origin}/favicon.ico`;

        return NextResponse.json({
            sponsor_name: sponsorName,
            sponsor_domain: domain,
            sponsor_logo_url: logoUrl,
            headline: generated.headline,
            body: generated.body,
            cta_text: generated.cta_text,
            cta_url: normalizedUrl,
        });

    } catch (error: any) {
        console.error('Generate from URL error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to generate content' },
            { status: 500 }
        );
    }
}
