import { useState } from 'react'
import { Sparkles, ChevronDown, ChevronUp } from 'lucide-react'

// Renders the Claude-generated markdown summary with a tiny purpose-built parser
// (headings, bullets, quotes, **bold**) — no external markdown lib needed
function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i} className="text-primary font-semibold">{part.slice(2, -2)}</strong>
      : <span key={i}>{part}</span>
  )
}

function SummaryBody({ markdown }: { markdown: string }) {
  const lines = markdown.split('\n')
  const out: React.ReactNode[] = []
  lines.forEach((line, i) => {
    const trimmed = line.trim()
    if (!trimmed) return
    if (trimmed.startsWith('# ')) {
      // Skip the top-level title — the card already has one
      return
    }
    if (trimmed.startsWith('## ')) {
      out.push(
        <h4 key={i} className="text-xs font-semibold text-accent uppercase tracking-widest mt-4 mb-1.5 first:mt-0">
          {trimmed.slice(3)}
        </h4>
      )
    } else if (trimmed.startsWith('> ')) {
      out.push(
        <blockquote key={i} className="text-xs text-primary/70 italic border-l-2 border-accent/40 pl-3 my-1">
          {trimmed.slice(2)}
        </blockquote>
      )
    } else if (trimmed.startsWith('- ')) {
      out.push(
        <div key={i} className="flex gap-2 text-sm text-muted leading-relaxed my-0.5">
          <span className="text-accent flex-shrink-0">•</span>
          <span>{renderInline(trimmed.slice(2))}</span>
        </div>
      )
    } else {
      out.push(
        <p key={i} className="text-sm text-muted leading-relaxed my-1">{renderInline(trimmed)}</p>
      )
    }
  })
  return <>{out}</>
}

export default function AiSummaryCard({ summary }: { summary: string }) {
  const [open, setOpen] = useState(true)
  if (!summary) return null

  return (
    <div className="bg-gradient-to-br from-accent/10 to-purple-500/5 border border-accent/25 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 p-5 text-left hover:bg-white/3 transition-colors"
      >
        <Sparkles className="w-5 h-5 text-accent flex-shrink-0" />
        <div className="flex-1">
          <h2 className="text-base font-bold text-primary">AI Executive Summary</h2>
          <p className="text-xs text-muted mt-0.5">
            Claude's condensed read of everything found — start here for the big picture
          </p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-accent/15 pt-4">
          <SummaryBody markdown={summary} />
        </div>
      )}
    </div>
  )
}
