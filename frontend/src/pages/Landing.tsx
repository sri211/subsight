import { Link } from 'react-router-dom'
import { TrendingUp, Coins, Target, MessageCircle, Layers, Package, Globe } from 'lucide-react'
import { CREDIT_PACKS } from '../types'

const FEATURES = [
  { icon: Target, label: 'Customer Personas', desc: 'Real archetypes distilled from real conversations, not guesswork' },
  { icon: MessageCircle, label: 'AI Chat Agent', desc: 'Ask natural-language questions about your research data' },
  { icon: Layers, label: 'Topic Clusters', desc: 'See exactly what people actually talk about, grouped and named' },
  { icon: Package, label: 'Product Radar', desc: 'Which products your audience already loves — or complains about' },
  { icon: Globe, label: 'Cross-Interests', desc: 'Where else your audience spends time, for smarter targeting' },
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Top bar */}
      <header className="border-b border-border px-4 sm:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-accent" />
          <span className="text-lg sm:text-xl font-bold text-primary">SubSight</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/login"
            className="text-sm text-muted hover:text-primary transition-colors px-3 py-2"
          >
            Log In
          </Link>
          <Link
            to="/signup"
            className="bg-accent text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-500 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="flex flex-col items-center justify-center px-4 sm:px-6 py-14 sm:py-20 text-center">
          <div className="w-full max-w-2xl">
            <h1 className="text-3xl sm:text-5xl font-extrabold text-primary leading-tight mb-4">
              Understand your customers<br />
              <span className="text-accent">through Reddit</span>
            </h1>
            <p className="text-muted text-base sm:text-lg mb-8">
              Enter a topic. SubSight scrapes real Reddit conversations, extracts insights,
              builds customer personas, and lets you ask AI questions about the data —
              market research startup founders actually use.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/signup"
                className="bg-accent text-white font-semibold px-8 py-4 rounded-xl hover:bg-blue-500 transition-colors"
              >
                Get Started — 50 free credits
              </Link>
              <Link
                to="/login"
                className="bg-card border border-border text-primary font-semibold px-8 py-4 rounded-xl hover:border-accent transition-colors"
              >
                Log In
              </Link>
            </div>
          </div>
        </section>

        {/* Feature grid */}
        <section className="px-4 sm:px-6 pb-14 sm:pb-20">
          <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {FEATURES.map(f => {
              const Icon = f.icon
              return (
                <div key={f.label} className="bg-card border border-border rounded-xl p-5 text-center">
                  <Icon className="w-6 h-6 text-accent mx-auto mb-3" />
                  <div className="text-sm font-semibold text-primary">{f.label}</div>
                  <div className="text-xs text-muted mt-1.5 leading-relaxed">{f.desc}</div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Pricing */}
        <section className="px-4 sm:px-6 pb-16 sm:pb-24 border-t border-border pt-14 sm:pt-20">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-primary mb-2 flex items-center justify-center gap-2">
              <Coins className="w-6 h-6 text-accent" /> Simple, usage-based pricing
            </h2>
            <p className="text-muted text-sm mb-10">
              1 credit = 1 post analyzed. No subscriptions — buy credits, use them whenever.
              Every new account starts with 50 free credits.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {CREDIT_PACKS.map(pack => (
                <div key={pack.id} className="bg-card border border-border rounded-2xl p-6">
                  <div className="text-xs text-muted uppercase tracking-widest font-semibold mb-2">{pack.label}</div>
                  <div className="text-3xl font-extrabold text-primary mb-1">
                    ₹{pack.priceRupees.toLocaleString('en-IN')}
                  </div>
                  <div className="text-sm text-muted flex items-center justify-center gap-1">
                    <Coins className="w-3.5 h-3.5 text-accent" /> {pack.credits.toLocaleString()} SC
                  </div>
                </div>
              ))}
            </div>
            <Link
              to="/signup"
              className="inline-block mt-10 bg-accent text-white font-semibold px-8 py-4 rounded-xl hover:bg-blue-500 transition-colors"
            >
              Get Started — 50 free credits
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-4 sm:px-8 py-6 text-center text-xs text-muted">
        SubSight — Reddit intelligence for startup founders
      </footer>
    </div>
  )
}
