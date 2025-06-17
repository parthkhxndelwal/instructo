const { DataTypes } = require("sequelize")
const sequelize = require("../lib/database")

const ProgressEntry = sequelize.define("ProgressEntry", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 200],
    },
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  milestonesAchieved: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  currentStatus: {
    type: DataTypes.ENUM("In Progress", "Completed", "Blocked", "On Hold"),
    defaultValue: "In Progress",
  },
  nextSteps: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  blockers: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  completionPercentage: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 100,
    },
  },
  hoursWorked: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0,
  },
  assignmentId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: "Assignments",
      key: "id",
    },
  },
})

module.exports = ProgressEntry
