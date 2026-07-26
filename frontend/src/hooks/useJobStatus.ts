import { useState, useEffect, useRef } from 'react'
import { researchApi } from '../lib/api'
import type { JobStatus } from '../types'

export function useJobStatus(jobId: string | null, enabled = true) {
  const [status, setStatus] = useState<JobStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!jobId || !enabled) return

    const poll = async () => {
      try {
        const data = await researchApi.status(jobId)
        setStatus(data)
        if (data.status === 'complete' || data.status === 'failed') {
          if (intervalRef.current) clearInterval(intervalRef.current)
        }
      } catch (e) {
        setError('Failed to fetch status')
      }
    }

    poll()
    intervalRef.current = setInterval(poll, 2000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [jobId, enabled])

  return { status, error }
}
