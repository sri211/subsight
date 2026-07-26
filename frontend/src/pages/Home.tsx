import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, TrendingUp, Trash2, ExternalLink, Clock, MessageSquare } from 'lucide-react'
import { researchApi } from '../lib/api'
import type { Job } from '../types'

const EXAMPLE_TOPICS = ['hydration', 'meal prep', 'sleep tracking', 'productivity apps', 'standing desks']

const DEPTH_OPTIONS = [
  { label: 'Quick', posts: 200, time: '~1 min' },
  { label: 'Standard', posts: 500, time: '~2–3 min' },
  { label: 'Deep', posts: 1000, time: '~5 min' },
]

export default function Home() {
  const [topic, setTopic] = useState('')
  const [depth, setDepth] = useState(1) // index into DEPTH_OPTIONS
  const [jobs, setJobs] = useState<Job[]>([])
  const [starting, setStarting] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    researchApi.list().then(setJobs).catch(() => {})
  }, [])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!topic.trim()) return
    setStarting(true)
    try {
      const { job_id } = await researchApi.start(topic.trim(), DEPTH_OPTIONS[depth].posts)
      navigate(`/dashboard/${job_id}`)
    } catch (err) {
      alert('Failed to start research. Is the backend running?')
      setStarting(false)
    }
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await researchApi.delete(id)
    setJobs(j => j.filter(j => j.id !== id))
  }

  const statusColor = (status: string) => {
    if (status === 'complete') return 'text-positive'
    if (status === 'failed') return 'text-negative'
    if (status === 'running') return 'text-accent'
    return 'text-muted'
  }

  const statusDot = (status: string) => {
    const colors: Record<string, string> = {
      complete: 'bg-positive',
      failed: 'bg-negative',
      running: 'bg-accent animate-pulse',
      pending: 'bg-muted',
    }
    return colors[status] || 'bg-muted'
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Top bar */}
      <header className="border-b border-border px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-accent" />
          <span className="text-xl font-bold text-primary">SubSight</span>
          <span className="text-xs text-muted ml-1 font-medium tracking-widest uppercase">Beta</span>
        </div>
        <p className="text-sm text-muted">Reddit intelligence for startup founders</p>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-2xl text-center mb-12">
          <h1 className="text-5xl font-extrabold text-primary leading-tight mb-4">
            Understand your customers<br />
            <span className="text-accent">through Reddit</span>
          </h1>
          <p className="text-muted text-lg">
            Enter a topic. We'll scrape thousands of conversations, extract insights,
            build customer personas, and let you ask AI questions about the data.
          </p>
        </div>

        {/* Search form */}
        <form onSubmit={handleSearch} className="w-full max-w-xl">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
              <input
                type="text"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="e.g. hydration, standing desk, meal prep..."
                className="w-full bg-card border border-border rounded-xl pl-12 pr-4 py-4 text-primary placeholder-muted text-base focus:outline-none focus:border-accent transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={starting || !topic.trim()}
              className="bg-accent text-white font-semibold px-8 py-4 rounded-xl hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              {starting ? 'Starting...' : 'Research'}
            </button>
          </div>

          {/* Depth selector */}
          <div className="flex items-center gap-2 mt-4 justify-center">
            <span className="text-muted text-xs">Depth:</span>
            {DEPTH_OPTIONS.map((opt, idx) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => setDepth(idx)}
                className={`text-xs px-4 py-1.5 rounded-full border transition-colors ${
                  depth === idx
                    ? 'bg-accent border-accent text-white font-semibold'
                    : 'bg-card border-border text-muted hover:border-accent hover:text-primary'
                }`}
              >
                {opt.label} <span className="opacity-60">· {opt.posts} posts · {opt.time}</span>
              </button>
            ))}
          </div>

          {/* Example chips */}
          <div className="flex flex-wrap gap-2 mt-3 justify-center">
            <span className="text-muted text-xs mr-1">Try:</span>
            {EXAMPLE_TOPICS.map(ex => (
              <button
                key={ex}
                type="button"
                onClick={() => setTopic(ex)}
                className="text-xs px-3 py-1.5 rounded-full bg-card border border-border text-muted hover:text-primary hover:border-accent transition-colors"
              >
                {ex}
              </button>
            ))}
          </div>
        </form>

        {/* Info cards */}
        <div className="grid grid-cols-3 gap-4 w-full max-w-xl mt-12">
          {[
            { icon: '🎯', label: 'Customer Personas', desc: 'Archetypes from real conversations' },
            { icon: '💬', label: 'AI Chat Agent', desc: 'Ask questions about your data' },
            { icon: '📊', label: 'Topic Clusters', desc: 'What people actually talk about' },
          ].map(item => (
            <div key={item.label} className="bg-card border border-border rounded-xl p-4 text-center">
              <div className="text-2xl mb-2">{item.icon}</div>
              <div className="text-sm font-semibold text-primary">{item.label}</div>
              <div className="text-xs text-muted mt-1">{item.desc}</div>
            </div>
          ))}
        </div>
      </main>

      {/* Recent research */}
      {jobs.length > 0 && (
        <section className="border-t border-border px-8 py-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-sm font-semibold text-muted uppercase tracking-widest mb-4">
              Recent Research
            </h2>
            <div className="space-y-2">
              {jobs.map(job => (
                <div
                  key={job.id}
                  onClick={() => navigate(`/dashboard/${job.id}`)}
                  className="flex items-center gap-4 bg-card border border-border rounded-xl px-5 py-4 cursor-pointer hover:border-accent transition-colors group"
                >
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot(job.status)}`} />
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-primary capitalize">{job.topic}</span>
                    {job.status === 'running' && (
                      <span className="ml-3 text-xs text-accent">{job.stage}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted">
                    {job.post_count > 0 && (
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> {job.post_count} posts
                      </span>
                    )}
                    <span className={`font-medium ${statusColor(job.status)}`}>
                      {job.status}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {job.created_at ? new Date(job.created_at).toLocaleDateString() : ''}
                    </span>
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <button
                    onClick={e => handleDelete(job.id, e)}
                    className="text-muted hover:text-negative transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
