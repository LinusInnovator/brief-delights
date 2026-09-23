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
 *   - track: 'top4' (default) | 'builders' | 'leaders' | 'generative_media' | 'weekly'
 *   - all: 'true' (returns all 4 daily tracks + weekly recap in a single bundle)
 *   - weekly: 'true' (alias for track=weekly)
 *   - format: 'json' (default) | 'md' | 'markdown' | 'text' | 'index'
 *   - date: 'YYYY-MM-DD' (optional, defaults to latest)
 *   - archive: 'true' (returns the list of all historical episodes and tracks)
 * 
 * Headers:
 *   - Accept: 'text/markdown' will return raw markdown unless format=json is specified
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const formatParam = searchParams.get('format')?.toLowerCase();
        const dateParam = searchParams.get('date')?.trim();
        const archiveParam = searchParams.get('archive')?.toLowerCase();
        const trackParam = searchParams.get('track')?.toLowerCase().trim();
        const allParam = searchParams.get('all')?.toLowerCase().trim();
        const weeklyParam = searchParams.get('weekly')?.toLowerCase().trim();
        const acceptHeader = request.headers.get('accept') || '';

        const cwd = process.cwd();
        const scriptsArchiveDir = path.join(cwd, 'public', 'data', 'video_scripts');
        const reportsDir = path.join(cwd, '..', 'reports', 'video_scripts');
        const publicDataDir = path.join(cwd, 'public', 'data');

        // 1. Archive Index Mode: returns list of all available episodes across all tracks
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
                            'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
                        },
                    });
                } catch (err) {
                    console.error('[video-script] Error reading index.json:', err);
                }
            }
        }

        // 2. All Tracks Bundle Mode (?all=true or ?track=all)
        if (allParam === 'true' || trackParam === 'all') {
            const tracks = ['top4', 'builders', 'leaders', 'generative_media'];
            const bundle: Record<string, any> = {};

            for (const t of tracks) {
                const jsonFile = t === 'top4' 
                    ? path.join(publicDataDir, 'latest_video_script.json')
                    : path.join(publicDataDir, `latest_video_script_${t}.json`);
                if (fs.existsSync(jsonFile)) {
                    try {
                        bundle[t] = JSON.parse(fs.readFileSync(jsonFile, 'utf-8'));
                    } catch (e) {
                        bundle[t] = null;
                    }
                }
            }

            // Also attach weekly if available
            const weeklyJson = path.join(publicDataDir, 'latest_weekly_video_script.json');
            if (fs.existsSync(weeklyJson)) {
                try {
                    bundle['weekly_recap'] = JSON.parse(fs.readFileSync(weeklyJson, 'utf-8'));
                } catch (e) {}
            }

            return NextResponse.json({
                available_tracks: Object.keys(bundle),
                tracks: bundle,
                generated_at: new Date().toISOString()
            }, {
                status: 200,
                headers: {
                    ...CORS_HEADERS,
                    'Content-Type': 'application/json; charset=utf-8',
                    'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
                }
            });
        }

        const wantsMarkdown = formatParam === 'md' || 
                              formatParam === 'markdown' || 
                              formatParam === 'text' ||
                              (acceptHeader.includes('text/markdown') && formatParam !== 'json');

        const isWeekly = weeklyParam === 'true' || trackParam === 'weekly' || trackParam === 'weekly_mega_recap';
        const track = isWeekly ? 'weekly' : (trackParam || 'top4');

        let jsonData: any = null;
        let rawMarkdown: string | null = null;

        // 3. Specific Date Requested
        if (dateParam) {
            let filenameStem = isWeekly 
                ? `weekly_${dateParam}-mega-recap`
                : (track === 'top4' ? `${dateParam}-ai-news` : `${dateParam}-ai-news-${track}`);

            const dateJsonPath = path.join(scriptsArchiveDir, `${filenameStem}.json`);
            if (fs.existsSync(dateJsonPath)) {
                try {
                    jsonData = JSON.parse(fs.readFileSync(dateJsonPath, 'utf-8'));
                    if (jsonData.raw_markdown) {
                        rawMarkdown = jsonData.raw_markdown;
                    }
                } catch (err) {
                    console.error(`[video-script] Error reading ${filenameStem}.json:`, err);
                }
            }

            const dateMdPath = path.join(scriptsArchiveDir, `${filenameStem}.md`);
            if (!rawMarkdown && fs.existsSync(dateMdPath)) {
                rawMarkdown = fs.readFileSync(dateMdPath, 'utf-8');
            }

            const reportDateMdPath = path.join(reportsDir, `${filenameStem}.md`);
            if (!rawMarkdown && fs.existsSync(reportDateMdPath)) {
                rawMarkdown = fs.readFileSync(reportDateMdPath, 'utf-8');
            }
        }

        // 4. Latest Fallback for requested track
        if (!jsonData && !rawMarkdown) {
            let latestJsonName = 'latest_video_script.json';
            let latestMdName = 'latest_video_script.md';

            if (isWeekly) {
                latestJsonName = 'latest_weekly_video_script.json';
                latestMdName = 'latest_weekly_video_script.md';
            } else if (track !== 'top4') {
                latestJsonName = `latest_video_script_${track}.json`;
                latestMdName = `latest_video_script_${track}.md`;
            }

            const publicLatestJson = path.join(publicDataDir, latestJsonName);
            if (fs.existsSync(publicLatestJson)) {
                try {
                    jsonData = JSON.parse(fs.readFileSync(publicLatestJson, 'utf-8'));
                    if (jsonData.raw_markdown) {
                        rawMarkdown = jsonData.raw_markdown;
                    }
                } catch (err) {
                    console.error(`[video-script] Error reading ${latestJsonName}:`, err);
                }
            }

            if (!rawMarkdown) {
                const publicLatestMd = path.join(publicDataDir, latestMdName);
                if (fs.existsSync(publicLatestMd)) {
                    rawMarkdown = fs.readFileSync(publicLatestMd, 'utf-8');
                } else if (fs.existsSync(reportsDir)) {
                    try {
                        const files = fs.readdirSync(reportsDir)
                            .filter(f => isWeekly ? f.startsWith('weekly_') : (track === 'top4' ? f.endsWith('-ai-news.md') : f.includes(track)))
                            .sort()
                            .reverse();
                        if (files.length > 0) {
                            rawMarkdown = fs.readFileSync(path.join(reportsDir, files[0]), 'utf-8');
                        }
                    } catch (err) {
                        console.error('[video-script] Error reading reportsDir:', err);
                    }
                }
            }
        }

        if (!jsonData && !rawMarkdown) {
            return NextResponse.json(
                { 
                    error: `No video safari script found for track: '${track}'${dateParam ? ` on date: ${dateParam}` : ''}.`,
                    available_tracks: ['top4', 'builders', 'leaders', 'generative_media', 'weekly']
                },
                { status: 404, headers: CORS_HEADERS }
            );
        }

        // 5. Return Raw Markdown
        if (wantsMarkdown) {
            if (!rawMarkdown && jsonData) {
                rawMarkdown = jsonData.raw_markdown || '';
            }
            return new NextResponse(rawMarkdown, {
                status: 200,
                headers: {
                    ...CORS_HEADERS,
                    'Content-Type': 'text/markdown; charset=utf-8',
                    'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
                },
            });
        }

        // 6. Return Structured JSON
        if (!jsonData && rawMarkdown) {
            jsonData = {
                raw_markdown: rawMarkdown,
                track: track,
                note: 'Structured JSON not cached for this historical date, raw markdown provided.',
            };
        }

        return NextResponse.json(jsonData, {
            status: 200,
            headers: {
                ...CORS_HEADERS,
                'Content-Type': 'application/json; charset=utf-8',
                'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
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
