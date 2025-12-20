import { create } from 'zustand'
import type { VoiceProfile } from '../shared/voices'
import { voicePresets } from '../shared/voices'

export type CompanionMode = 'actions' | 'chat' | 'autonomous'

export interface Suggestion {
  id: string
  text: string
  auditFlags?: string[]
}

export interface ChatTurn {
  id: string
  role: 'user' | 'assistant'
  text: string
  auditFlags?: string[]
}

export interface WritingStyle {
  id: string
  name: string
  content: string
  created_at?: string
}

interface CompanionState {
  mode: CompanionMode
  activeVoice: VoiceProfile
  loading: boolean
  error: string | null
  suggestions: Suggestion[]
  chat: ChatTurn[]
  selectionPreview: string
  writingStyles: WritingStyle[]
  setMode: (mode: CompanionMode) => void
  setVoice: (id: string) => void
  setSelectionPreview: (text: string) => void
  setLoading: (loading: boolean) => void
  setError: (err: string | null) => void
  addSuggestion: (text: string, auditFlags?: string[]) => void
  clearSuggestions: () => void
  addChatTurn: (turn: ChatTurn) => void
  clearChat: () => void
  addWritingStyle: (name: string, content: string) => Promise<void>
  loadWritingStyles: () => Promise<void>
}

export const useCompanionStore = create<CompanionState>((set, get) => ({
  mode: 'actions',
  activeVoice: voicePresets[0],
  loading: false,
  error: null,
  suggestions: [],
  chat: [],
  selectionPreview: '',
  writingStyles: [],
  setMode: (mode) => set({ mode }),
  setVoice: (id) => {
    const next = voicePresets.find((v) => v.id === id)
    if (next) set({ activeVoice: next })
  },
  setSelectionPreview: (text) => set({ selectionPreview: text }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  addSuggestion: (text, auditFlags) => {
    const entry: Suggestion = { id: crypto.randomUUID(), text, auditFlags }
    set({ suggestions: [...get().suggestions, entry] })
  },
  clearSuggestions: () => set({ suggestions: [] }),
  addChatTurn: (turn) => set({ chat: [...get().chat, turn] }),
  clearChat: () => set({ chat: [] }),
  addWritingStyle: async (name, content) => {
    const fallback: WritingStyle = { id: crypto.randomUUID(), name, content }
    try {
      const res = await fetch('/api/styles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, content }),
      })
      if (!res.ok) throw new Error(`Failed to save style (${res.status})`)
      const data = await res.json()
      const entry: WritingStyle = data?.style ?? fallback
      set({ writingStyles: [entry, ...get().writingStyles] })
    } catch (e) {
      console.warn('Failed to save style, falling back to local only', e)
      set({ writingStyles: [fallback, ...get().writingStyles] })
    }
  },
  loadWritingStyles: async () => {
    try {
      const res = await fetch('/api/styles')
      if (!res.ok) {
        if (res.status === 404) {
          set({ writingStyles: [] })
          return
        }
        throw new Error(`Failed to load styles (${res.status})`)
      }
      const data = await res.json()
      const styles = Array.isArray(data?.styles) ? data.styles : []
      set({ writingStyles: styles })
    } catch (e) {
      console.warn('Failed to load styles', e)
      set({ writingStyles: [] })
    }
  },
}))
