import { researchApi } from '../../lib/api'
import { useResults } from '../../hooks/useResults'
import PersonaCard from './PersonaCard'
import PainPointsBars from './PainPointsBars'
import QuoteCarousel from './QuoteCarousel'
import { Users, Info, Target } from 'lucide-react'

export default function CustomersTab({ jobId }: { jobId: string }) {
  const { data, loading } = useResults(() => researchApi.personas(jobId), [jobId])

  if (loading || !data) {
    return <div className="flex items-center justify-center h-48 text-muted">Loading customer analysis...</div>
  }

  const allQuotes = data.personas.flatMap(p => p.quotes)

  return (
    <div className="space-y-6">
      {/* Header with explanation */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <Users className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
          <div>
            <h2 className="text-lg font-bold text-primary mb-1">Customer DNA</h2>
            <p className="text-sm text-muted leading-relaxed">
              Claude reads hundreds of Reddit posts and identifies distinct <strong className="text-primary">user archetypes</strong> —
              patterns of people with similar needs, language, and frustrations. These aren't made-up marketing personas; they're derived directly from what real users write.
            </p>
            <div className="flex gap-4 mt-3 text-xs text-muted flex-wrap">
              <span className="flex items-center gap-1.5"><Target className="w-3 h-3 text-accent" /> Personas = who your customers actually are</span>
              <span className="flex items-center gap-1.5"><Info className="w-3 h-3 text-accent" /> Pain points = their unmet needs you could solve</span>
            </div>
            <p className="text-xs text-muted/60 mt-2">{data.personas.length} archetypes · {data.pain_points.length} pain points identified</p>
          </div>
        </div>
      </div>

      {/* Persona cards */}
      {data.personas.length > 0 ? (
        <div className={`grid gap-4 ${data.personas.length >= 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {data.personas.map(persona => (
            <PersonaCard key={persona.id} persona={persona} />
          ))}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl p-8 text-center text-muted">
          Personas are being generated... check back shortly.
        </div>
      )}

      {/* Pain points */}
      {data.pain_points.length > 0 && (
        <PainPointsBars painPoints={data.pain_points} />
      )}

      {/* Quote carousel */}
      {allQuotes.length > 0 && (
        <QuoteCarousel quotes={allQuotes} />
      )}
    </div>
  )
}
