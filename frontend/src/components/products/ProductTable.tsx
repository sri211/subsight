import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { Product } from '../../types'

interface Props { products: Product[] }

const LABEL_STYLES: Record<string, { bg: string; text: string }> = {
  LOVED: { bg: 'bg-positive/10', text: 'text-positive' },
  MIXED: { bg: 'bg-warning/10', text: 'text-warning' },
  CRITICIZED: { bg: 'bg-negative/10', text: 'text-negative' },
}

const LABEL_COLORS: Record<string, string> = {
  LOVED: '#22c55e',
  MIXED: '#f59e0b',
  CRITICIZED: '#ef4444',
}

export default function ProductTable({ products }: Props) {
  const [expanded, setExpanded] = useState<number | null>(null)
  const top12 = products.slice(0, 12)

  return (
    <div className="space-y-4">
      {/* Bar chart */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-muted uppercase tracking-widest mb-4">Mentions by Product</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={top12} layout="vertical" margin={{ left: 80, right: 20 }}>
            <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
            <YAxis
              type="category" dataKey="name" width={75}
              tick={{ fontSize: 11, fill: '#f1f5f9' }} tickLine={false} axisLine={false}
            />
            <Tooltip
              contentStyle={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 8 }}
              labelStyle={{ color: '#64748b' }}
            />
            <Bar dataKey="mentions" radius={[0, 4, 4, 0]}>
              {top12.map(p => (
                <Cell key={p.id} fill={LABEL_COLORS[p.sentiment_label] || '#5b8dee'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-6 py-3 text-xs font-semibold text-muted uppercase tracking-widest">Product / Brand</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-widest">Mentions</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-widest">Sentiment</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-widest">Sample Quote</th>
            </tr>
          </thead>
          <tbody>
            {products.map(product => {
              const style = LABEL_STYLES[product.sentiment_label] || LABEL_STYLES.MIXED
              const isExp = expanded === product.id
              return (
                <>
                  <tr
                    key={product.id}
                    onClick={() => setExpanded(isExp ? null : product.id)}
                    className="border-b border-border/50 hover:bg-white/3 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-3 text-sm font-medium text-primary">{product.name}</td>
                    <td className="px-4 py-3 text-sm text-muted">{product.mentions}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${style.bg} ${style.text}`}>
                        {product.sentiment_label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted max-w-xs truncate">
                      {product.sample_quotes[0] || '—'}
                    </td>
                  </tr>
                  {isExp && product.sample_quotes.length > 1 && (
                    <tr className="bg-white/3">
                      <td colSpan={4} className="px-6 py-3">
                        <div className="space-y-2">
                          {product.sample_quotes.map((q, i) => (
                            <p key={i} className="text-xs text-muted italic">"{q}"</p>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
