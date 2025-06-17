const { NextResponse } = require("next/server")
const { EmailLog } = require("../../../../../models")
const { authenticateToken } = require("../../../../../middleware/auth")

export async function GET(request, { params }) {
  try {
    // Authenticate user
    const authResult = await authenticateToken(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { id } = params

    // Get specific email log entry
    const emailLog = await EmailLog.findOne({
      where: {
        id,
        userId: request.user.id,
      },
    })

    if (!emailLog) {
      return NextResponse.json(
        {
          success: false,
          message: "Email record not found",
        },
        { status: 404 },
      )
    }

    return NextResponse.json({
      success: true,
      data: emailLog,
    })
  } catch (error) {
    console.error("Email log fetch error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch email record",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 },
    )
  }
}

export async function PATCH(request, { params }) {
  try {
    // Authenticate user
    const authResult = await authenticateToken(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { id } = params
    const body = await request.json()
    const { status, errorMessage } = body

    // Update email log status (useful for retry functionality)
    const [updatedRows] = await EmailLog.update(
      {
        status: status || "Pending",
        errorMessage: errorMessage || null,
        sentAt: status === "Sent" ? new Date() : null,
      },
      {
        where: {
          id,
          userId: request.user.id,
        },
      },
    )

    if (updatedRows === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Email record not found",
        },
        { status: 404 },
      )
    }

    // Get updated record
    const updatedEmailLog = await EmailLog.findByPk(id)

    return NextResponse.json({
      success: true,
      message: "Email record updated successfully",
      data: updatedEmailLog,
    })
  } catch (error) {
    console.error("Email log update error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to update email record",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 },
    )
  }
}
