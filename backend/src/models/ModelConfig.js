/**
 * Model configuration schema for MongoDB using Mongoose.
 */

import mongoose from "mongoose";

/**
 * Model provider enumeration
 */
const ModelProvider = {
  OLLAMA: "ollama",
  OPENROUTER: "openrouter",
  HUGGINGFACE: "huggingface",
  GEMINI: "gemini",
};

/**
 * User role enumeration (same as User model)
 */
const UserRole = {
  ADMIN: "admin",
  PAID: "paid",
  FREE: "free",
};

/**
 * ModelConfig schema definition
 */
const modelConfigSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Configuration name is required"],
      unique: true,
      trim: true,
    },
    provider: {
      type: String,
      enum: Object.values(ModelProvider),
      required: [true, "Provider is required"],
    },
    apiKey: {
      type: String,
      default: "", // Optional - some providers like Ollama don't need API keys
      select: false, // Don't include API key in queries by default
    },
    modelId: {
      type: String,
      required: [true, "Model ID is required"],
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isFree: {
      type: Boolean,
      default: false,
    },
    allowedRoles: {
      type: [String],
      enum: Object.values(UserRole),
      default: [UserRole.FREE, UserRole.PAID, UserRole.ADMIN],
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.apiKey;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.apiKey;
        return ret;
      },
    },
  },
);

// Note: Name index is automatically created by unique: true in schema
// Additional indexes for efficient querying
modelConfigSchema.index({ provider: 1 });
modelConfigSchema.index({ isActive: 1 });

/**
 * Static method to find active models
 */
modelConfigSchema.statics.findActive = function () {
  return this.find({ isActive: true });
};

/**
 * Static method to find models by provider
 */
modelConfigSchema.statics.findByProvider = function (provider) {
  return this.find({ provider, isActive: true });
};

/**
 * Static method to find models accessible by role
 */
modelConfigSchema.statics.findAccessibleByRole = function (role) {
  return this.find({
    isActive: true,
    allowedRoles: role,
  });
};

/**
 * Static method to find free models
 */
modelConfigSchema.statics.findFreeModels = function () {
  return this.find({ isActive: true, isFree: true });
};

const ModelConfig = mongoose.model("ModelConfig", modelConfigSchema);

export { ModelConfig, ModelProvider, UserRole };
export default ModelConfig;
