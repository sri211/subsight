import { useState } from 'react'
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react'

interface Props { quotes: string[] }

export default function QuoteCarousel({ quotes }: Props) {
  const [idx, setIdx] = useState(0)
  const filtered = quotes.filter(Boolean)
  if (!filtered.length) return null

  const prev = () => setIdx(i => (i - 1 + filtered.length) % filtered.length)
  const next = () => setIdx(i => (i + 1) % filtered.length)

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <h3 className="text-sm font-semibold text-muted uppercase tracking-widest mb-4">
        Verbatim from Reddit
      </h3>
      <div className="relative">
        <Quote className="w-8 h-8 text-accent/30 mb-3" />
        <p className="text-primary text-base leading-relaxed min-h-[60px]">
          "{filtered[idx]}"
        </p>

        <div className="flex items-center justify-between mt-6">
          <div className="flex gap-1">
            {filtered.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${i === idx ? 'bg-accent' : 'bg-border'}`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={prev}
              className="w-8 h-8 rounded-lg bg-border flex items-center justify-center text-muted hover:text-primary transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={next}
              className="w-8 h-8 rounded-lg bg-border flex items-center justify-center text-muted hover:text-primary transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
