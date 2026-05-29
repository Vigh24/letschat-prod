import { useEffect, useState } from 'react'
import { Outlet, useNavigate } from '@tanstack/react-router'
import { Sidebar } from '@/components/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { CsatFormView } from '@/components/CsatFormView'
import { AuthView } from '@/components/AuthView'
import { Softphone } from '@/components/Softphone'
import { TwilioVoiceProvider } from '@/hooks/useTwilioVoice'
import { currentAgent } from '@/data/appConfig'
import { useAppStore } from '@/store/appStore'
import type { ActiveView } from '@/types'
import { RefreshCw } from 'lucide-react'
import { Toaster } from 'sonner'

export function RootLayout() {
  const navigate = useNavigate()
  const theme = useAppStore(s => s.theme)
  const setBadgeCounts = useAppStore(s => s.setBadgeCounts)

  // CSAT form standalone mode
  const params = new URLSearchParams(window.location.search)
  const isCsatPage = params.get('csat') === 'true'
  const csatConvId = params.get('convId')
  const csatSig = params.get('sig') || ''

  const [session, setSession] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [isConfigured, setIsConfigured] = useState(false)

  useEffect(() => {
    let mounted = true
    import('@/lib/supabase').then(({ supabase, isSupabaseConfigured }) => {
      if (!mounted) return
      setIsConfigured(isSupabaseConfigured)
      if (!isSupabaseConfigured) { setAuthLoading(false); return }

      const syncProfile = async (s: any) => {
        if (!s) return
        try {
          const oauthName = s.user.user_metadata.full_name || s.user.user_metadata.name || s.user.email?.split('@')[0] || 'Agent'
          currentAgent.id = s.user.id
          currentAgent.email = s.user.email || ''
          currentAgent.full_name = oauthName

          const { data: dbUser } = await supabase
            .from('users').select('*').eq('id', s.user.id).maybeSingle()

          if (dbUser) {
            currentAgent.id = dbUser.id
            currentAgent.email = dbUser.email
            currentAgent.full_name = dbUser.full_name
            currentAgent.role = dbUser.role
          } else {
            const name = oauthName
            const { data: createdUser } = await supabase
              .from('users').insert({
                id: s.user.id,
                organization_id: '00000000-0000-0000-0000-000000000001',
                email: s.user.email || '', full_name: name, role: 'agent', is_online: true
              }).select().single()
            if (createdUser) {
              currentAgent.id = createdUser.id
              currentAgent.email = createdUser.email
              currentAgent.full_name = createdUser.full_name
              currentAgent.role = createdUser.role
            }
          }
        } catch (err) { console.error('Profile sync failed:', err) }
      }

      supabase.auth.getSession().then(({ data: { session: s } }) => {
        if (!mounted) return
        setSession(s)
        setAuthLoading(false)
        if (s) syncProfile(s)
      })

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
        if (!mounted) return
        setSession(s)
        if (s && event !== 'TOKEN_REFRESHED') syncProfile(s)
        if (!s) {
          currentAgent.id = ''; currentAgent.email = ''; currentAgent.full_name = 'Priya Sharma'; currentAgent.role = 'agent'
        }
      })

      return () => subscription.unsubscribe()
    })
    return () => { mounted = false }
  }, [])

  // Theme application
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'light') root.classList.add('light')
    else root.classList.remove('light')
    root.classList.add('theme-changing')
    setTimeout(() => root.classList.remove('theme-changing'), 350)
  }, [theme])

  // Badge counts
  useEffect(() => {
    let mounted = true
    let channel: any = null
    import('@/lib/supabase').then(async ({ supabase, isSupabaseConfigured }) => {
      if (!isSupabaseConfigured) return
      const fetchCounts = async () => {
        const { count: ib } = await supabase.from('conversations').select('*', { count: 'exact', head: true }).in('status', ['open', 'pending'])
        const { count: ch } = await supabase.from('channels').select('*', { count: 'exact', head: true }).eq('is_active', true)
        if (mounted) setBadgeCounts({ inbox: ib || 0, channels: ch || 0 })
      }
      fetchCounts()
      channel = supabase.channel(`badge-${Date.now()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => { if (document.visibilityState === 'visible') fetchCounts() })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'channels' }, () => { if (document.visibilityState === 'visible') fetchCounts() })
        .subscribe()
    })
    return () => {
      mounted = false
      if (channel) import('@/lib/supabase').then(({ supabase }) => supabase.removeChannel(channel))
    }
  }, [setBadgeCounts])

  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (isCsatPage && csatConvId) {
    return <CsatFormView convId={csatConvId} sig={csatSig} />
  }

  const handleLogOut = async () => {
    const { supabase, isSupabaseConfigured } = await import('@/lib/supabase')
    if (isSupabaseConfigured) await supabase.auth.signOut()
    navigate({ to: '/auth' })
  }

  const handleViewChange = (view: ActiveView) => {
    navigate({ to: view === 'dashboard' ? '/' : `/${view}` })
  }

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center theme-bg-primary">
        <RefreshCw className="h-5 w-5 text-emerald-500 dark:text-emerald-400 animate-spin" />
      </div>
    )
  }

  if (isConfigured && !session) {
    return <AuthView />
  }

  const activeView = getActiveViewFromPath(window.location.pathname)

  return (
    <TwilioVoiceProvider>
      <div className="flex h-screen overflow-hidden theme-bg-primary theme-text-main font-sans antialiased transition-all duration-200">
        <Sidebar
          activeView={activeView}
          onViewChange={handleViewChange}
          badgeCounts={useAppStore.getState().badgeCounts}
          onLogOut={handleLogOut}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          <TopBar onMenuClick={() => setSidebarOpen(true)} />
          <main className="flex-1 overflow-hidden">
            <Outlet />
          </main>
        </div>
      </div>
      <Softphone activeView={activeView} />
      <Toaster position="top-right" richColors />
    </TwilioVoiceProvider>
  )
}

function getActiveViewFromPath(pathname: string) {
  if (pathname === '/') return 'dashboard' as const
  const segment = pathname.split('/')[1]
  if (segment === 'inbox') return 'inbox' as const
  return (segment || 'dashboard') as 'dashboard' | 'inbox' | 'tickets' | 'copilot' | 'simulator' | 'channels' | 'ai_training' | 'analytics' | 'settings' | 'team'
}
