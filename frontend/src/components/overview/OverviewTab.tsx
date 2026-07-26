import { useEffect } from 'react'
import { Wifi, WifiOff, AlertTriangle, ShieldCheck } from 'lucide-react'
import { researchApi } from '../../lib/api'
import { useResults } from '../../hooks/useResults'
import AiSummaryCard from './AiSummaryCard'
import HeroStats from './HeroStats'
import SentimentGauge from './SentimentGauge'
import SubredditBars from './SubredditBars'
import ActivityTimeline from './ActivityTimeline'
import WordCloud from './WordCloud'
import type { OverviewData } from '../../types'

interface Props {
  jobId: string
  onTopicLoad: (topic: string) => void
}

function DataQualityBanner({ data }: { data: OverviewData }) {
  const requested = data.requested_posts || data.scrape_quality?.requested || 0
  const kept = data.post_count
  const dropped = data.scrape_quality?.dropped_irrelevant ?? 0
  const isLive = data.data_source?.startsWith('Live')
  const lowData = requested > 0 && kept < Math.min(100, requested * 0.3)

  return (
    <div className="space-y-2">
      {/* Source banner */}
      <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium border ${
        isLive
          ? 'bg-positive/10 border-positive/30 text-positive'
          : 'bg-warning/10 border-warning/30 text-warning'
      }`}>
        {isLive
          ? <Wifi className="w-3.5 h-3.5 flex-shrink-0" />
          : <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />}
        <span>{data.data_source}</span>
        {dropped > 0 && (
          <span className="ml-auto flex items-center gap-1.5 text-muted">
            <ShieldCheck className="w-3.5 h-3.5" />
            {dropped} off-topic post{dropped !== 1 ? 's' : ''} filtered out to keep insights relevant
          </span>
        )}
      </div>

      {/* Low-data warning */}
      {lowData && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-xl text-xs border bg-warning/10 border-warning/30 text-warning">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            <strong>Limited data:</strong> only {kept} relevant posts found (you requested {requested}).
            Insights below are directional, not statistically strong. Try a broader topic phrase
            (e.g. "hydration" instead of "hydration drinks brand X") or re-run later when more
            conversations exist.
          </span>
        </div>
      )}
    </div>
  )
}

export default function OverviewTab({ jobId, onTopicLoad }: Props) {
  const { data, loading } = useResults(() => researchApi.overview(jobId), [jobId])

  useEffect(() => {
    if (data?.topic) onTopicLoad(data.topic)
  }, [data])

  if (loading || !data) {
    return <div className="flex items-center justify-center h-48 text-muted">Loading overview...</div>
  }

  return (
    <div className="space-y-6">
      {/* Data source + quality */}
      <DataQualityBanner data={data} />

      {/* AI executive summary — the "so what" before the charts */}
      {data.ai_summary && <AiSummaryCard summary={data.ai_summary} />}

      {/* Hero stats */}
      <HeroStats
        postCount={data.post_count}
        commentCount={data.comment_count}
        userCount={data.user_count}
        subredditCount={data.subreddit_count}
      />

      {/* Row 2: sentiment + subreddits */}
      <div className="grid grid-cols-2 gap-6">
        <SentimentGauge breakdown={data.sentiment_breakdown} />
        <SubredditBars data={data.subreddit_breakdown} />
      </div>

      {/* Row 3: timeline */}
      <ActivityTimeline data={data.activity_timeline} />

      {/* Row 4: word cloud */}
      <WordCloud words={data.keywords} />
    </div>
  )
}
