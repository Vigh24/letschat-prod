import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import type { Conversation } from '@/types'

export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      if (!isSupabaseConfigured) return []
      const { data, error } = await supabase
        .from('conversations')
        .select('*, contact:contacts(*), channel:channels(*)')
        .order('updated_at', { ascending: false })

      if (error) throw error
      return (data || []).map((conv: any) => ({
        ...conv,
        tags: conv.tags ?? [],
        contact: Array.isArray(conv.contact) ? conv.contact[0] : conv.contact,
        channel: Array.isArray(conv.channel) ? conv.channel[0] : conv.channel,
        assigned_agent: null,
      })) as Conversation[]
    },
    enabled: isSupabaseConfigured,
  })
}

export function useConversation(id: string | null) {
  return useQuery({
    queryKey: ['conversation', id],
    queryFn: async () => {
      if (!id || !isSupabaseConfigured) return null
      const { data, error } = await supabase
        .from('conversations')
        .select('*, contact:contacts(*), channel:channels(*)')
        .eq('id', id)
        .single()

      if (error) throw error
      if (!data) return null

      return {
        ...data,
        tags: data.tags ?? [],
        contact: Array.isArray(data.contact) ? data.contact[0] : data.contact,
        channel: Array.isArray(data.channel) ? data.channel[0] : data.channel,
        assigned_agent: null,
      } as Conversation
    },
    enabled: !!id && isSupabaseConfigured,
  })
}

export function useResolveConversation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, disposition, sendCsat }: { id: string; disposition?: string; sendCsat?: boolean }) => {
      const res = await fetch(`/api/conversations/${id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disposition, sendCsat }),
      })
      if (!res.ok) throw new Error('Failed to resolve conversation')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })
}
