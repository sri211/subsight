interface Word { text: string; value: number }

interface Props { words: Word[] }

const PALETTE = [
  '#5b8dee', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#a78bfa',
]

export default function WordCloud({ words }: Props) {
  if (!words.length) return null

  const top = words.slice(0, 40)
  const maxVal = Math.max(...top.map(w => w.value), 1)

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-muted uppercase tracking-widest">Most Discussed Terms</h3>
        <p className="text-xs text-muted/60 mt-1">Words that appear most often across all posts and comments. Bigger = mentioned more frequently. These are the words your target audience uses when talking about this topic.</p>
      </div>
      <div className="flex flex-wrap gap-3 items-center justify-center min-h-[120px]">
        {top.map((word, i) => {
          const ratio = word.value / maxVal
          const size = 11 + Math.round(ratio * 24)
          const color = PALETTE[i % PALETTE.length]
          const opacity = 0.5 + ratio * 0.5
          return (
            <span
              key={word.text}
              className="font-semibold cursor-default select-none transition-opacity hover:opacity-100"
              style={{ fontSize: `${size}px`, color, opacity }}
            >
              {word.text}
            </span>
          )
        })}
      </div>
    </div>
  )
}
