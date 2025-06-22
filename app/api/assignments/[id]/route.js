import { NextResponse } from "next/server"
import { Assignment, Project, Trainee } from "../../../../models"

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

// GET /api/assignments/[id] - Get a specific assignment
export async function GET(request, { params }) {
  try {
    // Authenticate user
    const authResult = await authenticateUser(request)
    if (authResult.error) {
      return NextResponse.json(authResult.error, { status: authResult.status })
    }
    const user = authResult.user

    const { id } = params

    const assignment = await Assignment.findOne({
      where: {
        id,
        userId: user.id,
        isActive: true,
      },
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

    if (!assignment) {
      return NextResponse.json(
        {
          success: false,
          message: "Assignment not found",
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: assignment,
    })
  } catch (error) {
    console.error("Get assignment error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 }
    )
  }
}

// PUT /api/assignments/[id] - Update a specific assignment
export async function PUT(request, { params }) {
  try {
    // Authenticate user
    const authResult = await authenticateUser(request)
    if (authResult.error) {
      return NextResponse.json(authResult.error, { status: authResult.status })
    }
    const user = authResult.user

    const { id } = params
    const body = await request.json()

    // Find the assignment to update
    const assignment = await Assignment.findOne({
      where: {
        id,
        userId: user.id,
        isActive: true,
      },
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

    // Update the assignment
    await assignment.update(body)

    // Fetch the updated assignment with includes
    const updatedAssignment = await Assignment.findOne({
      where: { id },
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

    return NextResponse.json({
      success: true,
      message: "Assignment updated successfully",
      data: updatedAssignment,
    })
  } catch (error) {
    console.error("Update assignment error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 }
    )
  }
}

// DELETE /api/assignments/[id] - Delete a specific assignment
export async function DELETE(request, { params }) {
  try {
    // Authenticate user
    const authResult = await authenticateUser(request)
    if (authResult.error) {
      return NextResponse.json(authResult.error, { status: authResult.status })
    }
    const user = authResult.user

    const { id } = params

    // Find the assignment to delete
    const assignment = await Assignment.findOne({
      where: {
        id,
        userId: user.id,
        isActive: true,
      },
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

    // Soft delete the assignment by setting isActive to false
    await assignment.update({ isActive: false })

    return NextResponse.json({
      success: true,
      message: "Assignment deleted successfully",
    })
  } catch (error) {
    console.error("Delete assignment error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 }
    )
  }
}
