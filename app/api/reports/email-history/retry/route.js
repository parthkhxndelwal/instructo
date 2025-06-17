const { NextResponse } = require("next/server")
const { EmailLog } = require("../../../../../models")
const { authenticateToken } = require("../../../../../middleware/auth")
const { sendEmail } = require("../../../../../utils/emailService")

export async function POST(request) {
  try {
    // Authenticate user
    const authResult = await authenticateToken(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const body = await request.json()
    const { emailId } = body

    // Get the failed email record
    const emailLog = await EmailLog.findOne({
      where: {
        id: emailId,
        userId: request.user.id,
        status: "Failed",
      },
    })

    if (!emailLog) {
      return NextResponse.json(
        {
          success: false,
          message: "Failed email record not found",
        },
        { status: 404 },
      )
    }

    // Attempt to resend the email
    try {
      await sendEmail({
        to: emailLog.recipientEmail,
        subject: emailLog.subject,
        html: emailLog.body,
        // Note: Attachments would need to be stored separately for retry functionality
      })

      // Update email log status
      await emailLog.update({
        status: "Sent",
        sentAt: new Date(),
        errorMessage: null,
      })

      return NextResponse.json({
        success: true,
        message: "Email resent successfully",
      })
    } catch (emailError) {
      // Update with new error message
      await emailLog.update({
        errorMessage: emailError.message,
      })

      return NextResponse.json(
        {
          success: false,
          message: "Failed to resend email",
          error: emailError.message,
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Email retry error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to retry email",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 },
    )
  }
}