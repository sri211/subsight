import { MessageCircle } from 'lucide-react'

interface Props { onClick: () => void }

export default function ChatButton({ onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-accent text-white px-5 py-3 rounded-full shadow-2xl shadow-accent/30 hover:bg-blue-500 transition-all hover:scale-105 active:scale-95 font-semibold text-sm"
    >
      <MessageCircle className="w-4 h-4" />
      Ask AI
    </button>
  )
}
