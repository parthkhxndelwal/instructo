"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/ui/data-table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { projectAPI } from "@/lib/api"
import { useToast } from "@/components/ui/use-toast"
import { formatDate } from "@/lib/utils"
import { Plus, MoreHorizontal, Edit, Trash2, FolderOpen, Clock, Target, Star } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"

const projectSchema = z.object({
  name: z.string().min(2, "Project name must be at least 2 characters"),
  description: z.string().optional(),
  objectives: z.string().optional(),
  duration: z.number().min(1, "Duration must be at least 1 day").optional(),
  requiredSkills: z.string().optional(),
  difficultyLevel: z.enum(["Beginner", "Intermediate", "Advanced"]).optional(),
  expectedDeliverables: z.string().optional(),
})

type ProjectForm = z.infer<typeof projectSchema>

interface Project {
  id: string
  name: string
  description?: string
  objectives?: string
  duration?: number
  requiredSkills?: string
  difficultyLevel: "Beginner" | "Intermediate" | "Advanced"
  expectedDeliverables?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

const difficultyColors = {
  Beginner: "bg-green-100 text-green-800 border-green-300",
  Intermediate: "bg-yellow-100 text-yellow-800 border-yellow-300",
  Advanced: "bg-red-100 text-red-800 border-red-300",
}

export default function ProjectsPage() {
  const { toast } = useToast()
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<ProjectForm>({
    resolver: zodResolver(projectSchema),
  })

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      const response = await projectAPI.getAll()
      setProjects(response.data.data.projects)
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load projects",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: ProjectForm) => {
    setIsSubmitting(true)
    try {
      if (editingProject) {
        await projectAPI.update(editingProject.id, data)
        toast({
          title: "Project updated",
          description: "Project has been updated successfully.",
        })
      } else {
        await projectAPI.create(data)
        toast({
          title: "Project created",
          description: "New project has been added successfully.",
        })
      }

      setIsDialogOpen(false)
      setEditingProject(null)
      reset()
      fetchProjects()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to save project",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (project: Project) => {
    setEditingProject(project)
    setValue("name", project.name)
    setValue("description", project.description || "")
    setValue("objectives", project.objectives || "")
    setValue("duration", project.duration)
    setValue("requiredSkills", project.requiredSkills || "")
    setValue("difficultyLevel", project.difficultyLevel)
    setValue("expectedDeliverables", project.expectedDeliverables || "")
    setIsDialogOpen(true)
  }

  const handleDelete = async (project: Project) => {
    if (!confirm("Are you sure you want to delete this project?")) return

    try {
      await projectAPI.delete(project.id)
      toast({
        title: "Project deleted",
        description: "Project has been removed successfully.",
      })
      fetchProjects()
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete project",
        variant: "destructive",
      })
    }
  }

  const columns: ColumnDef<Project>[] = [
    {
      accessorKey: "name",
      header: "Project Name",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.getValue("name")}</div>
          <div className="text-sm text-gray-500">{row.original.description?.slice(0, 60)}...</div>
        </div>
      ),
    },
    {
      accessorKey: "difficultyLevel",
      header: "Difficulty",
      cell: ({ row }) => {
        const difficulty = row.getValue("difficultyLevel") as keyof typeof difficultyColors
        return <Badge className={difficultyColors[difficulty]}>{difficulty}</Badge>
      },
    },
    {
      accessorKey: "duration",
      header: "Duration",
      cell: ({ row }) => {
        const duration = row.getValue("duration") as number
        return duration ? `${duration} days` : "—"
      },
    },
    {
      accessorKey: "requiredSkills",
      header: "Required Skills",
      cell: ({ row }) => {
        const skills = row.getValue("requiredSkills") as string
        return skills ? <span className="text-sm">{skills.slice(0, 40)}...</span> : "—"
      },
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => formatDate(row.getValue("createdAt")),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const project = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleEdit(project)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDelete(project)} className="text-red-600">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const openCreateDialog = () => {
    setEditingProject(null)
    reset()
    setIsDialogOpen(true)
  }

  const difficultyStats = {
    Beginner: projects.filter((p) => p.difficultyLevel === "Beginner").length,
    Intermediate: projects.filter((p) => p.difficultyLevel === "Intermediate").length,
    Advanced: projects.filter((p) => p.difficultyLevel === "Advanced").length,
  }

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">Project Management</h1>
          </div>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Project Management</h1>
            <p className="text-gray-600 mt-1">Create and manage training projects that will be assigned to trainees.</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <Plus className="w-4 h-4 mr-2" />
                Create Project
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingProject ? "Edit Project" : "Create New Project"}</DialogTitle>
                <DialogDescription>
                  {editingProject
                    ? "Update project information and requirements."
                    : "Create a new training project with objectives and deliverables."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="name">Project Name *</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Aahaar - Canteen Management System"
                      {...register("name")}
                      className={errors.name ? "border-red-500" : ""}
                    />
                    {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="difficultyLevel">Difficulty Level</Label>
                    <Select
                      value={watch("difficultyLevel")}
                      onValueChange={(value) => setValue("difficultyLevel", value as any)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select difficulty" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Beginner">Beginner</SelectItem>
                        <SelectItem value="Intermediate">Intermediate</SelectItem>
                        <SelectItem value="Advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration (Days)</Label>
                    <Input
                      id="duration"
                      type="number"
                      placeholder="30"
                      {...register("duration", { valueAsNumber: true })}
                      className={errors.duration ? "border-red-500" : ""}
                    />
                    {errors.duration && <p className="text-sm text-red-600">{errors.duration.message}</p>}
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="A comprehensive canteen management system for NHPC..."
                      {...register("description")}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="objectives">Objectives</Label>
                    <Textarea
                      id="objectives"
                      placeholder="Develop a web-based system for canteen operations..."
                      {...register("objectives")}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="requiredSkills">Required Skills</Label>
                    <Textarea
                      id="requiredSkills"
                      placeholder="Java, Spring Boot, MySQL, HTML, CSS, JavaScript"
                      {...register("requiredSkills")}
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="expectedDeliverables">Expected Deliverables</Label>
                    <Textarea
                      id="expectedDeliverables"
                      placeholder="Working web application with user authentication, menu management..."
                      {...register("expectedDeliverables")}
                      rows={3}
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        {editingProject ? "Updating..." : "Creating..."}
                      </>
                    ) : editingProject ? (
                      "Update Project"
                    ) : (
                      "Create Project"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Projects</p>
                  <p className="text-3xl font-bold text-gray-900">{projects.length}</p>
                </div>
                <FolderOpen className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Beginner</p>
                  <p className="text-3xl font-bold text-green-600">{difficultyStats.Beginner}</p>
                </div>
                <Star className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Intermediate</p>
                  <p className="text-3xl font-bold text-yellow-600">{difficultyStats.Intermediate}</p>
                </div>
                <Target className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Advanced</p>
                  <p className="text-3xl font-bold text-red-600">{difficultyStats.Advanced}</p>
                </div>
                <Clock className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Project Examples */}
        <Card>
          <CardHeader>
            <CardTitle>Project Examples</CardTitle>
            <CardDescription>Sample projects to get you started</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">Aahaar CMS</h4>
                  <Badge className={difficultyColors.Intermediate}>Intermediate</Badge>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  Canteen Management System with menu management and order processing
                </p>
                <p className="text-xs text-gray-500">Skills: Java, Spring Boot, MySQL</p>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">Employee Portal</h4>
                  <Badge className={difficultyColors.Beginner}>Beginner</Badge>
                </div>
                <p className="text-sm text-gray-600 mb-2">Basic employee information portal with CRUD operations</p>
                <p className="text-xs text-gray-500">Skills: HTML, CSS, JavaScript, PHP</p>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">Analytics Dashboard</h4>
                  <Badge className={difficultyColors.Advanced}>Advanced</Badge>
                </div>
                <p className="text-sm text-gray-600 mb-2">Real-time analytics dashboard with data visualization</p>
                <p className="text-xs text-gray-500">Skills: React, Node.js, MongoDB, D3.js</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Projects Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Projects</CardTitle>
            <CardDescription>Manage and view all training projects in your library.</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable columns={columns} data={projects} searchKey="name" searchPlaceholder="Search projects..." />
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
