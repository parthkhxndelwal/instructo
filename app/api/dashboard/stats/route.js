import { NextResponse } from "next/server"
import { Assignment, Project, Trainee, ProgressEntry, Admin } from "../../../../models"
import { Op } from "sequelize"

export async function GET(request) {
  try {
    // Authenticate user
    const authResult = await authenticateUser(request)
    if (authResult.error) {
      return NextResponse.json(authResult.error, { status: authResult.status })
    }
    const user = authResult.user

    // Get date range for recent activities (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Get basic counts
    const [
      totalProjects,
      totalTrainees,
      totalAdmins,
      totalAssignments,
      activeAssignments,
      completedAssignments,
      recentProgressEntries,
    ] = await Promise.all([
      Project.count({ where: { userId: user.id, isActive: true } }),
      Trainee.count({ where: { userId: user.id, isActive: true } }),
      Admin.count({ where: { userId: user.id, isActive: true } }),
      Assignment.count({ where: { userId: user.id, isActive: true } }),
      Assignment.count({
        where: {
          userId: user.id,
          isActive: true,
          status: { [Op.in]: ["Not Started", "In Progress"] },
        },
      }),
      Assignment.count({
        where: {
          userId: user.id,
          isActive: true,
          status: "Completed",
        },
      }),
      ProgressEntry.count({
        include: [
          {
            model: Assignment,
            as: "assignment",
            where: { userId: user.id, isActive: true },
          },
        ],
        where: {
          createdAt: { [Op.gte]: thirtyDaysAgo },
        },
      }),
    ])

    // Get assignments by status
    const assignmentsByStatus = await Assignment.findAll({
      where: { userId: user.id, isActive: true },
      attributes: ["status", [Assignment.sequelize.fn("COUNT", Assignment.sequelize.col("id")), "count"]],
      group: ["status"],
      raw: true,
    })

    // Get recent assignments (last 10)
    const recentAssignments = await Assignment.findAll({
      where: { userId: user.id, isActive: true },
      include: [
        {
          model: Project,
          as: "project",
          attributes: ["id", "name"],
        },
        {
          model: Trainee,
          as: "trainee",
          attributes: ["id", "name", "email"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: 10,
    })

    // Get assignments nearing deadline (next 7 days)
    const nextWeek = new Date()
    nextWeek.setDate(nextWeek.getDate() + 7)

    const upcomingDeadlines = await Assignment.findAll({
      where: {
        userId: user.id,
        isActive: true,
        status: { [Op.in]: ["Not Started", "In Progress"] },
        expectedCompletionDate: {
          [Op.between]: [new Date(), nextWeek],
        },
      },
      include: [
        {
          model: Project,
          as: "project",
          attributes: ["id", "name"],
        },
        {
          model: Trainee,
          as: "trainee",
          attributes: ["id", "name", "email"],
        },
      ],
      order: [["expectedCompletionDate", "ASC"]],
    })

    // Get progress entries that need attention (blocked or overdue)
    const progressNeedingAttention = await ProgressEntry.findAll({
      include: [
        {
          model: Assignment,
          as: "assignment",
          where: { userId: user.id, isActive: true },
          include: [
            {
              model: Project,
              as: "project",
              attributes: ["id", "name"],
            },
            {
              model: Trainee,
              as: "trainee",
              attributes: ["id", "name", "email"],
            },
          ],
        },
      ],
      where: {
        [Op.or]: [{ currentStatus: "Blocked" }, { currentStatus: "On Hold" }],
      },
      order: [["createdAt", "DESC"]],
      limit: 10,
    })

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalProjects,
          totalTrainees,
          totalAdmins,
          totalAssignments,
          activeAssignments,
          completedAssignments,
          recentProgressEntries,
        },
        assignmentsByStatus: assignmentsByStatus.reduce((acc, item) => {
          acc[item.status] = Number.parseInt(item.count)
          return acc
        }, {}),
        recentAssignments,
        upcomingDeadlines,
        progressNeedingAttention,
      },
    })
  } catch (error) {
    console.error("Get dashboard stats error:", error)
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
