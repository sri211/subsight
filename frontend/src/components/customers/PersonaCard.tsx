import { QuoteIcon } from 'lucide-react'
import type { Persona } from '../../types'

const AVATAR_COLORS = [
  'bg-accent/20 text-accent',
  'bg-purple-500/20 text-purple-400',
  'bg-positive/20 text-positive',
  'bg-warning/20 text-warning',
  'bg-pink-500/20 text-pink-400',
]

const AVATAR_EMOJIS = ['🧑‍💼', '🏃', '👩‍🔬', '👨‍🍳', '🧘']

interface Props { persona: Persona }

export default function PersonaCard({ persona }: Props) {
  const idx = persona.id % 5

  return (
    <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${AVATAR_COLORS[idx]}`}>
          {AVATAR_EMOJIS[idx]}
        </div>
        <div className="min-w-0">
          <div className="font-bold text-primary text-sm truncate">{persona.name}</div>
          <div className="text-xs text-muted mt-0.5 leading-snug">{persona.archetype}</div>
        </div>
      </div>

      {/* Demographics badge */}
      {persona.demographics && (
        <div className="text-xs bg-border/50 rounded-lg px-3 py-1.5 text-muted inline-block self-start">
          {persona.demographics}
        </div>
      )}

      {/* Pain points */}
      {persona.pain_points.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-muted uppercase tracking-widest mb-2">Pain Points</div>
          <ul className="space-y-1.5">
            {persona.pain_points.slice(0, 4).map((pp, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-primary">
                <span className="text-negative mt-0.5 flex-shrink-0">•</span>
                {pp}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Goals */}
      {persona.goals.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-muted uppercase tracking-widest mb-2">Goals</div>
          <ul className="space-y-1.5">
            {persona.goals.slice(0, 3).map((g, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-primary">
                <span className="text-positive mt-0.5 flex-shrink-0">→</span>
                {g}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Quote */}
      {persona.quotes.length > 0 && (
        <div className="border-t border-border pt-3">
          <QuoteIcon className="w-3 h-3 text-accent mb-1" />
          <p className="text-xs text-muted italic leading-relaxed">
            "{persona.quotes[0]}"
          </p>
        </div>
      )}

      {/* Subreddits */}
      {persona.subreddits.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-auto">
          {persona.subreddits.slice(0, 3).map(sub => (
            <span key={sub} className="text-xs bg-accent/10 text-accent rounded px-2 py-0.5">
              r/{sub}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
