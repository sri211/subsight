import { useState } from 'react'
import { X, Coins, Loader2 } from 'lucide-react'
import { paymentsApi } from '../../lib/api'
import { useAuth } from '../../hooks/useAuth'
import { CREDIT_PACKS } from '../../types'
import { useRazorpayScript } from './useRazorpayScript'

interface Props {
  onClose: () => void
  message?: string
}

export default function BuyCreditsModal({ onClose, message }: Props) {
  const [busyPack, setBusyPack] = useState<string | null>(null)
  const [error, setError] = useState('')
  const razorpayReady = useRazorpayScript()
  const { user, refreshUser } = useAuth()

  const handleBuy = async (packId: string) => {
    setError('')
    setBusyPack(packId)
    try {
      const order = await paymentsApi.createOrder(packId)
      const rzp = new (window as any).Razorpay({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        order_id: order.order_id,
        name: 'SubSight',
        description: `${order.credits.toLocaleString()} credits`,
        prefill: { email: user?.email },
        theme: { color: '#5b8dee' },
        handler: async (response: any) => {
          try {
            await paymentsApi.verify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            })
            await refreshUser()
            onClose()
          } catch {
            setError('Payment succeeded but crediting failed — contact support with your payment ID.')
          } finally {
            setBusyPack(null)
          }
        },
        modal: {
          ondismiss: () => setBusyPack(null),
        },
      })
      rzp.open()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Could not start checkout. Try again.')
      setBusyPack(null)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold text-primary flex items-center gap-2">
            <Coins className="w-5 h-5 text-accent" /> Buy Credits
          </h2>
          <button onClick={onClose} className="text-muted hover:text-primary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-muted mb-5">
          {message || '1 credit = 1 post analyzed. Choose a pack to top up.'}
        </p>

        <div className="space-y-2.5">
          {CREDIT_PACKS.map(pack => (
            <button
              key={pack.id}
              onClick={() => handleBuy(pack.id)}
              disabled={!razorpayReady || busyPack !== null}
              className="w-full flex items-center justify-between bg-bg border border-border rounded-xl px-4 py-3.5 hover:border-accent transition-colors disabled:opacity-50 text-left"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-primary">{pack.label}</span>
                  <span className="text-xs text-muted bg-white/5 px-2 py-0.5 rounded-full border border-border">
                    {pack.credits.toLocaleString()} SC
                  </span>
                </div>
                <div className="text-xs text-muted mt-0.5">
                  ≈ {pack.credits.toLocaleString()} posts of research
                </div>
              </div>
              <div className="flex items-center gap-2">
                {busyPack === pack.id && <Loader2 className="w-4 h-4 text-accent animate-spin" />}
                <span className="font-bold text-primary">₹{pack.priceRupees.toLocaleString('en-IN')}</span>
              </div>
            </button>
          ))}
        </div>

        {!razorpayReady && (
          <p className="text-xs text-muted text-center mt-3">Loading payment options...</p>
        )}
        {error && <p className="text-xs text-negative mt-3">{error}</p>}
      </div>
    </div>
  )
}
