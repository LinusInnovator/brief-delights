import React from 'react';

// Monocle Standard - Bespoke Engraved Micro-Vector Illustrations (Single-weight 1.25px stroke, Crimson/Gold accents)

export function IconDailyRead({ className = "w-8 h-8 text-[#58111A]" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Pocket Watch Outer Ring */}
      <circle cx="16" cy="18" r="10" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16" cy="18" r="8" stroke="currentColor" strokeWidth="0.75" strokeDasharray="1 2.5" />
      {/* Winder Crown */}
      <path d="M16 8V5M14 5H18" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16" cy="3" r="1.5" stroke="currentColor" strokeWidth="1" />
      {/* Precision Hands */}
      <path d="M16 18L16 12.5M16 18L20 18" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16" cy="18" r="1" fill="currentColor" />
    </svg>
  );
}

export function IconPersonalizedRole({ className = "w-8 h-8 text-[#58111A]" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Architect's Compass */}
      <path d="M16 4L9 26M16 4L23 26" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
      {/* Compass Joint */}
      <circle cx="16" cy="5" r="2" stroke="currentColor" strokeWidth="1.25" fill="#FAF8F5" />
      {/* Crossbar Rule */}
      <path d="M11.5 18H20.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      <path d="M13 16V18M16 16V18M19 16V18" stroke="currentColor" strokeWidth="0.75" />
    </svg>
  );
}

export function IconDataDriven({ className = "w-8 h-8 text-[#58111A]" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Ledger Grid Frame */}
      <rect x="5" y="6" width="22" height="20" rx="2" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      {/* Horizontal Rules */}
      <line x1="5" y1="12" x2="27" y2="12" stroke="currentColor" strokeWidth="0.75" />
      <line x1="5" y1="18" x2="27" y2="18" stroke="currentColor" strokeWidth="0.75" />
      {/* Vertical Column Rule */}
      <line x1="12" y1="6" x2="12" y2="26" stroke="currentColor" strokeWidth="0.75" />
      {/* Trend Nodes */}
      <circle cx="16" cy="21" r="1.5" fill="currentColor" />
      <circle cx="20" cy="15" r="1.5" fill="currentColor" />
      <circle cx="24" cy="9" r="1.5" fill="currentColor" />
      <path d="M16 21L20 15L24 9" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconSundaySynthesis({ className = "w-8 h-8 text-[#58111A]" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Solar Astrolabe Ring */}
      <circle cx="16" cy="16" r="8" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="16" cy="16" r="3" stroke="currentColor" strokeWidth="1" fill="#FAF8F5" />
      {/* Radial Sun Rays */}
      <path d="M16 3V6M16 26V29M3 16H6M26 16H29" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      <path d="M6.8 6.8L8.9 8.9M23.1 23.1L25.2 25.2M6.8 25.2L8.9 23.1M23.1 8.9L25.2 6.8" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

export function IconFreeForever({ className = "w-8 h-8 text-[#58111A]" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Engraved Wax Ribbon Seal */}
      <circle cx="16" cy="13" r="8" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="16" cy="13" r="6" stroke="currentColor" strokeWidth="0.75" strokeDasharray="1.5 1.5" />
      <path d="M13 13L15 15L19 11" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
      {/* Ribbon Tails */}
      <path d="M12 20L9 28L13.5 26.5L15 28L14.5 20.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 20L23 28L18.5 26.5L17 28L17.5 20.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconEditoriallyCurated({ className = "w-8 h-8 text-[#58111A]" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Vintage Quill Nib */}
      <path d="M24 4C24 4 18 10 16 16C14 22 13 27 13 27L10 27C10 27 11.5 21 14 15C16.5 9 24 4 24 4Z" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="16" y1="16" x2="11" y2="24" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      {/* Inkwell Base */}
      <path d="M5 27H27" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      <path d="M20 22C20 22 22 24 22 27H18C18 24 20 22 20 22Z" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Role Stream Edition Icons (Monocle Standard)

export function IconStreamBuilders({ className = "w-8 h-8 text-[#58111A]" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Crossed Drafting Wrenches / Calipers */}
      <path d="M7 25L17 15M15 17L25 7" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      <circle cx="24" cy="8" r="3" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="8" cy="24" r="3" stroke="currentColor" strokeWidth="1.25" />
      <path d="M12 8L24 20" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      <circle cx="12" cy="8" r="1.5" fill="currentColor" />
      <circle cx="20" cy="24" r="1.5" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

export function IconStreamLeaders({ className = "w-8 h-8 text-[#58111A]" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Executive Leather Briefcase */}
      <rect x="5" y="10" width="22" height="16" rx="3" stroke="currentColor" strokeWidth="1.25" />
      {/* Handle */}
      <path d="M12 10V7C12 5.9 12.9 5 14 5H18C19.1 5 20 5.9 20 7V10" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      {/* Brass Clasp & Straps */}
      <line x1="11" y1="10" x2="11" y2="26" stroke="currentColor" strokeWidth="0.75" />
      <line x1="21" y1="10" x2="21" y2="26" stroke="currentColor" strokeWidth="0.75" />
      <rect x="14.5" y="15" width="3" height="3" rx="0.5" stroke="currentColor" strokeWidth="1" fill="#FAF8F5" />
    </svg>
  );
}

export function IconStreamInnovators({ className = "w-8 h-8 text-[#58111A]" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Vintage Rocket / Frontier Impulse Mark */}
      <path d="M16 4C16 4 23 9 23 18L16 23L9 18C9 9 16 4 16 4Z" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16" cy="13" r="2.5" stroke="currentColor" strokeWidth="1" fill="#FAF8F5" />
      {/* Fins */}
      <path d="M9 18L5 22L9 23" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M23 18L27 22L23 23" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
      {/* Exhaust Impulse Rays */}
      <path d="M14 26L16 29L18 26" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
