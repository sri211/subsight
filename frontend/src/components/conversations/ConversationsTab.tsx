import { useState, useEffect } from 'react'
import { ExternalLink, ChevronDown, ChevronUp, Filter, MessageSquare, Info } from 'lucide-react'
import { researchApi } from '../../lib/api'
import type { ConversationPost, ConversationsData } from '../../types'

const SENTIMENT_BADGE: Record<string, string> = {
  positive: 'bg-positive/10 text-positive',
  negative: 'bg-negative/10 text-negative',
  neutral: 'bg-muted/10 text-muted',
}

interface Props { jobId: string }

export default function ConversationsTab({ jobId }: Props) {
  const [data, setData] = useState<ConversationsData | null>(null)
  const [page, setPage] = useState(1)
  const [sentiment, setSentiment] = useState('')
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    researchApi.conversations(jobId, { page, sentiment: sentiment || undefined })
      .then(setData)
      .finally(() => setLoading(false))
  }, [jobId, page, sentiment])

  return (
    <div className="space-y-5">
      {/* Explanation box */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <MessageSquare className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
          <div>
            <h2 className="text-lg font-bold text-primary mb-1">Raw Conversations</h2>
            <p className="text-sm text-muted leading-relaxed">
              These are the actual Reddit posts that were scraped and analysed to generate every insight on this dashboard.
              Use this tab to read verbatim what real people say — great for finding exact language, discovering edge cases, or verifying AI findings.
            </p>
            <div className="flex gap-4 mt-2 text-xs text-muted flex-wrap">
              <span className="flex items-center gap-1.5"><Info className="w-3 h-3 text-accent" /> Click any post to see top comments</span>
              <span className="flex items-center gap-1.5"><ExternalLink className="w-3 h-3 text-accent" /> Link icon opens original Reddit thread</span>
              <span className="flex items-center gap-1.5 text-positive">↑ score = how many Reddit users upvoted it (popular = relevant)</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">{data?.total ?? 0} posts scraped</p>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted" />
          <select
            value={sentiment}
            onChange={e => { setSentiment(e.target.value); setPage(1) }}
            className="bg-card border border-border rounded-lg px-3 py-1.5 text-sm text-primary focus:outline-none focus:border-accent"
          >
            <option value="">All Sentiments</option>
            <option value="positive">Positive</option>
            <option value="neutral">Neutral</option>
            <option value="negative">Negative</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-muted">Loading conversations...</div>
      ) : (
        <>
          <div className="space-y-3">
            {(data?.posts ?? []).map(post => (
              <PostCard
                key={post.id}
                post={post}
                expanded={expanded === post.id}
                onToggle={() => setExpanded(expanded === post.id ? null : post.id)}
              />
            ))}
          </div>

          {/* Pagination */}
          {data && data.total > data.page_size && (
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 text-sm bg-card border border-border rounded-lg text-muted hover:text-primary disabled:opacity-40 transition-colors"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-sm text-muted">
                Page {page} of {Math.ceil(data.total / data.page_size)}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= Math.ceil(data.total / data.page_size)}
                className="px-4 py-2 text-sm bg-card border border-border rounded-lg text-muted hover:text-primary disabled:opacity-40 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function PostCard({ post, expanded, onToggle }: { post: ConversationPost; expanded: boolean; onToggle: () => void }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="p-4 cursor-pointer hover:bg-white/3 transition-colors" onClick={onToggle}>
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="text-xs font-semibold bg-accent/10 text-accent rounded px-2 py-0.5">
                r/{post.subreddit}
              </span>
              <span className={`text-xs font-medium rounded px-2 py-0.5 ${SENTIMENT_BADGE[post.sentiment] || SENTIMENT_BADGE.neutral}`}>
                {post.sentiment}
              </span>
              {post.topic_cluster && (
                <span className="text-xs bg-border/50 text-muted rounded px-2 py-0.5">
                  {post.topic_cluster}
                </span>
              )}
              <span className="text-xs text-muted ml-auto">↑ {post.score}</span>
            </div>
            <h4 className="font-semibold text-primary text-sm leading-snug mb-1">{post.title}</h4>
            {post.body && (
              <p className="text-xs text-muted line-clamp-2">{post.body}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 mt-1">
            <a
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="text-muted hover:text-accent transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-muted" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted" />
            )}
          </div>
        </div>
      </div>

      {expanded && post.top_comments.length > 0 && (
        <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
          <div className="text-xs font-semibold text-muted uppercase tracking-widest">Top Comments</div>
          {post.top_comments.map((c, i) => (
            <div key={i} className="flex gap-3">
              <div className={`w-1.5 flex-shrink-0 rounded-full mt-1 ${SENTIMENT_BADGE[c.sentiment]?.includes('positive') ? 'bg-positive' : c.sentiment === 'negative' ? 'bg-negative' : 'bg-border'}`} />
              <div>
                <p className="text-xs text-primary leading-relaxed">{c.body}</p>
                <span className="text-xs text-muted mt-1 block">u/{c.author} · ↑{c.score}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
