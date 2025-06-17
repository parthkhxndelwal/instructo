const { DataTypes } = require("sequelize")
const sequelize = require("../lib/database")

const EmailConfiguration = sequelize.define("EmailConfiguration", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  emailAddress: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isEmail: true,
    },
  },
  smtpHost: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  smtpPort: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 587,
  },
  smtpSecure: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  smtpUsername: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  smtpPassword: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  isConfigured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  lastTested: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  testStatus: {
    type: DataTypes.ENUM("Success", "Failed", "Not Tested"),
    defaultValue: "Not Tested",
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

module.exports = EmailConfiguration
