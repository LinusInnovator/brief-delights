'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function NewsletterPage() {
    const params = useParams();
    const slug = params.slug as string;

    const [html, setHtml] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        async function loadNewsletter() {
            try {
                const response = await fetch(`/api/newsletters/${slug}`);

                if (!response.ok) {
                    setError(true);
                    return;
                }

                const htmlContent = await response.text();
                setHtml(htmlContent);
            } catch (err) {
                console.error('Error loading newsletter:', err);
                setError(true);
            } finally {
                setLoading(false);
            }
        }

        loadNewsletter();
    }, [slug]);

    if (loading) {
        return (
            <div className="min-h-screen bg-white">
                {/* Navigation Header */}
                <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                    <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
                        <Link href="/archive" className="text-gray-600 hover:text-black font-semibold">
                            ← Back to Archive
                        </Link>
                        <Link href="/" className="text-gray-600 hover:text-black font-semibold">
                            Home
                        </Link>
                    </div>
                </div>

                {/* Loading State */}
                <div className="flex items-center justify-center py-20">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading newsletter...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-4xl font-bold mb-4">Newsletter Not Found</h1>
                    <p className="text-gray-600 mb-6">This newsletter doesn't exist or has been removed.</p>
                    <Link href="/archive" className="text-blue-600 hover:underline font-semibold">
                        ← Back to Archive
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div>
            {/* Navigation Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
                    <Link href="/archive" className="text-gray-600 hover:text-black font-semibold">
                        ← Back to Archive
                    </Link>
                    <Link href="/" className="text-gray-600 hover:text-black font-semibold">
                        Home
                    </Link>
                </div>
            </div>

            {/* Newsletter Content */}
            <div dangerouslySetInnerHTML={{ __html: html }} />
        </div>
    );
}
