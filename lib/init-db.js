const { sequelize } = require("../models")

let isInitialized = false

async function initializeDatabase() {
  if (isInitialized) {
    return
  }

  try {
    console.log("Initializing database connection...")
    await sequelize.authenticate()
    console.log("Database connection established successfully.")
    
    // Sync models without force to avoid dropping tables
    await sequelize.sync({ alter: false })
    console.log("Database models synchronized.")
    
    isInitialized = true
  } catch (error) {
    console.error("Database initialization failed:", error)
    throw error
  }
}

module.exports = initializeDatabase
