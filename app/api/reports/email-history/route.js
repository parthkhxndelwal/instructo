const { NextResponse } = require("next/server")
const { EmailLog, User } = require("../../../../models")
const { Op } = require("sequelize")

export async function GET(request) {
  try {
    // Authenticate user
    const authResult = await authenticateUser(request)
    if (authResult.error) {
      return NextResponse.json(authResult.error, { status: authResult.status })
    }
    const user = authResult.user

    const { searchParams } = new URL(request.url)

    // Pagination parameters
    const page = Number.parseInt(searchParams.get("page")) || 1
    const limit = Number.parseInt(searchParams.get("limit")) || 10
    const offset = (page - 1) * limit

    // Filter parameters
    const status = searchParams.get("status")
    const recipientEmail = searchParams.get("recipientEmail")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const search = searchParams.get("search")

    // Build where clause
    const whereClause = {
      userId: user.id,
    }

    // Status filter
    if (status && ["Sent", "Failed", "Pending"].includes(status)) {
      whereClause.status = status
    }

    // Recipient email filter
    if (recipientEmail) {
      whereClause.recipientEmail = {
        [Op.like]: `%${recipientEmail}%`,
      }
    }

    // Date range filter
    if (startDate || endDate) {
      whereClause.createdAt = {}
      if (startDate) {
        whereClause.createdAt[Op.gte] = new Date(startDate)
      }
      if (endDate) {
        whereClause.createdAt[Op.lte] = new Date(endDate)
      }
    }

    // Search filter (searches in subject, recipient name, and recipient email)
    if (search) {
      whereClause[Op.or] = [
        { subject: { [Op.like]: `%${search}%` } },
        { recipientName: { [Op.like]: `%${search}%` } },
        { recipientEmail: { [Op.like]: `%${search}%` } },
      ]
    }

    // Get email history with pagination
    const { count, rows: emailHistory } = await EmailLog.findAndCountAll({
      where: whereClause,
      order: [["createdAt", "DESC"]],
      limit,
      offset,
      attributes: [
        "id",
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

    // Parse subject to extract trainee and project information
    const enrichedEmailHistory = emailHistory.map(email => {
      let trainee = null
      let project = null
      
      // Parse subject format: "Progress Report - [Trainee Name] - [Project Name]"
      if (email.subject && email.subject.includes('Progress Report - ')) {
        const parts = email.subject.replace('Progress Report - ', '').split(' - ')
        if (parts.length >= 2) {
          trainee = { name: parts[0] }
          project = { name: parts.slice(1).join(' - ') } // Join remaining parts in case project name has dashes
        }
      }
      
      return {
        ...email.toJSON(),
        trainee,
        project,
        recipients: email.recipientEmail ? [email.recipientEmail] : []
      }
    })

    // Get email statistics
    const stats = await EmailLog.findAll({
      where: { userId: user.id },
      attributes: ["status", [require("sequelize").fn("COUNT", "*"), "count"]],
      group: ["status"],
      raw: true,
    })

    // Format statistics
    const emailStats = {
      total: 0,
      sent: 0,
      failed: 0,
      pending: 0,
    }

    stats.forEach((stat) => {
      emailStats.total += Number.parseInt(stat.count)
      emailStats[stat.status.toLowerCase()] = Number.parseInt(stat.count)
    })

    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentActivity = await EmailLog.findAll({
      where: {
        userId: user.id,
        createdAt: {
          [Op.gte]: thirtyDaysAgo,
        },
      },
      attributes: [
        [require("sequelize").fn("DATE", require("sequelize").col("createdAt")), "date"],
        [require("sequelize").fn("COUNT", "*"), "count"],
      ],
      group: [require("sequelize").fn("DATE", require("sequelize").col("createdAt"))],
      order: [[require("sequelize").fn("DATE", require("sequelize").col("createdAt")), "DESC"]],
      raw: true,
    })

    return NextResponse.json({
      success: true,
      data: {
        emailHistory: enrichedEmailHistory,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: limit,
          hasNextPage: page < Math.ceil(count / limit),
          hasPreviousPage: page > 1,
        },
        statistics: emailStats,
        recentActivity,
      },
    })
  } catch (error) {
    console.error("Email history fetch error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch email history",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request) {
  try {
    // Authenticate user
    const authResult = await authenticateUser(request)
    if (authResult.error) {
      return NextResponse.json(authResult.error, { status: authResult.status })
    }
    const user = authResult.user

    const { searchParams } = new URL(request.url)
    const emailId = searchParams.get("id")
    const bulkDelete = searchParams.get("bulk") === "true"
    const olderThan = searchParams.get("olderThan") // Number of days

    if (bulkDelete && olderThan) {
      // Bulk delete emails older than specified days
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - Number.parseInt(olderThan))

      const deletedCount = await EmailLog.destroy({
        where: {
          userId: user.id,
          createdAt: {
            [Op.lt]: cutoffDate,
          },
        },
      })

      return NextResponse.json({
        success: true,
        message: `Deleted ${deletedCount} email records older than ${olderThan} days`,
      })
    }

    if (emailId) {
      // Delete specific email
      const deleted = await EmailLog.destroy({
        where: {
          id: emailId,
          userId: user.id,
        },
      })

      if (deleted === 0) {
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
        message: "Email record deleted successfully",
      })
    }

    return NextResponse.json(
      {
        success: false,
        message: "Email ID or bulk delete parameters required",
      },
      { status: 400 },
    )
  } catch (error) {
    console.error("Email history delete error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete email record",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 },
    )
  }
}

// Authentication helper function for Next.js App Router
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
