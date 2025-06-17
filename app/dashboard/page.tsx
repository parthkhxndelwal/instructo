"use client"

import { useEffect, useState } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { dashboardAPI } from "@/lib/api"
import { formatDate, formatDateTime } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import { GraduationCap, FolderOpen, ClipboardList, AlertTriangle, CheckCircle, Mail, Calendar } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"

interface DashboardStats {
  overview: {
    totalProjects: number
    totalTrainees: number
    totalAdmins: number
    totalAssignments: number
    activeAssignments: number
    completedAssignments: number
    recentProgressEntries: number
  }
  assignmentsByStatus: Record<string, number>
  recentAssignments: any[]
  upcomingDeadlines: any[]
  progressNeedingAttention: any[]
}

const statusColors = {
  "Not Started": "#f59e0b",
  "In Progress": "#3b82f6",
  Completed: "#10b981",
  "On Hold": "#6b7280",
  Cancelled: "#ef4444",
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#6b7280", "#ef4444"]

export default function DashboardPage() {
  const { toast } = useToast()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      const response = await dashboardAPI.getStats()
      setStats(response.data.data)
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load dashboard statistics",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </MainLayout>
    )
  }

  if (!stats) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Failed to load dashboard data</p>
          <Button onClick={fetchDashboardStats} className="mt-4">
            Retry
          </Button>
        </div>
      </MainLayout>
    )
  }

  const chartData = Object.entries(stats.assignmentsByStatus).map(([status, count]) => ({
    status,
    count,
    color: statusColors[status as keyof typeof statusColors] || "#6b7280",
  }))

  const pieData = Object.entries(stats.assignmentsByStatus).map(([status, count]) => ({
    name: status,
    value: count,
  }))

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Welcome back! Here's an overview of your training management activities.
            </p>
          </div>
          <Button onClick={fetchDashboardStats}>Refresh Data</Button>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Projects</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.overview.totalProjects}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <FolderOpen className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Trainees</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.overview.totalTrainees}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <GraduationCap className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Assignments</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.overview.activeAssignments}</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-full">
                  <ClipboardList className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.overview.completedAssignments}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <CheckCircle className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Assignment Status Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Assignment Status Distribution</CardTitle>
              <CardDescription>Overview of all assignment statuses</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Assignment Status Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Assignment Status Breakdown</CardTitle>
              <CardDescription>Percentage distribution of assignment statuses</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activities and Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Assignments */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Assignments</CardTitle>
              <CardDescription>Latest project assignments to trainees</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.recentAssignments.length > 0 ? (
                  stats.recentAssignments.slice(0, 5).map((assignment) => (
                    <div key={assignment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{assignment.trainee.name}</p>
                        <p className="text-sm text-gray-600">{assignment.project.name}</p>
                        <p className="text-xs text-gray-500">{formatDate(assignment.createdAt)}</p>
                      </div>
                      <Badge variant={assignment.status === "Completed" ? "default" : "secondary"} className="ml-2">
                        {assignment.status}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No recent assignments</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Deadlines */}
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Deadlines</CardTitle>
              <CardDescription>Assignments due in the next 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.upcomingDeadlines.length > 0 ? (
                  stats.upcomingDeadlines.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <Calendar className="w-5 h-5 text-yellow-600" />
                        <div>
                          <p className="font-medium text-gray-900">{assignment.trainee.name}</p>
                          <p className="text-sm text-gray-600">{assignment.project.name}</p>
                          <p className="text-xs text-yellow-700">
                            Due: {formatDate(assignment.expectedCompletionDate)}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="border-yellow-300 text-yellow-700">
                        {assignment.status}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No upcoming deadlines</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Needing Attention */}
        {stats.progressNeedingAttention.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span>Progress Needing Attention</span>
              </CardTitle>
              <CardDescription>Blocked or on-hold progress entries that require your attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.progressNeedingAttention.map((progress) => (
                  <div
                    key={progress.id}
                    className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <p className="font-medium text-gray-900">{progress.assignment.trainee.name}</p>
                        <span className="text-gray-400">•</span>
                        <p className="text-sm text-gray-600">{progress.assignment.project.name}</p>
                      </div>
                      <p className="text-sm text-gray-700 mt-1">{progress.title}</p>
                      <p className="text-xs text-gray-500 mt-1">Last updated: {formatDateTime(progress.updatedAt)}</p>
                      {progress.blockers && (
                        <p className="text-sm text-red-700 mt-2">
                          <strong>Blockers:</strong> {progress.blockers}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-300">
                        {progress.currentStatus}
                      </Badge>
                      <Button size="sm" variant="outline">
                        Review
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks to get you started</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button className="h-auto p-4 flex flex-col items-center space-y-2" variant="outline">
                <GraduationCap className="w-6 h-6" />
                <span>Add Trainee</span>
              </Button>
              <Button className="h-auto p-4 flex flex-col items-center space-y-2" variant="outline">
                <FolderOpen className="w-6 h-6" />
                <span>Create Project</span>
              </Button>
              <Button className="h-auto p-4 flex flex-col items-center space-y-2" variant="outline">
                <ClipboardList className="w-6 h-6" />
                <span>New Assignment</span>
              </Button>
              <Button className="h-auto p-4 flex flex-col items-center space-y-2" variant="outline">
                <Mail className="w-6 h-6" />
                <span>Send Report</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
