import { NextResponse } from "next/server"
import { Admin } from "../../../../../models"
import EmailService from "../../../../../utils/emailService"

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
    const { User } = require("../../../../../models")

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

export async function POST(request, { params }) {
  try {
    // Authenticate user
    const authResult = await authenticateUser(request)
    if (authResult.error) {
      return NextResponse.json(authResult.error, { status: authResult.status })
    }
    const user = authResult.user
    const { adminId } = params

    // Find the admin
    const admin = await Admin.findOne({
      where: {
        id: adminId,
        userId: user.id,
        isActive: true,
      },
    })

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message: "Admin not found",
        },
        { status: 404 },
      )
    }

    // Send test email to the admin
    await EmailService.sendTestEmailToAdmin(user.id, admin.email, admin.name)

    return NextResponse.json({
      success: true,
      message: `Test email sent successfully to ${admin.email}`,
    })
  } catch (error) {
    console.error("Admin test email error:", error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to send test email",
      },
      { status: 400 },
    )
  }
}
