interface Props {
  data: { subreddit: string; count: number }[]
}

export default function SubredditBars({ data }: Props) {
  const max = Math.max(...data.map(d => d.count), 1)

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-muted uppercase tracking-widest">Top Subreddits</h3>
        <p className="text-xs text-muted/60 mt-1">
          Subreddits are topic-specific communities on Reddit (e.g. r/fitness = fitness community). More posts = more people in that community are discussing your topic.
        </p>
      </div>
      <div className="space-y-3">
        {data.slice(0, 7).map((item, i) => {
          const pct = Math.round(item.count / max * 100)
          const colors = ['#5b8dee', '#6c6fee', '#8b5cf6', '#a78bfa', '#7c3aed', '#5b21b6', '#4c1d95']
          return (
            <div key={item.subreddit}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-primary font-medium">r/{item.subreddit}</span>
                <span className="text-xs text-muted">{item.count} posts</span>
              </div>
              <div className="bg-border rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, background: colors[i % colors.length] }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
