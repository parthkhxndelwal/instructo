# Instructor Training Management Tool - Backend API

A robust system built for educators and administrators to efficiently manage instructor-led training programs, monitor trainee progress, and streamline project-based learning. 

## Features

- **User Authentication & Authorization**
- **Admin Management**
- **Trainee Management**
- **Project Management**
- **Assignment Tracking**
- **Progress Monitoring**
- **File Upload & Management**
- **Email Configuration & Sending**
- **Dashboard Analytics**
- **Bulk Operations Support**

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: MySQL with Sequelize ORM
- **Authentication**: JWT
- **File Upload**: Multer
- **Email**: Nodemailer
- **Validation**: Joi
- **Password Hashing**: bcryptjs

## Installation

1. **Clone the repository**
\`\`\`bash
git clone <repository-url>
cd instructor-training-backend
\`\`\`

2. **Install dependencies**
\`\`\`bash
npm install
\`\`\`

3. **Environment Setup**
\`\`\`bash
cp .env.example .env
\`\`\`

Edit `.env` with your configuration:
\`\`\`env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=instructor_training_db
DB_USER=root
DB_PASSWORD=your_password

JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:3000

MAX_FILE_SIZE=10485760
UPLOAD_DIR=uploads
\`\`\`

4. **Database Setup**
\`\`\`bash
# Create MySQL database
mysql -u root -p
CREATE DATABASE instructor_training_db;

# Initialize database tables
node scripts/init-database.js
\`\`\`

5. **Start the server**
\`\`\`bash
npm run dev
\`\`\`

The API will be available at `http://localhost:3000`

## API Endpoints

### Authentication

#### POST `/api/auth/register`
Register a new instructor account.

**Request Body:**
\`\`\`json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "1234567890",
  "password": "password123",
  "nhpcDepartment": "IT Department",
  "employeeId": "EMP001"
}
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "message": "User registered successfully. Please verify your email.",
  "data": {
    "user": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "isEmailVerified": false
    }
  }
}
\`\`\`

#### POST `/api/auth/login`
Login with email and password.

**Request Body:**
\`\`\`json
{
  "email": "john@example.com",
  "password": "password123"
}
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "token": "jwt_token_here"
  }
}
\`\`\`

### Admin Management

#### GET `/api/admins`
Get all admins for the authenticated user.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search by name, email, or department

**Headers:**
\`\`\`
Authorization: Bearer <jwt_token>
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "data": {
    "admins": [
      {
        "id": "uuid",
        "name": "Mr. Sharma",
        "email": "sharma@nhpc.com",
        "department": "HR Department",
        "isDefault": true,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalItems": 1,
      "itemsPerPage": 10
    }
  }
}
\`\`\`

#### POST `/api/admins`
Create a new admin contact.

**Request Body:**
\`\`\`json
{
  "name": "Mr. Sharma",
  "email": "sharma@nhpc.com",
  "department": "HR Department",
  "phone": "9876543210",
  "isDefault": true
}
\`\`\`

### Trainee Management

#### GET `/api/trainees`
Get all trainees for the authenticated user.

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `search` (optional): Search by name, email, or background
- `batchNumber` (optional): Filter by batch number

#### POST `/api/trainees`
Create a new trainee.

**Request Body:**
\`\`\`json
{
  "name": "Aastha",
  "email": "aastha@example.com",
  "phone": "1234567890",
  "batchNumber": "BATCH2024-01",
  "joinDate": "2024-01-15",
  "background": "Computer Science Graduate",
  "skills": "Java, Python, Web Development"
}
\`\`\`

### Project Management

#### GET `/api/projects`
Get all projects for the authenticated user.

**Query Parameters:**
- `page`, `limit`, `search` (same as above)
- `difficultyLevel` (optional): Filter by difficulty (Beginner/Intermediate/Advanced)

#### POST `/api/projects`
Create a new project.

**Request Body:**
\`\`\`json
{
  "name": "Aahaar - Canteen Management System",
  "description": "A comprehensive canteen management system for NHPC",
  "objectives": "Develop a web-based system for canteen operations",
  "duration": 30,
  "requiredSkills": "Java, Spring Boot, MySQL, HTML, CSS, JavaScript",
  "difficultyLevel": "Intermediate",
  "expectedDeliverables": "Working web application with user authentication, menu management, and order processing"
}
\`\`\`

### Assignment Management

#### GET `/api/assignments`
Get all assignments for the authenticated user.

**Query Parameters:**
- `page`, `limit` (pagination)
- `status` (optional): Filter by status
- `projectId` (optional): Filter by project
- `traineeId` (optional): Filter by trainee

#### POST `/api/assignments`
Create new assignments.

**Request Body:**
\`\`\`json
{
  "projectId": "project_uuid",
  "traineeIds": ["trainee_uuid_1", "trainee_uuid_2"],
  "startDate": "2024-01-15",
  "expectedCompletionDate": "2024-02-15",
  "progressType": "Individual",
  "notes": "Focus on backend development first"
}
\`\`\`

### Progress Tracking

#### GET `/api/progress`
Get progress entries for assignments.

**Query Parameters:**
- `page`, `limit` (pagination)
- `assignmentId` (optional): Filter by assignment
- `status` (optional): Filter by progress status
- `startDate`, `endDate` (optional): Date range filter

#### POST `/api/progress`
Create a new progress entry.

**Request Body:**
\`\`\`json
{
  "assignmentId": "assignment_uuid",
  "title": "Week 1 Progress - Database Design",
  "description": "Completed database schema design and created initial tables",
  "startDate": "2024-01-15",
  "endDate": "2024-01-21",
  "milestonesAchieved": "Database schema completed, User authentication module started",
  "currentStatus": "In Progress",
  "nextSteps": "Implement user registration and login functionality",
  "completionPercentage": 25,
  "hoursWorked": 40
}
\`\`\`

### File Management

#### POST `/api/files/upload`
Upload files for a progress entry.

**Request Body:** (multipart/form-data)
- `progressEntryId`: UUID of the progress entry
- `fileType`: Type of file (Progress Report/Attendance/Other)
- `files`: Array of files to upload

**Response:**
\`\`\`json
{
  "success": true,
  "message": "Files uploaded successfully",
  "data": {
    "files": [
      {
        "id": "file_uuid",
        "originalName": "progress_report.pdf",
        "fileName": "unique_filename.pdf",
        "fileSize": 1024000,
        "fileType": "Progress Report"
      }
    ]
  }
}
\`\`\`

### Email Configuration

#### GET `/api/email-config`
Get email configuration for the authenticated user.

#### POST `/api/email-config`
Save or update email configuration.

**Request Body:**
\`\`\`json
{
  "emailAddress": "instructor@nhpc.com",
  "smtpHost": "smtp.gmail.com",
  "smtpPort": 587,
  "smtpSecure": false,
  "smtpUsername": "instructor@nhpc.com",
  "smtpPassword": "app_password"
}
\`\`\`

#### POST `/api/email-config/test`
Test email configuration by sending a test email.

### Reports & Email

#### POST `/api/reports/send`
Send progress report to admins.

**Request Body:**
\`\`\`json
{
  "assignmentId": "assignment_uuid",
  "adminIds": ["admin_uuid_1", "admin_uuid_2"],
  "customMessage": "Please review the attached progress report.",
  "includeAllProgress": true
}
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "message": "Progress report sent successfully",
  "data": {
    "emailResults": [
      {
        "adminId": "admin_uuid",
        "adminEmail": "admin@nhpc.com",
        "status": "sent",
        "messageId": "email_message_id"
      }
    ],
    "attachmentCount": 3
  }
}
\`\`\`

### Dashboard Analytics

#### GET `/api/dashboard/stats`
Get dashboard statistics and overview.

**Response:**
\`\`\`json
{
  "success": true,
  "data": {
    "overview": {
      "totalProjects": 5,
      "totalTrainees": 100,
      "totalAdmins": 3,
      "totalAssignments": 45,
      "activeAssignments": 30,
      "completedAssignments": 15,
      "recentProgressEntries": 12
    },
    "assignmentsByStatus": {
      "Not Started": 5,
      "In Progress": 25,
      "Completed": 15
    },
    "recentAssignments": [...],
    "upcomingDeadlines": [...],
    "progressNeedingAttention": [...]
  }
}
\`\`\`

## Database Schema

### Users Table
- `id` (UUID, Primary Key)
- `name` (String, Required)
- `email` (String, Unique, Required)
- `phone` (String, Optional)
- `password` (String, Hashed, Required)
- `nhpcDepartment` (String, Optional)
- `employeeId` (String, Unique, Optional)
- `isEmailVerified` (Boolean, Default: false)
- `isActive` (Boolean, Default: true)

### Admins Table
- `id` (UUID, Primary Key)
- `name` (String, Required)
- `email` (String, Required)
- `department` (String, Optional)
- `phone` (String, Optional)
- `isDefault` (Boolean, Default: false)
- `userId` (UUID, Foreign Key)

### Trainees Table
- `id` (UUID, Primary Key)
- `name` (String, Required)
- `email` (String, Required)
- `phone` (String, Optional)
- `batchNumber` (String, Optional)
- `joinDate` (Date, Optional)
- `background` (Text, Optional)
- `skills` (Text, Optional)
- `userId` (UUID, Foreign Key)

### Projects Table
- `id` (UUID, Primary Key)
- `name` (String, Required)
- `description` (Text, Optional)
- `objectives` (Text, Optional)
- `duration` (Integer, Days)
- `requiredSkills` (Text, Optional)
- `difficultyLevel` (Enum: Beginner/Intermediate/Advanced)
- `expectedDeliverables` (Text, Optional)
- `userId` (UUID, Foreign Key)

### Assignments Table
- `id` (UUID, Primary Key)
- `assignmentCode` (String, Unique)
- `startDate` (Date, Required)
- `expectedCompletionDate` (Date, Optional)
- `actualCompletionDate` (Date, Optional)
- `status` (Enum: Not Started/In Progress/Completed/On Hold/Cancelled)
- `progressType` (Enum: Individual/Group)
- `notes` (Text, Optional)
- `userId` (UUID, Foreign Key)
- `projectId` (UUID, Foreign Key)
- `traineeId` (UUID, Foreign Key)

### Progress Entries Table
- `id` (UUID, Primary Key)
- `title` (String, Required)
- `description` (Text, Required)
- `startDate` (Date, Required)
- `endDate` (Date, Required)
- `milestonesAchieved` (Text, Optional)
- `currentStatus` (Enum: In Progress/Completed/Blocked/On Hold)
- `nextSteps` (Text, Optional)
- `blockers` (Text, Optional)
- `completionPercentage` (Integer, 0-100)
- `hoursWorked` (Decimal)
- `assignmentId` (UUID, Foreign Key)

### Files Table
- `id` (UUID, Primary Key)
- `originalName` (String, Required)
- `fileName` (String, Required)
- `filePath` (String, Required)
- `fileSize` (Integer, Required)
- `mimeType` (String, Required)
- `fileType` (Enum: Progress Report/Attendance/Other)
- `uploadDate` (Date, Default: Now)
- `progressEntryId` (UUID, Foreign Key)

## Error Handling

All endpoints return consistent error responses:

\`\`\`json
{
  "success": false,
  "message": "Error description",
  "errors": ["Detailed error messages"] // For validation errors
}
\`\`\`

## HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (Validation errors)
- `401` - Unauthorized (Missing or invalid token)
- `403` - Forbidden (Invalid token)
- `404` - Not Found
- `409` - Conflict (Duplicate data)
- `500` - Internal Server Error

## Authentication

All protected endpoints require a JWT token in the Authorization header:

\`\`\`
Authorization: Bearer <jwt_token>
\`\`\`

Tokens expire after 7 days (configurable via `JWT_EXPIRES_IN` environment variable).

## File Upload

- Maximum file size: 10MB (configurable)
- Supported formats: PDF, DOC, DOCX, images, spreadsheets
- Files are stored in `uploads/<user_id>/` directory
- File metadata is stored in the database

## Email Features

- SMTP configuration per user
- Email templates for progress reports
- Attachment support
- Email delivery tracking
- Test email functionality

## Development

### Running Tests
\`\`\`bash
npm test
\`\`\`

### Database Migration
\`\`\`bash
node scripts/init-database.js
\`\`\`

### Environment Variables
See `.env.example` for all required environment variables.

## Production Deployment

1. Set `NODE_ENV=production`
2. Configure production database
3. Set secure JWT secret
4. Configure SMTP settings
5. Set up file storage (consider cloud storage for production)
6. Enable HTTPS
7. Configure CORS for your frontend domain

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- Input validation with Joi
- File type validation
- SQL injection prevention (Sequelize ORM)
- CORS configuration
- Rate limiting (recommended for production)

## Support

For issues and questions, please refer to the API documentation or contact the development team.
