const { DataTypes } = require("sequelize")
const sequelize = require("../lib/database")

const File = sequelize.define("File", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  originalName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  fileName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  filePath: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  fileSize: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  mimeType: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  fileType: {
    type: DataTypes.ENUM("Progress Report", "Attendance", "Other"),
    defaultValue: "Other",
  },
  uploadDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  progressEntryId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: "ProgressEntries",
      key: "id",
    },
  },
})

module.exports = File
