import Link from 'next/link';
import { readdirSync, statSync, readFileSync } from 'fs';
import { join } from 'path';
import { createClient } from '../../lib/supabase';

interface Newsletter {
    slug: string;
    segment: string;
    date: string;
    filename: string;
    size: string;
    storyCount: number;
    topHeadline: string;
}

function extractStoryCount(html: string): number {
    const matches = html.match(/<div class="story">/g);
    return matches ? matches.length : 0;
}

function extractTopHeadline(html: string): string {
    const match = html.match(/<div class="story">[\s\S]*?<h3>[\s\S]*?>(.*?)<\/a>/);
    if (match && match[1]) {
        return match[1].trim().substring(0, 80);
    }
    return 'Daily tech intelligence';
}

async function getSubscriberCount() {
    const supabase = createClient();
    try {
        const { count } = await supabase
            .from('subscribers')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'confirmed');
        return count || 0;
    } catch {
        return 0;
    }
}

async function getNewsletters(): Promise<Newsletter[]> {
    const newslettersDir = join(process.cwd(), 'public', 'newsletters');

    try {
        const files = readdirSync(newslettersDir);
        const newsletters = files
            .filter(f => f.startsWith('newsletter_') && f.endsWith('.html') && !f.includes('weekly'))
            .map(filename => {
                const match = filename.match(/newsletter_(\w+)_(\d{4}-\d{2}-\d{2})\.html/);
                if (!match) return null;

                const [, segment, date] = match;
                const filePath = join(newslettersDir, filename);
                const stats = statSync(filePath);
                const sizeKB = (stats.size / 1024).toFixed(1);
                const html = readFileSync(filePath, 'utf-8');

                return {
                    slug: `${date}-${segment}`,
                    segment,
                    date,
                    filename,
                    size: `${sizeKB} KB`,
                    storyCount: extractStoryCount(html),
                    topHeadline: extractTopHeadline(html),
                };
            })
            .filter(Boolean) as Newsletter[];

        newsletters.sort((a, b) => b.date.localeCompare(a.date));
        return newsletters;
    } catch (error) {
        console.error('Error reading newsletters:', error);
        return [];
    }
}

const segmentColors: Record<string, string> = {
    builders: 'bg-orange-500',
    leaders: 'bg-blue-600',
    innovators: 'bg-purple-600',
};

const segmentEmojis: Record<string, string> = {
    builders: '🛠️',
    leaders: '💼',
    innovators: '🚀',
};

const segmentDescriptions: Record<string, string> = {
    builders: 'Engineering, infrastructure & developer tools',
    leaders: 'Strategy, funding & market trends',
    innovators: 'AI research, breakthroughs & emerging tech',
};

export const metadata = {
    title: 'Newsletter Archive - Brief Delights',
    description: 'Browse past editions of Brief Delights. AI-curated daily tech intelligence for builders, leaders, and innovators.',
    openGraph: {
        title: 'Newsletter Archive - Brief Delights',
        description: 'Browse past editions of Brief Delights. AI-curated daily tech intelligence.',
        url: 'https://brief.delights.pro/archive',
    },
};

export default async function ArchivePage() {
    const newsletters = await getNewsletters();
    const subscriberCount = await getSubscriberCount();

    // Group by date for a cleaner display
    const dates = [...new Set(newsletters.map(n => n.date))];
    const latestDate = dates[0];
    const latestNewsletters = newsletters.filter(n => n.date === latestDate);
    const olderNewsletters = newsletters.filter(n => n.date !== latestDate);

    return (
        <main className="min-h-screen bg-gray-50">
            {/* Sticky Subscribe Banner */}
            <div className="bg-black text-white py-3 text-center text-sm sticky top-0 z-50">
                <span className="opacity-80">Get this in your inbox daily →</span>{' '}
                <Link href="/" className="underline font-semibold hover:text-blue-300 transition">
                    Subscribe free
                </Link>
            </div>

            {/* Header */}
            <header className="bg-white border-b border-gray-200">
                <div className="max-w-5xl mx-auto px-6 py-8">
                    <Link href="/" className="inline-block mb-4 text-gray-500 hover:text-black text-sm transition">
                        ← Back to Home
                    </Link>
                    <div className="flex items-end justify-between">
                        <div>
                            <h1 className="text-4xl font-bold tracking-tight">Newsletter Archive</h1>
                            <p className="text-gray-500 mt-1">
                                Browse past editions • {newsletters.length} editions published
                            </p>
                        </div>
                        {subscriberCount > 0 && (
                            <p className="text-sm text-gray-400 hidden md:block">
                                📬 {subscriberCount.toLocaleString()} subscriber{subscriberCount !== 1 ? 's' : ''}
                            </p>
                        )}
                    </div>
                </div>
            </header>

            <div className="max-w-5xl mx-auto px-6 py-10">
                {/* Featured: Latest Edition */}
                {latestNewsletters.length > 0 && (
                    <section className="mb-12">
                        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">
                            📰 Latest Edition — {new Date(latestDate + 'T00:00:00').toLocaleDateString('en-US', {
                                weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
                            })}
                        </h2>
                        <div className="grid md:grid-cols-3 gap-4">
                            {latestNewsletters.map(newsletter => (
                                <Link
                                    key={newsletter.slug}
                                    href={`/archive/${newsletter.slug}`}
                                    className="bg-white rounded-xl border-2 border-gray-200 p-6 hover:border-gray-400 hover:shadow-lg transition-all group relative overflow-hidden"
                                >
                                    {/* Gradient accent */}
                                    <div className={`absolute top-0 left-0 right-0 h-1 ${segmentColors[newsletter.segment]}`} />

                                    <div className="flex items-center gap-2 mb-3">
                                        <span className={`${segmentColors[newsletter.segment]} text-white px-3 py-1 rounded-full text-xs font-bold`}>
                                            {segmentEmojis[newsletter.segment]} {newsletter.segment}
                                        </span>
                                        <span className="text-xs text-green-600 font-semibold">NEW</span>
                                    </div>

                                    <p className="text-sm text-gray-600 mb-3">
                                        {segmentDescriptions[newsletter.segment]}
                                    </p>

                                    <p className="text-base font-semibold text-black group-hover:text-gray-700 mb-2 line-clamp-2">
                                        {newsletter.topHeadline}
                                    </p>

                                    <p className="text-xs text-gray-400 mt-auto">
                                        {newsletter.storyCount} stories • {newsletter.size}
                                    </p>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}

                {/* Subscribe CTA */}
                <section className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 mb-12 text-white text-center">
                    <h2 className="text-2xl font-bold mb-2">Don&apos;t miss tomorrow&apos;s edition</h2>
                    <p className="text-white/80 mb-4">We scan 1,340+ articles so you don&apos;t have to. Get the top stories in your inbox daily.</p>
                    <Link
                        href="/"
                        className="inline-block bg-white text-indigo-700 font-bold py-3 px-8 rounded-lg hover:bg-gray-100 transition text-sm"
                    >
                        Subscribe Free →
                    </Link>
                </section>

                {/* Previous Editions */}
                {olderNewsletters.length > 0 && (
                    <section>
                        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">
                            📚 Previous Editions
                        </h2>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {olderNewsletters.map(newsletter => (
                                <Link
                                    key={newsletter.slug}
                                    href={`/archive/${newsletter.slug}`}
                                    className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 hover:shadow-md transition-all group"
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`${segmentColors[newsletter.segment]} text-white px-2 py-0.5 rounded-full text-xs font-semibold`}>
                                            {segmentEmojis[newsletter.segment]} {newsletter.segment}
                                        </span>
                                    </div>

                                    <h3 className="text-sm font-bold mb-1 text-gray-800 group-hover:text-black">
                                        {new Date(newsletter.date + 'T00:00:00').toLocaleDateString('en-US', {
                                            weekday: 'short', month: 'short', day: 'numeric'
                                        })}
                                    </h3>

                                    <p className="text-xs text-gray-500 line-clamp-1">
                                        {newsletter.topHeadline}
                                    </p>

                                    <p className="text-xs text-gray-400 mt-2">
                                        {newsletter.storyCount} stories
                                    </p>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}
            </div>

            {/* Footer */}
            <footer className="border-t border-gray-200 py-12 mt-10 bg-white">
                <div className="max-w-5xl mx-auto px-6 text-center">
                    <p className="text-gray-600 mb-2">
                        <strong>brief delights</strong>
                    </p>
                    <p className="text-sm text-gray-400">
                        © 2026 All rights reserved
                    </p>
                </div>
            </footer>
        </main>
    );
}
