import { NextResponse } from "next/server"
import { EmailConfiguration } from "../../../models"
import { schemas } from "../../../middleware/validation"

export async function GET(request) {
  try {
    // Authenticate user
    const authResult = await authenticateUser(request)
    if (authResult.error) {
      return NextResponse.json(authResult.error, { status: authResult.status })
    }
    const user = authResult.user

    const emailConfig = await EmailConfiguration.findOne({
      where: { userId: user.id },
    })

    if (!emailConfig) {
      return NextResponse.json({
        success: true,
        data: { emailConfiguration: null },
      })
    }

    // Remove sensitive data from response
    const configResponse = emailConfig.toJSON()
    delete configResponse.smtpPassword

    return NextResponse.json({
      success: true,
      data: { emailConfiguration: configResponse },
    })
  } catch (error) {
    console.error("Get email configuration error:", error)
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
    const { error } = schemas.emailConfig.validate(body)
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

    const { emailAddress, smtpHost, smtpPort, smtpSecure, smtpUsername, smtpPassword } = body

    // Check if configuration already exists
    let emailConfig = await EmailConfiguration.findOne({
      where: { userId: user.id },
    })

    if (emailConfig) {
      // Update existing configuration
      await emailConfig.update({
        emailAddress,
        smtpHost,
        smtpPort,
        smtpSecure: smtpSecure || false,
        smtpUsername,
        smtpPassword,
        isConfigured: true,
        testStatus: "Not Tested",
      })
    } else {
      // Create new configuration
      emailConfig = await EmailConfiguration.create({
        emailAddress,
        smtpHost,
        smtpPort,
        smtpSecure: smtpSecure || false,
        smtpUsername,
        smtpPassword,
        isConfigured: true,
        userId: user.id,
      })
    }

    // Remove sensitive data from response
    const configResponse = emailConfig.toJSON()
    delete configResponse.smtpPassword

    return NextResponse.json({
      success: true,
      message: "Email configuration saved successfully",
      data: { emailConfiguration: configResponse },
    })
  } catch (error) {
    console.error("Save email configuration error:", error)
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
