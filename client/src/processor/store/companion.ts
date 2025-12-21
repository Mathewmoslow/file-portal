import { create } from 'zustand'
import type { VoiceProfile } from '../shared/voices'
import { voicePresets } from '../shared/voices'

export type CompanionMode = 'actions' | 'chat' | 'autonomous'
export type CompanionScope = 'selection' | 'paragraph' | 'full_document'

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

// Pending suggestion awaiting user confirmation
export interface PendingSuggestion {
  id: string
  originalText: string
  suggestedText: string
  scope: CompanionScope
  auditFlags?: string[]
  warnings: string[]
  lengthChange: number // percentage: positive = longer, negative = shorter
}

// History entry for revert functionality
export interface AppliedChange {
  id: string
  timestamp: number
  originalText: string
  appliedText: string
  scope: CompanionScope
}

interface CompanionState {
  mode: CompanionMode
  scope: CompanionScope
  activeVoice: VoiceProfile
  loading: boolean
  error: string | null
  suggestions: Suggestion[]
  chat: ChatTurn[]
  selectionPreview: string
  writingStyles: WritingStyle[]
  pendingSuggestion: PendingSuggestion | null
  appliedChanges: AppliedChange[]
  setMode: (mode: CompanionMode) => void
  setScope: (scope: CompanionScope) => void
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
  // New safeguard actions
  setPendingSuggestion: (original: string, suggested: string, auditFlags?: string[]) => void
  clearPendingSuggestion: () => void
  confirmPendingSuggestion: () => AppliedChange | null
  addAppliedChange: (change: AppliedChange) => void
  getLastAppliedChange: () => AppliedChange | null
  revertLastChange: () => AppliedChange | null
  resetCompanion: () => void
}

// Helper to calculate warnings based on text changes
function calculateWarnings(original: string, suggested: string): string[] {
  const warnings: string[] = []
  const originalLen = original.length
  const suggestedLen = suggested.length
  const lengthChange = originalLen > 0 ? ((suggestedLen - originalLen) / originalLen) * 100 : 0

  // Warn if significantly shorter (>50% reduction)
  if (lengthChange < -50) {
    warnings.push(`Text reduced by ${Math.abs(Math.round(lengthChange))}% - significant content may be removed`)
  }

  // Warn if significantly longer (>100% increase)
  if (lengthChange > 100) {
    warnings.push(`Text expanded by ${Math.round(lengthChange)}% - substantial additions`)
  }

  // Simple similarity check (word overlap)
  const originalWords = new Set(original.toLowerCase().split(/\s+/).filter(w => w.length > 3))
  const suggestedWords = new Set(suggested.toLowerCase().split(/\s+/).filter(w => w.length > 3))
  const intersection = [...originalWords].filter(w => suggestedWords.has(w))
  const similarity = originalWords.size > 0 ? intersection.length / originalWords.size : 1

  if (similarity < 0.3 && originalLen > 50) {
    warnings.push('Major rewrite detected - most original content replaced')
  }

  return warnings
}

export const useCompanionStore = create<CompanionState>((set, get) => ({
  mode: 'actions',
  scope: 'selection', // Default to safest scope
  activeVoice: voicePresets[0],
  loading: false,
  error: null,
  suggestions: [],
  chat: [],
  selectionPreview: '',
  writingStyles: [],
  pendingSuggestion: null,
  appliedChanges: [],
  setMode: (mode) => set({ mode }),
  setScope: (scope) => set({ scope }),
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

  // Safeguard: Set pending suggestion with analysis
  setPendingSuggestion: (original, suggested, auditFlags) => {
    const warnings = calculateWarnings(original, suggested)
    const lengthChange = original.length > 0
      ? ((suggested.length - original.length) / original.length) * 100
      : 0

    const pending: PendingSuggestion = {
      id: crypto.randomUUID(),
      originalText: original,
      suggestedText: suggested,
      scope: get().scope,
      auditFlags,
      warnings,
      lengthChange,
    }
    set({ pendingSuggestion: pending })
  },

  clearPendingSuggestion: () => set({ pendingSuggestion: null }),

  // Confirm and return the change to be applied
  confirmPendingSuggestion: () => {
    const pending = get().pendingSuggestion
    if (!pending) return null

    const change: AppliedChange = {
      id: pending.id,
      timestamp: Date.now(),
      originalText: pending.originalText,
      appliedText: pending.suggestedText,
      scope: pending.scope,
    }

    set({
      pendingSuggestion: null,
      appliedChanges: [...get().appliedChanges, change],
    })

    return change
  },

  addAppliedChange: (change) => {
    set({ appliedChanges: [...get().appliedChanges, change] })
  },

  getLastAppliedChange: () => {
    const changes = get().appliedChanges
    return changes.length > 0 ? changes[changes.length - 1] : null
  },

  revertLastChange: () => {
    const changes = get().appliedChanges
    if (changes.length === 0) return null
    const last = changes[changes.length - 1]
    set({ appliedChanges: changes.slice(0, -1) })
    return last
  },

  // Reset all companion state for fresh start
  resetCompanion: () => {
    set({
      suggestions: [],
      chat: [],
      selectionPreview: '',
      pendingSuggestion: null,
      appliedChanges: [],
      error: null,
      loading: false,
    })
  },

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
