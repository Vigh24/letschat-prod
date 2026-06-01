import { create } from 'zustand'
import type { ActiveView } from '@/types'

export type AgentStatus = 'online' | 'offline' | 'break' | 'busy'

export interface StatusActivity {
  id: string
  user_name: string
  status: AgentStatus
  created_at: string
}

type Theme = 'light' | 'dark'

interface AppState {
  activeView: ActiveView
  theme: Theme
  sidebarCollapsed: boolean
  badgeCounts: { inbox: number; channels: number }
  agentStatus: AgentStatus
  statusActivities: StatusActivity[]
  setActiveView: (view: ActiveView) => void
  toggleTheme: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setBadgeCounts: (counts: { inbox: number; channels: number }) => void
  setAgentStatus: (status: AgentStatus) => void
  addStatusActivity: (activity: StatusActivity) => void
  setStatusActivities: (activities: StatusActivity[]) => void
}

export const useAppStore = create<AppState>((set) => ({
  activeView: 'dashboard',
  theme: (localStorage.getItem('theme') as Theme) || 'dark',
  sidebarCollapsed: false,
  badgeCounts: { inbox: 0, channels: 0 },
  agentStatus: (localStorage.getItem('agentStatus') as AgentStatus) || 'online',
  statusActivities: JSON.parse(localStorage.getItem('agentStatusActivities') || '[]'),
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
      const nowStr = new Date().toISOString()
      
      const newLog: StatusActivity = {
        id: Math.random().toString(36).substring(2, 11),
        user_name: currentAgent.full_name,
        status: status,
        created_at: nowStr
      }

      useAppStore.getState().addStatusActivity(newLog)
      
      // Update database if configured
      import('@/lib/supabase').then(async ({ supabase, isSupabaseConfigured }) => {
        if (isSupabaseConfigured && currentAgent.id) {
          try {
            await supabase
              .from('users')
              .update({ 
                is_online: status === 'online' || status === 'busy',
                last_seen_at: nowStr
              })
              .eq('id', currentAgent.id)

            // Try to log in database table
            await supabase
              .from('agent_status_logs')
              .insert({
                user_id: currentAgent.id,
                user_name: currentAgent.full_name,
                status: status,
                created_at: nowStr
              })
          } catch (err) {
            console.warn('Failed to sync agent status/logs to DB:', err)
          }
        }
      })
    })

    set({ agentStatus: status })
  },
  addStatusActivity: (activity) => {
    set((state) => {
      const updated = [activity, ...state.statusActivities].slice(0, 100)
      localStorage.setItem('agentStatusActivities', JSON.stringify(updated))
      return { statusActivities: updated }
    })
  },
  setStatusActivities: (activities) => {
    localStorage.setItem('agentStatusActivities', JSON.stringify(activities))
    set({ statusActivities: activities })
  }
}))


