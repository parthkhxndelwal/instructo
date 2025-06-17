import { NextResponse } from "next/server"
import { File, ProgressEntry, Assignment } from "../../../../models"

export async function POST(request) {
  try {
    // Authenticate user
    const authResult = await authenticateUser(request)
    if (authResult.error) {
      return NextResponse.json(authResult.error, { status: authResult.status })
    }
    const user = authResult.user

    const formData = await request.formData()
    const progressEntryId = formData.get("progressEntryId")
    const fileType = formData.get("fileType") || "Other"
    const files = formData.getAll("files")

    if (!progressEntryId) {
      return NextResponse.json(
        {
          success: false,
          message: "Progress entry ID is required",
        },
        { status: 400 },
      )
    }

    if (!files || files.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No files provided",
        },
        { status: 400 },
      )
    }

    // Verify progress entry exists and belongs to user
    const progressEntry = await ProgressEntry.findOne({
      include: [
        {
          model: Assignment,
          as: "assignment",
          where: { userId: user.id, isActive: true },
        },
      ],
      where: { id: progressEntryId },
    })

    if (!progressEntry) {
      return NextResponse.json(
        {
          success: false,
          message: "Progress entry not found",
        },
        { status: 404 },
      )
    }

    const uploadedFiles = []
    const fs = require("fs")
    const path = require("path")
    const { v4: uuidv4 } = require("uuid")

    // Ensure upload directory exists
    const uploadDir = path.join(process.cwd(), "uploads", user.id)
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    for (const file of files) {
      if (file.size === 0) continue

      // Generate unique filename
      const fileExtension = path.extname(file.name)
      const uniqueFileName = `${uuidv4()}-${Date.now()}${fileExtension}`
      const filePath = path.join(uploadDir, uniqueFileName)

      // Save file to disk
      const buffer = Buffer.from(await file.arrayBuffer())
      fs.writeFileSync(filePath, buffer)

      // Save file record to database
      const fileRecord = await File.create({
        originalName: file.name,
        fileName: uniqueFileName,
        filePath: filePath,
        fileSize: file.size,
        mimeType: file.type,
        fileType: fileType,
        progressEntryId: progressEntryId,
      })

      uploadedFiles.push(fileRecord)
    }

    return NextResponse.json({
      success: true,
      message: "Files uploaded successfully",
      data: { files: uploadedFiles },
    })
  } catch (error) {
    console.error("File upload error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 },
    )
  }
}

// Helper function to authenticate user
async function authenticateUser(request) {
  try {
    const authHeader = request.headers.get("authorization")
    const token = authHeader && authHeader.split(" ")[1]

    if (!token) {
      return {
        error: { success: false, message: "Access token required" },
        status: 401,
      }
    }

    const jwt = require("jsonwebtoken")
    const { User } = require("../../../../models")

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findByPk(decoded.userId)

    if (!user || !user.isActive) {
      return {
        error: { success: false, message: "Invalid or inactive user" },
        status: 401,
      }
    }

    return { user }
  } catch (error) {
    return {
      error: { success: false, message: "Invalid or expired token" },
      status: 403,
    }
  }
}
