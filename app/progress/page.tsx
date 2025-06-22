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
import { FileUpload } from "@/components/ui/file-upload"
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
import { progressAPI, assignmentAPI } from "@/lib/api"
import { useToast } from "@/components/ui/use-toast"
import { formatDate } from "@/lib/utils"
import { Plus, MoreHorizontal, Edit, Trash2, FileText, Link, Calendar, Target, AlertTriangle } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"

const progressSchema = z.object({
  assignmentId: z.string().min(1, "Please select an assignment"),
  title: z.string().min(2, "Title must be at least 2 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  currentStatus: z.enum(["In Progress", "Completed", "Blocked", "On Hold"]),
  milestonesAchieved: z.string().optional(),
  nextSteps: z.string().optional(),
  blockers: z.string().optional(),
  hoursWorked: z.number().min(0).optional(),
  completionPercentage: z.number().min(0).max(100).optional(),
})

type ProgressForm = z.infer<typeof progressSchema>

interface ProgressEntry {
  id: string
  title: string
  description: string
  startDate: string
  endDate: string
  currentStatus: "In Progress" | "Completed" | "Blocked" | "On Hold"
  milestonesAchieved?: string
  nextSteps?: string
  blockers?: string
  hoursWorked?: number
  completionPercentage?: number
  assignment: {
    id: string
    assignmentCode: string
    project: {
      name: string
      difficultyLevel: string
    }
    trainee: {
      name: string
      email: string
    }
  }
  files: Array<{
    id: string
    originalName: string
    fileName: string
    fileSize: number
    mimeType: string
    uploadDate: string
  }>
  linkedProgress: Array<{
    id: string
    linkType: string
    linkedProgressEntry: {
      id: string
      title: string
      assignment: {
        trainee: {
          name: string
        }
      }
    }
  }>
  createdAt: string
  updatedAt: string
}

interface Assignment {
  id: string
  assignmentCode: string
  project: {
    id: string
    name: string
    difficultyLevel: string
  }
  trainee: {
    id: string
    name: string
    email: string
  }
  status: string
}

const statusColors = {
  "In Progress": "bg-blue-100 text-blue-800 border-blue-300",
  Completed: "bg-green-100 text-green-800 border-green-300",
  Blocked: "bg-red-100 text-red-800 border-red-300",
  "On Hold": "bg-yellow-100 text-yellow-800 border-yellow-300",
}

export default function ProgressPage() {
  const { toast } = useToast()
  const [progressEntries, setProgressEntries] = useState<ProgressEntry[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false)
  const [editingProgress, setEditingProgress] = useState<ProgressEntry | null>(null)
  const [linkingProgress, setLinkingProgress] = useState<ProgressEntry | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<ProgressForm>({
    resolver: zodResolver(progressSchema),
    defaultValues: {
      assignmentId: "",
      title: "",
      description: "",
      startDate: "",
      endDate: "",
      currentStatus: "In Progress",
      milestonesAchieved: "",
      nextSteps: "",
      blockers: "",
      hoursWorked: 0,
      completionPercentage: 0,
    },
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [progressRes, assignmentsRes] = await Promise.all([progressAPI.getAll(), assignmentAPI.getAll()])

      setProgressEntries(progressRes.data.data.progressEntries)
      setAssignments(assignmentsRes.data.data.assignments)
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load progress data",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: ProgressForm) => {
    setIsSubmitting(true)
    try {
      console.log("Form data before submission:", data) // Debug log
      
      const formData = new FormData()

      // Explicitly add only the fields expected by backend schema
      formData.append('assignmentId', data.assignmentId)
      formData.append('title', data.title)
      formData.append('description', data.description)
      formData.append('startDate', data.startDate)
      formData.append('endDate', data.endDate)
      formData.append('currentStatus', data.currentStatus)
      
      // Optional fields - only add if they have values
      if (data.milestonesAchieved && data.milestonesAchieved.trim()) {
        formData.append('milestonesAchieved', data.milestonesAchieved)
      }
      if (data.nextSteps && data.nextSteps.trim()) {
        formData.append('nextSteps', data.nextSteps)
      }
      if (data.blockers && data.blockers.trim()) {
        formData.append('blockers', data.blockers)
      }
      if (data.hoursWorked !== undefined && data.hoursWorked !== null) {
        formData.append('hoursWorked', data.hoursWorked.toString())
      }
      if (data.completionPercentage !== undefined && data.completionPercentage !== null) {
        formData.append('completionPercentage', data.completionPercentage.toString())
      }

      // Debug log FormData contents
      console.log("FormData contents:")
      for (let [key, value] of formData.entries()) {
        console.log(key, value)
      }

      // Add files with proper naming
      console.log("Uploaded files to add:", uploadedFiles.length)
      uploadedFiles.forEach((file, index) => {
        console.log(`Adding file ${index}:`, file.name, file.size, file.type)
        formData.append('files', file, file.name)
      })

      if (editingProgress) {
        await progressAPI.update(editingProgress.id, formData)
        toast({
          title: "Progress updated",
          description: "Progress entry has been updated successfully.",
        })
      } else {
        await progressAPI.create(formData)
        toast({
          title: "Progress created",
          description: "New progress entry has been created successfully.",
        })
      }

      setIsDialogOpen(false)
      setEditingProgress(null)
      setUploadedFiles([])
      reset({
        assignmentId: "",
        title: "",
        description: "",
        startDate: "",
        endDate: "",
        currentStatus: "In Progress",
        milestonesAchieved: "",
        nextSteps: "",
        blockers: "",
        hoursWorked: 0,
        completionPercentage: 0,
      })
      fetchData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to save progress",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (progress: ProgressEntry) => {
    setEditingProgress(progress)
    setUploadedFiles([]) // Clear any previously selected files
    setValue("assignmentId", progress.assignment.id)
    setValue("title", progress.title)
    setValue("description", progress.description)
    setValue("startDate", progress.startDate.split("T")[0])
    setValue("endDate", progress.endDate.split("T")[0])
    setValue("currentStatus", progress.currentStatus)
    setValue("milestonesAchieved", progress.milestonesAchieved || "")
    setValue("nextSteps", progress.nextSteps || "")
    setValue("blockers", progress.blockers || "")
    setValue("hoursWorked", progress.hoursWorked)
    setValue("completionPercentage", progress.completionPercentage)
    setIsDialogOpen(true)
  }

  const handleDelete = async (progress: ProgressEntry) => {
    if (!confirm("Are you sure you want to delete this progress entry?")) return

    try {
      await progressAPI.delete(progress.id)
      toast({
        title: "Progress deleted",
        description: "Progress entry has been removed successfully.",
      })
      fetchData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete progress entry",
        variant: "destructive",
      })
    }
  }

  const handleLinkProgress = async (targetProgressId: string) => {
    if (!linkingProgress) return

    try {
      await progressAPI.linkProgress(linkingProgress.id, targetProgressId)
      toast({
        title: "Progress linked",
        description: "Progress entries have been linked successfully.",
      })
      setIsLinkDialogOpen(false)
      setLinkingProgress(null)
      fetchData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to link progress entries",
        variant: "destructive",
      })
    }
  }

  const downloadFile = async (fileId: string, fileName: string) => {
    try {
      const response = await progressAPI.downloadFile(fileId)
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", fileName)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to download file",
        variant: "destructive",
      })
    }
  }

  const columns: ColumnDef<ProgressEntry>[] = [
    {
      accessorKey: "title",
      header: "Progress Title",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.getValue("title")}</div>
          <div className="text-sm text-gray-500">{row.original.assignment.assignmentCode}</div>
        </div>
      ),
    },
    {
      accessorKey: "assignment",
      header: "Assignment",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.assignment.trainee.name}</div>
          <div className="text-sm text-gray-500">{row.original.assignment.project.name}</div>
        </div>
      ),
    },
    {
      accessorKey: "currentStatus",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("currentStatus") as keyof typeof statusColors
        return <Badge className={statusColors[status]}>{status}</Badge>
      },
    },
    {
      accessorKey: "startDate",
      header: "Period",
      cell: ({ row }) => (
        <div className="text-sm">
          <div>{formatDate(row.getValue("startDate"))}</div>
          <div className="text-gray-500">to {formatDate(row.original.endDate)}</div>
        </div>
      ),
    },
    {
      accessorKey: "files",
      header: "Files",
      cell: ({ row }) => {
        const files = row.original.files || []
        const linkedProgress = row.original.linkedProgress || []
        return (
          <div className="space-y-1">
            <div className="flex items-center space-x-1">
              <FileText className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium">{files.length} file{files.length !== 1 ? 's' : ''}</span>
              {linkedProgress.length > 0 && (
                <>
                  <Link className="w-4 h-4 text-blue-500 ml-2" />
                  <span className="text-sm text-blue-600">{linkedProgress.length} linked</span>
                </>
              )}
            </div>
            {files.length > 0 && (
              <div className="space-y-1">
                {files.slice(0, 2).map((file) => (
                  <button
                    key={file.id}
                    onClick={() => downloadFile(file.id, file.originalName)}
                    className="block text-xs text-blue-600 hover:text-blue-800 hover:underline truncate max-w-[200px]"
                    title={file.originalName}
                  >
                    {file.originalName}
                  </button>
                ))}
                {files.length > 2 && (
                  <span className="text-xs text-gray-500">+{files.length - 2} more</span>
                )}
              </div>
            )}
          </div>
        )
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const progress = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleEdit(progress)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setLinkingProgress(progress)
                  setIsLinkDialogOpen(true)
                }}
              >
                <Link className="mr-2 h-4 w-4" />
                Link Progress
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDelete(progress)} className="text-red-600">
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
    setEditingProgress(null)
    setUploadedFiles([])
    reset({
      assignmentId: "",
      title: "",
      description: "",
      startDate: "",
      endDate: "",
      currentStatus: "In Progress",
      milestonesAchieved: "",
      nextSteps: "",
      blockers: "",
      hoursWorked: 0,
      completionPercentage: 0,
    })
    setIsDialogOpen(true)
  }

  const statusStats = {
    "In Progress": progressEntries.filter((p) => p.currentStatus === "In Progress").length,
    Completed: progressEntries.filter((p) => p.currentStatus === "Completed").length,
    Blocked: progressEntries.filter((p) => p.currentStatus === "Blocked").length,
    "On Hold": progressEntries.filter((p) => p.currentStatus === "On Hold").length,
  }

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">Progress Tracking</h1>
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
            <h1 className="text-3xl font-bold text-gray-900">Progress Tracking</h1>
            <p className="text-gray-600 mt-1">
              Record and track trainee progress on their assigned projects with file uploads and milestone tracking.
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <Plus className="w-4 h-4 mr-2" />
                Add Progress Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingProgress ? "Edit Progress Entry" : "Create Progress Entry"}</DialogTitle>
                <DialogDescription>
                  {editingProgress
                    ? "Update progress information and upload additional files."
                    : "Record trainee progress with milestones, files, and status updates."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="assignmentId">Assignment *</Label>
                    <Select value={watch("assignmentId")} onValueChange={(value) => setValue("assignmentId", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an assignment" />
                      </SelectTrigger>
                      <SelectContent>
                        {assignments.map((assignment) => (
                          <SelectItem key={assignment.id} value={assignment.id}>
                            <div className="flex items-center justify-between w-full">
                              <span>
                                {assignment.trainee.name} - {assignment.project.name}
                              </span>
                              <Badge variant="outline" className="ml-2">
                                {assignment.assignmentCode}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.assignmentId && <p className="text-sm text-red-600">{errors.assignmentId.message}</p>}
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="title">Progress Title *</Label>
                    <Input
                      id="title"
                      placeholder="e.g., Week 1 of March - Database Design"
                      {...register("title")}
                      className={errors.title ? "border-red-500" : ""}
                    />
                    {errors.title && <p className="text-sm text-red-600">{errors.title.message}</p>}
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

                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date *</Label>
                    <Input
                      id="endDate"
                      type="date"
                      {...register("endDate")}
                      className={errors.endDate ? "border-red-500" : ""}
                    />
                    {errors.endDate && <p className="text-sm text-red-600">{errors.endDate.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currentStatus">Current Status *</Label>
                    <Select
                      value={watch("currentStatus")}
                      onValueChange={(value) => setValue("currentStatus", value as any)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                        <SelectItem value="Blocked">Blocked</SelectItem>
                        <SelectItem value="On Hold">On Hold</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hoursWorked">Hours Worked</Label>
                    <Input
                      id="hoursWorked"
                      type="number"
                      placeholder="40"
                      {...register("hoursWorked", { valueAsNumber: true })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="completionPercentage">Completion Percentage</Label>
                    <Input
                      id="completionPercentage"
                      type="number"
                      min="0"
                      max="100"
                      placeholder="75"
                      {...register("completionPercentage", { valueAsNumber: true })}
                    />
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="description">Progress Description *</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe the work completed, challenges faced, and achievements..."
                      {...register("description")}
                      rows={4}
                      className={errors.description ? "border-red-500" : ""}
                    />
                    {errors.description && <p className="text-sm text-red-600">{errors.description.message}</p>}
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="milestonesAchieved">Milestones Achieved</Label>
                    <Textarea
                      id="milestonesAchieved"
                      placeholder="List specific milestones and deliverables completed..."
                      {...register("milestonesAchieved")}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="nextSteps">Next Steps</Label>
                    <Textarea
                      id="nextSteps"
                      placeholder="Outline planned activities for the next period..."
                      {...register("nextSteps")}
                      rows={3}
                    />
                  </div>

                  {watch("currentStatus") === "Blocked" && (
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="blockers">Blockers & Issues</Label>
                      <Textarea
                        id="blockers"
                        placeholder="Describe what is blocking progress and assistance needed..."
                        {...register("blockers")}
                        rows={3}
                        className="border-red-200 focus:border-red-500"
                      />
                    </div>
                  )}

                  <div className="space-y-2 col-span-2">
                    <Label>File Uploads</Label>
                    <FileUpload
                      key={editingProgress ? `edit-${editingProgress.id}` : 'create'}
                      onFilesChange={setUploadedFiles}
                      maxFiles={10}
                      acceptedTypes={[".pdf", ".doc", ".docx", ".jpg", ".png", ".zip"]}
                    />
                    <p className="text-sm text-gray-600">
                      Upload progress reports, attendance sheets, screenshots, or code samples (Max 10 files, 10MB each)
                    </p>
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
                        {editingProgress ? "Updating..." : "Creating..."}
                      </>
                    ) : editingProgress ? (
                      "Update Progress"
                    ) : (
                      "Create Progress"
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
                  <p className="text-sm font-medium text-gray-600">Total Entries</p>
                  <p className="text-3xl font-bold text-gray-900">{progressEntries.length}</p>
                </div>
                <FileText className="w-8 h-8 text-blue-500" />
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
                  <p className="text-sm font-medium text-gray-600">Blocked</p>
                  <p className="text-3xl font-bold text-red-600">{statusStats["Blocked"]}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Entries Table */}
        <Card>
          <CardHeader>
            <CardTitle>Progress Entries</CardTitle>
            <CardDescription>
              View and manage all progress entries with file uploads and milestone tracking.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={progressEntries}
              searchKey="title"
              searchPlaceholder="Search progress entries..."
            />
          </CardContent>
        </Card>

        {/* Progress Linking Dialog */}
        <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Link Progress Entries</DialogTitle>
              <DialogDescription>
                Link this progress entry with another trainee's progress for group projects.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {linkingProgress && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="font-medium">Linking: {linkingProgress.title}</p>
                  <p className="text-sm text-gray-600">
                    {linkingProgress.assignment.trainee.name} - {linkingProgress.assignment.project.name}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Select Progress Entry to Link With:</Label>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {progressEntries
                    .filter((p) => p.id !== linkingProgress?.id)
                    .map((progress) => (
                      <div
                        key={progress.id}
                        className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                        onClick={() => handleLinkProgress(progress.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{progress.title}</p>
                            <p className="text-sm text-gray-600">
                              {progress.assignment.trainee.name} - {progress.assignment.project.name}
                            </p>
                          </div>
                          <Badge className={statusColors[progress.currentStatus]}>{progress.currentStatus}</Badge>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  )
}
