import ClientPage from '../components/ClientPage';
import { createClient } from '../lib/supabase';
import { headers } from 'next/headers';

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

async function getSubscriberCount() {
  const supabase = createClient();
  try {
    const { count } = await supabase
      .from('subscribers')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'confirmed');
    return count || 0;
  } catch {
    return 0;
  }
}

export default async function Home({
  searchParams
}: {
  searchParams: { ref?: string }
}) {
  const subscriberCount = await getSubscriberCount();
  const referrer = searchParams.ref || null;

  // Read A/B variant from middleware headers
  const headersList = await headers();
  const variantId = headersList.get('x-ab-variant-id') || null;
  const experimentId = headersList.get('x-ab-experiment-id') || null;
  const variantContentRaw = headersList.get('x-ab-variant-content');

  let variantContent: ABVariantContent | null = null;
  try {
    if (variantContentRaw) {
      variantContent = JSON.parse(variantContentRaw);
    }
  } catch {
    variantContent = null;
  }

  return (
    <main className="min-h-screen bg-white">
      <ClientPage
        subscriberCount={subscriberCount}
        referrer={referrer}
        abVariant={variantContent}
        abVariantId={variantId}
        abExperimentId={experimentId}
      />
    </main>
  );
}
