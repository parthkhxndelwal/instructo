import { NextResponse } from "next/server"
import { File } from "../../../../../../models"
import { getFileStream } from "../../../../../../utils/nextFileUpload"
import path from "path"
import fs from "fs"

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
    const { User } = require("../../../../../../models")

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

// GET /api/progress/files/[fileId]/download - Download a file
export async function GET(request, { params }) {
  try {
    // Authenticate user
    const authResult = await authenticateUser(request)
    if (authResult.error) {
      return NextResponse.json(authResult.error, { status: authResult.status })
    }
    const user = authResult.user

    const { fileId } = params

    // Find the file in database
    const file = await File.findOne({
      where: { id: fileId },
      include: [
        {
          model: require("../../../../../../models").ProgressEntry,
          as: "progressEntry",
          include: [
            {
              model: require("../../../../../../models").Assignment,
              as: "assignment",
              where: { userId: user.id }, // Ensure user owns the assignment
            },
          ],
        },
      ],
    })

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          message: "File not found",
        },
        { status: 404 }
      )
    }

    // Check if file exists on filesystem
    const fullPath = path.isAbsolute(file.filePath) 
      ? file.filePath 
      : path.join(process.cwd(), file.filePath)

    if (!fs.existsSync(fullPath)) {
      return NextResponse.json(
        {
          success: false,
          message: "File not found on server",
        },
        { status: 404 }
      )
    }

    // Read file and return as blob
    const fileBuffer = await fs.promises.readFile(fullPath)
    
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": file.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${file.originalName}"`,
        "Content-Length": file.fileSize.toString(),
      },
    })
  } catch (error) {
    console.error("Download file error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 }
    )
  }
}
