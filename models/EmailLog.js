const { DataTypes } = require("sequelize")
const sequelize = require("../lib/database")

const EmailLog = sequelize.define("EmailLog", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  recipientEmail: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  recipientName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  subject: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  body: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  attachmentCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  status: {
    type: DataTypes.ENUM("Sent", "Failed", "Pending"),
    defaultValue: "Pending",
  },
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  sentAt: {
    type: DataTypes.DATE,
    allowNull: true,
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

module.exports = EmailLog
