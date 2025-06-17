const { NextResponse } = require("next/server")
const { EmailLog } = require("../../../../../models")
const { authenticateToken } = require("../../../../../middleware/auth")
const { Op } = require("sequelize")

export async function GET(request) {
  try {
    // Authenticate user
    const authResult = await authenticateToken(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { searchParams } = new URL(request.url)
    const format = searchParams.get("format") || "json" // json, csv
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const status = searchParams.get("status")

    // Build where clause
    const whereClause = {
      userId: request.user.id,
    }

    if (status && ["Sent", "Failed", "Pending"].includes(status)) {
      whereClause.status = status
    }

    if (startDate || endDate) {
      whereClause.createdAt = {}
      if (startDate) {
        whereClause.createdAt[Op.gte] = new Date(startDate)
      }
      if (endDate) {
        whereClause.createdAt[Op.lte] = new Date(endDate)
      }
    }

    // Get all email history for export
    const emailHistory = await EmailLog.findAll({
      where: whereClause,
      order: [["createdAt", "DESC"]],
      attributes: [
        "recipientEmail",
        "recipientName",
        "subject",
        "attachmentCount",
        "status",
        "errorMessage",
        "sentAt",
        "createdAt",
      ],
    })

    if (format === "csv") {
      // Convert to CSV format
      const csvHeaders = [
        "Recipient Email",
        "Recipient Name",
        "Subject",
        "Attachment Count",
        "Status",
        "Error Message",
        "Sent At",
        "Created At",
      ]

      const csvRows = emailHistory.map((email) => [
        email.recipientEmail,
        email.recipientName || "",
        email.subject,
        email.attachmentCount,
        email.status,
        email.errorMessage || "",
        email.sentAt ? email.sentAt.toISOString() : "",
        email.createdAt.toISOString(),
      ])

      const csvContent = [
        csvHeaders.join(","),
        ...csvRows.map((row) => row.map((field) => `"${field}"`).join(",")),
      ].join("\n")

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="email-history-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      })
    }

    // Return JSON format
    return NextResponse.json({
      success: true,
      data: emailHistory,
      exportedAt: new Date().toISOString(),
      totalRecords: emailHistory.length,
    })
  } catch (error) {
    console.error("Email history export error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to export email history",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 },
    )
  }
}
