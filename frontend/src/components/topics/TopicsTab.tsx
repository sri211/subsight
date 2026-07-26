import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { ChevronDown, ChevronUp, ExternalLink, TrendingUp, TrendingDown, Minus, Info } from 'lucide-react'
import { researchApi } from '../../lib/api'
import { useResults } from '../../hooks/useResults'
import TopicTreemap from './TopicTreemap'
import TopicTimeline from './TopicTimeline'
import type { TopicCluster } from '../../types'

const SENTIMENT_COLORS: Record<string, string> = {
  positive: '#22c55e',
  neutral: '#5b8dee',
  negative: '#ef4444',
}

const SentimentIcon = ({ s }: { s: string }) => {
  if (s === 'positive') return <TrendingUp className="w-3.5 h-3.5" style={{ color: SENTIMENT_COLORS.positive }} />
  if (s === 'negative') return <TrendingDown className="w-3.5 h-3.5" style={{ color: SENTIMENT_COLORS.negative }} />
  return <Minus className="w-3.5 h-3.5" style={{ color: SENTIMENT_COLORS.neutral }} />
}

function SentimentBar({ counts }: { counts: { positive: number; negative: number; neutral: number } }) {
  const total = counts.positive + counts.negative + counts.neutral || 1
  return (
    <div className="flex gap-0.5 h-2 rounded-full overflow-hidden w-full">
      <div style={{ width: `${(counts.positive / total) * 100}%`, background: SENTIMENT_COLORS.positive }} />
      <div style={{ width: `${(counts.neutral / total) * 100}%`, background: SENTIMENT_COLORS.neutral, opacity: 0.5 }} />
      <div style={{ width: `${(counts.negative / total) * 100}%`, background: SENTIMENT_COLORS.negative }} />
    </div>
  )
}

function TopicCard({ topic }: { topic: TopicCluster }) {
  const [expanded, setExpanded] = useState(false)
  const color = SENTIMENT_COLORS[topic.sentiment] || '#5b8dee'
  const counts = topic.sentiment_counts || { positive: 0, negative: 0, neutral: 0 }
  const total = counts.positive + counts.negative + counts.neutral || 1

  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <SentimentIcon s={topic.sentiment} />
            <span className="font-semibold text-primary text-sm">{topic.name}</span>
          </div>
          <span className="text-xs text-muted">{topic.size} posts</span>
        </div>
        <span
          className="text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0"
          style={{ background: `${color}20`, color }}
        >
          {topic.sentiment}
        </span>
      </div>

      {/* Sentiment breakdown */}
      <div>
        <div className="flex justify-between text-xs text-muted mb-1.5">
          <span className="text-positive">{Math.round((counts.positive / total) * 100)}% positive</span>
          <span className="text-muted">{Math.round((counts.neutral / total) * 100)}% neutral</span>
          <span className="text-negative">{Math.round((counts.negative / total) * 100)}% negative</span>
        </div>
        <SentimentBar counts={counts} />
      </div>

      {/* Keywords */}
      {topic.keywords.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {topic.keywords.slice(0, 6).map(k => (
            <span key={k} className="text-xs bg-border/60 rounded-full px-2.5 py-0.5 text-muted font-medium">
              {k}
            </span>
          ))}
        </div>
      )}

      {/* Expandable top posts */}
      {topic.top_posts?.length > 0 && (
        <div>
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1.5 text-xs text-accent hover:text-blue-400 transition-colors font-medium"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {expanded ? 'Hide' : 'Show'} top posts
          </button>

          {expanded && (
            <div className="mt-2 space-y-2">
              {topic.top_posts.map((p, i) => (
                <a
                  key={i}
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-start gap-2 p-2.5 rounded-lg bg-bg hover:bg-border/30 transition-colors group"
                >
                  <span className="text-xs text-muted font-mono mt-0.5 flex-shrink-0">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-primary leading-snug line-clamp-2 group-hover:text-accent transition-colors">
                      {p.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted">r/{p.subreddit}</span>
                      <span className="text-xs text-muted">·</span>
                      <span className="text-xs text-accent">{p.score} pts</span>
                    </div>
                  </div>
                  <ExternalLink className="w-3 h-3 text-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TopicVolumeChart({ topics }: { topics: TopicCluster[] }) {
  const sorted = [...topics].sort((a, b) => b.size - a.size)
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    const d = payload[0].payload
    return (
      <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs">
        <div className="font-semibold text-primary mb-1">{d.name}</div>
        <div className="text-muted">{d.size} posts · {d.sentiment}</div>
      </div>
    )
  }
  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <h3 className="text-sm font-semibold text-muted uppercase tracking-widest mb-4">Topic Volume Comparison</h3>
      <ResponsiveContainer width="100%" height={Math.max(200, sorted.length * 42)}>
        <BarChart data={sorted} layout="vertical" margin={{ left: 12, right: 40, top: 4, bottom: 4 }}>
          <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
          <YAxis
            type="category"
            dataKey="name"
            width={140}
            tick={{ fontSize: 11, fill: '#f1f5f9' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#2a2d3a' }} />
          <Bar dataKey="size" radius={[0, 4, 4, 0]}>
            {sorted.map(t => (
              <Cell key={t.id} fill={SENTIMENT_COLORS[t.sentiment] || '#5b8dee'} fillOpacity={0.75} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-4 mt-3 text-xs text-muted justify-center">
        {Object.entries(SENTIMENT_COLORS).map(([label, color]) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: color, opacity: 0.75 }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function TopicsTab({ jobId }: { jobId: string }) {
  const { data, loading } = useResults(() => researchApi.topics(jobId), [jobId])

  if (loading || !data) {
    return <div className="flex items-center justify-center h-48 text-muted">Analysing topic clusters...</div>
  }
  if (!data.length) {
    return <div className="flex items-center justify-center h-48 text-muted">No topic data yet. Need at least 50 posts.</div>
  }

  const mostDiscussed = data[0]
  const mostPositive = [...data].sort((a, b) => (b.sentiment_counts?.positive || 0) - (a.sentiment_counts?.positive || 0))[0]
  const mostNegative = [...data].sort((a, b) => (b.sentiment_counts?.negative || 0) - (a.sentiment_counts?.negative || 0))[0]
  const totalPosts = data.reduce((s, t) => s + t.size, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
          <div>
            <h2 className="text-lg font-bold text-primary mb-1">Topic Intelligence</h2>
            <p className="text-sm text-muted leading-relaxed">
              AI automatically groups all scraped Reddit posts into clusters based on what people are actually talking about.
              Each cluster is a distinct conversation theme — for example, "hydration supplements" vs "water intake tips" vs "electrolyte drinks".
            </p>
            <div className="flex gap-4 mt-3 text-xs text-muted flex-wrap">
              <span className="flex items-center gap-1.5 text-positive"><TrendingUp className="w-3 h-3" /> Positive cluster = opportunity / enthusiasm</span>
              <span className="flex items-center gap-1.5 text-negative"><TrendingDown className="w-3 h-3" /> Negative cluster = complaints / unmet needs</span>
              <span className="flex items-center gap-1.5 text-muted"><Minus className="w-3 h-3" /> Neutral = informational / general discussion</span>
            </div>
            <p className="text-xs text-muted/60 mt-2">{data.length} clusters · {totalPosts} posts analysed</p>
          </div>
        </div>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-xs text-muted uppercase tracking-widest mb-1">Most Discussed</div>
          <div className="font-bold text-primary text-sm">{mostDiscussed.name}</div>
          <div className="text-xs text-accent mt-0.5">{mostDiscussed.size} posts</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-xs text-muted uppercase tracking-widest mb-1">Most Positive</div>
          <div className="font-bold text-positive text-sm">{mostPositive?.name}</div>
          <div className="text-xs text-muted mt-0.5">{mostPositive?.sentiment_counts?.positive || 0} positive posts</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-xs text-muted uppercase tracking-widest mb-1">Most Negative</div>
          <div className="font-bold text-negative text-sm">{mostNegative?.name}</div>
          <div className="text-xs text-muted mt-0.5">{mostNegative?.sentiment_counts?.negative || 0} negative posts</div>
        </div>
      </div>

      {/* Treemap */}
      <TopicTreemap topics={data} />

      {/* Volume comparison */}
      <TopicVolumeChart topics={data} />

      {/* Topic deep-dive cards */}
      <div>
        <h3 className="text-sm font-semibold text-muted uppercase tracking-widest mb-3">
          Topic Deep Dive — click any card to see top posts
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {data.map(t => <TopicCard key={t.id} topic={t} />)}
        </div>
      </div>

      {/* Timeline */}
      <TopicTimeline topics={data} />
    </div>
  )
}
