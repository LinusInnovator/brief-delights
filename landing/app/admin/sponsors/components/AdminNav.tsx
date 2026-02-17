'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, usePathname } from 'next/navigation';

const NAV_ITEMS = [
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/admin/subscribers', label: 'Subscribers', icon: '👥' },
    { href: '/admin/growth', label: 'Growth', icon: '🚀' },
    { href: '/admin/sponsors', label: 'Sponsors', icon: '💰' },
    { href: '/admin/partnerships', label: 'Partnerships', icon: '🤝' },
    { href: '/admin/sponsors/insights', label: 'Insights', icon: '🔍' },
    { href: '/admin/sponsors/analytics', label: 'Analytics', icon: '📈' },
];

export default function AdminNav() {
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const router = useRouter();
    const pathname = usePathname();

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
        <div className="bg-white border-b border-gray-200 px-8 py-4 sticky top-0 z-50">
            <div className="max-w-6xl mx-auto flex justify-between items-center">
                <div className="flex items-center gap-6">
                    <a href="/dashboard" className="text-lg font-bold text-gray-900 hover:text-blue-600 transition">
                        ✉️ Brief Delights
                    </a>
                    <nav className="flex gap-1">
                        {NAV_ITEMS.map((item) => {
                            const isActive = pathname === item.href ||
                                (item.href !== '/dashboard' && pathname?.startsWith(item.href) && item.href.length > 10);

                            return (
                                <a
                                    key={item.href}
                                    href={item.href}
                                    className={`
                                        px-3 py-1.5 rounded-md text-sm font-medium transition
                                        ${isActive
                                            ? 'bg-blue-50 text-blue-700'
                                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                        }
                                    `}
                                >
                                    {item.icon} {item.label}
                                </a>
                            );
                        })}
                    </nav>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500">{userEmail}</span>
                    <button
                        onClick={handleLogout}
                        className="text-sm text-gray-500 hover:text-gray-900 px-3 py-1.5 rounded-md hover:bg-gray-50 transition"
                    >
                        Logout
                    </button>
                </div>
            </div>
        </div>
    );
}
