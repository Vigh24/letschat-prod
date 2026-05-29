import { createRootRoute, createRoute, createRouter, useParams, useNavigate } from '@tanstack/react-router'
import { RootLayout } from '@/components/layout/RootLayout'
import { lazy } from 'react'
import type { ActiveView } from '@/types'

const DashboardView = lazy(() => import('@/components/DashboardView').then(m => ({ default: m.DashboardView })))
const InboxView = lazy(() => import('@/components/InboxView').then(m => ({ default: m.InboxView })))
const TicketsView = lazy(() => import('@/components/TicketsView').then(m => ({ default: m.TicketsView })))
const CopilotView = lazy(() => import('@/components/CopilotView').then(m => ({ default: m.CopilotView })))
const SimulatorView = lazy(() => import('@/components/SimulatorView').then(m => ({ default: m.SimulatorView })))
const ChannelsView = lazy(() => import('@/components/ChannelsView').then(m => ({ default: m.ChannelsView })))
const AITrainingView = lazy(() => import('@/components/AITrainingView').then(m => ({ default: m.AITrainingView })))
const AnalyticsView = lazy(() => import('@/components/AnalyticsView').then(m => ({ default: m.AnalyticsView })))
const SettingsView = lazy(() => import('@/components/SettingsView').then(m => ({ default: m.SettingsView })))
const TeamView = lazy(() => import('@/components/TeamView').then(m => ({ default: m.TeamView })))
const AuthView = lazy(() => import('@/components/AuthView').then(m => ({ default: m.AuthView })))

// ── Wrappers that wire route-level concerns to view props ──

function DashboardWrapper() {
  const navigate = useNavigate()
  return (
    <DashboardView
      onNavigate={(view: ActiveView) => navigate({ to: view === 'dashboard' ? '/' : `/${view}` })}
      onSelectConversation={(id: string) => navigate({ to: '/inbox/$conversationId', params: { conversationId: id } })}
    />
  )
}

function InboxWrapper() {
  return <InboxView />
}

function ConversationWrapper() {
  const navigate = useNavigate()
  const { conversationId } = useParams({ strict: false }) as { conversationId?: string }
  return (
    <InboxView
      selectedConvId={conversationId || null}
      setSelectedConvId={(id: string | null) => {
        if (id) navigate({ to: '/inbox/$conversationId', params: { conversationId: id } })
        else navigate({ to: '/inbox' })
      }}
    />
  )
}

function TicketsWrapper() {
  const navigate = useNavigate()
  return (
    <TicketsView
      onSelectTicket={(convId: string) => navigate({ to: '/inbox/$conversationId', params: { conversationId: convId } })}
    />
  )
}

// ── Routes ─────────────────────────────────────────────────

const rootRoute = createRootRoute({
  component: () => <RootLayout />,
})

export const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: DashboardWrapper,
})

export const inboxRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/inbox',
  component: InboxWrapper,
})

export const conversationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/inbox/$conversationId',
  component: ConversationWrapper,
})

export const ticketsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tickets',
  component: TicketsWrapper,
})

export const copilotRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/copilot',
  component: () => <CopilotView />,
})

export const simulatorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/simulator',
  component: () => <SimulatorView />,
})

export const channelsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/channels',
  component: () => <ChannelsView />,
})

export const aiTrainingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/ai-training',
  component: () => <AITrainingView />,
})

export const analyticsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/analytics',
  component: () => <AnalyticsView />,
})

export const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: () => <SettingsView />,
})

export const teamRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/team',
  component: () => <TeamView />,
})

export const authRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth',
  component: () => <AuthView />,
})

const routeTree = rootRoute.addChildren([
  dashboardRoute,
  inboxRoute,
  conversationRoute,
  ticketsRoute,
  copilotRoute,
  simulatorRoute,
  channelsRoute,
  aiTrainingRoute,
  analyticsRoute,
  settingsRoute,
  teamRoute,
  authRoute,
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
