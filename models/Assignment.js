const { DataTypes } = require("sequelize")
const sequelize = require("../lib/database")

const Assignment = sequelize.define("Assignment", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  assignmentCode: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  expectedCompletionDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  actualCompletionDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM("Not Started", "In Progress", "Completed", "On Hold", "Cancelled"),
    defaultValue: "Not Started",
  },
  progressType: {
    type: DataTypes.ENUM("Individual", "Group"),
    defaultValue: "Individual",
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: "Users",
      key: "id",
    },
  },
  projectId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: "Projects",
      key: "id",
    },
  },
  traineeId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: "Trainees",
      key: "id",
    },
  },
})

module.exports = Assignment
