import { create } from 'zustand'
import type { Conversation, Message } from '@/types'

interface ChatState {
  selectedConvId: string | null
  conversations: Conversation[]
  conversationMap: Map<string, Message[]>
  loading: boolean
  setSelectedConvId: (id: string | null) => void
  setConversations: (convs: Conversation[]) => void
  setMessages: (convId: string, messages: Message[]) => void
  appendMessage: (convId: string, message: Message) => void
  setLoading: (loading: boolean) => void
}

export const useChatStore = create<ChatState>((set) => ({
  selectedConvId: null,
  conversations: [],
  conversationMap: new Map(),
  loading: false,
  setSelectedConvId: (id) => set({ selectedConvId: id }),
  setConversations: (convs) => set({ conversations: convs }),
  setMessages: (convId, messages) =>
    set((state) => {
      const next = new Map(state.conversationMap)
      next.set(convId, messages)
      return { conversationMap: next }
    }),
  appendMessage: (convId, message) =>
    set((state) => {
      const next = new Map(state.conversationMap)
      const existing = next.get(convId) || []
      next.set(convId, [...existing, message])
      return { conversationMap: next }
    }),
  setLoading: (loading) => set({ loading }),
}))
