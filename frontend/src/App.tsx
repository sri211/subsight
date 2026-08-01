import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AuthProvider, useAuth } from './hooks/useAuth'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Landing from './pages/Landing'
import AdminDashboard from './pages/AdminDashboard'

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) {
    return <div className="min-h-screen bg-bg flex items-center justify-center text-muted">Loading...</div>
  }
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AdminRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) {
    return <div className="min-h-screen bg-bg flex items-center justify-center text-muted">Loading...</div>
  }
  if (!user) return <Navigate to="/login" replace />
  if (!user.is_admin) return <Navigate to="/" replace />
  return <>{children}</>
}

// subsight.in stays a single stable URL that adapts to auth state, rather
// than splitting the marketing page onto a separate path
function IndexRoute() {
  const { user, loading } = useAuth()
  if (loading) {
    return <div className="min-h-screen bg-bg flex items-center justify-center text-muted">Loading...</div>
  }
  return user ? <Home /> : <Landing />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/" element={<IndexRoute />} />
          <Route path="/dashboard/:jobId" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
