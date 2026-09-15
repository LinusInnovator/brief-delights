import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization',
};

/**
 * OPTIONS handler for CORS preflight
 */
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: CORS_HEADERS,
    });
}

/**
 * GET /api/video-script
 * 
 * Query params:
 *   - format: 'json' (default) | 'md' | 'markdown' | 'text'
 *   - date: 'YYYY-MM-DD' (optional, defaults to latest)
 * 
 * Headers:
 *   - Accept: 'text/markdown' will return raw markdown unless format=json is specified
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const formatParam = searchParams.get('format')?.toLowerCase();
        const dateParam = searchParams.get('date')?.trim();
        const acceptHeader = request.headers.get('accept') || '';

        const wantsMarkdown = formatParam === 'md' || 
                              formatParam === 'markdown' || 
                              formatParam === 'text' ||
                              (acceptHeader.includes('text/markdown') && formatParam !== 'json');

        const cwd = process.cwd();

        // Determine paths
        let jsonData: any = null;
        let rawMarkdown: string | null = null;

        // Path candidate 1: latest_video_script.json in public/data
        const publicJsonPath = path.join(cwd, 'public', 'data', 'latest_video_script.json');
        
        // Path candidate 2: reports/video_scripts in root if accessible
        const reportsDir = path.join(cwd, '..', 'reports', 'video_scripts');

        if (dateParam) {
            // Specific date requested
            const dateMdPath = path.join(reportsDir, `${dateParam}-ai-news.md`);
            if (fs.existsSync(dateMdPath)) {
                rawMarkdown = fs.readFileSync(dateMdPath, 'utf-8');
            }
        }

        // Default or fallback to latest_video_script.json
        if (fs.existsSync(publicJsonPath)) {
            try {
                const fileContent = fs.readFileSync(publicJsonPath, 'utf-8');
                jsonData = JSON.parse(fileContent);
                if (!rawMarkdown && jsonData.raw_markdown) {
                    rawMarkdown = jsonData.raw_markdown;
                }
            } catch (err) {
                console.error('[video-script] Error reading latest_video_script.json:', err);
            }
        }

        // If still no markdown found, check reports directory for today or latest .md
        if (!rawMarkdown && fs.existsSync(reportsDir)) {
            try {
                const files = fs.readdirSync(reportsDir).filter(f => f.endsWith('-ai-news.md')).sort().reverse();
                if (files.length > 0) {
                    const latestMdFile = path.join(reportsDir, files[0]);
                    rawMarkdown = fs.readFileSync(latestMdFile, 'utf-8');
                }
            } catch (err) {
                console.error('[video-script] Error reading reportsDir:', err);
            }
        }

        if (!jsonData && !rawMarkdown) {
            return NextResponse.json(
                { error: 'No video safari script found for the requested date.' },
                { status: 404, headers: CORS_HEADERS }
            );
        }

        // Return Raw Markdown if requested
        if (wantsMarkdown) {
            if (!rawMarkdown && jsonData) {
                rawMarkdown = jsonData.raw_markdown || '';
            }
            return new NextResponse(rawMarkdown, {
                status: 200,
                headers: {
                    ...CORS_HEADERS,
                    'Content-Type': 'text/markdown; charset=utf-8',
                    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
                },
            });
        }

        // Return Structured JSON
        if (!jsonData && rawMarkdown) {
            jsonData = {
                raw_markdown: rawMarkdown,
                note: 'Structured JSON not cached for this historical date, raw markdown provided.',
            };
        }

        return NextResponse.json(jsonData, {
            status: 200,
            headers: {
                ...CORS_HEADERS,
                'Content-Type': 'application/json; charset=utf-8',
                'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
            },
        });
    } catch (error: any) {
        console.error('[video-script] Handler error:', error);
        return NextResponse.json(
            { error: 'Internal server error fetching video script', details: error.message },
            { status: 500, headers: CORS_HEADERS }
        );
    }
}
