import { useState } from 'react'
import { Coins, Plus, LogOut } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import BuyCreditsModal from './BuyCreditsModal'

export default function CreditBadge() {
  const { user, logout } = useAuth()
  const [showBuy, setShowBuy] = useState(false)
  if (!user) return null

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 bg-card border border-border rounded-full pl-3 pr-1 py-1 text-sm">
        <Coins className="w-3.5 h-3.5 text-accent" />
        <span className="font-semibold text-primary">{user.credits.toLocaleString()}</span>
        <span className="text-xs text-muted">SC</span>
        <button
          onClick={() => setShowBuy(true)}
          className="ml-1 w-6 h-6 flex items-center justify-center rounded-full bg-accent/15 text-accent hover:bg-accent/25 transition-colors"
          title="Buy credits"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
      <button
        onClick={logout}
        className="text-muted hover:text-negative transition-colors"
        title="Log out"
      >
        <LogOut className="w-4 h-4" />
      </button>

      {showBuy && <BuyCreditsModal onClose={() => setShowBuy(false)} />}
    </div>
  )
}
