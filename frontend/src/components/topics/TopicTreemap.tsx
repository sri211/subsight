import { useState } from 'react'
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts'
import type { TopicCluster } from '../../types'

interface Props { topics: TopicCluster[] }

const SENTIMENT_COLORS: Record<string, string> = {
  positive: '#22c55e',
  neutral: '#5b8dee',
  negative: '#ef4444',
}

const CustomContent = (props: any) => {
  const { x, y, width, height, name, sentiment, size } = props
  if (width < 40 || height < 30) return null
  return (
    <g>
      <rect
        x={x + 2} y={y + 2}
        width={width - 4} height={height - 4}
        fill={SENTIMENT_COLORS[sentiment] || '#5b8dee'}
        fillOpacity={0.2}
        stroke={SENTIMENT_COLORS[sentiment] || '#5b8dee'}
        strokeWidth={1}
        rx={8}
      />
      {width > 80 && height > 40 && (
        <>
          <text x={x + 12} y={y + 24} fill="#f1f5f9" fontSize={13} fontWeight={600}>
            {name?.length > 20 ? name.slice(0, 18) + '…' : name}
          </text>
          {height > 60 && (
            <text x={x + 12} y={y + 40} fill="#64748b" fontSize={11}>
              {size} posts
            </text>
          )}
        </>
      )}
    </g>
  )
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-card border border-border rounded-xl p-4 text-sm max-w-xs">
      <div className="font-bold text-primary mb-1">{d.name}</div>
      <div className="text-muted mb-2">{d.size} posts · {d.sentiment}</div>
      {d.keywords?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {d.keywords.slice(0, 6).map((k: string) => (
            <span key={k} className="text-xs bg-border rounded px-2 py-0.5 text-muted">{k}</span>
          ))}
        </div>
      )}
    </div>
  )
}

export default function TopicTreemap({ topics }: Props) {
  const [selected, setSelected] = useState<TopicCluster | null>(null)

  const data = topics.map(t => ({
    ...t,
    value: t.size,
    children: undefined,
  }))

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-4 mb-4">
          <h3 className="text-sm font-semibold text-muted uppercase tracking-widest">Topic Clusters</h3>
          <div className="flex items-center gap-3 ml-auto text-xs text-muted">
            {Object.entries(SENTIMENT_COLORS).map(([label, color]) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ background: color, opacity: 0.7 }} />
                {label}
              </div>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={380}>
          <Treemap
            data={data}
            dataKey="value"
            content={<CustomContent />}
          >
            <Tooltip content={<CustomTooltip />} />
          </Treemap>
        </ResponsiveContainer>
      </div>

      {/* Topic keyword cards */}
      <div className="grid grid-cols-2 gap-3">
        {topics.map(t => (
          <div key={t.id} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-sm text-primary">{t.name}</span>
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{
                  background: `${SENTIMENT_COLORS[t.sentiment]}20`,
                  color: SENTIMENT_COLORS[t.sentiment],
                }}
              >
                {t.sentiment}
              </span>
            </div>
            <div className="text-xs text-muted mb-2">{t.size} posts</div>
            <div className="flex flex-wrap gap-1">
              {t.keywords.slice(0, 5).map(k => (
                <span key={k} className="text-xs bg-border/50 rounded px-2 py-0.5 text-muted">{k}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
