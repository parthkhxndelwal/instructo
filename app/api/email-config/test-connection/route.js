import { NextResponse } from "next/server"
import EmailService from "../../../../utils/emailService"

export async function POST(request) {
  try {
    // Authenticate user
    const authResult = await authenticateUser(request)
    if (authResult.error) {
      return NextResponse.json(authResult.error, { status: authResult.status })
    }
    const user = authResult.user

    const result = await EmailService.testConnection(user.id)

    return NextResponse.json({
      success: true,
      message: result.message,
    })
  } catch (error) {
    console.error("Test email connection error:", error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Email connection test failed",
      },
      { status: 400 },
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
        error: { success: false, message: "User not found or inactive" },
        status: 401,
      }
    }

    return { user }
  } catch (error) {
    return {
      error: { success: false, message: "Invalid token" },
      status: 401,
    }
  }
}
