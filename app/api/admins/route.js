import { NextResponse } from "next/server"
import { Admin } from "../../../models"
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

    const offset = (page - 1) * limit

    const whereClause = {
      userId: user.id,
      isActive: true,
    }

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { department: { [Op.like]: `%${search}%` } },
      ]
    }

    const { count, rows: admins } = await Admin.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [["createdAt", "DESC"]],
    })

    return NextResponse.json({
      success: true,
      data: {
        admins,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: limit,
        },
      },
    })
  } catch (error) {
    console.error("Get admins error:", error)
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
    const { error } = schemas.admin.validate(body)
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

    const { name, email, department, phone, isDefault } = body

    // If setting as default, unset other defaults
    if (isDefault) {
      await Admin.update({ isDefault: false }, { where: { userId: user.id, isActive: true } })
    }

    // Create admin
    const admin = await Admin.create({
      name,
      email,
      department,
      phone,
      isDefault: isDefault || false,
      userId: user.id,
    })

    return NextResponse.json(
      {
        success: true,
        message: "Admin created successfully",
        data: { admin },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Create admin error:", error)
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
