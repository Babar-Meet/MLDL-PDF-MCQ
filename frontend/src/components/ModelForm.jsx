import React, { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';

// Provider options
const PROVIDERS = [
  { value: 'ollama', label: 'Ollama (Local)' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'huggingface', label: 'HuggingFace' },
  { value: 'gemini', label: 'Google Gemini' },
];

// Role options
const ROLES = [
  { value: 'free', label: 'Free' },
  { value: 'paid', label: 'Paid' },
  { value: 'admin', label: 'Admin' },
];

const ModelForm = ({ model, onSubmit, onCancel, loading }) => {
  const [formData, setFormData] = useState({
    name: '',
    provider: 'ollama',
    apiKey: '',
    modelId: '',
    isFree: true,
    allowedRoles: ['free'],
  });

  const [errors, setErrors] = useState({});

  // Populate form if editing existing model
  useEffect(() => {
    if (model) {
      setFormData({
        name: model.name || '',
        provider: model.provider || 'ollama',
        apiKey: model.apiKey || '',
        modelId: model.modelId || '',
        isFree: model.isFree !== undefined ? model.isFree : true,
        allowedRoles: model.allowedRoles || ['free'],
      });
    }
  }, [model]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    // Clear error when field is modified
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleRoleToggle = (role) => {
    setFormData(prev => {
      const currentRoles = prev.allowedRoles;
      if (currentRoles.includes(role)) {
        // Don't allow removing last role
        if (currentRoles.length === 1) return prev;
        return { ...prev, allowedRoles: currentRoles.filter(r => r !== role) };
      } else {
        return { ...prev, allowedRoles: [...currentRoles, role] };
      }
    });
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Model name is required';
    }
    
    if (!formData.provider) {
      newErrors.provider = 'Provider is required';
    }
    
    if (!formData.modelId.trim()) {
      newErrors.modelId = 'Model ID is required';
    }

    // For non-local providers, API key is required
    if (formData.provider !== 'ollama' && !formData.apiKey.trim()) {
      newErrors.apiKey = 'API key is required for this provider';
    }
    
    if (formData.allowedRoles.length === 0) {
      newErrors.allowedRoles = 'At least one role must be selected';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    // Prepare data for submission
    const submitData = {
      name: formData.name.trim(),
      provider: formData.provider,
      modelId: formData.modelId.trim(),
      isFree: formData.isFree,
      allowedRoles: formData.allowedRoles,
    };
    
    // Only include apiKey if provided (don't send empty string)
    if (formData.apiKey.trim()) {
      submitData.apiKey = formData.apiKey.trim();
    }
    
    onSubmit(submitData);
  };

  return (
    <div className="model-form-overlay">
      <div className="model-form-container">
        <div className="model-form-header">
          <h2>{model ? 'Edit Model' : 'Add New Model'}</h2>
          <button className="close-btn" onClick={onCancel} disabled={loading}>
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="model-form">
          {/* Model Name */}
          <div className="form-group">
            <label htmlFor="name">Model Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Llama 2 7B"
              disabled={loading}
              className={errors.name ? 'error' : ''}
            />
            {errors.name && <span className="error-text">{errors.name}</span>}
          </div>
          
          {/* Provider */}
          <div className="form-group">
            <label htmlFor="provider">Provider *</label>
            <select
              id="provider"
              name="provider"
              value={formData.provider}
              onChange={handleChange}
              disabled={loading}
              className={errors.provider ? 'error' : ''}
            >
              {PROVIDERS.map(provider => (
                <option key={provider.value} value={provider.value}>
                  {provider.label}
                </option>
              ))}
            </select>
            {errors.provider && <span className="error-text">{errors.provider}</span>}
          </div>
          
          {/* Model ID */}
          <div className="form-group">
            <label htmlFor="modelId">Model ID *</label>
            <input
              type="text"
              id="modelId"
              name="modelId"
              value={formData.modelId}
              onChange={handleChange}
              placeholder="e.g., llama2, gpt-3.5-turbo"
              disabled={loading}
              className={errors.modelId ? 'error' : ''}
            />
            {errors.modelId && <span className="error-text">{errors.modelId}</span>}
          </div>
          
          {/* API Key */}
          <div className="form-group">
            <label htmlFor="apiKey">
              API Key {formData.provider !== 'ollama' && '*'}
            </label>
            <input
              type="password"
              id="apiKey"
              name="apiKey"
              value={formData.apiKey}
              onChange={handleChange}
              placeholder={formData.provider === 'ollama' ? 'Optional (for local)' : 'Enter API key'}
              disabled={loading}
              className={errors.apiKey ? 'error' : ''}
            />
            {errors.apiKey && <span className="error-text">{errors.apiKey}</span>}
            <span className="help-text">
              {formData.provider === 'ollama' 
                ? 'Leave empty for local Ollama instance' 
                : 'Required for external providers'}
            </span>
          </div>
          
          {/* Free Toggle */}
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="isFree"
                checked={formData.isFree}
                onChange={handleChange}
                disabled={loading}
              />
              <span>Free Model</span>
            </label>
            <span className="help-text">
              Free models are available to all users; paid models require subscription
            </span>
          </div>
          
          {/* Allowed Roles */}
          <div className="form-group">
            <label>Allowed Roles *</label>
            <div className="role-checkboxes">
              {ROLES.filter(r => r.value !== 'admin').map(role => (
                <label key={role.value} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.allowedRoles.includes(role.value)}
                    onChange={() => handleRoleToggle(role.value)}
                    disabled={loading || (formData.allowedRoles.length === 1 && formData.allowedRoles.includes(role.value))}
                  />
                  <span>{role.label}</span>
                </label>
              ))}
            </div>
            {errors.allowedRoles && (
              <span className="error-text">{errors.allowedRoles}</span>
            )}
          </div>
          
          {/* Form Actions */}
          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="spinner" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} />
                  {model ? 'Update Model' : 'Create Model'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModelForm;
