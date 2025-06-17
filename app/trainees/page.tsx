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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { traineeAPI } from "@/lib/api"
import { useToast } from "@/components/ui/use-toast"
import { formatDate } from "@/lib/utils"
import { Plus, MoreHorizontal, Edit, Trash2, Upload, Download, GraduationCap, Users, Calendar } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"

const traineeSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().optional(),
  batchNumber: z.string().optional(),
  joinDate: z.string().optional(),
  background: z.string().optional(),
  skills: z.string().optional(),
})

type TraineeForm = z.infer<typeof traineeSchema>

interface Trainee {
  id: string
  name: string
  email: string
  phone?: string
  batchNumber?: string
  joinDate?: string
  background?: string
  skills?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export default function TraineesPage() {
  const { toast } = useToast()
  const [trainees, setTrainees] = useState<Trainee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false)
  const [editingTrainee, setEditingTrainee] = useState<Trainee | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<TraineeForm>({
    resolver: zodResolver(traineeSchema),
  })

  useEffect(() => {
    fetchTrainees()
  }, [])

  const fetchTrainees = async () => {
    try {
      const response = await traineeAPI.getAll()
      setTrainees(response.data.data.trainees)
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load trainees",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: TraineeForm) => {
    setIsSubmitting(true)
    try {
      if (editingTrainee) {
        await traineeAPI.update(editingTrainee.id, data)
        toast({
          title: "Trainee updated",
          description: "Trainee information has been updated successfully.",
        })
      } else {
        await traineeAPI.create(data)
        toast({
          title: "Trainee created",
          description: "New trainee has been added successfully.",
        })
      }

      setIsDialogOpen(false)
      setEditingTrainee(null)
      reset()
      fetchTrainees()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to save trainee",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (trainee: Trainee) => {
    setEditingTrainee(trainee)
    setValue("name", trainee.name)
    setValue("email", trainee.email)
    setValue("phone", trainee.phone || "")
    setValue("batchNumber", trainee.batchNumber || "")
    setValue("joinDate", trainee.joinDate ? trainee.joinDate.split("T")[0] : "")
    setValue("background", trainee.background || "")
    setValue("skills", trainee.skills || "")
    setIsDialogOpen(true)
  }

  const handleDelete = async (trainee: Trainee) => {
    if (!confirm("Are you sure you want to delete this trainee?")) return

    try {
      await traineeAPI.delete(trainee.id)
      toast({
        title: "Trainee deleted",
        description: "Trainee has been removed successfully.",
      })
      fetchTrainees()
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete trainee",
        variant: "destructive",
      })
    }
  }

  const handleBulkImport = async () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a CSV file to import",
        variant: "destructive",
      })
      return
    }

    const formData = new FormData()
    formData.append("file", selectedFile)

    try {
      setIsSubmitting(true)
      await traineeAPI.bulkImport(formData)
      toast({
        title: "Import successful",
        description: "Trainees have been imported successfully.",
      })
      setIsBulkDialogOpen(false)
      setSelectedFile(null)
      fetchTrainees()
    } catch (error: any) {
      toast({
        title: "Import failed",
        description: error.response?.data?.message || "Failed to import trainees",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const downloadTemplate = () => {
    const csvContent =
      "name,email,phone,batchNumber,joinDate,background,skills\n" +
      "John Doe,john@example.com,1234567890,BATCH2024-01,2024-01-15,Computer Science Graduate,Java Python\n" +
      "Jane Smith,jane@example.com,0987654321,BATCH2024-01,2024-01-15,Electronics Engineer,C++ JavaScript"

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "trainee_template.csv"
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const columns: ColumnDef<Trainee>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.getValue("name")}</div>
          <div className="text-sm text-gray-500">{row.original.email}</div>
        </div>
      ),
    },
    {
      accessorKey: "batchNumber",
      header: "Batch",
      cell: ({ row }) => {
        const batch = row.getValue("batchNumber") as string
        return batch ? <Badge variant="outline">{batch}</Badge> : <span className="text-gray-400">—</span>
      },
    },
    {
      accessorKey: "joinDate",
      header: "Join Date",
      cell: ({ row }) => {
        const date = row.getValue("joinDate") as string
        return date ? formatDate(date) : "—"
      },
    },
    {
      accessorKey: "background",
      header: "Background",
      cell: ({ row }) => {
        const background = row.getValue("background") as string
        return background ? <span className="text-sm">{background.slice(0, 50)}...</span> : "—"
      },
    },
    {
      accessorKey: "skills",
      header: "Skills",
      cell: ({ row }) => {
        const skills = row.getValue("skills") as string
        return skills ? <span className="text-sm">{skills.slice(0, 30)}...</span> : "—"
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const trainee = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleEdit(trainee)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDelete(trainee)} className="text-red-600">
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
    setEditingTrainee(null)
    reset()
    setIsDialogOpen(true)
  }

  const uniqueBatches = [...new Set(trainees.map((t) => t.batchNumber).filter(Boolean))]

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">Trainee Management</h1>
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
            <h1 className="text-3xl font-bold text-gray-900">Trainee Management</h1>
            <p className="text-gray-600 mt-1">Manage trainee information and track their training progress.</p>
          </div>
          <div className="flex space-x-2">
            <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Upload className="w-4 h-4 mr-2" />
                  Bulk Import
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Bulk Import Trainees</DialogTitle>
                  <DialogDescription>
                    Import multiple trainees from a CSV file. Download the template to see the required format.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <div>
                      <p className="font-medium text-blue-900">Download Template</p>
                      <p className="text-sm text-blue-700">Get the CSV template with sample data</p>
                    </div>
                    <Button variant="outline" onClick={downloadTemplate}>
                      <Download className="w-4 h-4 mr-2" />
                      Template
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="csvFile">Select CSV File</Label>
                    <Input
                      id="csvFile"
                      type="file"
                      accept=".csv"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsBulkDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleBulkImport} disabled={!selectedFile || isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Importing...
                        </>
                      ) : (
                        "Import Trainees"
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openCreateDialog}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Trainee
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingTrainee ? "Edit Trainee" : "Add New Trainee"}</DialogTitle>
                  <DialogDescription>
                    {editingTrainee ? "Update trainee information." : "Add a new trainee to the training program."}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        placeholder="e.g., Aastha"
                        {...register("name")}
                        className={errors.name ? "border-red-500" : ""}
                      />
                      {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="aastha@example.com"
                        {...register("email")}
                        className={errors.email ? "border-red-500" : ""}
                      />
                      {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input id="phone" placeholder="1234567890" {...register("phone")} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="batchNumber">Batch Number</Label>
                      <Input id="batchNumber" placeholder="BATCH2024-01" {...register("batchNumber")} />
                    </div>

                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="joinDate">Join Date</Label>
                      <Input id="joinDate" type="date" {...register("joinDate")} />
                    </div>

                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="background">Background</Label>
                      <Textarea
                        id="background"
                        placeholder="e.g., Computer Science Graduate"
                        {...register("background")}
                        rows={2}
                      />
                    </div>

                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="skills">Skills</Label>
                      <Textarea
                        id="skills"
                        placeholder="e.g., Java, Python, Web Development"
                        {...register("skills")}
                        rows={2}
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
                          {editingTrainee ? "Updating..." : "Creating..."}
                        </>
                      ) : editingTrainee ? (
                        "Update Trainee"
                      ) : (
                        "Create Trainee"
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Trainees</p>
                  <p className="text-3xl font-bold text-gray-900">{trainees.length}</p>
                </div>
                <GraduationCap className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Trainees</p>
                  <p className="text-3xl font-bold text-gray-900">{trainees.filter((t) => t.isActive).length}</p>
                </div>
                <Users className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Batches</p>
                  <p className="text-3xl font-bold text-gray-900">{uniqueBatches.length}</p>
                </div>
                <Calendar className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Recent Joins</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {
                      trainees.filter((t) => {
                        const joinDate = new Date(t.joinDate || t.createdAt)
                        const thirtyDaysAgo = new Date()
                        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
                        return joinDate >= thirtyDaysAgo
                      }).length
                    }
                  </p>
                </div>
                <Plus className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Batch Overview */}
        {uniqueBatches.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Batch Overview</CardTitle>
              <CardDescription>Trainee distribution across different batches</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {uniqueBatches.map((batch) => {
                  const batchTrainees = trainees.filter((t) => t.batchNumber === batch)
                  return (
                    <div key={batch} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{batch}</p>
                          <p className="text-sm text-gray-600">{batchTrainees.length} trainees</p>
                        </div>
                        <Badge variant="outline">{batchTrainees.length}</Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Trainees Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Trainees</CardTitle>
            <CardDescription>Manage and view all trainee information in your training program.</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable columns={columns} data={trainees} searchKey="name" searchPlaceholder="Search trainees..." />
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
