require('dotenv').config()
const { sequelize } = require("../models")

async function forceSyncDatabase() {
  try {
    console.log("🔄 Starting database force sync...")
    
    // Connect to database
    await sequelize.authenticate()
    console.log("✅ Database connection established successfully.")
    
    // Force sync all models (this will drop and recreate all tables)
    console.log("⚠️  WARNING: This will drop and recreate all tables!")
    console.log("🔄 Force syncing all models...")
    
    await sequelize.sync({ force: true })
    
    console.log("✅ All models have been force synced successfully!")
    console.log("📋 All tables have been recreated with the latest schema.")
    
    // List all models that were synced
    const models = Object.keys(sequelize.models)
    console.log("📊 Synced models:", models.join(", "))
    
  } catch (error) {
    console.error("❌ Database force sync failed:", error)
    throw error
  } finally {
    // Close the connection
    await sequelize.close()
    console.log("🔌 Database connection closed.")
    process.exit(0)
  }
}

// Run the force sync
forceSyncDatabase()
