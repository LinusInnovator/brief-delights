import ClientPage from '../components/ClientPage';
import { Suspense } from 'react';

// Force 100% Static Edge Pre-rendering (< 50ms Edge CDN delivery)
export const dynamic = 'force-static';
export const revalidate = 86400; // Cache and revalidate daily

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <Suspense fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="animate-pulse text-gray-400">Loading Brief Delights...</div>
        </div>
      }>
        <ClientPage subscriberCount={1340} />
      </Suspense>
    </main>
  );
}
