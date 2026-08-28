'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function JoinRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get('ref') || 'VIP';
    try {
      localStorage.setItem('bd_referrer_code', ref);
    } catch {}
    router.replace(`/?ref=${encodeURIComponent(ref)}#signup`);
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 rounded-xl bg-[#3D0A11] p-2 flex items-center justify-center mx-auto shadow-md animate-pulse">
          <img src="/bd_seal_logo.png" alt="Seal" className="w-full h-full object-contain" />
        </div>
        <p className="text-xs font-mono tracking-widest text-[#58111A] uppercase">
          Activating VIP Invite & Redirecting...
        </p>
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <p className="text-xs font-mono text-[#58111A]">Loading VIP Invite...</p>
      </div>
    }>
      <JoinRedirectContent />
    </Suspense>
  );
}
