'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, usePathname } from 'next/navigation';

interface NavSection {
    label: string;
    items: NavItem[];
}

interface NavItem {
    href: string;
    label: string;
    icon: string;
    badge?: string;
}

const NAV_SECTIONS: NavSection[] = [
    {
        label: 'Overview',
        items: [
            { href: '/dashboard', label: 'Dashboard', icon: '📊' },
            { href: '/admin/subscribers', label: 'Subscribers', icon: '👥' },
            { href: '/admin/growth', label: 'Growth', icon: '🚀' },
        ],
    },
    {
        label: 'Monetization',
        items: [
            { href: '/admin/sponsors', label: 'Sponsors', icon: '💰' },
            { href: '/admin/partnerships', label: 'Partnerships', icon: '🤝' },
        ],
    },
    {
        label: 'Intelligence',
        items: [
            { href: '/admin/sponsors/insights', label: 'Insights', icon: '🔍' },
            { href: '/admin/sponsors/analytics', label: 'Analytics', icon: '📈' },
            { href: '/admin/feedback', label: 'Feedback', icon: '💬' },
            { href: '/admin/ab-testing', label: 'A/B Testing', icon: '🧪' },
        ],
    },
];

export default function AdminSidebar() {
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [collapsed, setCollapsed] = useState(false);
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

    function isActive(href: string) {
        if (href === '/dashboard') return pathname === href;
        return pathname === href || (pathname?.startsWith(href) && href.length > 10);
    }

    if (!userEmail) return null;

    return (
        <aside
            className={`fixed left-0 top-0 h-screen bg-[#0f172a] text-white flex flex-col z-50 transition-all duration-300 ${collapsed ? 'w-[68px]' : 'w-[240px]'
                }`}
        >
            {/* Logo */}
            <div className="px-4 py-5 flex items-center justify-between border-b border-white/10">
                {!collapsed && (
                    <a href="/dashboard" className="flex items-center gap-2 group">
                        <span className="text-xl">✉️</span>
                        <span className="font-bold text-sm tracking-tight group-hover:text-blue-300 transition">
                            Brief Delights
                        </span>
                    </a>
                )}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="text-white/40 hover:text-white/80 transition text-sm p-1 rounded hover:bg-white/10"
                    title={collapsed ? 'Expand' : 'Collapse'}
                >
                    {collapsed ? '→' : '←'}
                </button>
            </div>

            {/* Nav Sections */}
            <nav className="flex-1 overflow-y-auto py-3 px-2">
                {NAV_SECTIONS.map((section) => (
                    <div key={section.label} className="mb-4">
                        {!collapsed && (
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 px-3 mb-1.5">
                                {section.label}
                            </p>
                        )}
                        <div className="space-y-0.5">
                            {section.items.map((item) => {
                                const active = isActive(item.href);
                                return (
                                    <a
                                        key={item.href}
                                        href={item.href}
                                        title={collapsed ? item.label : undefined}
                                        className={`
                                            flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all
                                            ${active
                                                ? 'bg-blue-600/20 text-blue-300 shadow-[inset_2px_0_0_#3b82f6]'
                                                : 'text-white/60 hover:text-white hover:bg-white/5'
                                            }
                                        `}
                                    >
                                        <span className="text-base flex-shrink-0">{item.icon}</span>
                                        {!collapsed && <span>{item.label}</span>}
                                        {!collapsed && item.badge && (
                                            <span className="ml-auto bg-blue-500/20 text-blue-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                                {item.badge}
                                            </span>
                                        )}
                                    </a>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            {/* User footer */}
            <div className="border-t border-white/10 px-3 py-3">
                {!collapsed ? (
                    <div className="flex items-center justify-between">
                        <div className="min-w-0">
                            <p className="text-xs text-white/50 truncate">{userEmail}</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="text-xs text-white/30 hover:text-red-400 transition px-2 py-1 rounded hover:bg-white/5 flex-shrink-0"
                        >
                            Logout
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={handleLogout}
                        title="Logout"
                        className="w-full text-center text-white/30 hover:text-red-400 transition py-1 rounded hover:bg-white/5"
                    >
                        ⏏
                    </button>
                )}
            </div>
        </aside>
    );
}
