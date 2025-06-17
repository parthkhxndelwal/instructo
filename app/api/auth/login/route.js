import { NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { User } from "../../../../models"
import { schemas } from "../../../../middleware/validation"

export async function POST(request) {
  try {
    const body = await request.json()

    // Validate request body
    const { error } = schemas.login.validate(body)
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

    const { email, password } = body

    // Find user
    const user = await User.findOne({ where: { email, isActive: true } })
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid credentials",
        },
        { status: 401 },
      )
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password)
    if (!isPasswordValid) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid credentials",
        },
        { status: 401 },
      )
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    })

    // Remove password from response
    const userResponse = user.toJSON()
    delete userResponse.password
    delete userResponse.emailVerificationToken
    delete userResponse.resetPasswordToken

    return NextResponse.json({
      success: true,
      message: "Login successful",
      data: {
        user: userResponse,
        token,
      },
    })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 },
    )
  }
}
