import type { CrossInterest } from '../../types'

interface Props { interests: CrossInterest[] }

const PALETTE = [
  '#5b8dee', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#a78bfa',
  '#10b981', '#e879f9', '#facc15', '#38bdf8', '#fb923c',
]

export default function InterestBubbles({ interests }: Props) {
  const max = Math.max(...interests.map(i => i.percentage), 1)

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <h3 className="text-sm font-semibold text-muted uppercase tracking-widest mb-4">
        Also Interested In
      </h3>
      <div className="flex flex-wrap gap-3 items-center justify-center min-h-[160px] py-4">
        {interests.map((item, i) => {
          const ratio = item.percentage / max
          const size = 60 + Math.round(ratio * 80)
          const color = PALETTE[i % PALETTE.length]
          return (
            <div
              key={item.subreddit}
              className="flex flex-col items-center justify-center rounded-full border-2 cursor-default hover:scale-105 transition-transform"
              style={{
                width: size,
                height: size,
                borderColor: color,
                background: `${color}15`,
              }}
              title={`${item.user_count} users (${item.percentage}%)`}
            >
              <div className="text-xs font-bold text-center leading-tight px-1" style={{ color }}>
                r/{item.subreddit.length > 8 ? item.subreddit.slice(0, 7) + '…' : item.subreddit}
              </div>
              {size > 80 && (
                <div className="text-xs text-muted mt-0.5">{item.percentage}%</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
