import { NextResponse } from "next/server"
import { Assignment, Project, Trainee, ProgressEntry, File } from "../../../../../../models"

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
    const { User } = require("../../../../../../models")

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

// GET /api/progress/assignment/[traineeId]/[projectId] - Get progress entries for specific assignment
export async function GET(request, { params }) {
  try {
    // Authenticate user
    const authResult = await authenticateUser(request)
    if (authResult.error) {
      return NextResponse.json(authResult.error, { status: authResult.status })
    }
    const user = authResult.user

    const { traineeId, projectId } = params

    if (!traineeId || !projectId) {
      return NextResponse.json(
        {
          success: false,
          message: "Trainee ID and Project ID are required",
        },
        { status: 400 }
      )
    }

    // Find the assignment first to verify ownership
    const assignment = await Assignment.findOne({
      where: {
        userId: user.id,
        traineeId: traineeId,
        projectId: projectId,
        isActive: true,
      },
      include: [
        {
          model: Project,
          as: "project",
          attributes: ["id", "name", "description"],
        },
        {
          model: Trainee,
          as: "trainee",
          attributes: ["id", "name", "email"],
        },
      ],
    })

    if (!assignment) {
      return NextResponse.json(
        {
          success: false,
          message: "Assignment not found",
        },
        { status: 404 }
      )
    }

    // Get progress entries for this assignment
    const progressEntries = await ProgressEntry.findAll({
      where: { assignmentId: assignment.id },
      include: [
        {
          model: File,
          as: "files",
          attributes: ["id", "originalName", "fileName", "fileSize", "mimeType", "uploadDate"],
          required: false, // LEFT JOIN to include progress entries even without files
        },
      ],
      order: [["createdAt", "DESC"]],
    })

    return NextResponse.json({
      success: true,
      data: {
        assignment: {
          id: assignment.id,
          assignmentCode: assignment.assignmentCode,
          project: assignment.project,
          trainee: assignment.trainee,
        },
        progressEntries: progressEntries,
      },
    })
  } catch (error) {
    console.error("Get progress by assignment error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 }
    )
  }
}
