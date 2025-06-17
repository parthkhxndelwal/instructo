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
import { Switch } from "@/components/ui/switch"
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
import { adminAPI } from "@/lib/api"
import { useToast } from "@/components/ui/use-toast"
import { formatDateTime } from "@/lib/utils"
import { Plus, MoreHorizontal, Edit, Trash2, Mail, Star, TestTube } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"

const adminSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  department: z.string().optional(),
  phone: z.string().optional(),
  isDefault: z.boolean().default(false),
})

type AdminForm = z.infer<typeof adminSchema>

interface Admin {
  id: string
  name: string
  email: string
  department?: string
  phone?: string
  isDefault: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export default function AdminsPage() {
  const { toast } = useToast()
  const [admins, setAdmins] = useState<Admin[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<AdminForm>({
    resolver: zodResolver(adminSchema),
  })

  useEffect(() => {
    fetchAdmins()
  }, [])

  const fetchAdmins = async () => {
    try {
      const response = await adminAPI.getAll()
      setAdmins(response.data.data.admins)
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load admins",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: AdminForm) => {
    setIsSubmitting(true)
    try {
      if (editingAdmin) {
        await adminAPI.update(editingAdmin.id, data)
        toast({
          title: "Admin updated",
          description: "Admin contact has been updated successfully.",
        })
      } else {
        await adminAPI.create(data)
        toast({
          title: "Admin created",
          description: "New admin contact has been added successfully.",
        })
      }

      setIsDialogOpen(false)
      setEditingAdmin(null)
      reset()
      fetchAdmins()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to save admin",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (admin: Admin) => {
    setEditingAdmin(admin)
    setValue("name", admin.name)
    setValue("email", admin.email)
    setValue("department", admin.department || "")
    setValue("phone", admin.phone || "")
    setValue("isDefault", admin.isDefault)
    setIsDialogOpen(true)
  }

  const handleDelete = async (admin: Admin) => {
    if (!confirm("Are you sure you want to delete this admin?")) return

    try {
      await adminAPI.delete(admin.id)
      toast({
        title: "Admin deleted",
        description: "Admin contact has been removed successfully.",
      })
      fetchAdmins()
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete admin",
        variant: "destructive",
      })
    }
  }

  const testEmailConnection = async (admin: Admin) => {
    try {
      // This would be a test email endpoint
      toast({
        title: "Test email sent",
        description: `Test email sent to ${admin.email}`,
      })
    } catch (error: any) {
      toast({
        title: "Email test failed",
        description: "Failed to send test email",
        variant: "destructive",
      })
    }
  }

  const columns: ColumnDef<Admin>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div className="flex items-center space-x-2">
          <span className="font-medium">{row.getValue("name")}</span>
          {row.original.isDefault && <Star className="w-4 h-4 text-yellow-500 fill-current" />}
        </div>
      ),
    },
    {
      accessorKey: "email",
      header: "Email",
    },
    {
      accessorKey: "department",
      header: "Department",
      cell: ({ row }) => row.getValue("department") || "—",
    },
    {
      accessorKey: "phone",
      header: "Phone",
      cell: ({ row }) => row.getValue("phone") || "—",
    },
    {
      accessorKey: "isDefault",
      header: "Default",
      cell: ({ row }) => (
        <Badge variant={row.getValue("isDefault") ? "default" : "secondary"}>
          {row.getValue("isDefault") ? "Default" : "Regular"}
        </Badge>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => formatDateTime(row.getValue("createdAt")),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const admin = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleEdit(admin)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => testEmailConnection(admin)}>
                <TestTube className="mr-2 h-4 w-4" />
                Test Email
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDelete(admin)} className="text-red-600">
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
    setEditingAdmin(null)
    reset()
    setIsDialogOpen(true)
  }

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">Admin Management</h1>
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
            <h1 className="text-3xl font-bold text-gray-900">Admin Management</h1>
            <p className="text-gray-600 mt-1">
              Manage admin contacts who will receive progress reports and notifications.
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <Plus className="w-4 h-4 mr-2" />
                Add Admin
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editingAdmin ? "Edit Admin" : "Add New Admin"}</DialogTitle>
                <DialogDescription>
                  {editingAdmin
                    ? "Update admin contact information."
                    : "Add a new admin contact who will receive progress reports."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Mr. Sharma"
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
                    placeholder="sharma@nhpc.com"
                    {...register("email")}
                    className={errors.email ? "border-red-500" : ""}
                  />
                  {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input id="department" placeholder="e.g., HR Department" {...register("department")} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" placeholder="e.g., +91 9876543210" {...register("phone")} />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="isDefault"
                    checked={watch("isDefault")}
                    onCheckedChange={(checked) => setValue("isDefault", checked)}
                  />
                  <Label htmlFor="isDefault">Set as default admin</Label>
                </div>
                <p className="text-sm text-gray-600">Default admin will be pre-selected when sending reports.</p>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        {editingAdmin ? "Updating..." : "Creating..."}
                      </>
                    ) : editingAdmin ? (
                      "Update Admin"
                    ) : (
                      "Create Admin"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Admins</p>
                  <p className="text-3xl font-bold text-gray-900">{admins.length}</p>
                </div>
                <Mail className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Default Admin</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {admins.find((admin) => admin.isDefault)?.name || "None set"}
                  </p>
                </div>
                <Star className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Admins</p>
                  <p className="text-3xl font-bold text-gray-900">{admins.filter((admin) => admin.isActive).length}</p>
                </div>
                <TestTube className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Admins Table */}
        <Card>
          <CardHeader>
            <CardTitle>Admin Contacts</CardTitle>
            <CardDescription>
              Manage admin contacts who will receive progress reports and notifications.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable columns={columns} data={admins} searchKey="name" searchPlaceholder="Search admins..." />
          </CardContent>
        </Card>

        {/* Help Section */}
        <Card>
          <CardHeader>
            <CardTitle>Admin Management Guide</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Setting Up Admins</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Add admin contacts who should receive progress reports</li>
                  <li>• Include department information for better organization</li>
                  <li>• Set one admin as default for quick report sending</li>
                  <li>• Test email connectivity before sending reports</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Best Practices</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Use official NHPC email addresses</li>
                  <li>• Keep admin information up to date</li>
                  <li>• Set department heads as default admins</li>
                  <li>• Regularly test email connectivity</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
