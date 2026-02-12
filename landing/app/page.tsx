import ClientPage from '../components/ClientPage';
import { createClient } from '../lib/supabase';

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

  return (
    <main className="min-h-screen bg-white">
      <ClientPage subscriberCount={subscriberCount} referrer={referrer} />
    </main>
  );
}
