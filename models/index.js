const sequelize = require("../lib/database")
const User = require("./User")
const Admin = require("./Admin")
const Trainee = require("./Trainee")
const Project = require("./Project")
const Assignment = require("./Assignment")
const ProgressEntry = require("./ProgressEntry")
const EmailConfiguration = require("./EmailConfiguration")
const File = require("./File")
const EmailLog = require("./EmailLog")
const ProgressLink = require("./ProgressLink")

// Define associations
User.hasMany(Admin, { foreignKey: "userId", as: "admins" })
Admin.belongsTo(User, { foreignKey: "userId", as: "user" })

User.hasMany(Trainee, { foreignKey: "userId", as: "trainees" })
Trainee.belongsTo(User, { foreignKey: "userId", as: "user" })

User.hasMany(Project, { foreignKey: "userId", as: "projects" })
Project.belongsTo(User, { foreignKey: "userId", as: "user" })

User.hasMany(Assignment, { foreignKey: "userId", as: "assignments" })
Assignment.belongsTo(User, { foreignKey: "userId", as: "user" })

Assignment.belongsTo(Project, { foreignKey: "projectId", as: "project" })
Project.hasMany(Assignment, { foreignKey: "projectId", as: "assignments" })

Assignment.belongsTo(Trainee, { foreignKey: "traineeId", as: "trainee" })
Trainee.hasMany(Assignment, { foreignKey: "traineeId", as: "assignments" })

Assignment.hasMany(ProgressEntry, { foreignKey: "assignmentId", as: "progressEntries" })
ProgressEntry.belongsTo(Assignment, { foreignKey: "assignmentId", as: "assignment" })

ProgressEntry.hasMany(File, { foreignKey: "progressEntryId", as: "files" })
File.belongsTo(ProgressEntry, { foreignKey: "progressEntryId", as: "progressEntry" })

User.hasOne(EmailConfiguration, { foreignKey: "userId", as: "emailConfiguration" })
EmailConfiguration.belongsTo(User, { foreignKey: "userId", as: "user" })

User.hasMany(EmailLog, { foreignKey: "userId", as: "emailLogs" })
EmailLog.belongsTo(User, { foreignKey: "userId", as: "user" })

ProgressEntry.hasMany(ProgressLink, { foreignKey: "progressEntryId", as: "linkedProgress" })
ProgressLink.belongsTo(ProgressEntry, { foreignKey: "progressEntryId", as: "progressEntry" })

ProgressEntry.hasMany(ProgressLink, { foreignKey: "linkedProgressEntryId", as: "linkingProgress" })
ProgressLink.belongsTo(ProgressEntry, { foreignKey: "linkedProgressEntryId", as: "linkedProgressEntry" })

module.exports = {
  sequelize,
  User,
  Admin,
  Trainee,
  Project,
  Assignment,
  ProgressEntry,
  EmailConfiguration,
  File,
  EmailLog,
  ProgressLink,
}
