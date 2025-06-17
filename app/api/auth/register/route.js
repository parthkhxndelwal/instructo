import { NextResponse } from "next/server"
import { User } from "../../../../models"
import { schemas } from "../../../../middleware/validation"
import { v4 as uuidv4 } from "uuid"
import initializeDatabase from "../../../../lib/init-db"

export async function POST(request) {
  try {
    // Ensure database is initialized
    await initializeDatabase()
    
    const body = await request.json()

    // Validate request body
    const { error } = schemas.register.validate(body)
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

    const { name, email, phone, password, nhpcDepartment, employeeId } = body

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } })
    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          message: "User with this email already exists",
        },
        { status: 409 },
      )
    }

    // Check if employee ID already exists (if provided)
    if (employeeId) {
      const existingEmployee = await User.findOne({ where: { employeeId } })
      if (existingEmployee) {
        return NextResponse.json(
          {
            success: false,
            message: "User with this employee ID already exists",
          },
          { status: 409 },
        )
      }
    }

    // Create user
    const user = await User.create({
      name,
      email,
      phone,
      password,
      nhpcDepartment,
      employeeId,
      emailVerificationToken: uuidv4(),
    })

    // Remove password from response
    const userResponse = user.toJSON()
    delete userResponse.password
    delete userResponse.emailVerificationToken

    return NextResponse.json(
      {
        success: true,
        message: "User registered successfully. Please verify your email.",
        data: { user: userResponse },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 },
    )
  }
}
