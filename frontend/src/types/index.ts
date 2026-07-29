export interface Job {
  id: string
  topic: string
  status: 'pending' | 'running' | 'complete' | 'failed'
  progress: number
  stage: string
  created_at: string
  post_count: number
}

export interface JobStatus {
  status: string
  progress: number
  stage: string
  error?: string
}

export interface OverviewData {
  topic: string
  created_at: string
  subreddits_found: string[]
  post_count: number
  comment_count: number
  user_count: number
  subreddit_count: number
  sentiment_breakdown: { positive: number; negative: number; neutral: number }
  subreddit_breakdown: { subreddit: string; count: number }[]
  activity_timeline: { month: string; count: number }[]
  keywords: { text: string; value: number }[]
  data_source?: string
  scrape_quality?: { kept?: number; dropped_irrelevant?: number; requested?: number; sources?: string[] }
  requested_posts?: number
  ai_summary?: string
}

export interface TopicPost {
  title: string
  score: number
  subreddit: string
  url: string
  sentiment: string
}

export interface TopicCluster {
  id: number
  name: string
  size: number
  sentiment: string
  avg_sentiment_score: number
  keywords: string[]
  monthly_counts: Record<string, number>
  sentiment_counts: { positive: number; negative: number; neutral: number }
  top_posts: TopicPost[]
}

export interface Persona {
  id: number
  name: string
  archetype: string
  demographics: string
  pain_points: string[]
  goals: string[]
  quotes: string[]
  subreddits: string[]
}

export interface PainPoint {
  id: number
  description: string
  frequency: number
  quotes: string[]
}

export interface PersonasData {
  personas: Persona[]
  pain_points: PainPoint[]
}

export interface CrossInterest {
  subreddit: string
  user_count: number
  percentage: number
}

export interface AudienceInsight {
  title: string
  insight: string
  action: string
}

export interface InterestsData {
  cross_interests: CrossInterest[]
  cross_interests_meta?: { method?: 'user_history' | 'community_distribution'; sample_size?: number }
  audience_insights?: AudienceInsight[]
  subreddits_found: string[]
  topic?: string
}

export interface Product {
  id: number
  name: string
  mentions: number
  sentiment_score: number
  sentiment_label: 'LOVED' | 'MIXED' | 'CRITICIZED'
  sample_quotes: string[]
  category?: string
  why_mentioned?: string
}

export interface ConversationPost {
  id: string
  subreddit: string
  title: string
  body: string
  score: number
  num_comments: number
  author: string
  url: string
  created_at: string
  sentiment: string
  sentiment_score: number
  topic_cluster: string
  top_comments: { body: string; score: number; author: string; sentiment: string }[]
}

export interface ConversationsData {
  total: number
  page: number
  page_size: number
  posts: ConversationPost[]
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface User {
  id: string
  email: string
  credits: number
}

export interface CreditPack {
  id: '1000' | '3000' | '10000'
  credits: number
  priceRupees: number
  label: string
}

export const CREDIT_PACKS: CreditPack[] = [
  { id: '1000', credits: 1000, priceRupees: 299, label: 'Starter' },
  { id: '3000', credits: 3000, priceRupees: 799, label: 'Growth' },
  { id: '10000', credits: 10000, priceRupees: 1999, label: 'Scale' },
]
