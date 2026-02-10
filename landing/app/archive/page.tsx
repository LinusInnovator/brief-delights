import Link from 'next/link';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';

interface Newsletter {
    slug: string;
    segment: string;
    date: string;
    filename: string;
    size: string;
}

async function getNewsletters(): Promise<Newsletter[]> {
    const newslettersDir = join(process.cwd(), 'public', 'newsletters');

    try {
        const files = readdirSync(newslettersDir);
        const newsletters = files
            .filter(f => f.startsWith('newsletter_') && f.endsWith('.html'))
            .map(filename => {
                // Parse: newsletter_innovators_2026-02-09.html
                const match = filename.match(/newsletter_(\w+)_(\d{4}-\d{2}-\d{2})\.html/);
                if (!match) return null;

                const [, segment, date] = match;
                const filePath = join(newslettersDir, filename);
                const stats = statSync(filePath);
                const sizeKB = (stats.size / 1024).toFixed(1);

                return {
                    slug: `${date}-${segment}`,
                    segment,
                    date,
                    filename,
                    size: `${sizeKB} KB`
                };
            })
            .filter(Boolean) as Newsletter[];

        // Sort by date descending (newest first)
        newsletters.sort((a, b) => b.date.localeCompare(a.date));

        return newsletters;
    } catch (error) {
        console.error('Error reading newsletters:', error);
        return [];
    }
}

const segmentColors = {
    builders: 'bg-orange-500',
    leaders: 'bg-blue-600',
    innovators: 'bg-purple-600',
};

const segmentEmojis = {
    builders: '🛠️',
    leaders: '💼',
    innovators: '🚀',
};

export default async function ArchivePage() {
    const newsletters = await getNewsletters();

    return (
        <main className="min-h-screen bg-white">
            {/* Header */}
            <header className="border-b border-gray-200">
                <div className="max-w-6xl mx-auto px-6 py-8">
                    <Link href="/" className="inline-block mb-4 text-gray-600 hover:text-black">
                        ← Back to Home
                    </Link>
                    <h1 className="text-5xl font-bold mb-2">Brief</h1>
                    <p className="text-xl tracking-[0.2em] text-gray-600">delights</p>
                </div>
            </header>

            {/* Archive Grid */}
            <section className="max-w-6xl mx-auto px-6 py-12">
                <h2 className="text-3xl font-bold mb-8">Newsletter Archive</h2>

                {newsletters.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-gray-500 text-lg">No newsletters yet. Check back soon!</p>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {newsletters.map(newsletter => (
                            <Link
                                key={newsletter.slug}
                                href={`/archive/${newsletter.slug}`}
                                className="border-2 border-gray-200 rounded-xl p-6 hover:border-gray-400 hover:shadow-lg transition group"
                            >
                                {/* Segment Badge */}
                                <div className="flex items-center gap-2 mb-4">
                                    <span className={`${segmentColors[newsletter.segment as keyof typeof segmentColors]} text-white px-3 py-1 rounded-full text-sm font-semibold`}>
                                        {segmentEmojis[newsletter.segment as keyof typeof segmentEmojis]} {newsletter.segment}
                                    </span>
                                </div>

                                {/* Date */}
                                <h3 className="text-xl font-bold mb-2 group-hover:text-black transition">
                                    {new Date(newsletter.date).toLocaleDateString('en-US', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </h3>

                                {/* Metadata */}
                                <p className="text-sm text-gray-500">
                                    {newsletter.size} • 14 stories
                                </p>
                            </Link>
                        ))}
                    </div>
                )}
            </section>

            {/* Footer */}
            <footer className="border-t border-gray-200 py-12 mt-20">
                <div className="max-w-6xl mx-auto px-6 text-center">
                    <p className="text-gray-600 mb-4">
                        <strong>brief delights</strong> | A DreamValidator brand
                    </p>
                    <p className="text-sm text-gray-500">
                        © 2026 All rights reserved
                    </p>
                </div>
            </footer>
        </main>
    );
}
