import { TrendingUp, LayoutDashboard, Layers, Users, Globe, Package, MessageSquare, X } from 'lucide-react'
import clsx from 'clsx'

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'topics', label: 'Topic Intelligence', icon: Layers },
  { id: 'customers', label: 'Customer DNA', icon: Users },
  { id: 'interests', label: 'Cross-Interests', icon: Globe },
  { id: 'products', label: 'Product Radar', icon: Package },
  { id: 'conversations', label: 'Conversations', icon: MessageSquare },
]

interface SidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
  topic: string
  // Provided only when rendered inside the mobile drawer — shows a close
  // button and closes the drawer automatically after picking a tab
  onClose?: () => void
}

export default function Sidebar({ activeTab, onTabChange, topic, onClose }: SidebarProps) {
  const handleTabChange = (tab: string) => {
    onTabChange(tab)
    onClose?.()
  }

  return (
    <aside className="w-64 md:w-56 flex-shrink-0 bg-card border-r border-border flex flex-col h-full">
      <div className="px-5 py-5 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-accent" />
            <span className="font-bold text-primary text-base">SubSight</span>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-muted hover:text-primary transition-colors">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        <div className="text-xs text-muted uppercase tracking-widest font-medium">Researching</div>
        <div className="text-sm font-semibold text-primary mt-1 capitalize truncate">{topic}</div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {TABS.map(tab => {
          const Icon = tab.icon
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={clsx(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left',
                active
                  ? 'bg-accent/10 text-accent border border-accent/20'
                  : 'text-muted hover:text-primary hover:bg-white/5'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {tab.label}
            </button>
          )
        })}
      </nav>

    </aside>
  )
}
