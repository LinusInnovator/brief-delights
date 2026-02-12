'use client';

import { useState } from 'react';

type Segment = 'builders' | 'leaders' | 'innovators';

export default function SignupForm({
    preSelectedSegment,
    referrer
}: {
    preSelectedSegment?: Segment;
    referrer?: string | null;
}) {
    const [email, setEmail] = useState('');
    const [segment, setSegment] = useState<Segment>(preSelectedSegment || 'innovators');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Basic email validation
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setStatus('error');
            setMessage('Please enter a valid email address');
            return;
        }

        setStatus('loading');

        try {
            const response = await fetch('/api/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, segment, referrer })
            });

            const data = await response.json();

            if (response.ok) {
                setStatus('success');
                setMessage(data.message || 'Check your email to confirm your subscription! 📧');
                setEmail('');
            } else {
                setStatus('error');
                setMessage(data.error || 'Something went wrong. Please try again.');
            }
        } catch (error) {
            setStatus('error');
            setMessage('Network error. Please try again.');
        }
    };

    return (
        <div className="max-w-md mx-auto">
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email Input */}
                <div>
                    <label htmlFor="email-input" className="sr-only">Email address</label>
                    <input
                        id="email-input"
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-black focus:outline-none text-lg placeholder:text-gray-500 placeholder:opacity-100"
                        disabled={status === 'loading'}
                        aria-label="Email address"
                        aria-required="true"
                    />
                </div>

                {/* Segment Selector */}
                <div className="grid grid-cols-3 gap-2">
                    <button
                        type="button"
                        onClick={() => setSegment('builders')}
                        className={`py-2 px-3 rounded-lg border-2 font-semibold transition ${segment === 'builders'
                            ? 'bg-orange-500 text-white border-orange-500'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-orange-500'
                            }`}
                        disabled={status === 'loading'}
                    >
                        🛠️ Builder
                    </button>

                    <button
                        type="button"
                        onClick={() => setSegment('leaders')}
                        className={`py-2 px-3 rounded-lg border-2 font-semibold transition ${segment === 'leaders'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-blue-600'
                            }`}
                        disabled={status === 'loading'}
                    >
                        💼 Leader
                    </button>

                    <button
                        type="button"
                        onClick={() => setSegment('innovators')}
                        className={`py-2 px-3 rounded-lg border-2 font-semibold transition ${segment === 'innovators'
                            ? 'bg-purple-600 text-white border-purple-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-purple-600'
                            }`}
                        disabled={status === 'loading'}
                    >
                        🚀 Innovator
                    </button>
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={status === 'loading'}
                    className="w-full bg-black text-white py-3 rounded-lg font-semibold text-lg hover:bg-gray-800 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    {status === 'loading' ? 'Subscribing...' : 'Get Brief Daily'}
                </button>

                {/* Status Message */}
                {message && (
                    <div className={`p-4 rounded-lg text-center ${status === 'success'
                        ? 'bg-green-50 text-green-800 border border-green-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                        }`}>
                        {message}
                    </div>
                )}

                {/* Subtext */}
                <p className="text-center text-sm text-gray-500">
                    Free forever. Unsubscribe anytime. No spam, ever.
                </p>
            </form>
        </div>
    );
}
