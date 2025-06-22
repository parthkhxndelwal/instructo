const sequelize = require("../lib/database")

async function fixFileTable() {
  try {
    console.log("Updating Files table schema...")
    
    // Update column sizes to handle longer strings
    await sequelize.query("ALTER TABLE Files MODIFY COLUMN originalName VARCHAR(255) NOT NULL")
    await sequelize.query("ALTER TABLE Files MODIFY COLUMN fileName VARCHAR(255) NOT NULL")
    await sequelize.query("ALTER TABLE Files MODIFY COLUMN filePath VARCHAR(512) NOT NULL")
    await sequelize.query("ALTER TABLE Files MODIFY COLUMN mimeType VARCHAR(100) NOT NULL")
    await sequelize.query("ALTER TABLE Files MODIFY COLUMN fileType VARCHAR(100) NOT NULL")
    
    console.log("Files table schema updated successfully!")
    
    // Test the connection
    await sequelize.authenticate()
    console.log("Database connection is working.")
    
  } catch (error) {
    console.error("Error updating Files table:", error)
  } finally {
    await sequelize.close()
    process.exit(0)
  }
}

fixFileTable()
