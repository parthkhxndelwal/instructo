const { Sequelize } = require("sequelize")

const sequelize = new Sequelize(
  process.env.DB_NAME || 'instructo_db', 
  process.env.DB_USER || 'root', 
  process.env.DB_PASSWORD || '12345', 
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: "mysql",
    dialectModule: require('mysql2'),
    logging: false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
)

module.exports = sequelize
