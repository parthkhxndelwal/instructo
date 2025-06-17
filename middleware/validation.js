const Joi = require("joi")

const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body)
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.details.map((detail) => detail.message),
      })
    }
    next()
  }
}

// Validation schemas
const schemas = {
  register: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    phone: Joi.string().min(10).max(15).optional(),
    password: Joi.string().min(6).required(),
    nhpcDepartment: Joi.string().optional(),
    employeeId: Joi.string().optional(),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  admin: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    department: Joi.string().optional(),
    phone: Joi.string().optional(),
    isDefault: Joi.boolean().optional(),
  }),

  trainee: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    phone: Joi.string().optional(),
    batchNumber: Joi.string().optional(),
    joinDate: Joi.date().optional(),
    background: Joi.string().optional(),
    skills: Joi.string().optional(),
  }),

  project: Joi.object({
    name: Joi.string().min(2).max(200).required(),
    description: Joi.string().optional(),
    objectives: Joi.string().optional(),
    duration: Joi.number().integer().min(1).optional(),
    requiredSkills: Joi.string().optional(),
    difficultyLevel: Joi.string().valid("Beginner", "Intermediate", "Advanced").optional(),
    expectedDeliverables: Joi.string().optional(),
  }),

  assignment: Joi.object({
    projectId: Joi.string().uuid().required(),
    traineeIds: Joi.array().items(Joi.string().uuid()).min(1).required(),
    startDate: Joi.date().required(),
    expectedCompletionDate: Joi.date().optional(),
    progressType: Joi.string().valid("Individual", "Group").optional(),
    notes: Joi.string().optional(),
  }),

  progressEntry: Joi.object({
    assignmentId: Joi.string().uuid().required(),
    title: Joi.string().min(2).max(200).required(),
    description: Joi.string().required(),
    startDate: Joi.date().required(),
    endDate: Joi.date().required(),
    milestonesAchieved: Joi.string().optional(),
    currentStatus: Joi.string().valid("In Progress", "Completed", "Blocked", "On Hold").optional(),
    nextSteps: Joi.string().optional(),
    blockers: Joi.string().optional(),
    completionPercentage: Joi.number().integer().min(0).max(100).optional(),
    hoursWorked: Joi.number().min(0).optional(),
  }),

  emailConfig: Joi.object({
    emailAddress: Joi.string().email().required(),
    smtpHost: Joi.string().required(),
    smtpPort: Joi.number().integer().min(1).max(65535).required(),
    smtpSecure: Joi.boolean().optional(),
    smtpUsername: Joi.string().required(),
    smtpPassword: Joi.string().required(),
  }),
}

module.exports = { validateRequest, schemas }
