import axios from 'axios'
import type {
  Job, JobStatus, OverviewData, TopicCluster, PersonasData,
  InterestsData, Product, ConversationsData, ChatMessage, User,
  AdminStats, AdminUsersData, AdminUserDetail,
} from '../types'

// In dev, Vite proxies /api -> localhost:8001 (see vite.config.ts).
// In production, the frontend (Vercel) and backend (Hetzner) live on
// different hosts, so the built app needs the full backend URL baked in
// at build time via VITE_API_BASE_URL.
const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || '/api' })

export const TOKEN_KEY = 'subsight_token'

api.interceptors.request.use(config => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY)
      if (location.pathname !== '/login') location.href = '/login'
    }
    // 402 (insufficient credits) is left for callers to handle explicitly —
    // it's an expected, recoverable state, not a session failure
    return Promise.reject(err)
  }
)

export const authApi = {
  signup: (email: string, password: string) =>
    api.post<{ token: string; user: User }>('/auth/signup', { email, password }).then(r => r.data),
  login: (email: string, password: string) =>
    api.post<{ token: string; user: User }>('/auth/login', { email, password }).then(r => r.data),
  me: () => api.get<User>('/auth/me').then(r => r.data),
}

export const paymentsApi = {
  createOrder: (packId: string) =>
    api.post<{ order_id: string; amount: number; currency: string; key_id: string; credits: number }>(
      '/payments/create-order', { pack_id: packId }
    ).then(r => r.data),
  verify: (payload: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) =>
    api.post<{ credits: number }>('/payments/verify', payload).then(r => r.data),
}

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

export const adminApi = {
  stats: () => api.get<AdminStats>('/admin/stats').then(r => r.data),
  listUsers: (search = '', page = 1) =>
    api.get<AdminUsersData>('/admin/users', { params: { search, page } }).then(r => r.data),
  getUser: (userId: string) => api.get<AdminUserDetail>(`/admin/users/${userId}`).then(r => r.data),
  grantCredits: (userId: string, amount: number, note: string) =>
    api.post<{ credits: number }>(`/admin/users/${userId}/grant-credits`, { amount, note }).then(r => r.data),
}
