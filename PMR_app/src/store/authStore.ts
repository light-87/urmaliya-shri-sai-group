import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  role: 'ADMIN' | 'EXPENSE_INVENTORY' | 'INVENTORY_ONLY' | 'REGISTRY_MANAGER' | 'LEADS' | null
  setRole: (role: AuthState['role']) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      role: null,
      setRole: (role) => set({ role }),
      clearAuth: () => set({ role: null }),
    }),
    {
      name: 'pmr-auth',
    }
  )
)
