const fs = require("fs")
const path = require("path")
const { v4: uuidv4 } = require("uuid")

// Ensure upload directory exists
const uploadDir = path.join(process.cwd(), "uploads")
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

// Allowed file types
const allowedMimeTypes = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/gif",
  "text/plain",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
]

// Function to save uploaded file
async function saveUploadedFile(file, userId, progressEntryId) {
  try {
    // Validate file type
    if (!allowedMimeTypes.includes(file.type)) {
      throw new Error(`Invalid file type: ${file.type}. Only PDF, DOC, DOCX, images, and spreadsheets are allowed.`)
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      throw new Error(`File size too large: ${file.size} bytes. Maximum allowed: ${maxSize} bytes.`)
    }

    // Create user-specific directory
    const userDir = path.join(uploadDir, userId)
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true })
    }

    // Create progress-specific directory
    const progressDir = path.join(userDir, progressEntryId)
    if (!fs.existsSync(progressDir)) {
      fs.mkdirSync(progressDir, { recursive: true })
    }

    // Generate unique filename
    const fileExtension = path.extname(file.name)
    const uniqueFileName = `${uuidv4()}-${Date.now()}${fileExtension}`
    const filePath = path.join(progressDir, uniqueFileName)

    // Convert file to buffer and save
    const buffer = Buffer.from(await file.arrayBuffer())
    await fs.promises.writeFile(filePath, buffer)

    // Return file metadata
    return {
      originalName: file.name,
      fileName: uniqueFileName,
      filePath: filePath,
      relativePath: path.relative(process.cwd(), filePath),
      fileSize: file.size,
      fileType: file.type,
      progressEntryId: progressEntryId,
    }
  } catch (error) {
    console.error("File save error:", error)
    throw error
  }
}

// Function to delete file from filesystem
async function deleteUploadedFile(filePath) {
  try {
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath)
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath)
      console.log(`File deleted: ${fullPath}`)
    }
  } catch (error) {
    console.error("File deletion error:", error)
    // Don't throw error for file deletion failures
  }
}

// Function to get file stream for download
function getFileStream(filePath) {
  try {
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath)
    if (!fs.existsSync(fullPath)) {
      throw new Error("File not found")
    }
    return fs.createReadStream(fullPath)
  } catch (error) {
    console.error("File read error:", error)
    throw error
  }
}

module.exports = {
  saveUploadedFile,
  deleteUploadedFile,
  getFileStream,
  allowedMimeTypes,
  uploadDir,
}
