import { NextResponse } from "next/server"
import { Assignment, Project, Trainee } from "../../../models"
import { schemas } from "../../../middleware/validation"
import { Op } from "sequelize"

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
    const status = searchParams.get("status") || ""
    const projectId = searchParams.get("projectId") || ""
    const traineeId = searchParams.get("traineeId") || ""

    const offset = (page - 1) * limit

    const whereClause = {
      userId: user.id,
      isActive: true,
    }

    if (status) {
      whereClause.status = status
    }

    if (projectId) {
      whereClause.projectId = projectId
    }

    if (traineeId) {
      whereClause.traineeId = traineeId
    }

    const { count, rows: assignments } = await Assignment.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Project,
          as: "project",
          attributes: ["id", "name", "description", "difficultyLevel"],
        },
        {
          model: Trainee,
          as: "trainee",
          attributes: ["id", "name", "email", "batchNumber"],
        },
      ],
      limit,
      offset,
      order: [["createdAt", "DESC"]],
    })

    return NextResponse.json({
      success: true,
      data: {
        assignments,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: limit,
        },
      },
    })
  } catch (error) {
    console.error("Get assignments error:", error)
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

    const body = await request.json()

    // Validate request body
    const { error } = schemas.assignment.validate(body)
    if (error) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation error",
          errors: error.details.map((detail) => detail.message),
        },
        { status: 400 },
      )
    }

    const { projectId, traineeIds, startDate, expectedCompletionDate, progressType, notes } = body

    // Verify project exists and belongs to user
    const project = await Project.findOne({
      where: { id: projectId, userId: user.id, isActive: true },
    })

    if (!project) {
      return NextResponse.json(
        {
          success: false,
          message: "Project not found",
        },
        { status: 404 },
      )
    }

    // Verify all trainees exist and belong to user
    const trainees = await Trainee.findAll({
      where: {
        id: { [Op.in]: traineeIds },
        userId: user.id,
        isActive: true,
      },
    })

    if (trainees.length !== traineeIds.length) {
      return NextResponse.json(
        {
          success: false,
          message: "One or more trainees not found",
        },
        { status: 404 },
      )
    }

    // Create assignments for each trainee
    const assignments = []
    for (let i = 0; i < traineeIds.length; i++) {
      const traineeId = traineeIds[i]
      const assignmentCode = `${project.name.substring(0, 3).toUpperCase()}-${Date.now()}-${i + 1}`

      const assignment = await Assignment.create({
        assignmentCode,
        projectId,
        traineeId,
        startDate,
        expectedCompletionDate,
        progressType: progressType || "Individual",
        notes,
        userId: user.id,
      })

      // Include related data
      const assignmentWithRelations = await Assignment.findByPk(assignment.id, {
        include: [
          {
            model: Project,
            as: "project",
            attributes: ["id", "name", "description", "difficultyLevel"],
          },
          {
            model: Trainee,
            as: "trainee",
            attributes: ["id", "name", "email", "batchNumber"],
          },
        ],
      })

      assignments.push(assignmentWithRelations)
    }

    return NextResponse.json(
      {
        success: true,
        message: "Assignments created successfully",
        data: { assignments },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Create assignment error:", error)
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
