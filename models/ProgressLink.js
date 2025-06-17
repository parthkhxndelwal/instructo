const { DataTypes } = require("sequelize")
const sequelize = require("../lib/database")

const ProgressLink = sequelize.define("ProgressLink", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  linkType: {
    type: DataTypes.ENUM("Related", "Dependent", "Shared"),
    defaultValue: "Related",
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  progressEntryId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: "ProgressEntries",
      key: "id",
    },
  },
  linkedProgressEntryId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: "ProgressEntries",
      key: "id",
    },
  },
})

module.exports = ProgressLink
