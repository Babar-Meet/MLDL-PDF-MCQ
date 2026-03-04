/**
 * Model configuration routes.
 */

import express from 'express';
import { body, validationResult, param } from 'express-validator';
import ModelConfig from '../models/ModelConfig.js';

const router = express.Router();

// Validation middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation Error',
      details: errors.array()
    });
  }
  next();
};

// Get all model configurations
router.get('/', async (req, res, next) => {
  try {
    const { provider, active, free } = req.query;
    
    let query = {};
    
    if (provider) {
      query.provider = provider;
    }
    
    if (active !== undefined) {
      query.isActive = active === 'true';
    }
    
    if (free !== undefined) {
      query.isFree = free === 'true';
    }
    
    const models = await ModelConfig.find(query);
    
    res.json({
      message: 'Model configurations retrieved successfully',
      count: models.length,
      models
    });
  } catch (error) {
    next(error);
  }
});

// Get models by provider
router.get('/provider/:provider', [
  param('provider').isIn(['ollama', 'openrouter', 'huggingface', 'gemini'])
    .withMessage('Invalid provider')
], validateRequest, async (req, res, next) => {
  try {
    const { provider } = req.params;
    const models = await ModelConfig.findByProvider(provider);
    
    res.json({
      message: `Models for ${provider} retrieved successfully`,
      count: models.length,
      models
    });
  } catch (error) {
    next(error);
  }
});

// Get active/free models
router.get('/active', async (req, res, next) => {
  try {
    const models = await ModelConfig.findActive();
    
    res.json({
      message: 'Active models retrieved successfully',
      count: models.length,
      models
    });
  } catch (error) {
    next(error);
  }
});

router.get('/free', async (req, res, next) => {
  try {
    const models = await ModelConfig.findFreeModels();
    
    res.json({
      message: 'Free models retrieved successfully',
      count: models.length,
      models
    });
  } catch (error) {
    next(error);
  }
});

// Get model configuration by ID
router.get('/:id', [
  param('id').isMongoId().withMessage('Invalid model ID')
], validateRequest, async (req, res, next) => {
  try {
    const { id } = req.params;
    const model = await ModelConfig.findById(id);
    
    if (!model) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Model configuration not found'
      });
    }
    
    res.json({
      message: 'Model configuration retrieved successfully',
      model
    });
  } catch (error) {
    next(error);
  }
});

// Create model configuration
router.post('/', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('provider').isIn(['ollama', 'openrouter', 'huggingface', 'gemini'])
    .withMessage('Invalid provider'),
  body('apiKey').notEmpty().withMessage('API key is required'),
  body('modelId').trim().notEmpty().withMessage('Model ID is required'),
  body('isActive').optional().isBoolean(),
  body('isFree').optional().isBoolean(),
  body('allowedRoles').optional().isArray()
], validateRequest, async (req, res, next) => {
  try {
    const { name, provider, apiKey, modelId, isActive, isFree, allowedRoles } = req.body;
    
    // Check if model with name already exists
    const existingModel = await ModelConfig.findOne({ name });
    if (existingModel) {
      return res.status(400).json({
        error: 'Conflict',
        message: 'Model configuration with this name already exists'
      });
    }
    
    const model = new ModelConfig({
      name,
      provider,
      apiKey,
      modelId,
      isActive: isActive ?? true,
      isFree: isFree ?? false,
      allowedRoles: allowedRoles ?? ['free', 'paid', 'admin']
    });
    
    await model.save();
    
    res.status(201).json({
      message: 'Model configuration created successfully',
      model
    });
  } catch (error) {
    next(error);
  }
});

// Update model configuration
router.put('/:id', [
  param('id').isMongoId().withMessage('Invalid model ID'),
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('provider').optional().isIn(['ollama', 'openrouter', 'huggingface', 'gemini'])
    .withMessage('Invalid provider'),
  body('apiKey').optional().notEmpty().withMessage('API key cannot be empty'),
  body('modelId').optional().trim().notEmpty().withMessage('Model ID cannot be empty'),
  body('isActive').optional().isBoolean(),
  body('isFree').optional().isBoolean(),
  body('allowedRoles').optional().isArray()
], validateRequest, async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    
    // Remove apiKey from update if not provided
    if (updateData.apiKey === '') {
      delete updateData.apiKey;
    }
    
    const model = await ModelConfig.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!model) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Model configuration not found'
      });
    }
    
    res.json({
      message: 'Model configuration updated successfully',
      model
    });
  } catch (error) {
    next(error);
  }
});

// Delete model configuration
router.delete('/:id', [
  param('id').isMongoId().withMessage('Invalid model ID')
], validateRequest, async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const model = await ModelConfig.findByIdAndDelete(id);
    
    if (!model) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Model configuration not found'
      });
    }
    
    res.json({
      message: 'Model configuration deleted successfully',
      model
    });
  } catch (error) {
    next(error);
  }
});

export default router;
