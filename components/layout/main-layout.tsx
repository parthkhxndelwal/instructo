"use client"

import type React from "react"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore, useAppStore } from "@/lib/store"
import { Sidebar } from "./sidebar"
import { Header } from "./header"
import { Toaster } from "@/components/ui/toaster"
import { emailConfigAPI } from "@/lib/api"

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()
  const { sidebarOpen, setEmailConfigured } = useAppStore()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login")
      return
    }

    // Check email configuration status
    const checkEmailConfig = async () => {
      try {
        const response = await emailConfigAPI.get()
        setEmailConfigured(response.data.data.emailConfiguration?.isConfigured || false)
      } catch (error) {
        console.error("Failed to check email configuration:", error)
        setEmailConfigured(false)
      }
    }

    checkEmailConfig()
  }, [isAuthenticated, router, setEmailConfigured])

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <Header />
      <main className={`transition-all duration-300 ${sidebarOpen ? "ml-64" : "ml-16"} mt-16`}>
        <div className="p-6">{children}</div>
      </main>
      <Toaster />
    </div>
  )
}
