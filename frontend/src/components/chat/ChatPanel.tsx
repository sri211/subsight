import { useState, useRef, useEffect } from 'react'
import { X, Send, Loader2, MessageCircle, Zap } from 'lucide-react'
import { useChat } from '../../hooks/useChat'

interface Props {
  jobId: string
  onClose: () => void
}

const SUGGESTED = [
  'What is the biggest pain point in this category?',
  'Who is the ideal customer persona?',
  'What products are most talked about?',
  'What unmet needs exist in this space?',
  'What would a successful startup look like here?',
]

export default function ChatPanel({ jobId, onClose }: Props) {
  const { messages, loading, sendMessage } = useChat(jobId)
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    const msg = input.trim()
    if (!msg || loading) return
    setInput('')
    await sendMessage(msg)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-96 flex flex-col bg-card border-l border-border shadow-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
        <div className="w-8 h-8 rounded-xl bg-accent/20 flex items-center justify-center">
          <MessageCircle className="w-4 h-4 text-accent" />
        </div>
        <div className="flex-1">
          <div className="font-semibold text-primary text-sm">SubSight AI</div>
          <div className="flex items-center gap-1 text-xs text-muted">
            <Zap className="w-3 h-3 text-warning" />
            Ask anything about this research
          </div>
        </div>
        <button onClick={onClose} className="text-muted hover:text-primary transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-3">
                <MessageCircle className="w-6 h-6 text-accent" />
              </div>
              <p className="text-sm text-muted">Ask me anything about the research data.</p>
            </div>
            <div>
              <div className="text-xs text-muted font-semibold uppercase tracking-widest mb-2">Suggested questions</div>
              <div className="space-y-2">
                {SUGGESTED.map(q => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="w-full text-left text-xs text-primary bg-bg border border-border rounded-xl px-3 py-2.5 hover:border-accent hover:text-accent transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-accent text-white rounded-br-sm'
                  : 'bg-bg border border-border text-primary rounded-bl-sm'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-bg border border-border rounded-2xl rounded-bl-sm px-4 py-3">
              <Loader2 className="w-4 h-4 text-accent animate-spin" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-5 py-4 border-t border-border">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about customers, products, pain points..."
            rows={2}
            className="flex-1 bg-bg border border-border rounded-xl px-4 py-3 text-sm text-primary placeholder-muted resize-none focus:outline-none focus:border-accent transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-accent rounded-xl hover:bg-blue-500 disabled:opacity-40 transition-colors self-end"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
        <div className="text-xs text-muted mt-2 text-center">
          Answers are grounded in this research's Reddit data
        </div>
      </div>
    </div>
  )
}
