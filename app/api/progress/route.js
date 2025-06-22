import { NextResponse } from "next/server"
import { ProgressEntry, Assignment, Project, Trainee, File, ProgressLink } from "../../../models"
import { schemas } from "../../../middleware/validation"
import { Op } from "sequelize"
import { saveUploadedFile } from "../../../utils/nextFileUpload"

export async function GET(request) {
  try {
    // Authenticate user
    const authResult = await authenticateUser(request)
    if (authResult.error) {
      return NextResponse.json(authResult.error, { status: authResult.status })
    }
    const user = authResult.user

    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page")) || 1
    const limit = Number.parseInt(searchParams.get("limit")) || 10
    const assignmentId = searchParams.get("assignmentId") || ""
    const status = searchParams.get("status") || ""
    const startDate = searchParams.get("startDate") || ""
    const endDate = searchParams.get("endDate") || ""

    const offset = (page - 1) * limit

    // Build where clause for assignments (to filter by user)
    const assignmentWhere = {
      userId: user.id,
      isActive: true,
    }

    if (assignmentId) {
      assignmentWhere.id = assignmentId
    }

    const progressWhere = {}

    if (status) {
      progressWhere.currentStatus = status
    }

    if (startDate && endDate) {
      progressWhere.startDate = {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      }
    }

    const { count, rows: progressEntries } = await ProgressEntry.findAndCountAll({
      where: progressWhere,
      include: [
        {
          model: Assignment,
          as: "assignment",
          where: assignmentWhere,
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
        {
          model: ProgressLink,
          as: "linkedProgress",
          include: [
            {
              model: ProgressEntry,
              as: "linkedProgressEntry",
              attributes: ["id", "title"],
              include: [
                {
                  model: Assignment,
                  as: "assignment",
                  attributes: ["id"],
                  include: [
                    {
                      model: Trainee,
                      as: "trainee",
                      attributes: ["id", "name"],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      limit,
      offset,
      order: [["createdAt", "DESC"]],
    })

    return NextResponse.json({
      success: true,
      data: {
        progressEntries,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: limit,
        },
      },
    })
  } catch (error) {
    console.error("Get progress entries error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 },
    )
  }
}

export async function POST(request) {
  try {
    // Authenticate user
    const authResult = await authenticateUser(request)
    if (authResult.error) {
      return NextResponse.json(authResult.error, { status: authResult.status })
    }
    const user = authResult.user

    // Check if the request is multipart/form-data or JSON
    const contentType = request.headers.get("content-type") || ""
    let body
    let formData = null // Store formData to reuse later

    if (contentType.includes("multipart/form-data")) {
      // Handle FormData
      formData = await request.formData()
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

    // Verify assignment exists and belongs to user
    const assignment = await Assignment.findOne({
      where: { id: assignmentId, userId: user.id, isActive: true },
    })

    if (!assignment) {
      return NextResponse.json(
        {
          success: false,
          message: "Assignment not found",
        },
        { status: 404 },
      )
    }

    // Create progress entry
    const progressEntry = await ProgressEntry.create({
      title,
      description,
      startDate,
      endDate,
      milestonesAchieved,
      currentStatus: currentStatus || "In Progress",
      nextSteps,
      blockers,
      completionPercentage: completionPercentage ? Number(completionPercentage) : 0,
      hoursWorked: hoursWorked ? Number(hoursWorked) : 0,
      assignmentId,
    })

    // Update assignment status if progress is completed
    const numericCompletionPercentage = Number(completionPercentage)
    if (currentStatus === "Completed" && numericCompletionPercentage === 100) {
      await assignment.update({
        status: "Completed",
        actualCompletionDate: new Date(),
      })
    } else if (currentStatus === "In Progress" && assignment.status === "Not Started") {
      await assignment.update({
        status: "In Progress",
      })
    }

    // Handle file uploads if present
    const uploadedFiles = []
    if (contentType.includes("multipart/form-data") && formData) {
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
    const progressEntryWithRelations = await ProgressEntry.findByPk(progressEntry.id, {
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
        {
          model: ProgressLink,
          as: "linkedProgress",
          include: [
            {
              model: ProgressEntry,
              as: "linkedProgressEntry",
              attributes: ["id", "title"],
              include: [
                {
                  model: Assignment,
                  as: "assignment",
                  attributes: ["id"],
                  include: [
                    {
                      model: Trainee,
                      as: "trainee",
                      attributes: ["id", "name"],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    })

    return NextResponse.json(
      {
        success: true,
        message: "Progress entry created successfully",
        data: { 
          progressEntry: progressEntryWithRelations,
          uploadedFiles: uploadedFiles.length,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Create progress entry error:", error)
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
    const { User } = require("../../../models")

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
