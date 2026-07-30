import ClientPage from '../components/ClientPage';
import { createClient } from '../lib/supabase/client';

export const revalidate = 3600; // Cache and revalidate every hour (ISR for static delivery)

export interface ABVariantContent {
  banner_text?: string;
  banner_cta?: string;
  badge_text?: string;
  headline?: string;
  headline_accent?: string;
  subheadline?: string;
  cta_primary?: string;
  cta_secondary?: string;
}

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<{ ref?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const referrer = resolvedParams?.ref || null;

  return (
    <main className="min-h-screen bg-white">
      <ClientPage
        subscriberCount={1340}
        referrer={referrer}
      />
    </main>
  );
}
