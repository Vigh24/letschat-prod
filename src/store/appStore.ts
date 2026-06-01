import { create } from 'zustand'
import type { ActiveView } from '@/types'

export type AgentStatus = 'online' | 'offline' | 'break' | 'busy'

type Theme = 'light' | 'dark'

interface AppState {
  activeView: ActiveView
  theme: Theme
  sidebarCollapsed: boolean
  badgeCounts: { inbox: number; channels: number }
  agentStatus: AgentStatus
  setActiveView: (view: ActiveView) => void
  toggleTheme: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setBadgeCounts: (counts: { inbox: number; channels: number }) => void
  setAgentStatus: (status: AgentStatus) => void
}

export const useAppStore = create<AppState>((set) => ({
  activeView: 'dashboard',
  theme: (localStorage.getItem('theme') as Theme) || 'dark',
  sidebarCollapsed: false,
  badgeCounts: { inbox: 0, channels: 0 },
  agentStatus: (localStorage.getItem('agentStatus') as AgentStatus) || 'online',
  setActiveView: (view) => set({ activeView: view }),
  toggleTheme: () =>
    set((state) => {
      const next = state.theme === 'dark' ? 'light' : 'dark'
      localStorage.setItem('theme', next)
      return { theme: next }
    }),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setBadgeCounts: (counts) => set({ badgeCounts: counts }),
  setAgentStatus: (status) => {
    localStorage.setItem('agentStatus', status)
    
    // Sync to static currentAgent object
    import('@/data/appConfig').then(({ currentAgent }) => {
      currentAgent.is_online = status === 'online' || status === 'busy'
      
      // Update database if configured
      import('@/lib/supabase').then(async ({ supabase, isSupabaseConfigured }) => {
        if (isSupabaseConfigured && currentAgent.id) {
          try {
            await supabase
              .from('users')
              .update({ is_online: status === 'online' || status === 'busy' })
              .eq('id', currentAgent.id)
          } catch (err) {
            console.error('Failed to sync agent status to DB:', err)
          }
        }
      })
    })

    set({ agentStatus: status })
  },
}))

