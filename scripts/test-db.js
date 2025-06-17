const { User, sequelize } = require("../models")

async function testDatabase() {
  try {
    console.log("Testing database connection...")
    await sequelize.authenticate()
    console.log("Database connection established successfully.")

    console.log("Testing User model...")
    
    // Try to find a user (should work even if no users exist)
    const userCount = await User.count()
    console.log(`Current user count: ${userCount}`)

    // Test creating a user
    console.log("Testing user creation...")
    const testUser = await User.create({
      name: "Test User",
      email: "test@example.com",
      password: "testpassword123"
    })
    console.log("Test user created successfully:", testUser.id)

    // Clean up test user
    await testUser.destroy()
    console.log("Test user deleted successfully.")

    console.log("Database test completed successfully!")
  } catch (error) {
    console.error("Database test failed:", error)
  } finally {
    await sequelize.close()
  }
}

testDatabase()
