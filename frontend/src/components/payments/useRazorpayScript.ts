import { useEffect, useState } from 'react'

const SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js'

// Loads the Razorpay Checkout SDK once, shared across every modal instance
export function useRazorpayScript() {
  const [ready, setReady] = useState(() => !!(window as any).Razorpay)

  useEffect(() => {
    if ((window as any).Razorpay) {
      setReady(true)
      return
    }
    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`)
    if (existing) {
      existing.addEventListener('load', () => setReady(true))
      return
    }
    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.onload = () => setReady(true)
    document.body.appendChild(script)
  }, [])

  return ready
}
