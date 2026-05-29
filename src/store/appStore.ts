import { create } from 'zustand'
import type { ActiveView } from '@/types'

type Theme = 'light' | 'dark'

interface AppState {
  activeView: ActiveView
  theme: Theme
  sidebarCollapsed: boolean
  badgeCounts: { inbox: number; channels: number }
  setActiveView: (view: ActiveView) => void
  toggleTheme: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setBadgeCounts: (counts: { inbox: number; channels: number }) => void
}

export const useAppStore = create<AppState>((set) => ({
  activeView: 'dashboard',
  theme: (localStorage.getItem('theme') as Theme) || 'dark',
  sidebarCollapsed: false,
  badgeCounts: { inbox: 0, channels: 0 },
  setActiveView: (view) => set({ activeView: view }),
  toggleTheme: () =>
    set((state) => {
      const next = state.theme === 'dark' ? 'light' : 'dark'
      localStorage.setItem('theme', next)
      return { theme: next }
    }),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setBadgeCounts: (counts) => set({ badgeCounts: counts }),
}))
