import axios from "axios"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api"

// Create axios instance with default config
const api = axios.create({
  baseURL: "http://localhost:3000/api/",
  headers: {
    "Content-Type": "application/json",
  },
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

// Auth API
export const authAPI = {
  register: (data: any) => api.post("/auth/register", data),
  login: (data: any) => api.post("/auth/login", data),
}

// Admin API
export const adminAPI = {
  getAll: (params?: any) => api.get("/admins", { params }),
  create: (data: any) => api.post("/admins", data),
  update: (id: string, data: any) => api.put(`/admins/${id}`, data),
  delete: (id: string) => api.delete(`/admins/${id}`),
  testEmail: (id: string) => api.post(`/admins/${id}/test-email`),
}

// Trainee API
export const traineeAPI = {
  getAll: (params?: any) => api.get("/trainees", { params }),
  create: (data: any) => api.post("/trainees", data),
  update: (id: string, data: any) => api.put(`/trainees/${id}`, data),
  delete: (id: string) => api.delete(`/trainees/${id}`),
  bulkImport: (formData: FormData) =>
    api.post("/trainees/bulk-import", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
}

// Project API
export const projectAPI = {
  getAll: (params?: any) => api.get("/projects", { params }),
  create: (data: any) => api.post("/projects", data),
  update: (id: string, data: any) => api.put(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
}

// Assignment API
export const assignmentAPI = {
  getAll: (params?: any) => api.get("/assignments", { params }),
  create: (data: any) => api.post("/assignments", data),
  update: (id: string, data: any) => api.put(`/assignments/${id}`, data),
  delete: (id: string) => api.delete(`/assignments/${id}`),
}

// Progress API
export const progressAPI = {
  getAll: (params?: any) => api.get("/progress", { params }),
  getByAssignment: (traineeId: string, projectId: string) => api.get(`/progress/assignment/${traineeId}/${projectId}`),
  create: (formData: FormData) =>
    api.post("/progress", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  update: (id: string, formData: FormData) =>
    api.put(`/progress/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  delete: (id: string) => api.delete(`/progress/${id}`),
  linkProgress: (progressId: string, targetProgressId: string) =>
    api.post(`/progress/${progressId}/link`, { targetProgressId }),
  downloadFile: (fileId: string) =>
    api.get(`/progress/files/${fileId}/download`, {
      responseType: "blob",
    }),
}

// Email Configuration API
export const emailConfigAPI = {
  get: () => api.get("/email-config"),
  save: (data: any) => api.post("/email-config", data),
  test: () => api.post("/email-config/test"),
}

// Reports API
export const reportsAPI = {
  getEmailHistory: (params?: any) => api.get("/reports/email-history", { params }),
  generatePreview: (data: any) => api.post("/reports/preview", data),
  sendEmail: (data: any) => api.post("/reports/send", data),
}

// Dashboard API
export const dashboardAPI = {
  getStats: () => api.get("/dashboard/stats"),
}

// File API
export const fileAPI = {
  upload: (formData: FormData) =>
    api.post("/files/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  download: (fileId: string) =>
    api.get(`/files/${fileId}/download`, {
      responseType: "blob",
    }),
}

export default api
