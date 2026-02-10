import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const newslettersDir = join(process.cwd(), 'public', 'newsletters');
        const { slug } = await params;

        // Parse slug: 2026-02-09-innovators or 2026-02-10-weekly_innovators
        // The slug format is: YYYY-MM-DD-segment where segment can contain underscores
        const parts = slug.split('-');

        if (parts.length < 4) {
            return new NextResponse('Invalid slug format', { status: 400 });
        }

        // First 3 parts are the date (YYYY-MM-DD)
        const datePart = parts.slice(0, 3).join('-');

        // Everything after the date is the segment
        const segmentPart = parts.slice(3).join('-');

        const filename = `newsletter_${segmentPart}_${datePart}.html`;
        const filePath = join(newslettersDir, filename);

        console.log('[Newsletter API] Looking for:', { slug, datePart, segmentPart, filename, filePath });

        if (!existsSync(filePath)) {
            console.error('[Newsletter API] File not found:', filePath);
            return new NextResponse('Newsletter not found', { status: 404 });
        }

        const html = readFileSync(filePath, 'utf-8');

        return new NextResponse(html, {
            status: 200,
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'public, max-age=3600, s-maxage=86400',
            },
        });
    } catch (error) {
        console.error('[Newsletter API] Error:', error);
        return new NextResponse('Internal server error', { status: 500 });
    }
}
