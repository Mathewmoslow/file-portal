import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'

interface AuthState {
  user: User | null
  loading: boolean
  init: () => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  init: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    set({ user: session?.user ?? null, loading: false })

    supabase.auth.onAuthStateChange((_event, sessionChange) => {
      set({ user: sessionChange?.user ?? null, loading: false })
    })
  },
  signInWithGoogle: async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    })
    if (error) {
      console.error('Google sign-in error', error.message)
      throw error
    }
  },
  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Sign out error', error.message)
      throw error
    }
  },
}))
