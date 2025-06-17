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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { emailConfigAPI } from "@/lib/api"
import { useAppStore } from "@/lib/store"
import { useToast } from "@/components/ui/use-toast"
import { Mail, TestTube, CheckCircle, AlertTriangle, Eye, EyeOff } from "lucide-react"

const emailConfigSchema = z.object({
  emailAddress: z.string().email("Please enter a valid email address"),
  smtpHost: z.string().min(1, "SMTP host is required"),
  smtpPort: z.number().min(1).max(65535, "Port must be between 1 and 65535"),
  smtpSecure: z.boolean(),
  smtpUsername: z.string().min(1, "SMTP username is required"),
  smtpPassword: z.string().min(1, "SMTP password is required"),
})

type EmailConfigForm = z.infer<typeof emailConfigSchema>

export default function SettingsPage() {
  const { toast } = useToast()
  const { setEmailConfigured } = useAppStore()
  const [isLoading, setIsLoading] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [emailConfig, setEmailConfig] = useState<any>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<EmailConfigForm>({
    resolver: zodResolver(emailConfigSchema),
    defaultValues: {
      smtpPort: 587,
      smtpSecure: false,
    },
  })

  useEffect(() => {
    fetchEmailConfig()
  }, [])

  const fetchEmailConfig = async () => {
    try {
      const response = await emailConfigAPI.get()
      const config = response.data.data.emailConfiguration
      if (config) {
        setEmailConfig(config)
        setValue("emailAddress", config.emailAddress)
        setValue("smtpHost", config.smtpHost)
        setValue("smtpPort", config.smtpPort)
        setValue("smtpSecure", config.smtpSecure)
        setValue("smtpUsername", config.smtpUsername)
        // Don't set password for security
      }
    } catch (error: any) {
      console.error("Failed to fetch email configuration:", error)
    }
  }

  const onSubmit = async (data: EmailConfigForm) => {
    setIsLoading(true)
    try {
      await emailConfigAPI.save(data)
      setEmailConfigured(true)
      toast({
        title: "Email configuration saved",
        description: "Your email settings have been saved successfully.",
      })
      fetchEmailConfig()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to save email configuration",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const testEmailConfig = async () => {
    setIsTesting(true)
    try {
      await emailConfigAPI.test()
      toast({
        title: "Email test successful",
        description: "Test email sent successfully. Check your inbox.",
      })
    } catch (error: any) {
      toast({
        title: "Email test failed",
        description: error.response?.data?.message || "Failed to send test email",
        variant: "destructive",
      })
    } finally {
      setIsTesting(false)
    }
  }

  const smtpPresets = {
    gmail: {
      smtpHost: "smtp.gmail.com",
      smtpPort: 587,
      smtpSecure: false,
    },
    outlook: {
      smtpHost: "smtp-mail.outlook.com",
      smtpPort: 587,
      smtpSecure: false,
    },
    yahoo: {
      smtpHost: "smtp.mail.yahoo.com",
      smtpPort: 587,
      smtpSecure: false,
    },
  }

  const applyPreset = (preset: keyof typeof smtpPresets) => {
    const config = smtpPresets[preset]
    setValue("smtpHost", config.smtpHost)
    setValue("smtpPort", config.smtpPort)
    setValue("smtpSecure", config.smtpSecure)
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Configure your application settings and preferences.</p>
        </div>

        <Tabs defaultValue="email" className="space-y-6">
          <TabsList>
            <TabsTrigger value="email">Email Configuration</TabsTrigger>
            <TabsTrigger value="general">General Settings</TabsTrigger>
            <TabsTrigger value="data">Data Management</TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Mail className="w-5 h-5" />
                  <span>Email Configuration</span>
                </CardTitle>
                <CardDescription>
                  Configure SMTP settings to send progress reports and notifications. This is required for the email
                  functionality to work.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Status Alert */}
                {emailConfig ? (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      Email configuration is set up and{" "}
                      {emailConfig.testStatus === "Success" ? "tested successfully" : "ready for testing"}. Last tested:{" "}
                      {emailConfig.lastTested ? new Date(emailConfig.lastTested).toLocaleString() : "Never"}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert className="border-yellow-200 bg-yellow-50">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-800">
                      Email configuration is not set up. Configure your SMTP settings below to enable email
                      functionality.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Quick Setup Presets */}
                <div>
                  <Label className="text-base font-medium">Quick Setup</Label>
                  <p className="text-sm text-gray-600 mb-3">Choose a preset for common email providers</p>
                  <div className="flex space-x-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => applyPreset("gmail")}>
                      Gmail
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => applyPreset("outlook")}>
                      Outlook
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => applyPreset("yahoo")}>
                      Yahoo
                    </Button>
                  </div>
                </div>

                {/* Email Configuration Form */}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="emailAddress">Email Address *</Label>
                      <Input
                        id="emailAddress"
                        type="email"
                        placeholder="your.email@company.com"
                        {...register("emailAddress")}
                        className={errors.emailAddress ? "border-red-500" : ""}
                      />
                      {errors.emailAddress && <p className="text-sm text-red-600">{errors.emailAddress.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="smtpHost">SMTP Host *</Label>
                      <Input
                        id="smtpHost"
                        type="text"
                        placeholder="smtp.gmail.com"
                        {...register("smtpHost")}
                        className={errors.smtpHost ? "border-red-500" : ""}
                      />
                      {errors.smtpHost && <p className="text-sm text-red-600">{errors.smtpHost.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="smtpPort">SMTP Port *</Label>
                      <Input
                        id="smtpPort"
                        type="number"
                        placeholder="587"
                        {...register("smtpPort", { valueAsNumber: true })}
                        className={errors.smtpPort ? "border-red-500" : ""}
                      />
                      {errors.smtpPort && <p className="text-sm text-red-600">{errors.smtpPort.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="smtpUsername">SMTP Username *</Label>
                      <Input
                        id="smtpUsername"
                        type="text"
                        placeholder="your.email@company.com"
                        {...register("smtpUsername")}
                        className={errors.smtpUsername ? "border-red-500" : ""}
                      />
                      {errors.smtpUsername && <p className="text-sm text-red-600">{errors.smtpUsername.message}</p>}
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="smtpPassword">SMTP Password *</Label>
                      <div className="relative">
                        <Input
                          id="smtpPassword"
                          type={showPassword ? "text" : "password"}
                          placeholder="Your email password or app password"
                          {...register("smtpPassword")}
                          className={errors.smtpPassword ? "border-red-500 pr-10" : "pr-10"}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-400" />
                          )}
                        </Button>
                      </div>
                      {errors.smtpPassword && <p className="text-sm text-red-600">{errors.smtpPassword.message}</p>}
                      <p className="text-sm text-gray-600">
                        For Gmail, use an App Password instead of your regular password.
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="smtpSecure"
                        {...register("smtpSecure")}
                        checked={watch("smtpSecure")}
                        onCheckedChange={(checked) => setValue("smtpSecure", checked)}
                      />
                      <Label htmlFor="smtpSecure">Use SSL/TLS</Label>
                    </div>
                  </div>

                  <div className="flex space-x-4">
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Saving...
                        </>
                      ) : (
                        "Save Configuration"
                      )}
                    </Button>

                    {emailConfig && (
                      <Button type="button" variant="outline" onClick={testEmailConfig} disabled={isTesting}>
                        {isTesting ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                            Testing...
                          </>
                        ) : (
                          <>
                            <TestTube className="w-4 h-4 mr-2" />
                            Test Configuration
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </form>

                {/* Help Section */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Need Help?</h4>
                  <div className="text-sm text-blue-800 space-y-1">
                    <p>
                      <strong>Gmail:</strong> Use smtp.gmail.com, port 587, and create an App Password
                    </p>
                    <p>
                      <strong>Outlook:</strong> Use smtp-mail.outlook.com, port 587
                    </p>
                    <p>
                      <strong>Yahoo:</strong> Use smtp.mail.yahoo.com, port 587
                    </p>
                    <p>
                      <strong>Custom SMTP:</strong> Contact your IT department for SMTP settings
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>Configure general application preferences.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Email Notifications</Label>
                      <p className="text-sm text-gray-600">Receive email notifications for important events</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Auto-save Progress</Label>
                      <p className="text-sm text-gray-600">Automatically save progress entries as you type</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Show Setup Guide</Label>
                      <p className="text-sm text-gray-600">Display guided tour for new features</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="data" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Data Management</CardTitle>
                <CardDescription>Import, export, and manage your training data.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-medium mb-2">Export Data</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Download your training data for backup or external analysis.
                  </p>
                  <div className="flex space-x-2">
                    <Button variant="outline">Export Trainees</Button>
                    <Button variant="outline">Export Projects</Button>
                    <Button variant="outline">Export Progress</Button>
                    <Button variant="outline">Export All Data</Button>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Import Data</h4>
                  <p className="text-sm text-gray-600 mb-4">Import trainee data from CSV files or external systems.</p>
                  <div className="flex space-x-2">
                    <Button variant="outline">Import Trainees</Button>
                    <Button variant="outline">Import Projects</Button>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Data Cleanup</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Clean up old files and archived data to free up storage space.
                  </p>
                  <div className="flex space-x-2">
                    <Button variant="outline">Archive Completed Projects</Button>
                    <Button variant="outline">Clean Old Files</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  )
}
