const { DataTypes } = require("sequelize")
const sequelize = require("../lib/database")

const Project = sequelize.define("Project", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 200],
    },
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  objectives: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  duration: {
    type: DataTypes.INTEGER, // Duration in days
    allowNull: true,
  },
  requiredSkills: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  difficultyLevel: {
    type: DataTypes.ENUM("Beginner", "Intermediate", "Advanced"),
    defaultValue: "Beginner",
  },
  expectedDeliverables: {
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
})

module.exports = Project
