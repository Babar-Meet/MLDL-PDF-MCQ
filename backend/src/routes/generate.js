/**
 * MCQ generation routes.
 * Handles text extraction, chunking, and AI model routing directly in Node.js.
 */

import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { authenticate } from "../middleware/auth.js";
import ModelConfig from "../models/ModelConfig.js";
import { UserRole } from "../models/User.js";
import axios from "axios";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

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

// Get available models for the authenticated user (alias)
router.get("/", authenticate, async (req, res, next) => {
  try {
    const userRole = req.user.role;
    let query = { isActive: true };
    if (userRole !== UserRole.ADMIN) {
      query.allowedRoles = { $in: [userRole] };
    }
    const models = await ModelConfig.find(query).select("-apiKey");
    res.json({
      message: "Available models retrieved successfully",
      count: models.length,
      models,
    });
  } catch (error) {
    next(error);
  }
});

// Get available models for the authenticated user
router.get("/models", authenticate, async (req, res, next) => {
  try {
    const userRole = req.user.role;

    // Find models available for user's role - use $in for array matching
    let query = { isActive: true };

    // Admins see all active models, other roles see only allowed ones
    if (userRole !== UserRole.ADMIN) {
      query.allowedRoles = { $in: [userRole] };
    }

    const models = await ModelConfig.find(query).select("-apiKey"); // Exclude API key from response

    // Debug log
    console.log(
      `[GET /models] User role: ${userRole}, Found models: ${models.length}`,
    );

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

    // Admins should not access quota
    if (user.role === UserRole.ADMIN) {
      return res.status(403).json({
        error: "Forbidden",
        message:
          "Admin users do not have quota. Please use the admin dashboard.",
      });
    }

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

// Build MCQ prompt
function buildMCQPrompt(text, mcqCount, easy, medium, hard) {
  let difficultyPart = "";
  if (easy > 0 || medium > 0 || hard > 0) {
    difficultyPart = `\n\nPlease generate:
- ${easy} Easy questions (basic recall, straightforward)
- ${medium} Medium questions (understanding/application)
- ${hard} Hard questions (analysis/synthesis)\n`;
  }

  return (
    `Generate exactly ${mcqCount} multiple choice questions (MCQs) ONLY from the text below.` +
    difficultyPart +
    `\n\nRULES:\n` +
    `1. Output ONLY the questions - NO introductions, NO explanations, NO summaries, NO conclusions.\n` +
    `2. Do NOT write phrases like 'Here are', 'Based on', 'Below are', 'Thank you', etc.\n` +
    `3. Each question must have: question number, question text, 4 options (A, B, C, D), and the correct answer.\n` +
    `4. If the text doesn't contain enough information, generate fewer questions but never add external information.\n` +
    `5. Generate EXACTLY ${mcqCount} questions - no more, no less.\n\n` +
    `TEXT:\n${text}\n\n` +
    `MCQs (exactly ${mcqCount}):\n`
  );
}

// Call AI model to generate MCQs
async function callAIModel(provider, model, apiKey, prompt, temperature = 0.7) {
  const providers = {
    // Local Ollama
    local: async () => {
      const response = await axios.post(
        "http://localhost:11434/api/generate",
        {
          model: model,
          prompt: prompt,
          options: { temperature, num_ctx: 131072 },
          stream: false,
        },
        { timeout: 300000 }, // 5 minutes buffer
      );
      return response.data.response;
    },
    // OpenRouter
    openrouter: async () => {
      const response = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          model: model,
          messages: [{ role: "user", content: prompt }],
          temperature: temperature,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://mcq-generator.local",
            "X-Title": "MCQ Generator",
          },
          timeout: 180000,
        },
      );
      return response.data.choices[0].message.content;
    },
    // OpenAI
    openai: async () => {
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: model,
          messages: [{ role: "user", content: prompt }],
          temperature: temperature,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 180000,
        },
      );
      return response.data.choices[0].message.content;
    },
    // Google Gemini
    gemini: async () => {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature },
        },
        { timeout: 180000 },
      );
      return response.data.candidates[0].content.parts[0].text;
    },
    // HuggingFace
    huggingface: async () => {
      const response = await axios.post(
        `https://api-inference.huggingface.co/models/${model}`,
        {
          inputs: prompt,
          parameters: { temperature, max_new_tokens: 4096 },
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 180000,
        },
      );
      if (Array.isArray(response.data) && response.data.length > 0) {
        return response.data[0].generated_text;
      }
      return String(response.data);
    },
    // Claude
    claude: async () => {
      const response = await axios.post(
        "https://api.anthropic.com/v1/messages",
        {
          model: model,
          messages: [{ role: "user", content: prompt }],
          temperature: temperature,
          max_tokens: 4096,
        },
        {
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          },
          timeout: 180000,
        },
      );
      return response.data.content[0].text;
    },
  };

  try {
    const providerKey = provider?.toLowerCase();
    
    // Alias "ollama" to "local"
    const actualProvider = providerKey === "ollama" ? "local" : providerKey;
    
    if (!providers[actualProvider]) {
      throw new Error(`Unsupported provider: ${provider}`);
    }

    return await providers[actualProvider]();
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const errorData = error.response?.data;
      const message = errorData?.error?.message || errorData?.message || (typeof errorData === 'string' ? errorData : error.message);
      
      console.error(`AI Provider Error [${provider}]:`, {
        status,
        message,
        data: errorData
      });
      
      const newError = new Error(`AI Provider Error (${provider}): ${message}`);
      newError.status = status || 502;
      newError.details = errorData;
      throw newError;
    }
    throw error;
  }
}

// Generate MCQs from text (requires authentication)
router.post("/", authenticate, async (req, res, next) => {
  try {
    const user = req.user;

    // Admins are allowed to generate MCQs

    const {
      text,
      numQuestions,
      modelId,
      provider,
      easy = 0,
      medium = 0,
      hard = 0,
    } = req.body;

    // Validate text input
    if (!text || !text.trim()) {
      return res.status(400).json({
        error: "Validation Error",
        message: "Text content is required",
      });
    }

    // Validate number of questions
    const totalQuestions =
      (parseInt(easy) || 0) + (parseInt(medium) || 0) + (parseInt(hard) || 0);
    if (totalQuestions < 1) {
      return res.status(400).json({
        error: "Validation Error",
        message: "Number of questions must be at least 1",
      });
    }

    // Check quota for free users
    const quotaCheck = user.hasQuota(totalQuestions);
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
    let query = { isActive: true };
    if (user.role !== UserRole.ADMIN) {
      query.allowedRoles = { $in: [user.role] };
    }
    const availableModels = await ModelConfig.find(query).select("+apiKey");

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

    // Generate MCQs
    const startTime = Date.now();

    try {
      const prompt = buildMCQPrompt(
        text,
        totalQuestions,
        parseInt(easy) || 0,
        parseInt(medium) || 0,
        parseInt(hard) || 0,
      );

      const generatedOutput = await callAIModel(
        selectedModel.provider,
        selectedModel.modelId,
        selectedModel.apiKey,
        prompt,
        0.7,
      );

      const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);

      // Increment quota for free users
      if (user.role === UserRole.FREE) {
        await user.incrementQuota(totalQuestions);
      }

      res.json({
        message: "MCQ generated successfully",
        quota: {
          used:
            user.quotaUsed + (user.role === UserRole.FREE ? totalQuestions : 0),
          limit: user.quotaLimit,
          remaining:
            user.role === UserRole.FREE
              ? user.quotaLimit - user.quotaUsed - totalQuestions
              : "unlimited",
        },
        model: {
          id: selectedModel._id,
          name: selectedModel.name,
          provider: selectedModel.provider,
          modelId: selectedModel.modelId,
        },
        generated: {
          count: totalQuestions,
          output: generatedOutput,
          processing_time: processingTime,
        },
        model_used: selectedModel.name,
        provider: selectedModel.provider,
        total_chunks: 1,
        generated_output: generatedOutput,
        processing_time: processingTime,
      });
    } catch (aiError) {
      console.error("AI generation error:", aiError.message);

      if (aiError.code === "ECONNREFUSED") {
        return res.status(503).json({
          error: "Service Unavailable",
          message:
            "Cannot connect to AI service. Make sure Ollama is running or check your API key.",
        });
      }

      throw aiError;
    }
  } catch (error) {
    next(error);
  }
});

// Generate MCQs from text (POST /generate/generate-text)
router.post("/generate-text", authenticate, async (req, res, next) => {
  try {
    const user = req.user;

    // Admins are allowed to generate MCQs

    const {
      text,
      prompt,
      model_name,
      provider,
      api_key,
      temperature = 0.5,
      mcq_count = 10,
      easy = 0,
      medium = 0,
      hard = 0,
    } = req.body;

    // Validate text input
    if (!text || !text.trim()) {
      return res.status(400).json({
        error: "Validation Error",
        message: "Text content is required",
      });
    }

    const totalQuestions =
      mcq_count ||
      (parseInt(easy) || 0) + (parseInt(medium) || 0) + (parseInt(hard) || 0);

    if (totalQuestions < 1) {
      return res.status(400).json({
        error: "Validation Error",
        message: "Number of questions must be at least 1",
      });
    }

    // Check quota for free users
    const quotaCheck = user.hasQuota(totalQuestions);
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
    let query = { isActive: true };
    if (user.role !== UserRole.ADMIN) {
      query.allowedRoles = { $in: [user.role] };
    }
    const availableModels = await ModelConfig.find(query).select("+apiKey");

    // Find selected model
    let selectedModel = availableModels.find(
      (m) => m.modelId === model_name || m.provider === provider,
    );

    if (!selectedModel) {
      selectedModel = availableModels[0];
    }

    if (!selectedModel) {
      return res.status(400).json({
        error: "No Models Available",
        message: "No models are available for your account.",
      });
    }

    // Generate MCQs
    const startTime = Date.now();

    try {
      const fullPrompt = buildMCQPrompt(
        text,
        totalQuestions,
        parseInt(easy) || 0,
        parseInt(medium) || 0,
        parseInt(hard) || 0,
      );

      const generatedOutput = await callAIModel(
        selectedModel.provider,
        selectedModel.modelId,
        api_key || selectedModel.apiKey,
        fullPrompt,
        temperature,
      );

      const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);

      // Increment quota for free users
      if (user.role === UserRole.FREE) {
        await user.incrementQuota(totalQuestions);
      }

      res.json({
        message: "MCQ generated successfully",
        quota: {
          used:
            user.quotaUsed + (user.role === UserRole.FREE ? totalQuestions : 0),
          limit: user.quotaLimit,
          remaining:
            user.role === UserRole.FREE
              ? user.quotaLimit - user.quotaUsed - totalQuestions
              : "unlimited",
        },
        model_used: selectedModel.name,
        provider: selectedModel.provider,
        total_chunks: 1,
        generated_output: generatedOutput,
        processing_time: processingTime,
      });
    } catch (aiError) {
      console.error("AI generation error:", aiError.message);

      if (aiError.code === "ECONNREFUSED") {
        return res.status(503).json({
          error: "Service Unavailable",
          message:
            "Cannot connect to AI service. Make sure Ollama is running or check your API key.",
        });
      }

      throw aiError;
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

      // Extract text from uploaded files using pdf-parse
      const extractedTexts = {};
      let totalTextLength = 0;

      for (const file of req.files) {
        try {
          let text = "";

          // Check if file is PDF
          if (
            file.mimetype === "application/pdf" ||
            file.originalname.toLowerCase().endsWith(".pdf")
          ) {
            try {
              const pdfParse = (await import("pdf-parse")).default;
              const dataBuffer = await fs.promises.readFile(file.path);
              const pdfData = await pdfParse(dataBuffer);
              text = pdfData.text;
            } catch (pdfError) {
              console.error("PDF parsing error:", pdfError);
              text = `[Error parsing PDF: ${file.originalname}]`;
            }
          } else {
            // For images, return a message (OCR would require tesseract.js)
            text = `[Image file: ${file.originalname} - OCR not implemented in Node.js version]`;
          }

          extractedTexts[file.originalname] = text;
          totalTextLength += text.length;
        } catch (e) {
          extractedTexts[file.originalname] = `[Error: ${e.message}]`;
        }
      }

      res.json({
        message: "File uploaded and text extracted successfully",
        extracted_texts: extractedTexts,
        files_processed: req.files.length,
        total_text_length: totalTextLength,
      });
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

    res.json({
      message: "Streaming MCQ generation endpoint",
      note: "This endpoint requires integration with AI model for streaming responses",
    });
  } catch (error) {
    next(error);
  }
});

export default router;
