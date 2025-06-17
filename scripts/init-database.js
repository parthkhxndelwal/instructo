const sequelize = require("../lib/database")
// Import all models to ensure they are defined before sync
require("../models")

async function initializeDatabase() {
  try {
    console.log("Testing database connection...")
    await sequelize.authenticate()
    console.log("Database connection established successfully.")

    console.log("Synchronizing database models...")
    await sequelize.sync({ alter: true }) // Use alter instead of force to preserve data
    console.log("Database models synchronized successfully.")

    console.log("Database initialization completed!")
  } catch (error) {
    console.error("Database initialization failed:", error)
    process.exit(1)
  } finally {
    await sequelize.close()
  }
}

// Run if called directly
if (require.main === module) {
  initializeDatabase()
}

module.exports = initializeDatabase
