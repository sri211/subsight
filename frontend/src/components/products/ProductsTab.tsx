import { ShoppingBag, Info, TrendingUp, AlertTriangle, Heart } from 'lucide-react'
import { researchApi } from '../../lib/api'
import { useResults } from '../../hooks/useResults'
import type { Product } from '../../types'
import { useState } from 'react'

const LABEL_STYLES: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  LOVED: { bg: 'bg-positive/10', text: 'text-positive', icon: <Heart className="w-3 h-3" /> },
  MIXED: { bg: 'bg-warning/10', text: 'text-warning', icon: <TrendingUp className="w-3 h-3" /> },
  CRITICIZED: { bg: 'bg-negative/10', text: 'text-negative', icon: <AlertTriangle className="w-3 h-3" /> },
}

function ProductCard({ product }: { product: Product }) {
  const [open, setOpen] = useState(false)
  const style = LABEL_STYLES[product.sentiment_label] || LABEL_STYLES.MIXED
  // sample_quotes[0] = "[Category] Why mentioned text" or just "Why mentioned text"
  const rawFirst = product.sample_quotes[0] || ''
  const catMatch = rawFirst.match(/^\[([^\]]+)\]\s*(.*)/)
  const displayCategory = catMatch ? catMatch[1] : (product.category || '')
  const why = catMatch ? catMatch[2].trim() : rawFirst
  const quotes = product.sample_quotes.slice(1)

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div
        className="p-5 cursor-pointer hover:bg-white/3 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-semibold text-primary">{product.name}</span>
              {product.category && (
                <span className="text-xs text-muted bg-white/5 px-2 py-0.5 rounded-full border border-border">
                  {product.category}
                </span>
              )}
            </div>
            {why && (
              <p className="text-xs text-muted mt-1">{why}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${style.bg} ${style.text}`}>
              {style.icon}
              {product.sentiment_label}
            </span>
            <span className="text-xs text-muted">{product.mentions} mention{product.mentions !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {open && quotes.length > 0 && (
        <div className="border-t border-border/50 bg-white/3 px-5 py-4 space-y-3">
          <p className="text-xs font-semibold text-muted uppercase tracking-widest">What Redditors said</p>
          {quotes.map((q, i) => (
            <blockquote key={i} className="text-sm text-primary/80 italic border-l-2 border-accent pl-3">
              "{q}"
            </blockquote>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ProductsTab({ jobId }: { jobId: string }) {
  const { data, loading } = useResults(() => researchApi.products(jobId), [jobId])

  if (loading || !data) {
    return <div className="flex items-center justify-center h-48 text-muted">Loading product data...</div>
  }

  const loved = data.filter(p => p.sentiment_label === 'LOVED')
  const criticized = data.filter(p => p.sentiment_label === 'CRITICIZED')
  const mixed = data.filter(p => p.sentiment_label === 'MIXED')

  return (
    <div className="space-y-6">
      {/* Header with explanation */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <ShoppingBag className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
          <div>
            <h2 className="text-lg font-bold text-primary mb-1">Product Radar</h2>
            <p className="text-sm text-muted leading-relaxed">
              AI-identified products and brands that Reddit users are actually discussing in the context of this topic.
              Each entry was validated by Claude to ensure it's relevant — not just any word that appeared in the posts.
            </p>
            <div className="flex gap-4 mt-3 text-xs text-muted">
              <span className="flex items-center gap-1.5 text-positive"><Heart className="w-3 h-3" /> LOVED = people recommend it</span>
              <span className="flex items-center gap-1.5 text-warning"><TrendingUp className="w-3 h-3" /> MIXED = divided opinions</span>
              <span className="flex items-center gap-1.5 text-negative"><AlertTriangle className="w-3 h-3" /> CRITICIZED = people complain about it</span>
            </div>
          </div>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-10 text-center">
          <ShoppingBag className="w-10 h-10 text-muted mx-auto mb-3 opacity-40" />
          <p className="text-muted font-medium">No specific products detected</p>
          <p className="text-xs text-muted/70 mt-1">Conversations may be general/educational rather than product-focused</p>
        </div>
      ) : (
        <>
          {loved.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-muted uppercase tracking-widest mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-positive inline-block" /> Loved by the community
              </h3>
              <div className="grid gap-3">
                {loved.map(p => <ProductCard key={p.id} product={p} />)}
              </div>
            </div>
          )}

          {criticized.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-muted uppercase tracking-widest mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-negative inline-block" /> Frequently criticized
              </h3>
              <div className="grid gap-3">
                {criticized.map(p => <ProductCard key={p.id} product={p} />)}
              </div>
            </div>
          )}

          {mixed.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-muted uppercase tracking-widest mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-warning inline-block" /> Mixed reactions
              </h3>
              <div className="grid gap-3">
                {mixed.map(p => <ProductCard key={p.id} product={p} />)}
              </div>
            </div>
          )}

          {/* Insight box */}
          <div className="bg-accent/5 border border-accent/20 rounded-2xl p-4 flex gap-3">
            <Info className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
            <div className="text-xs text-muted leading-relaxed">
              <strong className="text-primary">How to use this:</strong> LOVED products reveal what your target audience already trusts —
              these are your competitors or potential partners. CRITICIZED products reveal unmet needs — gaps in the market where
              your product could do better. MIXED products signal an opportunity if you can solve the specific complaints.
            </div>
          </div>
        </>
      )}
    </div>
  )
}
