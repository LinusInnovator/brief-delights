import SignupForm from '../components/SignupForm';
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
      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center">
          {/* Logo */}
          <h1 className="text-7xl font-bold tracking-tight mb-2 text-gray-900">
            Brief
          </h1>
          <p className="text-2xl tracking-[0.2em] text-gray-600 mb-8">
            delights
          </p>

          {/* Value Prop */}
          <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight text-gray-900">
            Tech Intelligence,<br />
            Curated for Your Role
          </h2>

          <p className="text-xl text-gray-700 max-w-3xl mx-auto mb-12 leading-relaxed">
            Get the top 14 stories that matter to your role—daily. Plus weekly strategic insights
            that connect the dots. We read 1,340+ articles so you don't have to.
          </p>

          {/* CTA Buttons */}
          <div className="flex gap-4 justify-center">
            <a href="#signup" className="bg-black text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-800 transition">
              Get Brief Daily
            </a>
            <a href="/archive" className="border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-lg font-semibold text-lg hover:border-gray-400 transition inline-block">
              See Archive
            </a>
          </div>

          {/* Transparency Metric */}
          <p className="mt-8 text-lg font-mono text-gray-700 font-medium">
            1,340+ news scanned → ~400 analyzed → 14 selected daily
          </p>
        </div>
      </section>

      {/* Segment Selector */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h3 className="text-3xl font-bold text-center mb-12 text-gray-900">
          Choose Your Brief
        </h3>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Builders Card */}
          <div className="border-2 border-gray-200 rounded-xl p-8 hover:border-orange-500 hover:shadow-lg transition cursor-pointer group">
            <div className="text-5xl mb-4">🛠️</div>
            <h4 className="text-2xl font-bold mb-2 text-gray-900 group-hover:text-orange-500 transition">Builders</h4>
            <p className="text-gray-600 mb-4">For engineers, developers, technical founders</p>
            <p className="text-sm text-gray-500 mb-4">
              Developer tools • Infrastructure • Open source
            </p>
            <a href="#signup" className="w-full bg-orange-500 text-white py-3 rounded-lg font-semibold hover:bg-orange-600 transition inline-block text-center">
              Get Builder Brief
            </a>
          </div>

          {/* Leaders Card */}
          <div className="border-2 border-gray-200 rounded-xl p-8 hover:border-blue-600 hover:shadow-lg transition cursor-pointer group">
            <div className="text-5xl mb-4">💼</div>
            <h4 className="text-2xl font-bold mb-2 text-gray-900 group-hover:text-blue-600 transition">Leaders</h4>
            <p className="text-gray-600 mb-4">For executives, managers, product leads</p>
            <p className="text-sm text-gray-500 mb-4">
              Business strategy • Leadership • Market trends
            </p>
            <a href="#signup" className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition inline-block text-center">
              Get Leader Brief
            </a>
          </div>

          {/* Innovators Card */}
          <div className="border-2 border-gray-200 rounded-xl p-8 hover:border-purple-600 hover:shadow-lg transition cursor-pointer group">
            <div className="text-5xl mb-4">🚀</div>
            <h4 className="text-2xl font-bold mb-2 text-gray-900 group-hover:text-purple-600 transition">Innovators</h4>
            <p className="text-gray-600 mb-4">For early adopters, AI enthusiasts, startup operators</p>
            <p className="text-sm text-gray-500 mb-4">
              Cutting-edge AI • Emerging tech • Venture trends
            </p>
            <a href="#signup" className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition inline-block text-center">
              Get Innovator Brief
            </a>
          </div>
        </div>
      </section>

      {/* Signup Section */}
      <section id="signup" className="max-w-6xl mx-auto px-6 py-20 bg-gray-50 scroll-mt-8">
        <h3 className="text-3xl font-bold text-center mb-4 text-gray-900">
          Start Getting Brief
        </h3>
        <p className="text-center text-gray-600 mb-8 max-w-2xl mx-auto">
          {subscriberCount > 0 ? (
            <span className="font-semibold text-gray-900">
              Join {subscriberCount}+ subscribers
            </span>
          ) : (
            <span>Join subscribers</span>
          )}{' '}
          getting curated intelligence daily
        </p>
        <SignupForm referrer={referrer} />
      </section>

      {/* Value Props Section */}
      <section className="max-w-6xl mx-auto px-6 py-20 bg-gray-50">
        <h3 className="text-3xl font-bold text-center mb-12 text-gray-900">
          Why Brief Delights?
        </h3>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="flex gap-4">
            <div className="text-3xl">⚡</div>
            <div>
              <h4 className="font-bold text-lg mb-2 text-gray-900">10 min daily read</h4>
              <p className="text-gray-600">Not 2 hours of scrolling</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="text-3xl">🎯</div>
            <div>
              <h4 className="font-bold text-lg mb-2 text-gray-900">Personalized for your role</h4>
              <p className="text-gray-600">Builder, Leader, or Innovator</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="text-3xl">📊</div>
            <div>
              <h4 className="font-bold text-lg mb-2 text-gray-900">Data-driven insights</h4>
              <p className="text-gray-600">Trend detection, not just news</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="text-3xl">🔮</div>
            <div>
              <h4 className="font-bold text-lg mb-2 text-gray-900">Sunday synthesis</h4>
              <p className="text-gray-600">Strategic context for the week</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="text-3xl">🆓</div>
            <div>
              <h4 className="font-bold text-lg mb-2 text-gray-900">Free forever</h4>
              <p className="text-gray-600">No paywalls, no upsells</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="text-3xl">✨</div>
            <div>
              <h4 className="font-bold text-lg mb-2 text-gray-900">Editorially curated</h4>
              <p className="text-gray-600">Premium quality, every story</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-12">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-gray-600 mb-4">
            <strong>brief delights</strong> | A DreamValidator brand
          </p>
          <p className="text-sm text-gray-500">
            © 2026 All rights reserved
          </p>
        </div>
      </footer>
    </main>
  );
}
