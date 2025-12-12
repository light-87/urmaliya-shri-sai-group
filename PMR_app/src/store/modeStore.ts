import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type AppMode = 'DEF' | 'REGISTRY'

interface ModeState {
  mode: AppMode
  setMode: (mode: AppMode) => void
  toggleMode: () => void
}

export const useModeStore = create<ModeState>()(
  persist(
    (set) => ({
      mode: 'DEF',
      setMode: (mode) => set({ mode }),
      toggleMode: () => set((state) => ({
        mode: state.mode === 'DEF' ? 'REGISTRY' : 'DEF'
      })),
    }),
    {
      name: 'app-mode-storage',
    }
  )
)
