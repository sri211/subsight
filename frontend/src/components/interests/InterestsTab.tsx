import { researchApi } from '../../lib/api'
import { useResults } from '../../hooks/useResults'
import type { CrossInterest, AudienceInsight } from '../../types'
import { ExternalLink, Users, Info, Target, Lightbulb, ArrowRight } from 'lucide-react'

// ── Category engine ──────────────────────────────────────────────────────────
interface Category {
  label: string
  color: string
  bg: string
  icon: string
  pattern: RegExp
}

const CATEGORIES: Category[] = [
  {
    label: 'Health & Fitness',
    icon: '💪',
    color: '#22c55e',
    bg: '#22c55e20',
    pattern: /fit|gym|run|yoga|workout|exercise|health|weight|cardio|sport|lifting|bodybuilding|crossfit|swim|cycling|hiit|nutrition|supplement|keto|paleo|vegan|diet|calorie|muscle|strength|marathon|triathlon|wellnes|bodyweight|calisthen/i,
  },
  {
    label: 'Beauty & Skincare',
    icon: '✨',
    color: '#ec4899',
    bg: '#ec489920',
    pattern: /skin|hair|beauty|makeup|cosmetic|fashion|style|nails|glow|moistur|serum|cleanser|toner|sunscreen|spf|antiaging|acne|curly|shampoo|conditioner|lotion|lipstick|foundation|blush|contour|sephora|ulta/i,
  },
  {
    label: 'Food & Nutrition',
    icon: '🍽️',
    color: '#f59e0b',
    bg: '#f59e0b20',
    pattern: /food|cook|recipe|bake|kitchen|meal|diet|nutrition|restaurant|pizza|sourdough|bread|coffee|tea|wine|beer|vegan|vegeta|intermittentfast|mealprep|snack|grocery|cheese|burger|sushi|noodle|pasta|fruit|veggie/i,
  },
  {
    label: 'Mental Health',
    icon: '🧠',
    color: '#8b5cf6',
    bg: '#8b5cf620',
    pattern: /mental|anxiety|depress|therapy|mindful|meditat|stress|trauma|adhd|autism|bipolar|ocd|ptsd|selflove|selfcare|positiv|gratitude|journaling|sleep|insomnia/i,
  },
  {
    label: 'Gaming',
    icon: '🎮',
    color: '#06b6d4',
    bg: '#06b6d420',
    pattern: /gam|steam|xbox|playstation|nintendo|pc|gaming|esport|minecraft|fortnite|valorant|lol|dota|rpg|fps|mmorpg|indie/i,
  },
  {
    label: 'Tech & Productivity',
    icon: '💻',
    color: '#5b8dee',
    bg: '#5b8dee20',
    pattern: /tech|program|cod|developer|software|python|javascript|react|linux|apple|android|iphone|startup|saas|ai|machinelearn|productivity|notion|obsidian|pomodoro|focus/i,
  },
  {
    label: 'Travel & Outdoors',
    icon: '🌍',
    color: '#10b981',
    bg: '#10b98120',
    pattern: /travel|camp|hike|outdoor|adventure|backpack|nature|mountain|beach|surf|climb|ski|wander|nomad|expat|trip|destination|national.*park|trail/i,
  },
  {
    label: 'Finance & Business',
    icon: '💰',
    color: '#facc15',
    bg: '#facc1520',
    pattern: /financ|invest|money|stock|crypto|budget|frugal|saving|entrepreneur|business|startup|passive.*income|trading|wealth|retire|index.*fund|realestate/i,
  },
  {
    label: 'Pets & Animals',
    icon: '🐾',
    color: '#f97316',
    bg: '#f9731620',
    pattern: /dog|cat|pet|animal|bird|fish|rabbit|hamster|puppy|kitten|vet|adopt|rescue|wildlife/i,
  },
  {
    label: 'Entertainment',
    icon: '🎬',
    color: '#a78bfa',
    bg: '#a78bfa20',
    pattern: /movie|film|book|music|tv|show|anime|manga|podcast|netflix|spotify|read|novel|concert|art|draw|paint|photo|creativ/i,
  },
  {
    label: 'Relationships & Family',
    icon: '❤️',
    color: '#ef4444',
    bg: '#ef444420',
    pattern: /relationship|dating|marriage|family|parent|kid|child|divorce|love|partner|wedding|pregnan/i,
  },
]

function categorize(subreddit: string): Category {
  const name = subreddit.toLowerCase().replace(/[_-]/g, '')
  const match = CATEGORIES.find(c => c.pattern.test(name))
  return match || { label: 'Other', icon: '🔗', color: '#64748b', bg: '#64748b20', pattern: /x/ }
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface MetaInfo {
  method?: 'user_history' | 'community_distribution'
  sample_size?: number
}

function WhatThisMeans({ topic, interests, meta }: { topic: string; interests: CrossInterest[]; meta: MetaInfo }) {
  const top = interests[0]
  const topCat = top ? categorize(top.subreddit) : null
  const isUserHistory = meta.method === 'user_history'
  const sample = meta.sample_size || 0

  return (
    <div className="bg-card border border-border rounded-2xl p-5 flex gap-4">
      <Info className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm text-primary font-semibold mb-1">What is this?</p>
        {isUserHistory ? (
          <p className="text-sm text-muted leading-relaxed">
            We analysed the full Reddit posting history of <strong className="text-primary">{sample} users</strong> who
            posted about <span className="text-primary font-medium">"{topic}"</span>. These are the other
            communities they participate in — revealing who your audience really is: their
            hobbies, values, and adjacent interests beyond {topic}.
          </p>
        ) : (
          <p className="text-sm text-muted leading-relaxed">
            This shows <strong className="text-primary">which Reddit communities the "{topic}" conversation lives in</strong>,
            based on {sample} scraped posts. Percentages = share of all topic posts appearing in each community.
            (Individual user-history profiling wasn't available for this run — most authors were too recent
            for the archive — so we mapped the communities themselves instead.)
          </p>
        )}
        {top && topCat && (
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
            style={{ background: topCat.bg, color: topCat.color }}>
            {topCat.icon} Key finding: r/{top.subreddit} {isUserHistory
              ? `— ${top.percentage}% of your audience is active here`
              : `hosts ${top.percentage}% of the conversation`}
          </div>
        )}
        {isUserHistory && sample < 15 && (
          <p className="text-xs text-warning mt-2">
            ⚠ Small sample ({sample} users) — treat percentages as directional, not precise.
          </p>
        )}
      </div>
    </div>
  )
}

function CategoryGrid({ interests }: { interests: CrossInterest[] }) {
  type GroupMap = Record<string, { cat: Category; items: CrossInterest[] }>
  const groups: GroupMap = {}

  for (const interest of interests) {
    const cat = categorize(interest.subreddit)
    if (!groups[cat.label]) groups[cat.label] = { cat, items: [] }
    groups[cat.label].items.push(interest)
  }

  const sorted = Object.values(groups).sort((a, b) => b.items.length - a.items.length)

  return (
    <div>
      <h3 className="text-sm font-semibold text-muted uppercase tracking-widest mb-3">
        Interest Categories
        <span className="normal-case font-normal ml-2 text-muted/60">— grouped by lifestyle theme</span>
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {sorted.map(({ cat, items }) => (
          <div
            key={cat.label}
            className="rounded-xl border p-4"
            style={{ borderColor: cat.color + '40', background: cat.bg }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base">{cat.icon}</span>
              <span className="font-semibold text-sm" style={{ color: cat.color }}>{cat.label}</span>
              <span className="ml-auto text-xs text-muted">{items.length} communities</span>
            </div>
            <div className="space-y-1.5">
              {items.slice(0, 4).map(item => (
                <div key={item.subreddit} className="flex items-center justify-between">
                  <a
                    href={`https://reddit.com/r/${item.subreddit}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary hover:text-accent transition-colors flex items-center gap-1"
                  >
                    r/{item.subreddit}
                  </a>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 rounded-full bg-black/20 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${item.percentage}%`, background: cat.color }}
                      />
                    </div>
                    <span className="text-xs font-mono" style={{ color: cat.color }}>{item.percentage}%</span>
                  </div>
                </div>
              ))}
              {items.length > 4 && (
                <p className="text-xs text-muted mt-1">+{items.length - 4} more</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AudienceInsights({ interests, isUserHistory }: { interests: CrossInterest[]; isUserHistory: boolean }) {
  const top5 = interests.slice(0, 5)
  return (
    <div>
      <h3 className="text-sm font-semibold text-muted uppercase tracking-widest mb-3">
        {isUserHistory ? 'Top Audience Interests' : 'Top Communities for This Topic'}
        <span className="normal-case font-normal ml-2 text-muted/60">
          {isUserHistory ? '— strongest overlaps' : '— most active discussion hubs'}
        </span>
      </h3>
      <div className="grid grid-cols-5 gap-3">
        {top5.map((item, i) => {
          const cat = categorize(item.subreddit)
          return (
            <div key={item.subreddit} className="bg-card border border-border rounded-xl p-4 text-center">
              <div className="text-2xl mb-2">{cat.icon}</div>
              <div className="text-xs font-bold text-primary mb-0.5">r/{item.subreddit}</div>
              <div
                className="text-lg font-extrabold"
                style={{ color: cat.color }}
              >
                {item.percentage}%
              </div>
              <div className="text-xs text-muted mt-0.5">{isUserHistory ? 'of users' : 'of posts'}</div>
              <div
                className="mt-2 text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: cat.bg, color: cat.color }}
              >
                {cat.label}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function FullRanking({ interests, isUserHistory }: { interests: CrossInterest[]; isUserHistory: boolean }) {
  const max = Math.max(...interests.map(i => i.percentage), 1)

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-muted uppercase tracking-widest">
          {isUserHistory ? 'Full Overlap Ranking' : 'Full Community Ranking'}
        </h3>
        <div className="flex items-center gap-1.5 text-xs text-muted">
          <Users className="w-3.5 h-3.5" /> {isUserHistory ? 'Based on user post history' : 'Based on where topic posts appear'}
        </div>
      </div>
      <div className="space-y-2">
        {interests.map((item, idx) => {
          const cat = categorize(item.subreddit)
          return (
            <div key={item.subreddit} className="flex items-center gap-3 group">
              <span className="text-xs text-muted w-6 text-right font-mono flex-shrink-0">{idx + 1}</span>

              {/* Category icon */}
              <span className="text-sm flex-shrink-0">{cat.icon}</span>

              {/* Name + category */}
              <div className="w-48 flex-shrink-0">
                <a
                  href={`https://reddit.com/r/${item.subreddit}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-primary hover:text-accent transition-colors flex items-center gap-1"
                >
                  r/{item.subreddit}
                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                  style={{ background: cat.bg, color: cat.color }}
                >
                  {cat.label}
                </span>
              </div>

              {/* Bar */}
              <div className="flex-1">
                <div className="bg-border rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${(item.percentage / max) * 100}%`,
                      background: cat.color,
                      opacity: 0.75,
                    }}
                  />
                </div>
              </div>

              {/* Stats */}
              <div className="text-right flex-shrink-0 w-28">
                <div className="text-xs font-semibold" style={{ color: cat.color }}>{item.percentage}%</div>
                <div className="text-xs text-muted">{item.user_count} {isUserHistory ? 'users' : 'posts'}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TargetingPlaybook({ insights }: { insights: AudienceInsight[] }) {
  if (!insights.length) return null
  return (
    <div>
      <h3 className="text-sm font-semibold text-muted uppercase tracking-widest mb-1 flex items-center gap-2">
        <Target className="w-4 h-4 text-accent" /> How to Reach This Audience
      </h3>
      <p className="text-xs text-muted/60 mb-3">
        AI-generated targeting strategies built from the community data above — where to show up, what to say
      </p>
      <div className="grid grid-cols-2 gap-3">
        {insights.map((ins, i) => (
          <div key={i} className="bg-gradient-to-br from-accent/8 to-transparent border border-accent/25 rounded-xl p-5">
            <div className="flex items-start gap-2.5 mb-2">
              <Lightbulb className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
              <h4 className="font-semibold text-primary text-sm leading-snug">{ins.title}</h4>
            </div>
            <p className="text-xs text-muted leading-relaxed mb-3">{ins.insight}</p>
            <div className="flex items-start gap-2 bg-accent/10 rounded-lg px-3 py-2">
              <ArrowRight className="w-3.5 h-3.5 text-accent flex-shrink-0 mt-0.5" />
              <p className="text-xs text-primary font-medium leading-snug">{ins.action}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main tab ──────────────────────────────────────────────────────────────────
export default function InterestsTab({ jobId }: { jobId: string }) {
  const { data, loading } = useResults(() => researchApi.interests(jobId), [jobId])

  if (loading || !data) {
    return <div className="flex items-center justify-center h-48 text-muted">Building audience profile...</div>
  }

  const interests = data.cross_interests || []
  const meta = data.cross_interests_meta || {}
  const topic = data.topic || 'this topic'
  const isUserHistory = meta.method === 'user_history'

  if (!interests.length) {
    return (
      <div className="bg-card border border-border rounded-2xl p-8 text-center text-muted">
        Cross-interest data requires user profiling. Re-run research to collect this.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-primary mb-1">Cross-Interests</h2>
        <p className="text-sm text-muted">
          {isUserHistory
            ? 'Where else does your audience spend time on Reddit — mapped from their post history'
            : `Which Reddit communities the "${topic}" conversation happens in`}
        </p>
      </div>

      {/* What this means */}
      <WhatThisMeans topic={topic} interests={interests} meta={meta} />

      {/* AI targeting playbook — the actionable "so what" */}
      <TargetingPlaybook insights={data.audience_insights || []} />

      {/* Top 5 highlights */}
      <AudienceInsights interests={interests} isUserHistory={isUserHistory} />

      {/* Category groups */}
      <CategoryGrid interests={interests} />

      {/* Full ranking */}
      <FullRanking interests={interests} isUserHistory={isUserHistory} />
    </div>
  )
}
