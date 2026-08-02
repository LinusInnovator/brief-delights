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
    iconId: string;
    badge?: string;
}

function getNavIcon(id: string) {
  switch (id) {
    case 'dashboard':
      return <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M9 19v-6a2 2 0 012-2h2a2 2 0 012 2v6a2 2 0 01-2 2h-2a2 2 0 01-2-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>;
    case 'subscribers':
      return <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>;
    case 'growth':
      return <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>;
    case 'social':
      return <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.684A1.761 1.761 0 013 12V8a1.761 1.761 0 012.436-1.684l4.58-1.527A1.76 1.76 0 0112 6.471v11.058a1.76 1.76 0 01-1.984 1.742l-4.58-1.587z"/></svg>;
    case 'sponsors':
      return <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>;
    case 'partnerships':
      return <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>;
    case 'pitcher':
      return <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"/></svg>;
    case 'insights':
      return <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>;
    case 'analytics':
      return <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M9 19v-6a2 2 0 012-2h2a2 2 0 012 2v6a2 2 0 01-2 2h-2a2 2 0 01-2-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>;
    case 'feedback':
      return <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>;
    case 'abtesting':
      return <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L5.595 15.12a2 2 0 00-1.802.77M15.428 19.428a2 2 0 00.547-1.022l.477-2.387a6 6 0 00-.517-3.86l-.158-.318a6 6 0 01-.517-3.86L15.12 5.595a2 2 0 00-.77-1.802M12 3v1m0 16v1m9-9h-1M4 12H3"/></svg>;
    default:
      return null;
  }
}

const NAV_SECTIONS: NavSection[] = [
    {
        label: 'Overview',
        items: [
            { href: '/dashboard', label: 'Dashboard', iconId: 'dashboard' },
            { href: '/admin/subscribers', label: 'Subscribers', iconId: 'subscribers' },
            { href: '/admin/growth', label: 'Growth', iconId: 'growth' },
        ],
    },
    {
        label: 'Monetization & Distribution',
        items: [
            { href: '/admin/social-publisher', label: 'Reddit & Social', iconId: 'social', badge: '1-CLICK' },
            { href: '/admin/sponsors', label: 'Sponsors', iconId: 'sponsors' },
            { href: '/admin/partnerships', label: 'Partnerships', iconId: 'partnerships' },
            { href: '/admin/b2b-pitcher', label: 'Engine Pitcher', iconId: 'pitcher', badge: 'NEW' },
        ],
    },
    {
        label: 'Intelligence',
        items: [
            { href: '/admin/sponsors/insights', label: 'Insights', iconId: 'insights' },
            { href: '/admin/sponsors/analytics', label: 'Analytics', iconId: 'analytics' },
            { href: '/admin/feedback', label: 'Feedback', iconId: 'feedback' },
            { href: '/admin/ab-testing', label: 'A/B Testing', iconId: 'abtesting' },
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
            className={`fixed left-0 top-0 h-screen bg-[#3D0A11] text-white flex flex-col z-50 transition-all duration-300 border-r border-[#C5A059]/20 ${collapsed ? 'w-[68px]' : 'w-[240px]'
                }`}
        >
            {/* Logo */}
            <div className="px-4 py-5 flex items-center justify-between border-b border-[#C5A059]/20 bg-[#2D070C]">
                {!collapsed && (
                    <a href="/dashboard" className="flex items-center gap-2.5 group">
                        <div className="w-8 h-8 rounded-lg bg-white/10 border border-[#C5A059]/30 flex items-center justify-center p-1">
                            <img src="/bd_seal_logo.png" alt="Brief Delights" className="w-6 h-6 object-contain" />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-serif font-bold text-sm tracking-tight text-white group-hover:text-[#C5A059] transition">
                                Brief Delights
                            </span>
                            <span className="text-[9px] text-[#C5A059] font-mono tracking-widest uppercase">Studio</span>
                        </div>
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
                                                ? 'bg-[#58111A] text-white font-bold border-l-2 border-[#C5A059] shadow-sm'
                                                : 'text-white/70 hover:text-white hover:bg-white/5'
                                            }
                                        `}
                                    >
                                        <span className="flex-shrink-0">{getNavIcon(item.iconId)}</span>
                                        {!collapsed && <span>{item.label}</span>}
                                        {!collapsed && item.badge && (
                                            <span className="ml-auto bg-[#C5A059]/20 text-[#C5A059] border border-[#C5A059]/30 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
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
