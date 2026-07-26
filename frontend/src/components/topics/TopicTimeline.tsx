import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import type { TopicCluster } from '../../types'

interface Props { topics: TopicCluster[] }

const COLORS = ['#5b8dee', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16']

export default function TopicTimeline({ topics }: Props) {
  // Build a unified month list across all topics
  const allMonths = new Set<string>()
  topics.forEach(t => Object.keys(t.monthly_counts || {}).forEach(m => allMonths.add(m)))

  if (allMonths.size < 2) return null

  const sortedMonths = Array.from(allMonths).sort((a, b) => {
    try {
      return new Date(a).getTime() - new Date(b).getTime()
    } catch {
      return a.localeCompare(b)
    }
  })

  const data = sortedMonths.map(month => {
    const row: Record<string, any> = { month }
    topics.forEach(t => {
      row[t.name] = t.monthly_counts?.[month] ?? 0
    })
    return row
  })

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <h3 className="text-sm font-semibold text-muted uppercase tracking-widest mb-4">Topic Trends Over Time</h3>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3a" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 8 }}
            labelStyle={{ color: '#64748b', fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: '#64748b' }} />
          {topics.map((t, i) => (
            <Area
              key={t.name}
              type="monotone"
              dataKey={t.name}
              stackId="1"
              stroke={COLORS[i % COLORS.length]}
              fill={COLORS[i % COLORS.length]}
              fillOpacity={0.15}
              strokeWidth={1.5}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
