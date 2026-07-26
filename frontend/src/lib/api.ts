import axios from 'axios'
import type {
  Job, JobStatus, OverviewData, TopicCluster, PersonasData,
  InterestsData, Product, ConversationsData, ChatMessage,
} from '../types'

// In dev, Vite proxies /api -> localhost:8001 (see vite.config.ts).
// In production, the frontend (Vercel) and backend (Hetzner) live on
// different hosts, so the built app needs the full backend URL baked in
// at build time via VITE_API_BASE_URL.
const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || '/api' })

export const researchApi = {
  list: () => api.get<Job[]>('/research/').then(r => r.data),
  start: (topic: string, maxPosts = 500) =>
    api.post<{ job_id: string }>('/research/start', { topic, max_posts: maxPosts }).then(r => r.data),
  status: (id: string) => api.get<JobStatus>(`/research/${id}/status`).then(r => r.data),
  delete: (id: string) => api.delete(`/research/${id}`).then(r => r.data),
  overview: (id: string) => api.get<OverviewData>(`/research/${id}/overview`).then(r => r.data),
  topics: (id: string) => api.get<TopicCluster[]>(`/research/${id}/topics`).then(r => r.data),
  personas: (id: string) => api.get<PersonasData>(`/research/${id}/personas`).then(r => r.data),
  interests: (id: string) => api.get<InterestsData>(`/research/${id}/interests`).then(r => r.data),
  products: (id: string) => api.get<Product[]>(`/research/${id}/products`).then(r => r.data),
  conversations: (id: string, params?: {
    page?: number; subreddit?: string; sentiment?: string; topic_cluster?: string
  }) => api.get<ConversationsData>(`/research/${id}/conversations`, { params }).then(r => r.data),
}

export const chatApi = {
  ask: (job_id: string, message: string, history: ChatMessage[]) =>
    api.post<{ answer: string }>('/chat/', { job_id, message, history }).then(r => r.data),
}
