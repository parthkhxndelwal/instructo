import { NextResponse } from "next/server"
import { Assignment, Project, Trainee, ProgressEntry, File, Admin } from "../../../../models"

// Helper function to authenticate user
async function authenticateUser(request) {
  try {
    const authHeader = request.headers.get("authorization")
    const token = authHeader && authHeader.split(" ")[1]

    if (!token) {
      return {
        error: { success: false, message: "Access token required" },
        status: 401,
      }    }

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

// Helper function to generate email content
function generateEmailContent(assignment, progressEntries, customMessage, includeAllProgress) {
  const trainee = assignment.trainee
  const project = assignment.project
  
  let emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
      <h2 style="color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
        Progress Report - ${project.name}
      </h2>
      
      <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #374151;">Assignment Details</h3>
        <p><strong>Assignment Code:</strong> ${assignment.assignmentCode}</p>
        <p><strong>Trainee:</strong> ${trainee.name} (${trainee.email})</p>
        <p><strong>Project:</strong> ${project.name}</p>
        <p><strong>Difficulty Level:</strong> ${project.difficultyLevel || "N/A"}</p>
        <p><strong>Batch Number:</strong> ${trainee.batchNumber || "N/A"}</p>
      </div>
  `
  
  if (customMessage && customMessage.trim()) {
    emailContent += `
      <div style="background-color: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; margin: 20px 0;">
        <h4 style="margin-top: 0; color: #92400e;">Custom Message</h4>
        <p style="margin-bottom: 0;">${customMessage}</p>
      </div>
    `
  }
  
  // Add progress entries
  if (progressEntries && progressEntries.length > 0) {
    const entriesToShow = includeAllProgress ? progressEntries : progressEntries.slice(0, 3)
    
    emailContent += `
      <div style="margin: 20px 0;">
        <h3 style="color: #374151; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">
          Progress Entries ${includeAllProgress ? "(All)" : "(Latest 3)"}
        </h3>
    `
    
    entriesToShow.forEach((entry, index) => {
      const statusColor = {
        "Completed": "#059669",
        "In Progress": "#2563eb", 
        "Blocked": "#dc2626",
        "On Hold": "#d97706"
      }[entry.currentStatus] || "#6b7280"
      
      emailContent += `
        <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin: 15px 0;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <h4 style="margin: 0; color: #111827;">${entry.title}</h4>
            <span style="background-color: ${statusColor}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
              ${entry.currentStatus}
            </span>
          </div>
          <p style="color: #6b7280; margin: 10px 0;">${entry.description}</p>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 10px 0;">
            <div>
              <strong>Start Date:</strong> ${new Date(entry.startDate).toLocaleDateString()}
            </div>
            <div>
              <strong>End Date:</strong> ${new Date(entry.endDate).toLocaleDateString()}
            </div>
          </div>
          
          ${entry.completionPercentage !== null ? `
            <div style="margin: 10px 0;">
              <strong>Completion:</strong> ${entry.completionPercentage}%
              <div style="background-color: #e5e7eb; height: 8px; border-radius: 4px; margin-top: 5px;">
                <div style="background-color: #10b981; height: 100%; width: ${entry.completionPercentage}%; border-radius: 4px;"></div>
              </div>
            </div>
          ` : ""}
          
          ${entry.hoursWorked ? `<p><strong>Hours Worked:</strong> ${entry.hoursWorked}</p>` : ""}
          ${entry.milestonesAchieved ? `<p><strong>Milestones:</strong> ${entry.milestonesAchieved}</p>` : ""}
          ${entry.nextSteps ? `<p><strong>Next Steps:</strong> ${entry.nextSteps}</p>` : ""}
          ${entry.blockers ? `<p><strong>Blockers:</strong> ${entry.blockers}</p>` : ""}
          
          ${entry.files && entry.files.length > 0 ? `
            <div style="margin-top: 15px;">
              <strong>Attached Files (${entry.files.length}):</strong>
              <ul style="margin: 5px 0 0 20px;">
                ${entry.files.map(file => `<li>${file.originalName}</li>`).join("")}
              </ul>
            </div>
          ` : ""}
        </div>
      `
    })
    
    emailContent += "</div>"
  } else {
    emailContent += `
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
        <p style="color: #6b7280; margin: 0;">No progress entries found for this assignment.</p>
      </div>
    `
  }
  
  emailContent += `
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
        <p>This report was generated automatically by the Instructor Training Management System.</p>
        <p>Generated on: ${new Date().toLocaleString()}</p>
      </div>
    </div>
  `
  
  return emailContent
}

export async function POST(request) {
  try {
    console.log("Preview endpoint called") // Debug log
    
    // Authenticate user
    const authResult = await authenticateUser(request)
    if (authResult.error) {
      return NextResponse.json(authResult.error, { status: authResult.status })
    }
    const user = authResult.user
    console.log("User authenticated:", user.id) // Debug log

    const body = await request.json()
    console.log("Request body:", body) // Debug log
    
    const { traineeId, projectId, adminIds, subject, customMessage, includeAllProgress, includeFiles } = body

    if (!traineeId || !projectId || !adminIds || adminIds.length === 0) {
      console.log("Validation failed - missing required fields") // Debug log
      return NextResponse.json(
        {
          success: false,
          message: "Trainee ID, Project ID, and admin IDs are required",        },
        { status: 400 }
      )
    }    console.log("Querying assignment with:", { userId: user.id, projectId, traineeId })

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
          as: "project"
        },
        {
          model: Trainee,
          as: "trainee"
        },        {
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
      ],    })

    console.log("Assignment found:", assignment ? "Yes" : "No")

    if (!assignment) {
      return NextResponse.json(
        {
          success: false,
          message: "Assignment not found",
        },
        { status: 404 }
      )
    }

    // Get admins for recipients
    const admins = await Admin.findAll({
      where: { id: adminIds, isActive: true },
      attributes: ["id", "name", "email"],
    })

    if (admins.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No valid admins found",
        },
        { status: 404 }
      )
    }

    // Generate email content
    const htmlContent = generateEmailContent(
      assignment,
      assignment.progressEntries,
      customMessage,
      includeAllProgress
    )

    // Prepare attachments info
    const attachments = []
    if (includeFiles && assignment.progressEntries) {
      assignment.progressEntries.forEach(entry => {
        if (entry.files && entry.files.length > 0) {
          entry.files.forEach(file => {
            attachments.push({
              id: file.id,
              filename: file.originalName,
              size: file.fileSize,
              type: file.mimeType
            })
          })
        }
      })
    }

    const previewData = {
      recipients: admins.map(admin => `${admin.name} <${admin.email}>`),
      subject: subject || `Progress Report - ${assignment.project.name} - ${assignment.trainee.name}`,
      htmlContent,
      attachments,
      trainee: {
        name: assignment.trainee.name,
        email: assignment.trainee.email
      },
      project: {
        name: assignment.project.name
      }
    }

    return NextResponse.json({
      success: true,
      message: "Email preview generated successfully",
      data: previewData,
    })
  } catch (error) {
    console.error("Generate preview error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 }
    )
  }
}
