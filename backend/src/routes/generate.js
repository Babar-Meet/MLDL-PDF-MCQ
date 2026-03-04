/**
 * MCQ generation routes.
 * Note: PDF processing and AI integration can be handled via Python scripts or Node.js libraries.
 */

import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { authenticate } from "../middleware/auth.js";
import ModelConfig from "../models/ModelConfig.js";
import { UserRole } from "../models/User.js";
import axios from "axios";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Python backend URL - change this if Python backend runs on different port
// Note: Python backend runs on port 8000 by default
const PYTHON_API_URL =
  process.env.PYTHON_API_URL || "http://localhost:8000/api";

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../../temp_uploads"));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|png|jpg|jpeg/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase(),
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error("Only PDF and image files are allowed"));
  },
});

// Health check for generate service
router.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "MCQ Generator",
    version: "1.0.0",
  });
});

// Get available models for the authenticated user
router.get("/models", authenticate, async (req, res, next) => {
  try {
    const userRole = req.user.role;

    // Find models accessible by user's role
    const models = await ModelConfig.find({
      isActive: true,
      allowedRoles: userRole,
    }).select("-apiKey"); // Exclude API key from response

    res.json({
      message: "Available models retrieved successfully",
      count: models.length,
      models,
    });
  } catch (error) {
    next(error);
  }
});

// Get quota info for the authenticated user
router.get("/quota", authenticate, async (req, res, next) => {
  try {
    const user = req.user;

    let quotaInfo = {
      role: user.role,
      used: user.quotaUsed,
      limit: user.quotaLimit,
      remaining: user.quotaLimit - user.quotaUsed,
    };

    // Admins and paid users have unlimited quota
    if (user.role === UserRole.ADMIN || user.role === UserRole.PAID) {
      quotaInfo.limit = "unlimited";
      quotaInfo.remaining = "unlimited";
    }

    res.json({
      message: "Quota information retrieved successfully",
      quota: quotaInfo,
    });
  } catch (error) {
    next(error);
  }
});

// Generate MCQs from text (requires authentication)
router.post("/", authenticate, async (req, res, next) => {
  try {
    const { text, numQuestions, modelId, provider } = req.body;
    const user = req.user;

    // Validate text input
    if (!text || !text.trim()) {
      return res.status(400).json({
        error: "Validation Error",
        message: "Text content is required",
      });
    }

    // Validate number of questions
    if (!numQuestions || numQuestions < 1) {
      return res.status(400).json({
        error: "Validation Error",
        message: "Number of questions must be at least 1",
      });
    }

    // Check quota for free users
    const quotaCheck = user.hasQuota(numQuestions);
    if (!quotaCheck.allowed) {
      return res.status(403).json({
        error: "Quota Exceeded",
        message: `You have exceeded your free quota. You have ${quotaCheck.remaining} MCQs remaining. Upgrade to a paid plan for unlimited MCQs.`,
        quota: {
          used: user.quotaUsed,
          limit: user.quotaLimit,
          remaining: quotaCheck.remaining,
        },
      });
    }

    // Get available models for user's role
    const availableModels = await ModelConfig.find({
      isActive: true,
      allowedRoles: user.role,
    });

    // If modelId or provider specified, validate access
    let selectedModel = null;
    if (modelId || provider) {
      selectedModel = availableModels.find(
        (m) =>
          (modelId && m.modelId === modelId) ||
          (provider && m.provider === provider),
      );

      if (!selectedModel) {
        return res.status(403).json({
          error: "Forbidden",
          message:
            "You do not have access to this model. Please select an available model.",
        });
      }
    } else {
      // Default to first available model
      selectedModel = availableModels[0];
    }

    if (!selectedModel) {
      return res.status(400).json({
        error: "No Models Available",
        message:
          "No models are available for your account. Please contact support.",
      });
    }

    // Call Python backend to generate MCQs
    try {
      const pythonResponse = await axios.post(
        `${PYTHON_API_URL}/generate/generate-text`,
        {
          text: text,
          prompt: `Generate ${numQuestions} multiple choice questions from the text below.`,
          model_name: selectedModel.modelId,
          provider: selectedModel.provider,
          api_key: selectedModel.apiKey || undefined,
          temperature: 0.7,
          mcq_count: numQuestions,
        },
        {
          timeout: 180000, // 3 minute timeout
        },
      );

      // Increment quota for free users
      if (user.role === UserRole.FREE) {
        await user.incrementQuota(numQuestions);
      }

      // Return the response from Python backend
      res.json({
        message: "MCQ generated successfully",
        quota: {
          used:
            user.quotaUsed + (user.role === UserRole.FREE ? numQuestions : 0),
          limit: user.quotaLimit,
          remaining:
            user.role === UserRole.FREE
              ? user.quotaLimit - user.quotaUsed - numQuestions
              : "unlimited",
        },
        model: {
          id: selectedModel._id,
          name: selectedModel.name,
          provider: selectedModel.provider,
          modelId: selectedModel.modelId,
        },
        generated: {
          count: numQuestions,
          output: pythonResponse.data.generated_output,
          processing_time: pythonResponse.data.processing_time,
        },
      });
    } catch (pythonError) {
      console.error("Python backend error:", pythonError.message);

      // If Python backend is unavailable, return a helpful error
      if (
        pythonError.code === "ECONNREFUSED" ||
        pythonError.response?.status === 502
      ) {
        return res.status(503).json({
          error: "Service Unavailable",
          message:
            "The MCQ generation service is temporarily unavailable. Please try again later or contact support.",
          details:
            "Python backend is not running. Start the Python backend to generate MCQs.",
        });
      }

      throw pythonError;
    }
  } catch (error) {
    next(error);
  }
});

// Upload files and extract text (requires authentication)
router.post(
  "/upload",
  authenticate,
  upload.array("files", 10), // Allow up to 10 files
  async (req, res, next) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          error: "Validation Error",
          message: "No files uploaded",
        });
      }

      // Create FormData and append files
      const formData = new FormData();
      req.files.forEach((file) => {
        formData.append("files", new Blob([file.buffer]), file.originalname);
      });

      // Call Python backend for text extraction
      try {
        const pythonResponse = await axios.post(
          `${PYTHON_API_URL}/generate/upload`,
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
            timeout: 60000, // 1 minute timeout for extraction
          },
        );

        res.json({
          message: "File uploaded and text extracted successfully",
          extracted_texts: pythonResponse.data.extracted_texts,
          files_processed: pythonResponse.data.files_processed,
          total_text_length: pythonResponse.data.total_text_length,
        });
      } catch (pythonError) {
        console.error("Python backend extraction error:", pythonError.message);

        // If Python backend is unavailable, use Node.js fallback
        if (
          pythonError.code === "ECONNREFUSED" ||
          pythonError.response?.status === 502
        ) {
          // Use Node.js PDF parsing as fallback
          const extractedTexts = {};

          for (const file of req.files) {
            try {
              // Simple text extraction - in production, use pdf-parse
              const text =
                `Extracted text from ${file.originalname}. ` +
                "This is a placeholder. Configure Python backend for proper extraction.";
              extractedTexts[file.originalname] = text;
            } catch (e) {
              extractedTexts[file.originalname] = "[Error extracting text]";
            }
          }

          return res.json({
            message:
              "File uploaded (Python backend unavailable - using fallback)",
            extracted_texts: extractedTexts,
            files_processed: req.files.length,
            note: "For better text extraction, please start the Python backend.",
          });
        }

        throw pythonError;
      }
    } catch (error) {
      next(error);
    }
  },
);

// Chunk text into smaller pieces (requires authentication)
router.post("/chunk", authenticate, async (req, res, next) => {
  try {
    const { text, chunkSize, overlap } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        error: "Validation Error",
        message: "Text content is required",
      });
    }

    const size = chunkSize || 1000;
    const textOverlap = overlap || 100;

    // Simple text chunking implementation
    const words = text.split(/\s+/);
    const chunks = [];

    for (let i = 0; i < words.length; i += size - textOverlap) {
      const chunk = words.slice(i, i + size).join(" ");
      if (chunk.trim()) {
        chunks.push(chunk);
      }
    }

    res.json({
      message: "Text chunked successfully",
      count: chunks.length,
      chunkSize: size,
      overlap: textOverlap,
      chunks,
    });
  } catch (error) {
    next(error);
  }
});

// Generate MCQs with streaming (requires authentication)
router.post("/stream", authenticate, async (req, res, next) => {
  try {
    const { text, numQuestions, modelId, provider } = req.body;
    const user = req.user;

    if (!text || !text.trim()) {
      return res.status(400).json({
        error: "Validation Error",
        message: "Text content is required",
      });
    }

    // Check quota
    const quotaCheck = user.hasQuota(numQuestions || 10);
    if (!quotaCheck.allowed) {
      return res.status(403).json({
        error: "Quota Exceeded",
        message: "You have exceeded your free quota.",
        quota: quotaCheck,
      });
    }

    // TODO: Implement streaming response with actual AI model

    res.json({
      message: "Streaming MCQ generation endpoint",
      note: "This endpoint requires integration with AI model for streaming responses",
    });
  } catch (error) {
    next(error);
  }
});

export default router;
