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
import { Checkbox } from "@/components/ui/checkbox"
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
import { assignmentAPI, projectAPI, traineeAPI } from "@/lib/api"
import { useToast } from "@/components/ui/use-toast"
import { formatDate } from "@/lib/utils"
import { Plus, MoreHorizontal, Edit, Trash2, ClipboardList, Users, Calendar, Target } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"

const assignmentSchema = z.object({
  projectId: z.string().min(1, "Please select a project"),
  traineeIds: z.array(z.string()).min(1, "Please select at least one trainee"),
  startDate: z.string().min(1, "Start date is required"),
  expectedCompletionDate: z.string().optional(),
  progressType: z.enum(["Individual", "Group"]),
  notes: z.string().optional(),
})

type AssignmentForm = z.infer<typeof assignmentSchema>

interface Assignment {
  id: string
  assignmentCode: string
  startDate: string
  expectedCompletionDate?: string
  actualCompletionDate?: string
  status: "Not Started" | "In Progress" | "Completed" | "On Hold" | "Cancelled"
  progressType: "Individual" | "Group"
  notes?: string
  project: {
    id: string
    name: string
    description?: string
    difficultyLevel: string
  }
  trainee: {
    id: string
    name: string
    email: string
    batchNumber?: string
  }
  createdAt: string
}

interface Project {
  id: string
  name: string
  description?: string
  difficultyLevel: string
}

interface Trainee {
  id: string
  name: string
  email: string
  batchNumber?: string
}

const statusColors = {
  "Not Started": "bg-gray-100 text-gray-800 border-gray-300",
  "In Progress": "bg-blue-100 text-blue-800 border-blue-300",
  Completed: "bg-green-100 text-green-800 border-green-300",
  "On Hold": "bg-yellow-100 text-yellow-800 border-yellow-300",
  Cancelled: "bg-red-100 text-red-800 border-red-300",
}

export default function AssignmentsPage() {
  const { toast } = useToast()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [trainees, setTrainees] = useState<Trainee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedTrainees, setSelectedTrainees] = useState<string[]>([])

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<AssignmentForm>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      progressType: "Individual",
    },
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [assignmentsRes, projectsRes, traineesRes] = await Promise.all([
        assignmentAPI.getAll(),
        projectAPI.getAll(),
        traineeAPI.getAll(),
      ])

      setAssignments(assignmentsRes.data.data.assignments)
      setProjects(projectsRes.data.data.projects)
      setTrainees(traineesRes.data.data.trainees)
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: AssignmentForm) => {
    setIsSubmitting(true)
    try {
      // Ensure traineeIds are included in the submission data
      const traineeIds = selectedTrainees.length > 0 ? selectedTrainees : data.traineeIds

      // Validate that we have trainees selected
      if (!traineeIds || traineeIds.length === 0) {
        toast({
          title: "Validation Error",
          description: "Please select at least one trainee",
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      // Validate that project is selected
      if (!data.projectId || data.projectId.trim() === "") {
        toast({
          title: "Validation Error",
          description: "Please select a project",
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      // Validate start date
      if (!data.startDate) {
        toast({
          title: "Validation Error",
          description: "Please select a start date",
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      // Format the data properly for the API
      const submitData = {
        projectId: data.projectId,
        traineeIds: traineeIds,
        startDate: data.startDate,
        progressType: data.progressType,
        expectedCompletionDate: data.expectedCompletionDate && data.expectedCompletionDate.trim() 
          ? data.expectedCompletionDate 
          : undefined,
        notes: data.notes && data.notes.trim() 
          ? data.notes 
          : undefined,
      }

      // Remove undefined values
      Object.keys(submitData).forEach(key => {
        if (submitData[key as keyof typeof submitData] === undefined) {
          delete submitData[key as keyof typeof submitData]
        }
      })

      console.log("Submitting assignment data:", submitData) // Debug log

      if (editingAssignment) {
        await assignmentAPI.update(editingAssignment.id, submitData)
        toast({
          title: "Assignment updated",
          description: "Assignment has been updated successfully.",
        })
      } else {
        await assignmentAPI.create(submitData)
        toast({
          title: "Assignment created",
          description: "New assignment has been created successfully.",
        })
      }

      setIsDialogOpen(false)
      setEditingAssignment(null)
      setSelectedTrainees([])
      reset({
        projectId: "",
        traineeIds: [],
        startDate: "",
        expectedCompletionDate: "",
        progressType: "Individual",
        notes: "",
      })
      fetchData()
    } catch (error: any) {
      console.error("Assignment submission error:", error)
      
      // Extract detailed error information
      let errorMessage = "Failed to save assignment"
      
      if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        errorMessage = error.response.data.errors.join(", ")
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.message) {
        errorMessage = error.message
      }
      
      toast({
        title: "Validation Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (assignment: Assignment) => {
    setEditingAssignment(assignment)
    setValue("projectId", assignment.project.id)
    setValue("traineeIds", [assignment.trainee.id])
    setSelectedTrainees([assignment.trainee.id])
    setValue("startDate", assignment.startDate.split("T")[0])
    setValue("expectedCompletionDate", assignment.expectedCompletionDate?.split("T")[0] || "")
    setValue("progressType", assignment.progressType)
    setValue("notes", assignment.notes || "")
    setIsDialogOpen(true)
  }

  const handleDelete = async (assignment: Assignment) => {
    if (!confirm("Are you sure you want to delete this assignment?")) return

    try {
      await assignmentAPI.delete(assignment.id)
      toast({
        title: "Assignment deleted",
        description: "Assignment has been removed successfully.",
      })
      fetchData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete assignment",
        variant: "destructive",
      })
    }
  }

  const handleTraineeSelection = (traineeId: string, checked: boolean) => {
    let updatedTrainees: string[]
    if (checked) {
      updatedTrainees = [...selectedTrainees, traineeId]
    } else {
      updatedTrainees = selectedTrainees.filter((id) => id !== traineeId)
    }
    setSelectedTrainees(updatedTrainees)
    // Update the form value as well
    setValue("traineeIds", updatedTrainees)
  }

  const columns: ColumnDef<Assignment>[] = [
    {
      accessorKey: "assignmentCode",
      header: "Assignment Code",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.getValue("assignmentCode")}</div>
          <div className="text-sm text-gray-500">{row.original.project.name}</div>
        </div>
      ),
    },
    {
      accessorKey: "trainee",
      header: "Trainee",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.trainee.name}</div>
          <div className="text-sm text-gray-500">{row.original.trainee.email}</div>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as keyof typeof statusColors
        return <Badge className={statusColors[status]}>{status}</Badge>
      },
    },
    {
      accessorKey: "progressType",
      header: "Type",
      cell: ({ row }) => <Badge variant="outline">{row.getValue("progressType")}</Badge>,
    },
    {
      accessorKey: "startDate",
      header: "Start Date",
      cell: ({ row }) => formatDate(row.getValue("startDate")),
    },
    {
      accessorKey: "expectedCompletionDate",
      header: "Expected Completion",
      cell: ({ row }) => {
        const date = row.getValue("expectedCompletionDate") as string
        return date ? formatDate(date) : "—"
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const assignment = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleEdit(assignment)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDelete(assignment)} className="text-red-600">
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
    setEditingAssignment(null)
    setSelectedTrainees([])
    reset({
      projectId: "",
      traineeIds: [],
      startDate: "",
      expectedCompletionDate: "",
      progressType: "Individual",
      notes: "",
    })
    setIsDialogOpen(true)
  }

  const statusStats = {
    "Not Started": assignments.filter((a) => a.status === "Not Started").length,
    "In Progress": assignments.filter((a) => a.status === "In Progress").length,
    Completed: assignments.filter((a) => a.status === "Completed").length,
    "On Hold": assignments.filter((a) => a.status === "On Hold").length,
  }

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">Assignment Management</h1>
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
            <h1 className="text-3xl font-bold text-gray-900">Assignment Management</h1>
            <p className="text-gray-600 mt-1">
              Assign projects to trainees and track their progress through the training program.
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <Plus className="w-4 h-4 mr-2" />
                Create Assignment
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingAssignment ? "Edit Assignment" : "Create New Assignment"}</DialogTitle>
                <DialogDescription>
                  {editingAssignment
                    ? "Update assignment details and configuration."
                    : "Assign a project to one or more trainees with specific requirements."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="projectId">Project *</Label>
                    <Select value={watch("projectId")} onValueChange={(value) => setValue("projectId", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            <div className="flex items-center justify-between w-full">
                              <span>{project.name}</span>
                              <Badge variant="outline" className="ml-2">
                                {project.difficultyLevel}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.projectId && <p className="text-sm text-red-600">{errors.projectId.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="progressType">Progress Type *</Label>
                    <Select
                      value={watch("progressType")}
                      onValueChange={(value) => setValue("progressType", value as any)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Individual">Individual Progress</SelectItem>
                        <SelectItem value="Group">Group Progress</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date *</Label>
                    <Input
                      id="startDate"
                      type="date"
                      {...register("startDate")}
                      className={errors.startDate ? "border-red-500" : ""}
                    />
                    {errors.startDate && <p className="text-sm text-red-600">{errors.startDate.message}</p>}
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="expectedCompletionDate">Expected Completion Date</Label>
                    <Input id="expectedCompletionDate" type="date" {...register("expectedCompletionDate")} />
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label>Select Trainees *</Label>
                    <div className="border rounded-lg p-4 max-h-48 overflow-y-auto">
                      <div className="space-y-2">
                        {trainees.map((trainee) => (
                          <div key={trainee.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={trainee.id}
                              checked={selectedTrainees.includes(trainee.id)}
                              onCheckedChange={(checked) => handleTraineeSelection(trainee.id, checked as boolean)}
                            />
                            <Label htmlFor={trainee.id} className="flex-1 cursor-pointer">
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="font-medium">{trainee.name}</span>
                                  <span className="text-sm text-gray-500 ml-2">{trainee.email}</span>
                                </div>
                                {trainee.batchNumber && <Badge variant="outline">{trainee.batchNumber}</Badge>}
                              </div>
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                    {selectedTrainees.length === 0 && (
                      <p className="text-sm text-red-600">Please select at least one trainee</p>
                    )}
                    <p className="text-sm text-gray-600">
                      Selected: {selectedTrainees.length} trainee(s)
                      {watch("progressType") === "Group" && selectedTrainees.length > 1 && (
                        <span className="text-blue-600 ml-1">(Will share progress tracking)</span>
                      )}
                    </p>
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      placeholder="Additional instructions or requirements..."
                      {...register("notes")}
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
                        {editingAssignment ? "Updating..." : "Creating..."}
                      </>
                    ) : editingAssignment ? (
                      "Update Assignment"
                    ) : (
                      "Create Assignment"
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
                  <p className="text-sm font-medium text-gray-600">Total Assignments</p>
                  <p className="text-3xl font-bold text-gray-900">{assignments.length}</p>
                </div>
                <ClipboardList className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">In Progress</p>
                  <p className="text-3xl font-bold text-blue-600">{statusStats["In Progress"]}</p>
                </div>
                <Target className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-3xl font-bold text-green-600">{statusStats["Completed"]}</p>
                </div>
                <Calendar className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Not Started</p>
                  <p className="text-3xl font-bold text-gray-600">{statusStats["Not Started"]}</p>
                </div>
                <Users className="w-8 h-8 text-gray-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Assignment Flow Guide */}
        <Card>
          <CardHeader>
            <CardTitle>Assignment Process</CardTitle>
            <CardDescription>Follow these steps to create effective assignments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-blue-600 font-bold">1</span>
                </div>
                <h4 className="font-medium mb-1">Select Project</h4>
                <p className="text-sm text-gray-600">Choose from your project library</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-green-600 font-bold">2</span>
                </div>
                <h4 className="font-medium mb-1">Choose Trainees</h4>
                <p className="text-sm text-gray-600">Select one or multiple trainees</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-yellow-600 font-bold">3</span>
                </div>
                <h4 className="font-medium mb-1">Set Progress Type</h4>
                <p className="text-sm text-gray-600">Individual or group tracking</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-purple-600 font-bold">4</span>
                </div>
                <h4 className="font-medium mb-1">Configure Timeline</h4>
                <p className="text-sm text-gray-600">Set start and completion dates</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assignments Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Assignments</CardTitle>
            <CardDescription>View and manage all project assignments across your training program.</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={assignments}
              searchKey="assignmentCode"
              searchPlaceholder="Search assignments..."
            />
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
