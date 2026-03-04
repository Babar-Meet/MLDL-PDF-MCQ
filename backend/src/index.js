/**
 * Express server entry point for AI-Powered MCQ Generator backend.
 */

import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB, disconnectDB } from "./config/database.js";
import userRoutes from "./routes/users.js";
import modelConfigRoutes from "./routes/modelConfigs.js";
import generateRoutes from "./routes/generate.js";
import initialize from "./init.js";
import User from "./models/User.js";
import { authenticate, requireAdmin } from "./middleware/auth.js";

const app = express();
const PORT = process.env.PORT || 8001;

// Middleware
app.use(
  cors({
    origin: "*", // In production, replace with specific origins
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "MCQ Generator Backend",
    version: "1.0.0",
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    name: "AI-Powered MCQ Generator",
    version: "1.0.0",
    description: "Backend API for generating MCQs from PDF and image files",
    docs: "/api/docs",
    redoc: "/api/redoc",
    openapi: "/api/openapi.json",
  });
});

// API info endpoint
app.get("/api/info", (req, res) => {
  res.json({
    name: "AI-Powered MCQ Generator API",
    version: "1.0.0",
    endpoints: {
      auth: {
        "POST /api/auth/register": "Register a new user",
        "POST /api/auth/login": "Login user",
        "GET /api/auth/me": "Get current user",
        "PUT /api/auth/me": "Update current user",
        "DELETE /api/auth/me": "Delete current user",
      },
      models: {
        "GET /api/models": "Get all model configurations",
        "POST /api/models": "Create model configuration",
        "GET /api/models/:id": "Get model configuration by ID",
        "PUT /api/models/:id": "Update model configuration",
        "DELETE /api/models/:id": "Delete model configuration",
        "GET /api/models/provider/:provider": "Get models by provider",
      },
      generate: {
        "POST /api/generate": "Generate MCQs from text",
        "POST /api/generate/upload": "Upload files and extract text",
        "POST /api/generate/chunk": "Chunk text into smaller pieces",
      },
    },
  });
});

// API routes
app.use("/api/auth", userRoutes);
app.use("/api/models", modelConfigRoutes);
app.use("/api/generate", generateRoutes);

// Alias routes for frontend compatibility
// GET /api/auth/users -> /api/auth (admin only)
app.get(
  "/api/auth/users",
  authenticate,
  requireAdmin,
  async (req, res, next) => {
    try {
      const users = await User.find().sort({ createdAt: -1 });
      res.json({
        message: "Users retrieved successfully",
        count: users.length,
        users: users.map((u) => u.userResponse),
      });
    } catch (error) {
      next(error);
    }
  },
);

// PUT /api/auth/users/:id/role -> /api/auth/:id/role (handled by users router)
app.put(
  "/api/auth/users/:id/role",
  authenticate,
  requireAdmin,
  async (req, res, next) => {
    try {
      const { role } = req.body;
      const user = await User.findById(req.params.id);

      if (!user) {
        return res.status(404).json({
          error: "Not Found",
          message: "User not found",
        });
      }

      user.role = role;
      await user.save();

      res.json({
        message: "User role updated successfully",
        user: user.userResponse,
      });
    } catch (error) {
      next(error);
    }
  },
);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Error:", err.message);

  if (err.name === "ValidationError") {
    return res.status(400).json({
      error: "Validation Error",
      message: err.message,
      details: err.errors,
    });
  }

  if (err.name === "CastError") {
    return res.status(400).json({
      error: "Invalid ID",
      message: "The provided ID is not valid",
    });
  }

  if (err.code === 11000) {
    return res.status(400).json({
      error: "Duplicate Error",
      message: "A record with this value already exists",
    });
  }

  res.status(500).json({
    error: "Internal Server Error",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "An unexpected error occurred",
  });
});

// Start server
async function startServer() {
  try {
    // Connect to MongoDB
    await connectDB();

    // Initialize default users and models
    await initialize();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
      console.log(`Health check: http://0.0.0.0:${PORT}/health`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  await disconnectDB();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received. Shutting down gracefully...");
  await disconnectDB();
  process.exit(0);
});

startServer();

export default app;
