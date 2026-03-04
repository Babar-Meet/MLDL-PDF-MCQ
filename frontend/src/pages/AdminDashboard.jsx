import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Bot,
  Shield,
  Plus,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Loader2,
  AlertCircle,
  Home,
  BarChart3,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { selectUser, selectIsAdmin, selectAuthLoading } from '../store/authSlice';
import {
  getAllModelsAdmin,
  createModel,
  updateModel,
  deleteModel,
  toggleModelStatus,
} from '../services/api';
import ModelForm from '../components/ModelForm';

// Provider display names
const PROVIDER_NAMES = {
  ollama: 'Ollama (Local)',
  openrouter: 'OpenRouter',
  huggingface: 'HuggingFace',
  gemini: 'Gemini',
};

// User role display names
const ROLE_NAMES = {
  free: 'Free User',
  paid: 'Paid User',
  admin: 'Admin',
};

const AdminDashboard = () => {
  const user = useSelector(selectUser);
  const isAdmin = useSelector(selectIsAdmin);
  const authLoading = useSelector(selectAuthLoading);

  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Model form state
  const [showModelForm, setShowModelForm] = useState(false);
  const [editingModel, setEditingModel] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  // Check if user is admin
  if (!authLoading && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  // Load models on mount
  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    setLoading(true);
    setError(null);
    try {
      const modelsData = await getAllModelsAdmin();
      setModels(modelsData || []);
    } catch (err) {
      console.error('Failed to load models:', err);
      setError(err.message || 'Failed to load models');
    } finally {
      setLoading(false);
    }
  };

  // Show success message
  const showSuccess = (message) => {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 3000);
  };

  // Show error message
  const showError = (message) => {
    setError(message);
    setTimeout(() => setError(null), 5000);
  };

  // Handle model create/update
  const handleModelSubmit = async (modelData) => {
    setFormLoading(true);
    try {
      if (editingModel) {
        const updated = await updateModel(editingModel.id, modelData);
        setModels((prev) =>
          prev.map((m) => (m.id === editingModel.id ? updated : m))
        );
        showSuccess('Model updated successfully');
      } else {
        const created = await createModel(modelData);
        setModels((prev) => [...prev, created]);
        showSuccess('Model created successfully');
      }
      setShowModelForm(false);
      setEditingModel(null);
    } catch (err) {
      showError(err.message || 'Failed to save model');
    } finally {
      setFormLoading(false);
    }
  };

  // Handle model delete
  const handleDeleteModel = async (modelId) => {
    if (!window.confirm('Are you sure you want to delete this model?')) return;

    try {
      await deleteModel(modelId);
      setModels((prev) => prev.filter((m) => m.id !== modelId));
      showSuccess('Model deleted successfully');
    } catch (err) {
      showError(err.message || 'Failed to delete model');
    }
  };

  // Handle model status toggle
  const handleToggleModelStatus = async (modelId) => {
    try {
      const updated = await toggleModelStatus(modelId);
      setModels((prev) =>
        prev.map((m) => (m.id === modelId ? updated : m))
      );
      showSuccess(
        `Model ${updated.isActive ? 'activated' : 'deactivated'} successfully`
      );
    } catch (err) {
      showError(err.message || 'Failed to toggle model status');
    }
  };

  // Open edit model form
  const handleEditModel = (model) => {
    setEditingModel(model);
    setShowModelForm(true);
  };

  // Close model form
  const handleCloseModelForm = () => {
    setShowModelForm(false);
    setEditingModel(null);
  };

  // Stats calculation
  const stats = {
    totalModels: models.length,
    activeModels: models.filter((m) => m.isActive).length,
    freeModels: models.filter((m) => m.isFree).length,
    paidModels: models.filter((m) => !m.isFree).length,
  };

  // Render overview
  const renderOverview = () => (
    <div className="admin-overview">
      <h2>Model Dashboard</h2>

      <div className="stats-grid">
        <div className="stat-card">
          <div
            className="stat-icon"
            style={{ backgroundColor: '#10b98120', color: '#10b981' }}
          >
            <Bot size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.totalModels}</span>
            <span className="stat-label">Total Models</span>
          </div>
        </div>

        <div className="stat-card">
          <div
            className="stat-icon"
            style={{ backgroundColor: '#3b82f620', color: '#3b82f6' }}
          >
            <Shield size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.activeModels}</span>
            <span className="stat-label">Active Models</span>
          </div>
        </div>

        <div className="stat-card">
          <div
            className="stat-icon"
            style={{ backgroundColor: '#8b5cf620', color: '#8b5cf6' }}
          >
            <CheckCircle size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.freeModels}</span>
            <span className="stat-label">Free Models</span>
          </div>
        </div>

        <div className="stat-card">
          <div
            className="stat-icon"
            style={{ backgroundColor: '#f59e0b20', color: '#f59e0b' }}
          >
            <XCircle size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.paidModels}</span>
            <span className="stat-label">Paid Models</span>
          </div>
        </div>
      </div>

      <div className="quick-info">
        <h3>Quick Tips</h3>
        <ul>
          <li>Add Ollama models for free local generation</li>
          <li>Configure OpenRouter API keys for cloud models</li>
          <li>Set allowed roles to control which users can access each model</li>
          <li>Deactivate models instead of deleting to preserve settings</li>
        </ul>
      </div>
    </div>
  );

  // Render models tab
  const renderModels = () => (
    <div className="admin-models">
      <div className="models-header">
        <h3>
          <Bot size={20} />
          Model Configurations ({models.length})
        </h3>
        <button className="btn-primary" onClick={() => setShowModelForm(true)}>
          <Plus size={16} />
          Add Model
        </button>
      </div>

      {loading ? (
        <div className="loading-container">
          <Loader2 size={32} className="spinner" />
          <span>Loading models...</span>
        </div>
      ) : models.length === 0 ? (
        <div className="empty-state">
          <Bot size={48} className="empty-icon" />
          <h3>No Models Configured</h3>
          <p>Add your first model to get started.</p>
          <button
            className="btn-primary"
            onClick={() => setShowModelForm(true)}
          >
            <Plus size={16} />
            Add Model
          </button>
        </div>
      ) : (
        <div className="models-grid">
          {models.map((model) => (
            <div
              key={model.id}
              className={`model-card ${!model.isActive ? 'inactive' : ''}`}
            >
              <div className="model-card-header">
                <div className="model-info">
                  <h4>{model.name}</h4>
                  <span className="model-provider">
                    {PROVIDER_NAMES[model.provider] || model.provider}
                  </span>
                </div>
                <button
                  className={`toggle-btn ${model.isActive ? 'active' : ''}`}
                  onClick={() => handleToggleModelStatus(model.id)}
                  title={
                    model.isActive ? 'Deactivate model' : 'Activate model'
                  }
                >
                  {model.isActive ? (
                    <ToggleRight size={24} />
                  ) : (
                    <ToggleLeft size={24} />
                  )}
                </button>
              </div>

              <div className="model-card-body">
                <div className="model-detail">
                  <span className="detail-label">Model ID:</span>
                  <span className="detail-value">{model.modelId}</span>
                </div>
                <div className="model-detail">
                  <span className="detail-label">Type:</span>
                  <span className={`detail-badge ${model.isFree ? 'free' : 'paid'}`}>
                    {model.isFree ? 'Free' : 'Paid'}
                  </span>
                </div>
                <div className="model-detail">
                  <span className="detail-label">Allowed Roles:</span>
                  <span className="detail-value">
                    {model.allowedRoles?.map((r) => ROLE_NAMES[r] || r).join(', ') || 'All'}
                  </span>
                </div>
              </div>

              <div className="model-card-actions">
                <button
                  className="action-btn edit"
                  onClick={() => handleEditModel(model)}
                  title="Edit model"
                >
                  <Edit size={16} />
                  Edit
                </button>
                <button
                  className="action-btn delete"
                  onClick={() => handleDeleteModel(model.id)}
                  title="Delete model"
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (authLoading) {
    return (
      <div className="admin-loading">
        <div className="loading-spinner"></div>
        <p>Loading admin dashboard...</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="sidebar-header">
          <Shield size={24} />
          <span>Admin Panel</span>
        </div>

        <nav className="sidebar-nav">
          <button
            className="nav-item active"
          >
            <BarChart3 size={18} />
            <span>Models</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <a href="/" className="back-link">
            <Home size={16} />
            <span>Back to Home</span>
          </a>
        </div>
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        {/* Messages */}
        {error && (
          <div className="alert alert-error">
            <AlertCircle size={18} />
            <span>{error}</span>
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            <AlertCircle size={18} />
            <span>{success}</span>
            <button onClick={() => setSuccess(null)}>×</button>
          </div>
        )}

        {/* Content */}
        <div className="admin-content">
          {renderModels()}
        </div>
      </main>

      {/* Model Form Modal */}
      {showModelForm && (
        <ModelForm
          model={editingModel}
          onSubmit={handleModelSubmit}
          onCancel={handleCloseModelForm}
          loading={formLoading}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
