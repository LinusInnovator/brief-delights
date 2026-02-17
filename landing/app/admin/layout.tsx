'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import AdminSidebar from './components/AdminSidebar';
import { ToastProvider } from './components/Toast';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [authState, setAuthState] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        // Skip auth check on the login page itself
        if (pathname === '/admin/login') {
            setAuthState('authenticated'); // let login page render
            return;
        }

        const supabase = createClient();
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                setAuthState('authenticated');
            } else {
                setAuthState('unauthenticated');
                router.replace('/admin/login');
            }
        });
    }, [pathname, router]);

    // Login page — render without sidebar
    if (pathname === '/admin/login') {
        return <ToastProvider>{children}</ToastProvider>;
    }

    // Loading state
    if (authState === 'loading') {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin h-8 w-8 border-3 border-blue-600 border-t-transparent rounded-full" />
                    <p className="text-sm text-gray-500">Verifying access...</p>
                </div>
            </div>
        );
    }

    // Unauthenticated — show nothing (redirect is in progress)
    if (authState === 'unauthenticated') {
        return null;
    }

    return (
        <ToastProvider>
            <div className="flex min-h-screen bg-gray-50">
                <AdminSidebar />
                <main className="flex-1 ml-[240px] transition-all duration-300">
                    {children}
                </main>
            </div>
        </ToastProvider>
    );
}
