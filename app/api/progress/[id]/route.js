import { NextResponse } from "next/server"
import { ProgressEntry, Assignment, Project, Trainee, File } from "../../../../models"
import { schemas } from "../../../../middleware/validation"
import { saveUploadedFile, deleteUploadedFile } from "../../../../utils/nextFileUpload"

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

// GET /api/progress/[id] - Get a specific progress entry
export async function GET(request, { params }) {
  try {
    // Authenticate user
    const authResult = await authenticateUser(request)
    if (authResult.error) {
      return NextResponse.json(authResult.error, { status: authResult.status })
    }
    const user = authResult.user

    const { id } = params

    const progressEntry = await ProgressEntry.findOne({
      where: { id },
      include: [
        {
          model: Assignment,
          as: "assignment",
          where: { userId: user.id },
          include: [
            {
              model: Project,
              as: "project",
              attributes: ["id", "name", "description"],
            },
            {
              model: Trainee,
              as: "trainee",
              attributes: ["id", "name", "email", "batchNumber"],
            },
          ],
        },
        {
          model: File,
          as: "files",
          attributes: ["id", "originalName", "fileName", "fileSize", "mimeType", "uploadDate"],
        },
      ],
    })

    if (!progressEntry) {
      return NextResponse.json(
        {
          success: false,
          message: "Progress entry not found",
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: progressEntry,
    })
  } catch (error) {
    console.error("Get progress entry error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 }
    )
  }
}

// PUT /api/progress/[id] - Update a specific progress entry
export async function PUT(request, { params }) {
  try {
    // Authenticate user
    const authResult = await authenticateUser(request)
    if (authResult.error) {
      return NextResponse.json(authResult.error, { status: authResult.status })
    }
    const user = authResult.user

    const { id } = params

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Progress entry ID is required",
        },
        { status: 400 }
      )
    }    // Check if the request is multipart/form-data or JSON
    const contentType = request.headers.get("content-type") || ""
    let body
    let formData = null

    if (contentType.includes("multipart/form-data")) {
      // Handle FormData
      formData = await request.formData()
      body = {}
      
      // Convert FormData to object
      for (const [key, value] of formData.entries()) {
        if (key === "files") {
          // Handle file uploads separately
          continue
        }
        
        // Convert numeric fields
        if (key === "completionPercentage" || key === "hoursWorked") {
          body[key] = value ? Number(value) : undefined
        } else if (key === "startDate" || key === "endDate") {
          // Convert date strings to Date objects
          body[key] = value ? new Date(value) : undefined
        } else {
          body[key] = value
        }
      }
    } else {
      // Handle JSON
      body = await request.json()
    }

    // Find the progress entry and verify ownership
    const progressEntry = await ProgressEntry.findOne({
      where: { id },
      include: [
        {
          model: Assignment,
          as: "assignment",
          where: { userId: user.id },
        },
      ],
    })

    if (!progressEntry) {
      return NextResponse.json(
        {
          success: false,
          message: "Progress entry not found",
        },
        { status: 404 }
      )
    }

    // Extract fields from body
    const {
      assignmentId,
      title,
      description,
      startDate,
      endDate,
      milestonesAchieved,
      currentStatus,
      nextSteps,
      blockers,
      completionPercentage,
      hoursWorked,
    } = body

    // If assignmentId is being changed, verify the new assignment exists and belongs to user
    if (assignmentId && assignmentId !== progressEntry.assignmentId) {
      const newAssignment = await Assignment.findOne({
        where: { id: assignmentId, userId: user.id, isActive: true },
      })

      if (!newAssignment) {
        return NextResponse.json(
          {
            success: false,
            message: "New assignment not found",
          },
          { status: 404 }
        )
      }
    }    // Update progress entry
    await progressEntry.update({
      assignmentId: assignmentId || progressEntry.assignmentId,
      title: title || progressEntry.title,
      description: description || progressEntry.description,
      startDate: startDate || progressEntry.startDate,
      endDate: endDate || progressEntry.endDate,
      milestonesAchieved: milestonesAchieved !== undefined ? milestonesAchieved : progressEntry.milestonesAchieved,
      currentStatus: currentStatus || progressEntry.currentStatus,
      nextSteps: nextSteps !== undefined ? nextSteps : progressEntry.nextSteps,
      blockers: blockers !== undefined ? blockers : progressEntry.blockers,
      completionPercentage: completionPercentage !== undefined ? Number(completionPercentage) : progressEntry.completionPercentage,
      hoursWorked: hoursWorked !== undefined ? Number(hoursWorked) : progressEntry.hoursWorked,
    })

    // Handle file uploads if present
    const uploadedFiles = []
    if (contentType.includes("multipart/form-data") && formData) {
      const files = formData.getAll("files")
      
      if (files && files.length > 0) {
        for (const file of files) {
          // Check if the file is valid (has all required properties)
          if (file && typeof file === 'object' && file.size > 0 && file.name && file.type) {
            try {
              // Save file to filesystem
              const fileMetadata = await saveUploadedFile(file, user.id, progressEntry.id)
              
              // Save file record to database
              const dbFile = await File.create({
                originalName: fileMetadata.originalName,
                fileName: fileMetadata.fileName,
                filePath: fileMetadata.relativePath,
                fileSize: fileMetadata.fileSize,
                mimeType: fileMetadata.fileType,
                fileType: fileMetadata.fileType,
                progressEntryId: progressEntry.id,
              })
              
              uploadedFiles.push(dbFile)
            } catch (fileError) {
              console.error("File upload error:", fileError)
              // Continue with other files even if one fails
            }
          }
        }
      }
    }

    // Include related data in response
    const updatedProgressEntry = await ProgressEntry.findByPk(progressEntry.id, {
      include: [
        {
          model: Assignment,
          as: "assignment",
          include: [
            {
              model: Project,
              as: "project",
              attributes: ["id", "name", "description"],
            },
            {
              model: Trainee,
              as: "trainee",
              attributes: ["id", "name", "email", "batchNumber"],
            },
          ],
        },
        {
          model: File,
          as: "files",
          attributes: ["id", "originalName", "fileName", "fileSize", "mimeType", "uploadDate"],
        },
      ],
    })

    return NextResponse.json(
      {
        success: true,
        message: "Progress entry updated successfully",
        data: { 
          progressEntry: updatedProgressEntry,
          uploadedFiles: uploadedFiles.length,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Update progress entry error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 }
    )
  }
}

// DELETE /api/progress/[id] - Delete a specific progress entry
export async function DELETE(request, { params }) {
  try {
    // Authenticate user
    const authResult = await authenticateUser(request)
    if (authResult.error) {
      return NextResponse.json(authResult.error, { status: authResult.status })
    }
    const user = authResult.user

    const { id } = params

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Progress entry ID is required",
        },
        { status: 400 }
      )
    }

    // Find the progress entry and verify ownership
    const progressEntry = await ProgressEntry.findOne({
      where: { id },
      include: [
        {
          model: Assignment,
          as: "assignment",
          where: { userId: user.id },
        },
        {
          model: File,
          as: "files",
        },
      ],
    })

    if (!progressEntry) {
      return NextResponse.json(
        {
          success: false,
          message: "Progress entry not found",
        },
        { status: 404 }
      )
    }

    // Delete associated files from filesystem
    if (progressEntry.files && progressEntry.files.length > 0) {
      for (const file of progressEntry.files) {
        try {
          await deleteUploadedFile(file.filePath)
        } catch (fileError) {
          console.error("File deletion error:", fileError)
          // Continue with deletion even if file removal fails
        }
      }
    }

    // Delete the progress entry (this will also delete related files from DB due to cascade)
    await progressEntry.destroy()

    return NextResponse.json({
      success: true,
      message: "Progress entry deleted successfully",
    })
  } catch (error) {
    console.error("Delete progress entry error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 }
    )
  }
}
