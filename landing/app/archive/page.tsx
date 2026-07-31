import Link from 'next/link';
import { readdirSync, statSync, readFileSync } from 'fs';
import { join } from 'path';
import { createClient } from '../../lib/supabase';
import { IconStreamBuilders, IconStreamLeaders, IconStreamInnovators, IconEditoriallyCurated } from '../../components/EditorialIcons';

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

function renderSegmentIcon(segment: string) {
    switch (segment) {
        case 'builders': return <IconStreamBuilders className="w-4 h-4 text-[#58111A]" />;
        case 'leaders': return <IconStreamLeaders className="w-4 h-4 text-[#58111A]" />;
        case 'innovators': return <IconStreamInnovators className="w-4 h-4 text-[#58111A]" />;
        default: return <IconEditoriallyCurated className="w-4 h-4 text-[#58111A]" />;
    }
}

function isLockedDate(dateStr: string): boolean {
    try {
        const editionDate = new Date(dateStr + 'T00:00:00Z');
        const now = new Date();
        const diffDays = (now.getTime() - editionDate.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays < 2.5;
    } catch {
        return false;
    }
}

const segmentDescriptions: Record<string, string> = {
    builders: 'Engineering, infrastructure & developer tools',
    leaders: 'Strategy, funding & market trends',
    innovators: 'AI research, breakthroughs & emerging tech',
};

export const metadata = {
    title: 'Newsletter Archive — Brief Delights',
    description: 'Browse past editions of Brief Delights. AI-curated daily tech intelligence for builders, leaders, and innovators.',
};

export default async function ArchivePage() {
    const newsletters = await getNewsletters();
    const subscriberCount = await getSubscriberCount();

    const dates = [...new Set(newsletters.map(n => n.date))];
    const latestDate = dates[0];
    const latestNewsletters = newsletters.filter(n => n.date === latestDate);
    const olderNewsletters = newsletters.filter(n => n.date !== latestDate);

    return (
        <main className="min-h-screen bg-[#FAF8F5] text-gray-900">
            {/* Header Masthead */}
            <header className="bg-white border-b border-[#121212]/10">
                <div className="max-w-5xl mx-auto px-6 py-8">
                    <Link href="/" className="inline-block mb-4 text-xs font-bold text-[#58111A] hover:underline uppercase tracking-wider">
                        &larr; Back to Brief Delights
                    </Link>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-[#58111A]/10 border border-[#58111A]/20 flex items-center justify-center p-1.5">
                                <img src="/bd_seal_logo.png" alt="Brief Delights Seal" className="w-8 h-8 object-contain" />
                            </div>
                            <div>
                                <h1 className="text-3xl md:text-4xl font-serif font-bold text-[#121212]">Intelligence Archive</h1>
                                <p className="text-xs text-gray-500 mt-1">
                                    Knowledge Refined &bull; {newsletters.length} daily editions published
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-5xl mx-auto px-6 py-10">
                {/* Featured: Latest Edition */}
                {latestNewsletters.length > 0 && (
                    <section className="mb-12">
                        <h2 className="text-xs font-bold uppercase tracking-widest text-[#58111A] mb-4">
                            Latest Edition &mdash; {new Date(latestDate + 'T00:00:00').toLocaleDateString('en-US', {
                                weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
                            })}
                        </h2>
                        <div className="grid md:grid-cols-3 gap-6">
                            {latestNewsletters.map(newsletter => {
                                const locked = isLockedDate(newsletter.date);
                                return (
                                    <Link
                                        key={newsletter.slug}
                                        href={`/archive/${newsletter.slug}`}
                                        className="bg-white rounded-2xl border border-[#121212]/10 p-6 hover:border-[#58111A] hover:shadow-xl transition-all group relative overflow-hidden flex flex-col justify-between"
                                    >
                                        <div>
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-2 bg-[#58111A]/10 border border-[#58111A]/20 px-3 py-1 rounded-full">
                                                    {renderSegmentIcon(newsletter.segment)}
                                                    <span className="text-xs font-bold text-[#58111A] uppercase tracking-wider">
                                                        {newsletter.segment}
                                                    </span>
                                                </div>
                                                {locked ? (
                                                    <span className="bg-[#C5A059]/15 text-[#8C6D2B] border border-[#C5A059]/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                                                        Subscriber Only
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-emerald-700 font-bold">UNLOCKED</span>
                                                )}
                                            </div>

                                            <p className="text-xs text-gray-500 mb-3">
                                                {segmentDescriptions[newsletter.segment]}
                                            </p>

                                            <p className="text-base font-serif font-bold text-[#121212] group-hover:text-[#58111A] transition mb-3 line-clamp-2">
                                                {newsletter.topHeadline}
                                            </p>
                                        </div>

                                        <div className="pt-3 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500 mt-4">
                                            <span>{newsletter.storyCount} stories &bull; {newsletter.size}</span>
                                            {locked && <span className="text-[#58111A] font-bold">Subscribe to read &rarr;</span>}
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* Subscribe CTA Banner */}
                <section className="bg-[#58111A] rounded-3xl p-8 md:p-10 mb-12 text-white text-center shadow-xl">
                    <h2 className="text-2xl md:text-3xl font-serif font-bold mb-2">Never Miss Tomorrow&apos;s Intelligence Dispatch</h2>
                    <p className="text-white/80 max-w-xl mx-auto mb-6 text-sm">We scan 1,340+ articles daily so you don&apos;t have to. Get the top role-curated insights in your inbox every morning.</p>
                    <Link
                        href="/"
                        className="inline-block bg-white text-[#121212] font-bold px-8 py-3.5 rounded-xl hover:bg-gray-100 transition text-sm shadow-md"
                    >
                        Subscribe Free Now &rarr;
                    </Link>
                </section>

                {/* Previous Editions */}
                {olderNewsletters.length > 0 && (
                    <section>
                        <h2 className="text-xs font-bold uppercase tracking-widest text-[#58111A] mb-4">
                            Previous Editions
                        </h2>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {olderNewsletters.map(newsletter => (
                                <Link
                                    key={newsletter.slug}
                                    href={`/archive/${newsletter.slug}`}
                                    className="bg-white rounded-2xl border border-[#121212]/10 p-5 hover:border-[#58111A] hover:shadow-md transition-all group"
                                >
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="flex items-center gap-1.5 bg-[#58111A]/10 border border-[#58111A]/20 px-2.5 py-0.5 rounded-full">
                                            {renderSegmentIcon(newsletter.segment)}
                                            <span className="text-[11px] font-bold text-[#58111A] uppercase tracking-wider">
                                                {newsletter.segment}
                                            </span>
                                        </div>
                                    </div>

                                    <h3 className="text-sm font-serif font-bold mb-1 text-[#121212] group-hover:text-[#58111A] transition">
                                        {new Date(newsletter.date + 'T00:00:00').toLocaleDateString('en-US', {
                                            weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
                                        })}
                                    </h3>

                                    <p className="text-xs text-gray-500 line-clamp-2 mb-2 leading-relaxed">
                                        {newsletter.topHeadline}
                                    </p>

                                    <p className="text-[11px] text-gray-400 font-mono mt-2 pt-2 border-t border-gray-100">
                                        {newsletter.storyCount} stories &bull; {newsletter.size}
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
