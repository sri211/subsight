import { MessageSquare, MessageCircle, Users, Globe } from 'lucide-react'

interface Props {
  postCount: number
  commentCount: number
  userCount: number
  subredditCount: number
}

function StatCard({ icon: Icon, label, value, color, hint }: {
  icon: React.ElementType; label: string; value: number; color: string; hint: string
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl mb-4 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-4xl font-extrabold text-primary mb-1">{value.toLocaleString()}</div>
      <div className="text-sm text-muted font-medium">{label}</div>
      <div className="text-xs text-muted/50 mt-1 leading-snug">{hint}</div>
    </div>
  )
}

export default function HeroStats({ postCount, commentCount, userCount, subredditCount }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <StatCard icon={MessageSquare} label="Posts Analyzed" value={postCount} color="bg-accent/10 text-accent"
        hint="Reddit posts scraped and fed into the AI analysis" />
      <StatCard icon={MessageCircle} label="Comments" value={commentCount} color="bg-purple-500/10 text-purple-400"
        hint="Replies found inside those posts — richer signal than titles alone" />
      <StatCard icon={Users} label="Unique Users" value={userCount} color="bg-positive/10 text-positive"
        hint="Distinct Reddit accounts who wrote these posts/comments" />
      <StatCard icon={Globe} label="Subreddits" value={subredditCount} color="bg-warning/10 text-warning"
        hint="Topic communities where these conversations happened" />
    </div>
  )
}
