import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle, Loader2, XCircle } from 'lucide-react'
import { useJobStatus } from '../hooks/useJobStatus'
import Sidebar from '../components/layout/Sidebar'
import OverviewTab from '../components/overview/OverviewTab'
import TopicsTab from '../components/topics/TopicsTab'
import CustomersTab from '../components/customers/CustomersTab'
import InterestsTab from '../components/interests/InterestsTab'
import ProductsTab from '../components/products/ProductsTab'
import ConversationsTab from '../components/conversations/ConversationsTab'
import ChatButton from '../components/chat/ChatButton'
import ChatPanel from '../components/chat/ChatPanel'

const STAGE_ORDER = [
  'Discovering relevant subreddits...',
  'Scraping posts and comments...',
  'Building user interest profiles...',
  'Running NLP analysis...',
  'Extracting product mentions...',
  'Generating AI personas and insights...',
  'Building AI assistant context...',
]

export default function Dashboard() {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate = useNavigate()
  const { status } = useJobStatus(jobId ?? null, true)
  const [activeTab, setActiveTab] = useState('overview')
  const [chatOpen, setChatOpen] = useState(false)
  const [topic, setTopic] = useState('')

  useEffect(() => {
    if (status?.status === 'complete') {
      // topic loaded from overview
    }
  }, [status])

  if (!jobId) return null

  const isLoading = !status || status.status === 'pending' || status.status === 'running'
  const isFailed = status?.status === 'failed'
  const isComplete = status?.status === 'complete'

  if (isLoading || isFailed) {
    return (
      <div className="min-h-screen bg-bg flex flex-col">
        <header className="border-b border-border px-8 py-4 flex items-center gap-4">
          <button onClick={() => navigate('/')} className="text-muted hover:text-primary transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="font-bold text-primary">SubSight</span>
        </header>

        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-lg px-8">
            {isFailed ? (
              <div className="text-center">
                <XCircle className="w-12 h-12 text-negative mx-auto mb-4" />
                <h2 className="text-xl font-bold text-primary mb-2">Research Failed</h2>
                <p className="text-muted text-sm mb-6">{status?.stage}</p>
                <button
                  onClick={() => navigate('/')}
                  className="bg-accent text-white px-6 py-3 rounded-xl font-semibold"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <Loader2 className="w-5 h-5 text-accent animate-spin" />
                  <h2 className="text-lg font-semibold text-primary">Researching your topic...</h2>
                </div>

                {/* Progress bar */}
                <div className="bg-card border border-border rounded-full h-2 mb-8 overflow-hidden">
                  <div
                    className="bg-accent h-full rounded-full transition-all duration-1000"
                    style={{ width: `${status?.progress ?? 0}%` }}
                  />
                </div>

                {/* Stage checklist */}
                <div className="space-y-3">
                  {STAGE_ORDER.map((stage, i) => {
                    const currentProgress = status?.progress ?? 0
                    const stageProgress = ((i + 1) / STAGE_ORDER.length) * 100
                    const done = currentProgress >= stageProgress
                    const active = status?.stage?.includes(stage.split('...')[0].split(' ').slice(0, 3).join(' '))
                    return (
                      <div key={stage} className="flex items-center gap-3">
                        {done ? (
                          <CheckCircle className="w-4 h-4 text-positive flex-shrink-0" />
                        ) : active ? (
                          <Loader2 className="w-4 h-4 text-accent animate-spin flex-shrink-0" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-border flex-shrink-0" />
                        )}
                        <span className={done ? 'text-muted text-sm' : active ? 'text-primary text-sm font-medium' : 'text-muted text-sm opacity-50'}>
                          {stage}
                        </span>
                      </div>
                    )
                  })}
                </div>

                <p className="text-xs text-muted mt-8">
                  Estimated time: 3–8 min depending on data volume
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'overview': return <OverviewTab jobId={jobId} onTopicLoad={setTopic} />
      case 'topics': return <TopicsTab jobId={jobId} />
      case 'customers': return <CustomersTab jobId={jobId} />
      case 'interests': return <InterestsTab jobId={jobId} />
      case 'products': return <ProductsTab jobId={jobId} />
      case 'conversations': return <ConversationsTab jobId={jobId} />
      default: return null
    }
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Top bar */}
      <header className="border-b border-border px-6 py-3 flex items-center gap-4 flex-shrink-0">
        <button onClick={() => navigate('/')} className="text-muted hover:text-primary transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-border" />
        <span className="font-bold text-primary text-sm">SubSight</span>
        {topic && (
          <>
            <div className="w-px h-4 bg-border" />
            <span className="text-sm text-muted capitalize">{topic}</span>
          </>
        )}
        <div className="ml-auto flex items-center gap-2 text-xs text-positive">
          <CheckCircle className="w-3.5 h-3.5" />
          Analysis complete
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} topic={topic || 'Loading...'} />
        <main className="flex-1 overflow-y-auto p-6">
          {renderTab()}
        </main>
      </div>

      {/* AI Chat */}
      <ChatButton onClick={() => setChatOpen(true)} />
      {chatOpen && <ChatPanel jobId={jobId} onClose={() => setChatOpen(false)} />}
    </div>
  )
}
