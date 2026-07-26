import type { CrossInterest } from '../../types'

interface Props { interests: CrossInterest[] }

export default function SubredditRanking({ interests }: Props) {
  const max = Math.max(...interests.map(i => i.percentage), 1)

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <h3 className="text-sm font-semibold text-muted uppercase tracking-widest mb-4">
        Subreddit Overlap Ranking
      </h3>
      <div className="space-y-3">
        {interests.slice(0, 20).map((item, idx) => (
          <div key={item.subreddit} className="flex items-center gap-4">
            <span className="text-xs text-muted w-5 text-right font-mono">{idx + 1}</span>
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-primary">r/{item.subreddit}</span>
                <span className="text-xs text-muted">{item.user_count} users · {item.percentage}%</span>
              </div>
              <div className="bg-border rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-700"
                  style={{ width: `${(item.percentage / max) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
