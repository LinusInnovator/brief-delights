'use client';

import { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import { IconStreamBuilders, IconStreamLeaders, IconStreamInnovators } from './EditorialIcons';

type Segment = 'builders' | 'leaders' | 'innovators';

export interface SignupFormRef {
    selectSegmentAndFocus: (segment: Segment) => void;
}

const SignupForm = forwardRef<SignupFormRef, {
    preSelectedSegment?: Segment;
    referrer?: string | null;
    abVariantId?: string | null;
}>(({ preSelectedSegment, referrer, abVariantId }, ref) => {
    const [email, setEmail] = useState('');
    const [segment, setSegment] = useState<Segment>(preSelectedSegment || 'innovators');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const emailInputRef = useRef<HTMLInputElement>(null);

    // Expose method to parent to select segment and focus email
    useImperativeHandle(ref, () => ({
        selectSegmentAndFocus: (newSegment: Segment) => {
            setSegment(newSegment);
            setTimeout(() => {
                emailInputRef.current?.focus();
            }, 100); // Small delay to ensure scroll completes
        }
    }));

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
                body: JSON.stringify({ email, segment, referrer, ab_variant_id: abVariantId })
            });

            const data = await response.json();

            if (response.ok) {
                setStatus('success');
                setMessage(data.message || 'Check your email to confirm your subscription!');
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
                        ref={emailInputRef}
                        id="email-input"
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-5 py-3.5 border-2 border-gray-200 rounded-xl focus:border-[#58111A] focus:outline-none text-base placeholder:text-gray-400 placeholder:opacity-100 text-gray-900 bg-white"
                        disabled={status === 'loading'}
                        aria-label="Email address"
                        aria-required="true"
                    />
                </div>

                {/* Segment Selector - Monocle Standard Micro-Vectors & Midnight Oxide */}
                <div className="grid grid-cols-3 gap-3">
                    <button
                        type="button"
                        onClick={() => setSegment('builders')}
                        className={`py-3 px-3 rounded-xl border-2 font-bold text-xs tracking-wider transition flex items-center justify-center gap-2 ${segment === 'builders'
                            ? 'bg-[#58111A] text-white border-[#58111A] shadow-md'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-[#58111A]'
                            }`}
                        disabled={status === 'loading'}
                    >
                        <IconStreamBuilders className={`w-4 h-4 ${segment === 'builders' ? 'text-white' : 'text-[#58111A]'}`} />
                        <span>Builder</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setSegment('leaders')}
                        className={`py-3 px-3 rounded-xl border-2 font-bold text-xs tracking-wider transition flex items-center justify-center gap-2 ${segment === 'leaders'
                            ? 'bg-[#58111A] text-white border-[#58111A] shadow-md'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-[#58111A]'
                            }`}
                        disabled={status === 'loading'}
                    >
                        <IconStreamLeaders className={`w-4 h-4 ${segment === 'leaders' ? 'text-white' : 'text-[#58111A]'}`} />
                        <span>Leader</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setSegment('innovators')}
                        className={`py-3 px-3 rounded-xl border-2 font-bold text-xs tracking-wider transition flex items-center justify-center gap-2 ${segment === 'innovators'
                            ? 'bg-[#58111A] text-white border-[#58111A] shadow-md'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-[#58111A]'
                            }`}
                        disabled={status === 'loading'}
                    >
                        <IconStreamInnovators className={`w-4 h-4 ${segment === 'innovators' ? 'text-white' : 'text-[#58111A]'}`} />
                        <span>Innovator</span>
                    </button>
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={status === 'loading'}
                    className="w-full bg-[#121212] text-white py-4 rounded-xl font-bold tracking-wide hover:bg-[#58111A] transition shadow-lg shadow-[#58111A]/10 disabled:bg-gray-400 disabled:cursor-not-allowed"
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
});

SignupForm.displayName = 'SignupForm';

export default SignupForm;
