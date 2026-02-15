'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function AuthCallbackPage() {
    const router = useRouter();

    useEffect(() => {
        const handleAuth = async () => {
            const supabase = createClient();

            // Check if this is a password recovery flow
            // Supabase sends recovery tokens in the hash fragment like: #access_token=...&type=recovery
            const hashParams = new URLSearchParams(window.location.hash.substring(1));
            const type = hashParams.get('type');

            // Handle the auth callback
            const { error } = await supabase.auth.getSession();

            if (error) {
                console.error('Auth error:', error);
                router.push('/admin/login');
                return;
            }

            // If this is a password recovery, go to reset password page
            if (type === 'recovery') {
                router.push('/auth/reset-password');
            } else {
                // Otherwise go to dashboard
                router.push('/admin/sponsors');
            }
        };

        handleAuth();
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-gray-600">Processing authentication...</p>
            </div>
        </div>
    );
}
