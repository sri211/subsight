import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import {
  ArrowLeft, Users, Coins, IndianRupee, Search, ChevronDown, ChevronUp,
  Gift, Loader2, ShieldCheck, MessageSquare,
} from 'lucide-react'
import { adminApi } from '../lib/api'
import type { AdminStats, AdminUserRow, AdminUserDetail } from '../types'

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center mb-3">
        <Icon className="w-4.5 h-4.5 text-accent" />
      </div>
      <div className="text-2xl font-extrabold text-primary">{value}</div>
      <div className="text-xs text-muted mt-0.5">{label}</div>
    </div>
  )
}

function MiniChart({ title, data, valuePrefix = '', color = '#5b8dee' }: {
  title: string; data: { date: string; value: number }[]; valuePrefix?: string; color?: string
}) {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs">
        <div className="text-muted">{label}</div>
        <div className="text-primary font-semibold">{valuePrefix}{payload[0].value}</div>
      </div>
    )
  }
  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <h3 className="text-sm font-semibold text-muted uppercase tracking-widest mb-4">{title}</h3>
      {data.length === 0 ? (
        <div className="h-[160px] flex items-center justify-center text-xs text-muted">No data in the last 30 days yet</div>
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id={`grad-${title}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3a" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#grad-${title})`} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

function GrantCreditsForm({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    const amt = parseInt(amount, 10)
    if (!amt || amt === 0) { setError('Enter a non-zero amount'); return }
    setBusy(true)
    setError('')
    try {
      await adminApi.grantCredits(userId, amt, note)
      onDone()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to grant credits')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-bg border border-border rounded-xl p-3 flex flex-col sm:flex-row gap-2 mt-2">
      <input
        type="number"
        value={amount}
        onChange={e => setAmount(e.target.value)}
        placeholder="Credits (e.g. 500 or -100)"
        className="flex-1 bg-card border border-border rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent"
      />
      <input
        type="text"
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="Reason (optional)"
        className="flex-1 bg-card border border-border rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent"
      />
      <button
        onClick={submit}
        disabled={busy}
        className="bg-accent text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-500 disabled:opacity-50 transition-colors whitespace-nowrap"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Grant'}
      </button>
      {error && <p className="text-xs text-negative sm:ml-2 self-center">{error}</p>}
    </div>
  )
}

function UserDetailPanel({ detail }: { detail: AdminUserDetail }) {
  return (
    <div className="mt-3 space-y-4">
      <div>
        <h4 className="text-xs font-semibold text-muted uppercase tracking-widest mb-2">Transaction History</h4>
        <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
          {detail.transactions.length === 0 && <p className="text-xs text-muted">No transactions yet.</p>}
          {detail.transactions.map(t => (
            <div key={t.id} className="flex items-center justify-between text-xs bg-bg border border-border rounded-lg px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`font-medium ${t.amount >= 0 ? 'text-positive' : 'text-negative'}`}>
                  {t.amount >= 0 ? '+' : ''}{t.amount} SC
                </span>
                <span className="text-muted bg-border/50 px-1.5 py-0.5 rounded-full">{t.type}</span>
                {t.note && <span className="text-muted truncate">{t.note}</span>}
                {t.amount_paise != null && <span className="text-muted">₹{(t.amount_paise / 100).toFixed(2)}</span>}
              </div>
              <span className="text-muted flex-shrink-0 ml-2">{t.created_at ? new Date(t.created_at).toLocaleDateString() : ''}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h4 className="text-xs font-semibold text-muted uppercase tracking-widest mb-2">Research Jobs</h4>
        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          {detail.jobs.length === 0 && <p className="text-xs text-muted">No research run yet.</p>}
          {detail.jobs.map(j => (
            <div key={j.id} className="flex items-center justify-between text-xs bg-bg border border-border rounded-lg px-3 py-2">
              <span className="text-primary capitalize truncate">{j.topic}</span>
              <div className="flex items-center gap-2 text-muted flex-shrink-0 ml-2">
                <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {j.post_count}</span>
                <span>{j.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function UserRow({ user, onChanged }: { user: AdminUserRow; onChanged: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [showGrant, setShowGrant] = useState(false)
  const [detail, setDetail] = useState<AdminUserDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const toggleExpand = async () => {
    if (!expanded && !detail) {
      setLoadingDetail(true)
      try {
        setDetail(await adminApi.getUser(user.id))
      } finally {
        setLoadingDetail(false)
      }
    }
    setExpanded(e => !e)
  }

  const handleGrantDone = async () => {
    setShowGrant(false)
    setDetail(await adminApi.getUser(user.id))
    onChanged()
  }

  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3.5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="text-sm font-medium text-primary truncate">{user.email}</span>
          {user.is_admin && (
            <span className="flex items-center gap-1 text-xs text-accent bg-accent/10 px-2 py-0.5 rounded-full flex-shrink-0">
              <ShieldCheck className="w-3 h-3" /> Admin
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 sm:gap-5 text-xs text-muted flex-wrap">
          <span className="flex items-center gap-1 text-primary font-semibold">
            <Coins className="w-3 h-3 text-accent" /> {user.credits.toLocaleString()} SC
          </span>
          <span>₹{user.total_purchased_inr.toLocaleString('en-IN')} spent</span>
          <span>{user.total_jobs} jobs</span>
          <span>{user.created_at ? new Date(user.created_at).toLocaleDateString() : ''}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setShowGrant(g => !g)}
            className="flex items-center gap-1.5 text-xs font-medium text-accent bg-accent/10 hover:bg-accent/20 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Gift className="w-3.5 h-3.5" /> Grant
          </button>
          <button onClick={toggleExpand} className="text-muted hover:text-primary transition-colors">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {showGrant && <GrantCreditsForm userId={user.id} onDone={handleGrantDone} />}

      {expanded && (
        loadingDetail
          ? <div className="mt-3 text-xs text-muted flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading...</div>
          : detail && <UserDetailPanel detail={detail} />
      )}
    </div>
  )
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const [s, u] = await Promise.all([adminApi.stats(), adminApi.listUsers(search)])
    setStats(s)
    setUsers(u.users)
  }, [search])

  useEffect(() => {
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const t = setTimeout(() => { adminApi.listUsers(search).then(u => setUsers(u.users)) }, 300)
    return () => clearTimeout(t)
  }, [search])

  if (loading || !stats) {
    return <div className="min-h-screen bg-bg flex items-center justify-center text-muted">Loading admin dashboard...</div>
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border px-4 sm:px-8 py-4 flex items-center gap-4">
        <button onClick={() => navigate('/')} className="text-muted hover:text-primary transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="font-bold text-primary text-lg">Admin Dashboard</span>
      </header>

      <div className="p-4 sm:p-8 space-y-6 max-w-6xl mx-auto">
        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Total Users" value={stats.total_users.toLocaleString()} />
          <StatCard icon={IndianRupee} label="Total Revenue" value={`₹${stats.total_revenue_inr.toLocaleString('en-IN')}`} />
          <StatCard icon={Coins} label="Credits Outstanding" value={stats.total_credits_outstanding.toLocaleString()} />
          <StatCard icon={MessageSquare} label="Research Jobs Run" value={stats.total_jobs_run.toLocaleString()} />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <MiniChart title="Signups (last 30 days)" data={stats.signups_by_day} />
          <MiniChart title="Revenue (last 30 days)" data={stats.revenue_by_day} valuePrefix="₹" color="#22c55e" />
        </div>

        {/* User search + list */}
        <div>
          <div className="flex items-center justify-between mb-3 gap-3">
            <h2 className="text-sm font-semibold text-muted uppercase tracking-widest">Users</h2>
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by email..."
                className="w-full bg-card border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-primary placeholder-muted focus:outline-none focus:border-accent"
              />
            </div>
          </div>
          <div className="space-y-2">
            {users.map(u => <UserRow key={u.id} user={u} onChanged={load} />)}
            {users.length === 0 && <p className="text-sm text-muted text-center py-8">No users found.</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
