/**
 * MongoDB database configuration and connection management.
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

/**
 * MongoDB connection configuration
 */
const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME || "mcq";

/**
 * Connect to MongoDB database
 */
export async function connectDB() {
  if (!MONGO_URI) {
    console.error(
      "MongoDB connection error: MONGO_URI is not defined in environment variables",
    );
    console.error("Please check your .env file!");
    process.exit(1);
  }

  console.log(`Attempting to connect to MongoDB...`);
  console.log(`Database: ${DB_NAME}`);

  try {
    const options = {
      appName: "mcq",
    };

    await mongoose.connect(MONGO_URI, options);
    console.log(`✅ Connected to MongoDB database: ${DB_NAME}`);

    // Create indexes
    await createIndexes();
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    console.error("Error details:", error);
    process.exit(1);
  }
}

/**
 * Create database indexes for collections
 * Note: Indexes on unique fields are automatically created by Mongoose
 * We only create additional compound indexes here if needed
 */
async function createIndexes() {
  try {
    // Mongoose automatically creates indexes for fields with unique: true
    // Additional compound indexes can be added here if needed
    console.log("Database indexes handled by Mongoose automatically");
  } catch (error) {
    console.error("Error with indexes:", error.message);
  }
}

/**
 * Disconnect from MongoDB
 */
export async function disconnectDB() {
  try {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  } catch (error) {
    console.error("Error disconnecting from MongoDB:", error.message);
  }
}

/**
 * Get mongoose connection instance
 */
export function getConnection() {
  return mongoose.connection;
}

export default { connectDB, disconnectDB, getConnection };
