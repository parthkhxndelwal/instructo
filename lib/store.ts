import { create } from "zustand"
import { persist } from "zustand/middleware"

interface User {
  id: string
  name: string
  email: string
  nhpcDepartment?: string
  employeeId?: string
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (user: User, token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: (user, token) => {
        localStorage.setItem("token", token)
        localStorage.setItem("user", JSON.stringify(user))
        set({ user, token, isAuthenticated: true })
      },
      logout: () => {
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        set({ user: null, token: null, isAuthenticated: false })
      },
    }),
    {
      name: "auth-storage",
    },
  ),
)

interface AppState {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  setupComplete: boolean
  setSetupComplete: (complete: boolean) => void
  emailConfigured: boolean
  setEmailConfigured: (configured: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setupComplete: false,
  setSetupComplete: (complete) => set({ setupComplete: complete }),
  emailConfigured: false,
  setEmailConfigured: (configured) => set({ emailConfigured: configured }),
}))
