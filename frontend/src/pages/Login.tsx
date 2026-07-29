import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { TrendingUp, Coins } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-6">
      <div className="flex items-center gap-2 mb-8">
        <TrendingUp className="w-6 h-6 text-accent" />
        <span className="text-xl font-bold text-primary">SubSight</span>
      </div>

      <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-8">
        <h1 className="text-xl font-bold text-primary mb-1">Welcome back</h1>
        <p className="text-sm text-muted mb-6">Log in to continue your research</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-muted font-medium">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full mt-1 bg-bg border border-border rounded-lg px-3 py-2.5 text-primary text-sm focus:outline-none focus:border-accent transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-muted font-medium">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full mt-1 bg-bg border border-border rounded-lg px-3 py-2.5 text-primary text-sm focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          {error && <p className="text-xs text-negative">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent text-white font-semibold py-2.5 rounded-lg hover:bg-blue-500 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <p className="text-xs text-muted text-center mt-5">
          Don't have an account? <Link to="/signup" className="text-accent hover:underline">Sign up</Link>
          {' '}— get <span className="inline-flex items-center gap-0.5"><Coins className="w-3 h-3" />50 SC</span> free
        </p>
      </div>
    </div>
  )
}
