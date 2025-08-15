"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAppStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  FolderOpen,
  ClipboardList,
  Mail,
  Settings,
  ChevronLeft,
  ChevronRight,
  Star,
  Target,
} from "lucide-react"

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Overview and statistics",
  },
  {
    name: "Admins",
    href: "/admins",
    icon: Users,
    description: "Manage admin contacts",
  },
  {
    name: "Trainees",
    href: "/trainees",
    icon: GraduationCap,
    description: "Manage trainee information",
  },
  {
    name: "Projects",
    href: "/projects",
    icon: FolderOpen,
    description: "Create and manage projects",
  },
  {
    name: "Assignments",
    href: "/assignments",
    icon: ClipboardList,
    description: "Assign projects to trainees",
  },
  {
    name: "Progress Tracking",
    href: "/progress",
    icon: Target,
    description: "Record and track progress",
  },
  {
    name: "Reports & Email",
    href: "/reports",
    icon: Mail,
    description: "Send progress reports",
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
    description: "Configure application",
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { sidebarOpen, setSidebarOpen, emailConfigured } = useAppStore()

  return (
    <>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-30 flex flex-col bg-white border-r border-gray-200 transition-all duration-300",
          sidebarOpen ? "w-64" : "w-16",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          {sidebarOpen && (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-gray-900">Senpaihost Training</h1>
                <p className="text-xs text-gray-500">Management Tool</p>
              </div>
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5">
            {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </Button>
        </div>

        {/* Email Configuration Warning */}
        {!emailConfigured && sidebarOpen && (
          <div className="p-4 border-b border-gray-200">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <Star className="w-4 h-4 text-yellow-600" />
                <span className="text-xs font-medium text-yellow-800">Setup Required</span>
              </div>
              <p className="text-xs text-yellow-700 mt-1">Configure email settings to enable report sending</p>
              <Link href="/settings">
                <Button size="sm" variant="outline" className="mt-2 text-xs h-7">
                  Configure Now
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon

            return (
              <Link key={item.name} href={item.href}>
                <div
                  className={cn(
                    "flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-blue-100 text-blue-700 border border-blue-200"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900",
                  )}
                >
                  <Icon className={cn("w-5 h-5 flex-shrink-0", isActive ? "text-blue-600" : "text-gray-400")} />
                  {sidebarOpen && (
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="truncate">{item.name}</span>
                        {item.name === "Reports & Email" && !emailConfigured && (
                          <Badge variant="outline" className="text-xs border-yellow-300 text-yellow-700">
                            Setup
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate">{item.description}</p>
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        {sidebarOpen && (
          <div className="p-4 border-t border-gray-200">
            <div className="text-center">
              <p className="text-xs text-gray-500">Senpaihost Training Management</p>
              <p className="text-xs text-gray-400">v1.0.0</p>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
