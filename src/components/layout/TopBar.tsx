import { Sun, Moon, LayoutDashboard, Inbox, Ticket, Cpu, GraduationCap, Radio, Brain, BarChart3, Settings, Users, type LucideIcon } from 'lucide-react'
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

export function TopBar() {
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
    <div className="flex h-11 shrink-0 items-center justify-between border-b theme-border theme-bg-secondary px-6">
      <div className="min-w-0 flex items-center gap-2.5">
        <ViewIcon className="h-4 w-4 theme-text-muted" />
        <div>
          <h1 className="font-semibold theme-text-main text-[13px] leading-tight">{title}</h1>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-4">
        <button
          onClick={toggleTheme}
          className="flex h-7 w-7 items-center justify-center rounded-lg border theme-border theme-text-muted hover:theme-text-main hover:theme-bg-hover transition-colors"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  )
}
