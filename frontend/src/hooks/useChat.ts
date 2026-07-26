import { useState, useCallback } from 'react'
import { chatApi } from '../lib/api'
import type { ChatMessage } from '../types'

export function useChat(jobId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)

  const sendMessage = useCallback(async (content: string) => {
    const userMsg: ChatMessage = { role: 'user', content }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setLoading(true)
    try {
      const { answer } = await chatApi.ask(jobId, content, messages)
      setMessages([...updated, { role: 'assistant', content: answer }])
    } catch {
      setMessages([...updated, { role: 'assistant', content: 'Sorry, I could not process that question.' }])
    } finally {
      setLoading(false)
    }
  }, [messages, jobId])

  const clear = useCallback(() => setMessages([]), [])

  return { messages, loading, sendMessage, clear }
}
