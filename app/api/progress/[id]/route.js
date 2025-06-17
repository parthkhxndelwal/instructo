import { NextResponse } from "next/server"
import { ProgressEntry, Assignment, Project, Trainee, File } from "../../../../models"
import { schemas } from "../../../../middleware/validation"
import { Op } from "sequelize"
import { saveUploadedFile, deleteUploadedFile } from "../../../../utils/nextFileUpload"

// DELETE /api/progress/[id]
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
        { status: 400 },
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
          include: [
            {
              model: Project,
              as: "project",
              attributes: ["id", "name"],
            },
            {
              model: Trainee,
              as: "trainee",
              attributes: ["id", "name"],
            },
          ],
        },
      ],
    })

    if (!progressEntry) {
      return NextResponse.json(
        {
          success: false,
          message: "Progress entry not found",
        },
        { status: 404 },
      )
    }    // Delete associated files first (if any)
    const files = await File.findAll({
      where: { progressEntryId: id },
    })
    
    // Delete files from filesystem
    for (const file of files) {
      await deleteUploadedFile(file.filePath)
    }
    
    // Delete file records from database
    await File.destroy({
      where: { progressEntryId: id },
    })

    // Delete the progress entry
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
      { status: 500 },
    )
  }
}

// PUT /api/progress/[id]
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
        { status: 400 },
      )
    }

    // Check if the request is multipart/form-data or JSON
    const contentType = request.headers.get("content-type") || ""
    let body

    if (contentType.includes("multipart/form-data")) {
      // Handle FormData
      const formData = await request.formData()
      body = {}
      
      // Convert FormData to object
      for (const [key, value] of formData.entries()) {
        if (key === "files") {
          // Handle file uploads if needed
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

    // Validate request body
    const { error } = schemas.progressEntry.validate(body)
    if (error) {
      console.error("Progress entry validation error:", error.details)
      console.error("Received body:", body)
      return NextResponse.json(
        {
          success: false,
          message: "Validation error",
          errors: error.details.map((detail) => detail.message),
        },
        { status: 400 },
      )
    }

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
        { status: 404 },
      )
    }

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
          { status: 404 },
        )
      }
    }

    // Update progress entry
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

    // Update assignment status if progress is completed
    const assignment = await Assignment.findByPk(progressEntry.assignmentId)
    const numericCompletionPercentage = Number(completionPercentage || progressEntry.completionPercentage)
    
    if (currentStatus === "Completed" && numericCompletionPercentage === 100) {
      await assignment.update({
        status: "Completed",
        actualCompletionDate: new Date(),
      })    } else if (currentStatus === "In Progress" && assignment.status === "Not Started") {
      await assignment.update({
        status: "In Progress",
      })
    }

    // Handle file uploads if present
    const uploadedFiles = []
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData()
      const files = formData.getAll("files")
      
      if (files && files.length > 0) {
        for (const file of files) {
          if (file instanceof File && file.size > 0) {
            try {
              // Save file to filesystem
              const fileMetadata = await saveUploadedFile(file, user.id, progressEntry.id)
              
              // Save file record to database
              const dbFile = await File.create({
                originalName: fileMetadata.originalName,
                fileName: fileMetadata.fileName,
                filePath: fileMetadata.relativePath,
                fileSize: fileMetadata.fileSize,
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
          attributes: ["id", "originalName", "fileName", "fileSize", "fileType"],
        },
      ],
    })    return NextResponse.json(
      {
        success: true,
        message: "Progress entry updated successfully",
        data: { 
          progressEntry: updatedProgressEntry,
          uploadedFiles: uploadedFiles.length,
        },
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Update progress entry error:", error)
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
