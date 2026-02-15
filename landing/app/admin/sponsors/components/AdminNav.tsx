'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function AdminNav() {
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const supabase = createClient();
        supabase.auth.getSession().then(({ data: { session } }: { data: { session: any } }) => {
            setUserEmail(session?.user?.email || null);
        });
    }, []);

    async function handleLogout() {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push('/admin/login');
    }

    if (!userEmail) return null;

    return (
        <div className="bg-white border-b border-gray-200 px-8 py-4">
            <div className="max-w-6xl mx-auto flex justify-between items-center">
                <div className="flex items-center gap-6">
                    <h1 className="text-lg font-bold text-gray-900">
                        📊 Brief Delights Admin
                    </h1>
                    <nav className="flex gap-4">
                        <a
                            href="/admin/sponsors"
                            className="text-sm text-gray-600 hover:text-gray-900"
                        >
                            Pipeline
                        </a>
                        <a
                            href="/admin/sponsors/insights"
                            className="text-sm text-gray-600 hover:text-gray-900"
                        >
                            Insights
                        </a>
                        <a
                            href="/admin/partnerships"
                            className="text-sm text-gray-600 hover:text-gray-900"
                        >
                            Partnerships
                        </a>
                        <a
                            href="/admin/sponsors/analytics"
                            className="text-sm text-gray-600 hover:text-gray-900"
                        >
                            Analytics
                        </a>
                    </nav>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">{userEmail}</span>
                    <button
                        onClick={handleLogout}
                        className="text-sm text-gray-600 hover:text-gray-900"
                    >
                        Logout
                    </button>
                </div>
            </div>
        </div>
    );
}
