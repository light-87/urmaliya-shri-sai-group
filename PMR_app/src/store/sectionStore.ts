import { create } from 'zustand'
import { allSectionsOff, type SectionFlags } from '@/lib/sections'

// Which optional sections are on. Not persisted: always read fresh from the
// server so an admin's change shows up on every device.
interface SectionState {
  flags: SectionFlags
  loaded: boolean
  fetchFlags: () => Promise<void>
  setFlags: (flags: SectionFlags) => void
}

export const useSectionStore = create<SectionState>()((set) => ({
  flags: allSectionsOff(),
  loaded: false,
  fetchFlags: async () => {
    try {
      const response = await fetch('/api/settings/sections', { cache: 'no-store' })
      const data = await response.json()
      if (data.success) {
        set({ flags: data.flags, loaded: true })
      } else {
        set({ loaded: true })
      }
    } catch (error) {
      console.error('Failed to load section settings:', error)
      set({ loaded: true })
    }
  },
  setFlags: (flags) => set({ flags, loaded: true }),
}))
