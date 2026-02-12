'use client';

import { useRef } from 'react';
import SignupForm, { SignupFormRef } from './SignupForm';

type Segment = 'builders' | 'leaders' | 'innovators';

export default function ClientPage({
    subscriberCount,
    referrer
}: {
    subscriberCount: number;
    referrer?: string | null;
}) {
    const signupFormRef = useRef<SignupFormRef>(null);

    const handleSegmentClick = (segment: Segment) => {
        // Scroll to signup section smoothly
        const signupSection = document.getElementById('signup');
        if (signupSection) {
            signupSection.scrollIntoView({ behavior: 'smooth' });
        }

        // After a brief delay, select segment and focus email
        setTimeout(() => {
            signupFormRef.current?.selectSegmentAndFocus(segment);
        }, 300); // Wait for scroll to mostly complete
    };

    return (
        <>
            {/* Hero Section */}
            <section className="max-w-6xl mx-auto px-6 py-20 text-center">
                <div className="inline-block bg-gray-100 px-4 py-2 rounded-full text-sm font-semibold text-gray-700 mb-6">
                    Tech Intelligence, Curated for Your Role
                </div>

                <h1 className="text-5xl md:text-6xl font-bold mb-6 text-gray-900 leading-tight">
                    Brief
                    <span className="block mt-2 bg-gradient-to-r from-orange-500 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                        delights
                    </span>
                </h1>

                <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
                    Get the top 14 stories that matter to your role—daily. Plus weekly strategic insights that connect the dots. We read 1,340+ articles so you don't have to.
                </p>

                <a
                    href="/archive"
                    className="inline-block bg-gray-900 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-800 transition"
                >
                    See Archive
                </a>

                <div className="mt-12 bg-gray-50 rounded-xl p-8 inline-block">
                    <p className="text-gray-700 font-mono text-sm">
                        1,340+ news scanned → ~400 analyzed → 14 selected daily
                    </p>
                </div>
            </section>

            {/* Segment Selector */}
            <section className="max-w-6xl mx-auto px-6 py-20">
                <h3 className="text-3xl font-bold text-center mb-12 text-gray-900">
                    Choose Your Brief
                </h3>

                <div className="grid md:grid-cols-3 gap-8">
                    {/* Builders Card */}
                    <div className="border-2 border-gray-200 rounded-xl p-8 hover:border-orange-500 hover:shadow-lg transition cursor-pointer group">
                        <div className="text-5xl mb-4">🛠️</div>
                        <h4 className="text-2xl font-bold mb-2 text-gray-900 group-hover:text-orange-500 transition">Builders</h4>
                        <p className="text-gray-600 mb-4">For engineers, developers, technical founders</p>
                        <p className="text-sm text-gray-500 mb-4">
                            Developer tools • Infrastructure • Open source
                        </p>
                        <button
                            onClick={() => handleSegmentClick('builders')}
                            className="w-full bg-orange-500 text-white py-3 rounded-lg font-semibold hover:bg-orange-600 transition"
                        >
                            Get Builder Brief
                        </button>
                    </div>

                    {/* Leaders Card */}
                    <div className="border-2 border-gray-200 rounded-xl p-8 hover:border-blue-600 hover:shadow-lg transition cursor-pointer group">
                        <div className="text-5xl mb-4">💼</div>
                        <h4 className="text-2xl font-bold mb-2 text-gray-900 group-hover:text-blue-600 transition">Leaders</h4>
                        <p className="text-gray-600 mb-4">For executives, managers, product leads</p>
                        <p className="text-sm text-gray-500 mb-4">
                            Business strategy • Leadership • Market trends
                        </p>
                        <button
                            onClick={() => handleSegmentClick('leaders')}
                            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
                        >
                            Get Leader Brief
                        </button>
                    </div>

                    {/* Innovators Card */}
                    <div className="border-2 border-gray-200 rounded-xl p-8 hover:border-purple-600 hover:shadow-lg transition cursor-pointer group">
                        <div className="text-5xl mb-4">🚀</div>
                        <h4 className="text-2xl font-bold mb-2 text-gray-900 group-hover:text-purple-600 transition">Innovators</h4>
                        <p className="text-gray-600 mb-4">For early adopters, AI enthusiasts, startup operators</p>
                        <p className="text-sm text-gray-500 mb-4">
                            Cutting-edge AI • Emerging tech • Venture trends
                        </p>
                        <button
                            onClick={() => handleSegmentClick('innovators')}
                            className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition"
                        >
                            Get Innovator Brief
                        </button>
                    </div>
                </div>
            </section>

            {/* Signup Section */}
            <section id="signup" className="max-w-6xl mx-auto px-6 py-20 bg-gray-50 scroll-mt-8">
                <h3 className="text-3xl font-bold text-center mb-4 text-gray-900">
                    Start Getting Brief
                </h3>
                <p className="text-center text-gray-600 mb-8 max-w-2xl mx-auto">
                    {subscriberCount > 0 ? (
                        <span className="font-semibold text-gray-900">
                            Join {subscriberCount.toLocaleString()} subscribers getting curated intelligence daily
                        </span>
                    ) : (
                        'Join subscribers getting curated intelligence daily'
                    )}
                </p>

                <SignupForm ref={signupFormRef} referrer={referrer} />
            </section>

            {/* Value Props */}
            <section className="max-w-6xl mx-auto px-6 py-20">
                <h3 className="text-3xl font-bold text-center mb-12 text-gray-900">
                    Why Brief Delights?
                </h3>

                <div className="grid md:grid-cols-3 gap-8">
                    <div className="text-center">
                        <div className="text-4xl mb-4">⏱️</div>
                        <h4 className="text-xl font-bold mb-2 text-gray-900">10 min daily read</h4>
                        <p className="text-gray-600">Not 2 hours of scrolling</p>
                    </div>

                    <div className="text-center">
                        <div className="text-4xl mb-4">🎯</div>
                        <h4 className="text-xl font-bold mb-2 text-gray-900">Personalized for your role</h4>
                        <p className="text-gray-600">Builder, Leader, or Innovator</p>
                    </div>

                    <div className="text-center">
                        <div className="text-4xl mb-4">📊</div>
                        <h4 className="text-xl font-bold mb-2 text-gray-900">Data-driven insights</h4>
                        <p className="text-gray-600">Trend detection, not just news</p>
                    </div>

                    <div className="text-center">
                        <div className="text-4xl mb-4">📅</div>
                        <h4 className="text-xl font-bold mb-2 text-gray-900">Sunday synthesis</h4>
                        <p className="text-gray-600">Strategic context for the week</p>
                    </div>

                    <div className="text-center">
                        <div className="text-4xl mb-4">💎</div>
                        <h4 className="text-xl font-bold mb-2 text-gray-900">Free forever</h4>
                        <p className="text-gray-600">No paywalls, no upsells</p>
                    </div>

                    <div className="text-center">
                        <div className="text-4xl mb-4">✨</div>
                        <h4 className="text-xl font-bold mb-2 text-gray-900">Editorially curated</h4>
                        <p className="text-gray-600">Premium quality, every story</p>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-gray-200 mt-20 py-8">
                <div className="max-w-6xl mx-auto px-6 text-center text-gray-600 text-sm">
                    <p><span className="font-semibold">brief delights</span> | A DreamValidator brand</p>
                    <p className="mt-2">© 2026 All rights reserved</p>
                </div>
            </footer>
        </>
    );
}
