/**
 * Initialization script for the backend.
 * Creates default users and model configurations on first run.
 */

import User, { UserRole } from "./models/User.js";
import ModelConfig, { ModelProvider } from "./models/ModelConfig.js";

/**
 * Default users to create on initialization.
 */
const DEFAULT_USERS = [
  {
    email: "babarmeetadmin@gmail.com",
    password: "babarmeetadmin@pass",
    role: UserRole.ADMIN,
  },
  {
    email: "babarmeetfree@gmail.com",
    password: "BabarMeet123",
    role: UserRole.FREE,
  },
  {
    email: "babarmeetpaid@gmail.com",
    password: "BabarMeet123",
    role: UserRole.PAID,
  },
];

/**
 * Default model configurations to create on initialization.
 */
const DEFAULT_MODELS = [
  {
    name: "Arcee AI Trinity Large (OpenRouter)",
    provider: ModelProvider.OPENROUTER,
    apiKey:
      "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",
    modelId: "arcee-ai/trinity-large-preview:free",
    isActive: true,
    isFree: true,
    // Paid and admin only - not for free users
    allowedRoles: [UserRole.PAID, UserRole.ADMIN],
  },
  {
    name: "GPT-OSS 20B (Ollama)",
    provider: ModelProvider.OLLAMA,
    apiKey: "", // No API key needed for local Ollama
    modelId: "gpt-oss:20b",
    isActive: true,
    isFree: true,
    // All users can use Ollama models (they run locally)
    allowedRoles: [UserRole.FREE, UserRole.PAID, UserRole.ADMIN],
  },
  {
    name: "DeepSeek R1 1.5B (Ollama)",
    provider: ModelProvider.OLLAMA,
    apiKey: "", // No API key needed for local Ollama
    modelId: "deepseek-r1:1.5b",
    isActive: true,
    isFree: true,
    // All users can use Ollama models (they run locally)
    allowedRoles: [UserRole.FREE, UserRole.PAID, UserRole.ADMIN],
  },
  {
    name: "DeepSeek R1 8B (Ollama)",
    provider: ModelProvider.OLLAMA,
    apiKey: "", // No API key needed for local Ollama
    modelId: "deepseek-r1:8b",
    isActive: true,
    isFree: true,
    // All users can use Ollama models (they run locally)
    allowedRoles: [UserRole.FREE, UserRole.PAID, UserRole.ADMIN],
  },
];

/**
 * Initialize default users if they don't exist.
 */
async function initializeUsers() {
  console.log("Initializing default users...");

  for (const userData of DEFAULT_USERS) {
    try {
      const existingUser = await User.findByEmail(userData.email);

      if (existingUser) {
        console.log(`  - User ${userData.email} already exists, skipping...`);
        continue;
      }

      // Set quota limit based on role
      let quotaLimit = 10; // Default for free users
      if (userData.role === UserRole.ADMIN) {
        quotaLimit = Infinity; // Unlimited for admin
      } else if (userData.role === UserRole.PAID) {
        quotaLimit = Infinity; // Unlimited for paid users
      }

      const user = new User({
        ...userData,
        quotaLimit,
      });
      await user.save();
      console.log(
        `  - Created user: ${userData.email} (${userData.role}, quota: ${quotaLimit === Infinity ? "unlimited" : quotaLimit})`,
      );
    } catch (error) {
      console.error(
        `  - Error creating user ${userData.email}:`,
        error.message,
      );
    }
  }

  console.log("User initialization complete.");
}

/**
 * Initialize default model configurations if they don't exist.
 */
async function initializeModels() {
  console.log("Initializing default model configurations...");

  for (const modelData of DEFAULT_MODELS) {
    try {
      const existingModel = await ModelConfig.findOne({ name: modelData.name });

      if (existingModel) {
        console.log(`  - Model ${modelData.name} already exists, skipping...`);
        continue;
      }

      const model = new ModelConfig(modelData);
      await model.save();
      console.log(
        `  - Created model: ${modelData.name} (${modelData.modelId})`,
      );
    } catch (error) {
      console.error(
        `  - Error creating model ${modelData.name}:`,
        error.message,
      );
    }
  }

  console.log("Model configuration initialization complete.");
}

/**
 * Main initialization function.
 * Runs all initialization tasks.
 */
async function initialize() {
  console.log("========================================");
  console.log("Starting Backend Initialization...");
  console.log("========================================");

  try {
    await initializeUsers();
    await initializeModels();

    console.log("========================================");
    console.log("Backend Initialization Complete!");
    console.log("========================================");

    // Print login credentials for reference
    console.log("\nDefault login credentials:");
    console.log("  Admin:  babarmeetadmin@gmail.com / babarmeetadmin@pass");
    console.log("  Free:  babarmeetfree@gmail.com / BabarMeet123");
    console.log("  Paid:  babarmeetpaid@gmail.com / BabarMeet123");
    console.log("");
  } catch (error) {
    console.error("Initialization failed:", error);
    throw error;
  }
}

export default initialize;
