const { DataTypes } = require("sequelize")
const sequelize = require("../lib/database")

const File = sequelize.define("File", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  originalName: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  fileName: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  filePath: {
    type: DataTypes.STRING(512),
    allowNull: false,
  },
  fileSize: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  mimeType: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  fileType: {
    type: DataTypes.STRING(100),
    allowNull: false,
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
