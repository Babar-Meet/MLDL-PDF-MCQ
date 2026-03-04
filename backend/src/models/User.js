/**
 * User model schema for MongoDB using Mongoose.
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

/**
 * User role enumeration
 */
const UserRole = {
  ADMIN: "admin",
  PAID: "paid",
  FREE: "free",
};

/**
 * User schema definition
 */
const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters long"],
      select: false, // Don't include password in queries by default
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.FREE,
    },
    // Quota tracking for MCQ generation
    quotaUsed: {
      type: Number,
      default: 0,
    },
    quotaLimit: {
      type: Number,
      default: 10, // Free users get 10 MCQs by default
    },
    lastQuotaReset: {
      type: Date,
      default: Date.now,
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
        delete ret.password;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.password;
        return ret;
      },
    },
  },
);

// Note: Email index is automatically created by unique: true in schema

/**
 * Hash password before saving
 */
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Compare password method
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Check if user has enough quota for requested MCQs
 */
userSchema.methods.hasQuota = function (requestedMCQs) {
  // Admins have unlimited quota
  if (this.role === UserRole.ADMIN) {
    return { allowed: true, remaining: Infinity };
  }

  // Paid users have unlimited quota
  if (this.role === UserRole.PAID) {
    return { allowed: true, remaining: Infinity };
  }

  // Free users have limited quota
  const remaining = this.quotaLimit - this.quotaUsed;
  return {
    allowed: remaining >= requestedMCQs,
    remaining: remaining,
    limit: this.quotaLimit,
  };
};

/**
 * Increment quota usage
 */
userSchema.methods.incrementQuota = async function (mcqsGenerated) {
  this.quotaUsed += mcqsGenerated;
  await this.save();
};

/**
 * Reset quota (for monthly reset)
 */
userSchema.methods.resetQuota = async function () {
  this.quotaUsed = 0;
  this.lastQuotaReset = new Date();
  await this.save();
};

/**
 * Static method to find user by email
 */
userSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase() });
};

/**
 * Virtual for user response (excludes password)
 */
userSchema.virtual("userResponse").get(function () {
  return {
    id: this._id,
    email: this.email,
    role: this.role,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
});

const User = mongoose.model("User", userSchema);

export { User, UserRole };
export default User;
