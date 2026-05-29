import { Sun, Moon, Menu, LayoutDashboard, Inbox, Ticket, Cpu, GraduationCap, Radio, Brain, BarChart3, Settings, Users, type LucideIcon } from 'lucide-react'
import type { ActiveView } from '@/types'
import { useAppStore } from '@/store/appStore'
import { useRouterState } from '@tanstack/react-router'

const viewMeta: Record<ActiveView, { title: string; subtitle: string; icon: LucideIcon }> = {
  dashboard:    { title: 'Dashboard',          subtitle: 'Overview & quick actions', icon: LayoutDashboard },
  inbox:        { title: 'Inbox',              subtitle: 'WhatsApp Customer Inbox', icon: Inbox },
  tickets:      { title: 'Tickets',            subtitle: 'WhatsApp Ticket History', icon: Ticket },
  copilot:      { title: 'AI Copilot',         subtitle: 'Real-time agent suggestions & classification', icon: Cpu },
  simulator:    { title: 'Training Simulator', subtitle: 'AI customer training workspace', icon: GraduationCap },
  channels:     { title: 'Channels',           subtitle: 'Connected communication channels', icon: Radio },
  ai_training:  { title: 'AI Training',        subtitle: 'Classification and response rules', icon: Brain },
  analytics:    { title: 'Analytics',          subtitle: 'Performance and statistics', icon: BarChart3 },
  settings:     { title: 'Settings',           subtitle: 'Workspace and app configuration', icon: Settings },
  team:         { title: 'Team Management',    subtitle: 'Workspace member access control & roles', icon: Users },
}

export function TopBar({ onMenuClick }: { onMenuClick?: () => void }) {
  const theme = useAppStore(s => s.theme)
  const toggleTheme = useAppStore(s => s.toggleTheme)
  const pathname = useRouterState({ select: s => s.location.pathname })

  const activeView: ActiveView =
    pathname === '/' ? 'dashboard' :
    pathname.startsWith('/inbox') ? 'inbox' :
    pathname.startsWith('/tickets') ? 'tickets' :
    (pathname.replace('/', '') as ActiveView) || 'dashboard'

  const { title, icon: ViewIcon } = viewMeta[activeView] ?? viewMeta.dashboard

  return (
    <div className="flex h-12 shrink-0 items-center justify-between border-b theme-border theme-bg-secondary px-4 sm:px-6">
      <div className="min-w-0 flex items-center gap-3">
        <button onClick={onMenuClick} className="lg:hidden rounded-xl p-1.5 theme-text-muted hover:theme-text-main hover:bg-white/[0.03] transition-all cursor-pointer -ml-1" title="Toggle sidebar">
          <Menu className="h-4.5 w-4.5" />
        </button>
        <ViewIcon className="h-4 w-4 theme-text-muted hidden sm:block" />
        <div>
          <h1 className="font-extrabold font-display theme-text-main text-[11px] uppercase tracking-wider leading-none">{title}</h1>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-4">
        <button onClick={toggleTheme}
          className="flex h-8 w-8 items-center justify-center rounded-xl border theme-border theme-text-muted hover:theme-text-main hover:theme-bg-hover transition-all cursor-pointer bg-white/[0.01] hover:scale-105 active:scale-95"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-indigo-500" />}
        </button>
      </div>
    </div>
  )
}
