"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
import { reportsAPI, adminAPI, assignmentAPI, progressAPI } from "@/lib/api"
import { useToast } from "@/components/ui/use-toast"
import { formatDateTime } from "@/lib/utils"
import { Mail, Send, Eye, History, FileText, Calendar } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"

const emailSchema = z.object({
  traineeId: z.string().min(1, "Please select a trainee"),
  projectId: z.string().min(1, "Please select a project"),
  subject: z.string().min(1, "Subject is required"),
  customMessage: z.string().optional(),
  includeAllProgress: z.boolean(),
  includeFiles: z.boolean(),
})

type EmailForm = z.infer<typeof emailSchema>

interface EmailLog {
  id: string
  subject: string
  recipients: string[]
  sentAt: string
  status: "Sent" | "Failed" | "Pending"
  trainee: {
    name: string
    email: string
  }
  project: {
    name: string
  }
  attachmentCount: number
}

interface Assignment {
  id: string
  assignmentCode: string
  project: {
    id: string
    name: string
  }
  trainee: {
    id: string
    name: string
    email: string
  }
}

interface Admin {
  id: string
  name: string
  email: string
  department?: string
  isDefault: boolean
}

interface ProgressEntry {
  id: string
  title: string
  description: string
  currentStatus: string
  startDate: string
  endDate: string
  files: Array<{
    id: string
    fileName: string
    fileType: string
  }>
}

export default function ReportsPage() {
  const { toast } = useToast()
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [admins, setAdmins] = useState<Admin[]>([])
  const [progressEntries, setProgressEntries] = useState<ProgressEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedAdmins, setSelectedAdmins] = useState<string[]>([])
  const [emailPreview, setEmailPreview] = useState<any>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      includeAllProgress: true,
      includeFiles: true,
    },
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [logsRes, assignmentsRes, adminsRes] = await Promise.all([
        reportsAPI.getEmailHistory(),
        assignmentAPI.getAll(),
        adminAPI.getAll(),
      ])

      setEmailLogs(logsRes.data.data.emailHistory || [])
      setAssignments(assignmentsRes.data.data.assignments || [])
      setAdmins(adminsRes.data.data.admins || [])

      // Set default admin if available
      const defaultAdmin = adminsRes.data.data.admins.find((admin: Admin) => admin.isDefault)
      if (defaultAdmin) {
        setSelectedAdmins([defaultAdmin.id])
      }
    } catch (error: any) {
      console.error("Failed to load data:", error)
      // Ensure arrays are set to empty arrays on error
      setEmailLogs([])
      setAssignments([])
      setAdmins([])
      
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchProgressForAssignment = async (traineeId: string, projectId: string) => {
    try {
      const response = await progressAPI.getByAssignment(traineeId, projectId)
      setProgressEntries(response.data.data.progressEntries)
    } catch (error: any) {
      console.error("Failed to fetch progress entries:", error)
      setProgressEntries([])
    }
  }

  const generateEmailPreview = async () => {
    const formData = watch()
    if (!formData.traineeId || !formData.projectId) {
      toast({
        title: "Missing Information",
        description: "Please select both trainee and project",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await reportsAPI.generatePreview({
        ...formData,
        adminIds: selectedAdmins,
      })
      setEmailPreview(response.data.data)
      setIsPreviewOpen(true)
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to generate email preview",
        variant: "destructive",
      })
    }
  }

  const onSubmit = async (data: EmailForm) => {
    // Validate admin selection manually since it's not part of the form
    if (selectedAdmins.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one admin",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        ...data,
        adminIds: selectedAdmins,
      }
      
      await reportsAPI.sendEmail(payload)

      toast({
        title: "Email sent successfully",
        description: "Progress report has been sent to selected admins.",
      })

      setIsDialogOpen(false)
      setSelectedAdmins([])
      reset()
      fetchData()
    } catch (error: any) {
      console.error("Send email error:", error)
      toast({
        title: "Failed to send email",
        description: error.response?.data?.message || "An error occurred while sending the email",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAdminSelection = (adminId: string, checked: boolean) => {
    if (checked) {
      setSelectedAdmins((prev) => [...prev, adminId])
    } else {
      setSelectedAdmins((prev) => prev.filter((id) => id !== adminId))
    }
  }

  const handleTraineeProjectChange = () => {
    const traineeId = watch("traineeId")
    const projectId = watch("projectId")

    if (traineeId && projectId) {
      fetchProgressForAssignment(traineeId, projectId)

      // Auto-generate subject
      const assignment = assignments.find((a) => a.trainee.id === traineeId && a.project.id === projectId)
      if (assignment) {
        setValue("subject", `Progress Report - ${assignment.trainee.name} - ${assignment.project.name}`)
      }
    }
  }

  const emailLogColumns: ColumnDef<EmailLog>[] = [
    {
      accessorKey: "subject",
      header: "Subject",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.getValue("subject")}</div>
          <div className="text-sm text-gray-500">
            {row.original.trainee?.name || "Unknown Trainee"} - {row.original.project?.name || "Unknown Project"}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "recipients",
      header: "Recipients",
      cell: ({ row }) => {
        const recipients = row.getValue("recipients") as string[]
        if (!recipients || recipients.length === 0) {
          return <div className="text-sm text-gray-500">No recipients</div>
        }
        return (
          <div className="text-sm">
            {recipients.slice(0, 2).join(", ")}
            {recipients.length > 2 && ` +${recipients.length - 2} more`}
          </div>
        )
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        const colors = {
          Sent: "bg-green-100 text-green-800 border-green-300",
          Failed: "bg-red-100 text-red-800 border-red-300",
          Pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
        }
        return <Badge className={colors[status as keyof typeof colors]}>{status}</Badge>
      },
    },
    {
      accessorKey: "attachmentCount",
      header: "Attachments",
      cell: ({ row }) => (
        <div className="flex items-center space-x-1">
          <FileText className="w-4 h-4 text-gray-400" />
          <span className="text-sm">{row.getValue("attachmentCount")}</span>
        </div>
      ),
    },
    {
      accessorKey: "sentAt",
      header: "Sent At",
      cell: ({ row }) => formatDateTime(row.getValue("sentAt")),
    },
  ]

  const openCreateDialog = () => {
    setSelectedAdmins(admins.filter((admin) => admin.isDefault).map((admin) => admin.id))
    reset({
      traineeId: "",
      projectId: "",
      subject: "",
      customMessage: "",
      includeAllProgress: true,
      includeFiles: true,
    })
    setIsDialogOpen(true)
  }

  const uniqueTrainees = assignments.reduce(
    (acc, assignment) => {
      if (!acc.find((t) => t.id === assignment.trainee.id)) {
        acc.push(assignment.trainee)
      }
      return acc
    },
    [] as Array<{ id: string; name: string; email: string }>,
  )

  const getProjectsForTrainee = (traineeId: string) => {
    return assignments.filter((a) => a.trainee.id === traineeId).map((a) => a.project)
  }

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">Reports & Email</h1>
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
            <h1 className="text-3xl font-bold text-gray-900">Reports & Email</h1>
            <p className="text-gray-600 mt-1">
              Send progress reports to admins and manage email communication history.
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <Mail className="w-4 h-4 mr-2" />
                Send Report
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Send Progress Report</DialogTitle>
                <DialogDescription>
                  Generate and send a comprehensive progress report to selected admins.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="traineeId">Select Trainee *</Label>
                    <Select
                      value={watch("traineeId")}
                      onValueChange={(value) => {
                        setValue("traineeId", value)
                        setValue("projectId", "") // Reset project selection
                        handleTraineeProjectChange()
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose trainee" />
                      </SelectTrigger>
                      <SelectContent>
                        {uniqueTrainees.map((trainee) => (
                          <SelectItem key={trainee.id} value={trainee.id}>
                            {trainee.name} ({trainee.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.traineeId && <p className="text-sm text-red-600">{errors.traineeId.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="projectId">Select Project *</Label>
                    <Select
                      value={watch("projectId")}
                      onValueChange={(value) => {
                        setValue("projectId", value)
                        handleTraineeProjectChange()
                      }}
                      disabled={!watch("traineeId")}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose project" />
                      </SelectTrigger>
                      <SelectContent>
                        {watch("traineeId") &&
                          getProjectsForTrainee(watch("traineeId")).map((project) => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {errors.projectId && <p className="text-sm text-red-600">{errors.projectId.message}</p>}
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="subject">Email Subject *</Label>
                    <input
                      id="subject"
                      placeholder="Progress Report - Trainee Name - Project Name"
                      {...register("subject")}
                      className={`w-full px-3 py-2 border rounded-md ${errors.subject ? "border-red-500" : "border-gray-300"}`}
                    />
                    {errors.subject && <p className="text-sm text-red-600">{errors.subject.message}</p>}
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label>Select Admins *</Label>
                    <div className="border rounded-lg p-4 max-h-48 overflow-y-auto">
                      <div className="space-y-2">
                        {admins.map((admin) => (
                          <div key={admin.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={admin.id}
                              checked={selectedAdmins.includes(admin.id)}
                              onCheckedChange={(checked) => handleAdminSelection(admin.id, checked as boolean)}
                            />
                            <Label htmlFor={admin.id} className="flex-1 cursor-pointer">
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="font-medium">{admin.name}</span>
                                  <span className="text-sm text-gray-500 ml-2">{admin.email}</span>
                                  {admin.department && (
                                    <span className="text-sm text-gray-400 ml-1">({admin.department})</span>
                                  )}
                                </div>
                                {admin.isDefault && <Badge variant="outline">Default</Badge>}
                              </div>
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                    {selectedAdmins.length === 0 && (
                      <p className="text-sm text-red-600">Please select at least one admin</p>
                    )}
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="customMessage">Custom Message</Label>
                    <Textarea
                      id="customMessage"
                      placeholder="Add any additional notes or context for the admins..."
                      {...register("customMessage")}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label>Report Options</Label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="includeAllProgress"
                          checked={watch("includeAllProgress")}
                          onCheckedChange={(checked) => setValue("includeAllProgress", checked as boolean)}
                        />
                        <Label htmlFor="includeAllProgress">Include all progress entries</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="includeFiles"
                          checked={watch("includeFiles")}
                          onCheckedChange={(checked) => setValue("includeFiles", checked as boolean)}
                        />
                        <Label htmlFor="includeFiles">Include file attachments</Label>
                      </div>
                    </div>
                  </div>

                  {progressEntries.length > 0 && (
                    <div className="space-y-2 col-span-2">
                      <Label>Progress Summary</Label>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600 mb-2">
                          {progressEntries.length} progress entries will be included in this report:
                        </p>
                        <div className="space-y-1">
                          {progressEntries.slice(0, 3).map((entry) => (
                            <div key={entry.id} className="text-sm">
                              • {entry.title} ({entry.currentStatus})
                            </div>
                          ))}
                          {progressEntries.length > 3 && (
                            <div className="text-sm text-gray-500">
                              ... and {progressEntries.length - 3} more entries
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="button" variant="outline" onClick={generateEmailPreview}>
                    <Eye className="w-4 h-4 mr-2" />
                    Preview
                  </Button>
                  <Button type="submit" disabled={isSubmitting || selectedAdmins.length === 0}>
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Send Report
                      </>
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
                  <p className="text-sm font-medium text-gray-600">Total Emails</p>
                  <p className="text-3xl font-bold text-gray-900">{emailLogs?.length || 0}</p>
                </div>
                <Mail className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Sent Successfully</p>
                  <p className="text-3xl font-bold text-green-600">
                    {emailLogs?.filter((log) => log.status === "Sent").length || 0}
                  </p>
                </div>
                <Send className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Failed</p>
                  <p className="text-3xl font-bold text-red-600">
                    {emailLogs?.filter((log) => log.status === "Failed").length || 0}
                  </p>
                </div>
                <History className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">This Week</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {
                      emailLogs?.filter((log) => {
                        const sentDate = new Date(log.sentAt)
                        const weekAgo = new Date()
                        weekAgo.setDate(weekAgo.getDate() - 7)
                        return sentDate >= weekAgo
                      }).length || 0
                    }
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Email History */}
        <Card>
          <CardHeader>
            <CardTitle>Email History</CardTitle>
            <CardDescription>View all sent progress reports and their delivery status.</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={emailLogColumns}
              data={emailLogs || []}
              searchKey="subject"
              searchPlaceholder="Search email history..."
            />
          </CardContent>
        </Card>

        {/* Email Preview Dialog */}
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Email Preview</DialogTitle>
              <DialogDescription>Review the email content before sending to admins.</DialogDescription>
            </DialogHeader>
            {emailPreview && (
              <div className="space-y-4">
                <div className="border rounded-lg p-4 bg-gray-50">
                  <div className="space-y-2">
                    <div>
                      <strong>To:</strong> {emailPreview.recipients.join(", ")}
                    </div>
                    <div>
                      <strong>Subject:</strong> {emailPreview.subject}
                    </div>
                  </div>
                </div>
                <div className="border rounded-lg p-4 max-h-96 overflow-y-auto">
                  <div dangerouslySetInnerHTML={{ __html: emailPreview.htmlContent }} />
                </div>
                {emailPreview.attachments.length > 0 && (
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2">Attachments ({emailPreview.attachments.length})</h4>
                    <div className="space-y-1">
                      {emailPreview.attachments.map((file: any, index: number) => (
                        <div key={index} className="flex items-center space-x-2 text-sm">
                          <FileText className="w-4 h-4 text-gray-400" />
                          <span>{file.fileName}</span>
                          <span className="text-gray-500">({file.fileSize})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  )
}
