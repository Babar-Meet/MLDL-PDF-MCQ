/**
 * Model configuration routes.
 */

import express from "express";
import { body, validationResult, param } from "express-validator";
import ModelConfig from "../models/ModelConfig.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";

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

// Get all model configurations (public - for listing available models)
router.get("/", async (req, res, next) => {
  try {
    const { provider, active, free } = req.query;

    let query = {};

    if (provider) {
      query.provider = provider;
    }

    if (active !== undefined) {
      query.isActive = active === "true";
    }

    if (free !== undefined) {
      query.isFree = free === "true";
    }

    const models = await ModelConfig.find(query);

    res.json({
      message: "Model configurations retrieved successfully",
      count: models.length,
      models,
    });
  } catch (error) {
    next(error);
  }
});

// Get models by provider
router.get(
  "/provider/:provider",
  [
    param("provider")
      .isIn([
        "ollama",
        "openrouter",
        "huggingface",
        "gemini",
        "openai",
        "claude",
        "groq",
      ])
      .withMessage("Invalid provider"),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { provider } = req.params;
      const models = await ModelConfig.findByProvider(provider);

      res.json({
        message: `Models for ${provider} retrieved successfully`,
        count: models.length,
        models,
      });
    } catch (error) {
      next(error);
    }
  },
);

// Get active/free models
router.get("/active", async (req, res, next) => {
  try {
    const models = await ModelConfig.findActive();

    res.json({
      message: "Active models retrieved successfully",
      count: models.length,
      models,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/free", async (req, res, next) => {
  try {
    const models = await ModelConfig.findFreeModels();

    res.json({
      message: "Free models retrieved successfully",
      count: models.length,
      models,
    });
  } catch (error) {
    next(error);
  }
});

// Admin: Get all models including inactive
router.get("/admin/all", authenticate, requireAdmin, async (req, res, next) => {
  try {
    const models = await ModelConfig.find({}).sort({ createdAt: -1 });

    res.json({
      message: "All models retrieved successfully (admin)",
      count: models.length,
      models,
    });
  } catch (error) {
    next(error);
  }
});

// Admin: Get all models (shorthand endpoint for frontend)
router.get("/admin", authenticate, requireAdmin, async (req, res, next) => {
  try {
    const models = await ModelConfig.find({}).sort({ createdAt: -1 });

    res.json({
      message: "All models retrieved successfully (admin)",
      count: models.length,
      models,
    });
  } catch (error) {
    next(error);
  }
});

// Get model configuration by ID
router.get(
  "/:id",
  [param("id").isMongoId().withMessage("Invalid model ID")],
  validateRequest,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const model = await ModelConfig.findById(id);

      if (!model) {
        return res.status(404).json({
          error: "Not Found",
          message: "Model configuration not found",
        });
      }

      res.json({
        message: "Model configuration retrieved successfully",
        model,
      });
    } catch (error) {
      next(error);
    }
  },
);

// Create model configuration (admin only)
router.post(
  "/",
  authenticate,
  requireAdmin,
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("provider")
      .isIn([
        "ollama",
        "openrouter",
        "huggingface",
        "gemini",
        "openai",
        "claude",
        "groq",
      ])
      .withMessage("Invalid provider"),
    body("apiKey").optional(),
    body("modelId").trim().notEmpty().withMessage("Model ID is required"),
    body("isActive").optional().isBoolean(),
    body("isFree").optional().isBoolean(),
    body("isPaid").optional().isBoolean(),
    body("allowedRoles").optional().isArray(),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const {
        name,
        provider,
        apiKey,
        modelId,
        isActive,
        isFree,
        isPaid,
        allowedRoles,
      } = req.body;

      // Check if model with name already exists
      const existingModel = await ModelConfig.findOne({ name });
      if (existingModel) {
        return res.status(400).json({
          error: "Conflict",
          message: "Model configuration with this name already exists",
        });
      }

      const model = new ModelConfig({
        name,
        provider,
        apiKey: apiKey || "",
        modelId,
        isActive: isActive ?? true,
        isFree: isFree ?? false,
        isPaid: isPaid ?? true,
        allowedRoles: allowedRoles ?? ["free", "paid", "admin"],
      });

      await model.save();

      res.status(201).json({
        message: "Model configuration created successfully",
        model,
      });
    } catch (error) {
      next(error);
    }
  },
);

// Update model configuration (admin only)
router.put(
  "/:id",
  authenticate,
  requireAdmin,
  [
    param("id").isMongoId().withMessage("Invalid model ID"),
    body("name")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("Name cannot be empty"),
    body("provider")
      .optional()
      .isIn(["ollama", "openrouter", "huggingface", "gemini", "groq"])
      .withMessage("Invalid provider"),
    body("apiKey").optional(),
    body("modelId")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("Model ID cannot be empty"),
    body("isActive").optional().isBoolean(),
    body("isFree").optional().isBoolean(),
    body("isPaid").optional().isBoolean(),
    body("allowedRoles").optional().isArray(),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const updateData = { ...req.body };

      // Remove apiKey from update if not provided
      if (updateData.apiKey === "") {
        delete updateData.apiKey;
      }

      const model = await ModelConfig.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      });

      if (!model) {
        return res.status(404).json({
          error: "Not Found",
          message: "Model configuration not found",
        });
      }

      res.json({
        message: "Model configuration updated successfully",
        model,
      });
    } catch (error) {
      next(error);
    }
  },
);

// Delete model configuration (admin only)
router.delete(
  "/:id",
  authenticate,
  requireAdmin,
  [param("id").isMongoId().withMessage("Invalid model ID")],
  validateRequest,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const model = await ModelConfig.findByIdAndDelete(id);

      if (!model) {
        return res.status(404).json({
          error: "Not Found",
          message: "Model configuration not found",
        });
      }

      res.json({
        message: "Model configuration deleted successfully",
        model,
      });
    } catch (error) {
      next(error);
    }
  },
);

// Save API key for a provider
router.post(
  "/config/api-key",
  authenticate,
  requireAdmin,
  [
    body("provider")
      .isIn([
        "ollama",
        "openrouter",
        "huggingface",
        "gemini",
        "openai",
        "claude",
        "groq",
      ])
      .withMessage("Invalid provider"),
    body("api_key").trim().notEmpty().withMessage("API key is required"),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { provider, api_key } = req.body;

      // Find and update or create model config for this provider
      let modelConfig = await ModelConfig.findOne({ provider });

      if (modelConfig) {
        modelConfig.apiKey = api_key;
        await modelConfig.save();
      } else {
        // Create a new config with the API key
        modelConfig = new ModelConfig({
          name: `${provider} API Key`,
          provider,
          apiKey: api_key,
          modelId: `${provider}-default`,
          isActive: true,
          isFree: false,
          allowedRoles: ["admin"],
        });
        await modelConfig.save();
      }

      res.json({
        message: "API key saved successfully",
        provider,
      });
    } catch (error) {
      next(error);
    }
  },
);

// Get API key for a provider
router.get(
  "/config/api-key/:provider",
  authenticate,
  requireAdmin,
  [param("provider").notEmpty().withMessage("Provider is required")],
  validateRequest,
  async (req, res, next) => {
    try {
      const { provider } = req.params;

      const modelConfig = await ModelConfig.findOne({ provider });

      if (!modelConfig || !modelConfig.apiKey) {
        return res.json({
          message: "No API key found for this provider",
          provider,
          api_key: null,
        });
      }

      res.json({
        message: "API key retrieved successfully",
        provider,
        api_key: modelConfig.apiKey,
      });
    } catch (error) {
      next(error);
    }
  },
);

// Save last used provider and model
router.post(
  "/config/last-used",
  authenticate,
  [
    body("provider").notEmpty().withMessage("Provider is required"),
    body("model").notEmpty().withMessage("Model is required"),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { provider, model } = req.body;

      // Store in user session or create a simple config
      // For now, we'll just return success
      res.json({
        message: "Last used saved successfully",
        provider,
        model,
      });
    } catch (error) {
      next(error);
    }
  },
);

// Get last used provider and model
router.get("/config/last-used", authenticate, async (req, res, next) => {
  try {
    // Return default values for now
    res.json({
      message: "Last used retrieved successfully",
      provider: null,
      model: null,
    });
  } catch (error) {
    next(error);
  }
});

// Admin: Toggle model status
router.patch(
  "/:id/toggle",
  authenticate,
  requireAdmin,
  [param("id").isMongoId().withMessage("Invalid model ID")],
  validateRequest,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const model = await ModelConfig.findById(id);

      if (!model) {
        return res.status(404).json({
          error: "Not Found",
          message: "Model configuration not found",
        });
      }

      model.isActive = !model.isActive;
      await model.save();

      res.json({
        message: `Model ${model.isActive ? "activated" : "deactivated"} successfully`,
        model,
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
