import { useState, useEffect } from 'react'
import { researchApi } from '../lib/api'

export function useResults<T>(
  fetcher: () => Promise<T>,
  deps: unknown[]
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetcher()
      .then(d => { if (!cancelled) { setData(d); setLoading(false) } })
      .catch(e => { if (!cancelled) { setError(e.message); setLoading(false) } })
    return () => { cancelled = true }
  }, deps)

  return { data, loading, error }
}
