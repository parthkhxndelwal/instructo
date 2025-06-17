import { NextResponse } from "next/server"
import { Trainee } from "../../../models"
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
    const search = searchParams.get("search") || ""
    const batchNumber = searchParams.get("batchNumber") || ""

    const offset = (page - 1) * limit

    const whereClause = {
      userId: user.id,
      isActive: true,
    }

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { background: { [Op.like]: `%${search}%` } },
      ]
    }

    if (batchNumber) {
      whereClause.batchNumber = batchNumber
    }

    const { count, rows: trainees } = await Trainee.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [["createdAt", "DESC"]],
    })

    return NextResponse.json({
      success: true,
      data: {
        trainees,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: limit,
        },
      },
    })
  } catch (error) {
    console.error("Get trainees error:", error)
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
    const { error } = schemas.trainee.validate(body)
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

    const { name, email, phone, batchNumber, joinDate, background, skills } = body

    // Create trainee
    const trainee = await Trainee.create({
      name,
      email,
      phone,
      batchNumber,
      joinDate,
      background,
      skills,
      userId: user.id,
    })

    return NextResponse.json(
      {
        success: true,
        message: "Trainee created successfully",
        data: { trainee },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Create trainee error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 },
    )
  }
}

// Helper function to authenticate user (same as in admins route)
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
