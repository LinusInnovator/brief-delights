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
 *   - format: 'json' (default) | 'md' | 'markdown' | 'text' | 'index'
 *   - date: 'YYYY-MM-DD' (optional, defaults to latest)
 *   - archive: 'true' (returns the list of all historical episodes)
 * 
 * Headers:
 *   - Accept: 'text/markdown' will return raw markdown unless format=json is specified
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const formatParam = searchParams.get('format')?.toLowerCase();
        const dateParam = searchParams.get('date')?.trim();
        const archiveParam = searchParams.get('archive')?.toLowerCase();
        const acceptHeader = request.headers.get('accept') || '';

        const cwd = process.cwd();
        const scriptsArchiveDir = path.join(cwd, 'public', 'data', 'video_scripts');
        const reportsDir = path.join(cwd, '..', 'reports', 'video_scripts');

        // 1. Archive Index Mode: returns list of all available episodes
        if (archiveParam === 'true' || formatParam === 'index' || formatParam === 'archive') {
            const indexPath = path.join(scriptsArchiveDir, 'index.json');
            if (fs.existsSync(indexPath)) {
                try {
                    const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
                    return NextResponse.json(indexData, {
                        status: 200,
                        headers: {
                            ...CORS_HEADERS,
                            'Content-Type': 'application/json; charset=utf-8',
                            'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
                        },
                    });
                } catch (err) {
                    console.error('[video-script] Error reading index.json:', err);
                }
            }
        }

        const wantsMarkdown = formatParam === 'md' || 
                              formatParam === 'markdown' || 
                              formatParam === 'text' ||
                              (acceptHeader.includes('text/markdown') && formatParam !== 'json');

        let jsonData: any = null;
        let rawMarkdown: string | null = null;

        // 2. Specific Date Requested
        if (dateParam) {
            // Check public/data/video_scripts/YYYY-MM-DD.json
            const dateJsonPath = path.join(scriptsArchiveDir, `${dateParam}.json`);
            if (fs.existsSync(dateJsonPath)) {
                try {
                    jsonData = JSON.parse(fs.readFileSync(dateJsonPath, 'utf-8'));
                    if (jsonData.raw_markdown) {
                        rawMarkdown = jsonData.raw_markdown;
                    }
                } catch (err) {
                    console.error(`[video-script] Error reading ${dateParam}.json:`, err);
                }
            }

            // Check public/data/video_scripts/YYYY-MM-DD-ai-news.md
            const dateMdPath = path.join(scriptsArchiveDir, `${dateParam}-ai-news.md`);
            if (!rawMarkdown && fs.existsSync(dateMdPath)) {
                rawMarkdown = fs.readFileSync(dateMdPath, 'utf-8');
            }

            // Fallback to reports/video_scripts/
            const reportDateMdPath = path.join(reportsDir, `${dateParam}-ai-news.md`);
            if (!rawMarkdown && fs.existsSync(reportDateMdPath)) {
                rawMarkdown = fs.readFileSync(reportDateMdPath, 'utf-8');
            }
        }

        // 3. Default / Latest Fallback (if dateParam not specified or specific date not found)
        if (!jsonData && !rawMarkdown) {
            const publicLatestJson = path.join(cwd, 'public', 'data', 'latest_video_script.json');
            if (fs.existsSync(publicLatestJson)) {
                try {
                    jsonData = JSON.parse(fs.readFileSync(publicLatestJson, 'utf-8'));
                    if (jsonData.raw_markdown) {
                        rawMarkdown = jsonData.raw_markdown;
                    }
                } catch (err) {
                    console.error('[video-script] Error reading latest_video_script.json:', err);
                }
            }
        }

        // Fallback to latest .md file in public or reports
        if (!rawMarkdown) {
            const publicLatestMd = path.join(cwd, 'public', 'data', 'latest_video_script.md');
            if (fs.existsSync(publicLatestMd)) {
                rawMarkdown = fs.readFileSync(publicLatestMd, 'utf-8');
            } else if (fs.existsSync(reportsDir)) {
                try {
                    const files = fs.readdirSync(reportsDir).filter(f => f.endsWith('-ai-news.md')).sort().reverse();
                    if (files.length > 0) {
                        rawMarkdown = fs.readFileSync(path.join(reportsDir, files[0]), 'utf-8');
                    }
                } catch (err) {
                    console.error('[video-script] Error reading reportsDir:', err);
                }
            }
        }

        if (!jsonData && !rawMarkdown) {
            return NextResponse.json(
                { 
                    error: dateParam 
                        ? `No video safari script found for date: ${dateParam}`
                        : 'No video safari script available yet.' 
                },
                { status: 404, headers: CORS_HEADERS }
            );
        }

        // 4. Return Raw Markdown
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

        // 5. Return Structured JSON
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
