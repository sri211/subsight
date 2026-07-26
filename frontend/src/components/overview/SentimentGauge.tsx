import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

interface Props {
  breakdown: { positive: number; negative: number; neutral: number }
}

const COLORS = ['#22c55e', '#64748b', '#ef4444']
const LABELS = ['Positive', 'Neutral', 'Negative']

export default function SentimentGauge({ breakdown }: Props) {
  const total = breakdown.positive + breakdown.negative + breakdown.neutral || 1
  const score = Math.round((breakdown.positive / total) * 100)

  const data = [
    { name: 'Positive', value: breakdown.positive },
    { name: 'Neutral', value: breakdown.neutral },
    { name: 'Negative', value: breakdown.negative },
  ]

  const scoreColor = score >= 60 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444'

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-muted uppercase tracking-widest">Sentiment Score</h3>
        <p className="text-xs text-muted/60 mt-1">How positively/negatively people write about this topic. High score = people like it; low score = lots of complaints or skepticism.</p>
      </div>
      <div className="flex items-center gap-6">
        <div className="relative">
          <ResponsiveContainer width={140} height={140}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={65}
                paddingAngle={2}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-extrabold" style={{ color: scoreColor }}>{score}</span>
            <span className="text-xs text-muted">/ 100</span>
          </div>
        </div>

        <div className="space-y-3 flex-1">
          {data.map((item, i) => (
            <div key={item.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i] }} />
                <span className="text-sm text-muted">{item.name}</span>
              </div>
              <span className="text-sm font-semibold text-primary">
                {Math.round(item.value / total * 100)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
