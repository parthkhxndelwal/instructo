import { NextResponse } from "next/server"
import { Assignment, Project, Trainee, ProgressEntry, File, Admin } from "../../../../models"
import EmailService from "../../../../utils/emailService"
import fs from "fs"

export async function POST(request) {
  try {
    // Authenticate user
    const authResult = await authenticateUser(request)
    if (authResult.error) {
      return NextResponse.json(authResult.error, { status: authResult.status })
    }
    const user = authResult.user

    const body = await request.json()
    const { traineeId, projectId, adminIds, subject, customMessage, includeAllProgress, includeFiles } = body

    if (!traineeId || !projectId || !adminIds || adminIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Trainee ID, Project ID, and admin IDs are required",
        },
        { status: 400 },
      )
    }

    // Get assignment based on trainee and project
    const assignment = await Assignment.findOne({
      where: { 
        userId: user.id, 
        isActive: true,
        projectId: projectId,
        traineeId: traineeId
      },
      include: [
        {
          model: Project,
          as: "project",
        },
        {
          model: Trainee,
          as: "trainee",
        },
        {
          model: ProgressEntry,
          as: "progressEntries",
          required: false, // Use LEFT JOIN to include assignments even without progress entries
          include: [
            {
              model: File,
              as: "files",
              required: false, // Use LEFT JOIN to include progress entries even without files
            },
          ],
        },
      ],
      order: [
        [{ model: ProgressEntry, as: "progressEntries" }, "createdAt", "DESC"]
      ],
    })

    if (!assignment) {
      return NextResponse.json(
        {
          success: false,
          message: "Assignment not found",
        },
        { status: 404 },
      )
    }

    // Get admin recipients
    const admins = await Admin.findAll({
      where: {
        id: adminIds,
        userId: user.id,
        isActive: true,
      },
    })

    if (admins.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No valid admin recipients found",
        },
        { status: 404 },
      )
    }

    // Generate email content
    const emailSubject = `Progress Report - ${assignment.trainee.name} - ${assignment.project.name}`

    const emailBody = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 800px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
              Progress Report
            </h2>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3 style="color: #2c3e50; margin-top: 0;">Assignment Details</h3>
              <p><strong>Trainee:</strong> ${assignment.trainee.name} (${assignment.trainee.email})</p>
              <p><strong>Project:</strong> ${assignment.project.name}</p>
              <p><strong>Assignment Code:</strong> ${assignment.assignmentCode}</p>
              <p><strong>Status:</strong> ${assignment.status}</p>
              <p><strong>Start Date:</strong> ${new Date(assignment.startDate).toLocaleDateString()}</p>
              ${assignment.expectedCompletionDate ? `<p><strong>Expected Completion:</strong> ${new Date(assignment.expectedCompletionDate).toLocaleDateString()}</p>` : ""}
              ${assignment.actualCompletionDate ? `<p><strong>Actual Completion:</strong> ${new Date(assignment.actualCompletionDate).toLocaleDateString()}</p>` : ""}
            </div>

            <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 5px; margin: 20px 0;">
              <h3 style="color: #2c3e50; margin-top: 0;">Project Description</h3>
              <p>${assignment.project.description || "No description available"}</p>
            </div>

            <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 5px; margin: 20px 0;">
              <h3 style="color: #2c3e50; margin-top: 0;">Progress Summary</h3>
              ${
                assignment.progressEntries.length > 0
                  ? assignment.progressEntries
                      .map(
                        (progress) => `
                  <div style="border-left: 4px solid #3498db; padding-left: 15px; margin: 15px 0;">
                    <h4 style="color: #2c3e50; margin-bottom: 5px;">${progress.title}</h4>
                    <p><strong>Period:</strong> ${new Date(progress.startDate).toLocaleDateString()} - ${new Date(progress.endDate).toLocaleDateString()}</p>
                    <p><strong>Status:</strong> ${progress.currentStatus}</p>
                    <p><strong>Completion:</strong> ${progress.completionPercentage}%</p>
                    <p><strong>Hours Worked:</strong> ${progress.hoursWorked}</p>
                    <p><strong>Description:</strong> ${progress.description}</p>
                    ${progress.milestonesAchieved ? `<p><strong>Milestones:</strong> ${progress.milestonesAchieved}</p>` : ""}
                    ${progress.nextSteps ? `<p><strong>Next Steps:</strong> ${progress.nextSteps}</p>` : ""}
                    ${progress.blockers ? `<p><strong>Blockers:</strong> ${progress.blockers}</p>` : ""}
                  </div>
                `,
                      )
                      .join("")
                  : "<p>No progress entries available.</p>"
              }
            </div>

            ${
              customMessage
                ? `
              <div style="background-color: #e8f5e8; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <h3 style="color: #2c3e50; margin-top: 0;">Additional Notes</h3>
                <p>${customMessage}</p>
              </div>
            `
                : ""
            }

            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center;">
              <p style="margin: 0; color: #666;">
                This report was generated automatically by the Instructor Training Management System.
              </p>
              <p style="margin: 5px 0 0 0; color: #666;">
                Generated on: ${new Date().toLocaleString()}
              </p>
            </div>
          </div>
        </body>
      </html>
    `

    // Prepare attachments
    const attachments = []
    for (const progressEntry of assignment.progressEntries) {
      for (const file of progressEntry.files) {
        if (fs.existsSync(file.filePath)) {
          attachments.push({
            filename: file.originalName,
            path: file.filePath,
          })
        }
      }
    }

    // Send emails to all admins
    const emailResults = []
    for (const admin of admins) {
      try {
        const result = await EmailService.sendEmail(user.id, {
          to: admin.email,
          subject: emailSubject,
          html: emailBody,
          attachments: attachments,
        })

        emailResults.push({
          adminId: admin.id,
          adminEmail: admin.email,
          status: "sent",
          messageId: result.messageId,
        })
      } catch (error) {
        emailResults.push({
          adminId: admin.id,
          adminEmail: admin.email,
          status: "failed",
          error: error.message,
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: "Progress report sent successfully",
      data: {
        emailResults,
        attachmentCount: attachments.length,
      },
    })
  } catch (error) {
    console.error("Send report error:", error)
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
