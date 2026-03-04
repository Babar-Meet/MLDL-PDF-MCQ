/**
 * User authentication routes.
 */

import express from "express";
import { body, validationResult } from "express-validator";
import User from "../models/User.js";
import {
  generateToken,
  authenticate,
  requireAdmin,
} from "../middleware/auth.js";

const router = express.Router();

// Validation middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: "Validation Error",
      details: errors.array(),
    });
  }
  next();
};

// Register new user
router.post(
  "/register",
  [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email is required"),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters"),
    body("role")
      .optional()
      .isIn(["admin", "paid", "free"])
      .withMessage("Invalid role"),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { email, password, role } = req.body;

      // Check if user already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          error: "Conflict",
          message: "User with this email already exists",
        });
      }

      // Determine the role - only admins can create admin users
      let userRole = role || "free";

      // If trying to create an admin user, check if requester is admin
      if (role === "admin") {
        // Check if there's already an admin in the system
        const adminExists = await User.findOne({ role: "admin" });
        if (adminExists) {
          return res.status(403).json({
            error: "Forbidden",
            message:
              "Cannot create admin user. Only existing admins can create new admin users.",
          });
        }
        // First admin can be created (for initial setup)
        userRole = "admin";
      }

      // Create new user
      const user = new User({
        email,
        password,
        role: userRole,
      });

      await user.save();

      // Generate JWT token
      const token = generateToken(user);

      res.status(201).json({
        message: "User registered successfully",
        token,
        user: user.userResponse,
      });
    } catch (error) {
      next(error);
    }
  },
);

// Login user
router.post(
  "/login",
  [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email is required"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { email, password } = req.body;

      // Find user with password
      const user = await User.findOne({ email: email.toLowerCase() }).select(
        "+password",
      );
      if (!user) {
        return res.status(401).json({
          error: "Unauthorized",
          message: "Invalid email or password",
        });
      }

      // Check password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({
          error: "Unauthorized",
          message: "Invalid email or password",
        });
      }

      // Generate JWT token
      const token = generateToken(user);

      res.json({
        message: "Login successful",
        token,
        user: user.userResponse,
      });
    } catch (error) {
      next(error);
    }
  },
);

// Get current user (requires authentication)
router.get("/me", authenticate, async (req, res, next) => {
  try {
    res.json({
      message: "Current user retrieved successfully",
      user: req.user.userResponse,
    });
  } catch (error) {
    next(error);
  }
});

// Update current user (requires authentication)
router.put(
  "/me",
  authenticate,
  [
    body("password")
      .optional()
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters"),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { password } = req.body;
      const user = req.user;

      // Update password if provided
      if (password) {
        user.password = password;
      }

      await user.save();

      res.json({
        message: "User updated successfully",
        user: user.userResponse,
      });
    } catch (error) {
      next(error);
    }
  },
);

// Delete current user (requires authentication)
router.delete("/me", authenticate, async (req, res, next) => {
  try {
    const user = req.user;

    await user.deleteOne();

    res.json({
      message: "User deleted successfully",
    });
  } catch (error) {
    next(error);
  }
});

// Admin-only: Get all users
router.get("/", authenticate, requireAdmin, async (req, res, next) => {
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
});

// Admin-only: Get user by ID
router.get("/:id", authenticate, requireAdmin, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        error: "Not Found",
        message: "User not found",
      });
    }

    res.json({
      message: "User retrieved successfully",
      user: user.userResponse,
    });
  } catch (error) {
    next(error);
  }
});

// Admin-only: Update user role
router.put(
  "/:id/role",
  authenticate,
  requireAdmin,
  [body("role").isIn(["admin", "paid", "free"]).withMessage("Invalid role")],
  validateRequest,
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

// Upgrade current user to paid plan
router.post("/upgrade", authenticate, async (req, res, next) => {
  try {
    const user = req.user;

    // Already paid
    if (user.role === "paid" || user.role === "admin") {
      return res.status(400).json({
        error: "Bad Request",
        message: "User is already on a paid or admin plan",
      });
    }

    // Upgrade to paid
    user.role = "paid";
    await user.save();

    res.json({
      message: "Successfully upgraded to paid plan",
      user: user.userResponse,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
