import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { TrendingUp, Coins } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signup } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signup(email, password)
      navigate('/')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Signup failed')
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
        <h1 className="text-xl font-bold text-primary mb-1">Create your account</h1>
        <p className="text-sm text-muted mb-1">Start with</p>
        <p className="text-sm text-accent font-semibold mb-6 flex items-center gap-1.5">
          <Coins className="w-4 h-4" /> 50 free credits — enough for a 50-post research run
        </p>

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
              minLength={8}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full mt-1 bg-bg border border-border rounded-lg px-3 py-2.5 text-primary text-sm focus:outline-none focus:border-accent transition-colors"
            />
            <p className="text-xs text-muted/60 mt-1">At least 8 characters</p>
          </div>

          {error && <p className="text-xs text-negative">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent text-white font-semibold py-2.5 rounded-lg hover:bg-blue-500 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <p className="text-xs text-muted text-center mt-5">
          Already have an account? <Link to="/login" className="text-accent hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  )
}
