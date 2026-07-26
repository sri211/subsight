import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

interface Props {
  data: { month: string; count: number }[]
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 text-sm">
      <div className="text-muted">{label}</div>
      <div className="text-primary font-semibold">{payload[0].value} posts</div>
    </div>
  )
}

export default function ActivityTimeline({ data }: Props) {
  if (!data.length) return null

  // Compute date range from data
  const months = data.map(d => d.month)
  const rangeLabel = months.length > 1 ? `${months[0]} – ${months[months.length - 1]}` : months[0] || ''

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-muted uppercase tracking-widest">Activity Over Time</h3>
        <span className="text-xs text-muted bg-border/60 px-2.5 py-1 rounded-full">
          {rangeLabel} · Pullpush.io archive
        </span>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#5b8dee" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#5b8dee" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3a" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#5b8dee"
            strokeWidth={2}
            fill="url(#blueGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
