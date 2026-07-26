import type { PainPoint } from '../../types'

interface Props { painPoints: PainPoint[] }

export default function PainPointsBars({ painPoints }: Props) {
  const max = Math.max(...painPoints.map(p => p.frequency), 1)

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-muted uppercase tracking-widest">Pain Points by Frequency</h3>
        <p className="text-xs text-muted/70 mt-1">Problems Reddit users complain about most often — scored 1-10 by Claude based on how many posts mention them. High scores = validated market pain.</p>
      </div>
      <div className="space-y-4">
        {painPoints.map(pp => {
          const pct = Math.round(pp.frequency / max * 100)
          const intensityColor = pp.frequency >= 8 ? '#ef4444' : pp.frequency >= 5 ? '#f59e0b' : '#5b8dee'
          return (
            <div key={pp.id}>
              <div className="flex items-start justify-between mb-1.5 gap-3">
                <span className="text-sm text-primary flex-1">{pp.description}</span>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: `${intensityColor}20`, color: intensityColor }}
                >
                  {pp.frequency}/10
                </span>
              </div>
              <div className="bg-border rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, background: intensityColor }}
                />
              </div>
              {pp.quotes.length > 0 && (
                <p className="text-xs text-muted mt-1.5 italic">"{pp.quotes[0]}"</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
