import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
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
  Users,
  Key,
  LogOut,
} from "lucide-react";
import {
  selectUser,
  selectIsAdmin,
  selectAuthLoading,
  logoutUser,
} from "../store/authSlice";
import {
  getAllModelsAdmin,
  createModel,
  updateModel,
  deleteModel,
  toggleModelStatus,
  getAllUsers,
  updateUserRole,
  saveApiKey,
  getApiKey,
} from "../services/api";
import ModelForm from "../components/ModelForm";
import UserList from "../components/UserList";

// Provider display names
const PROVIDER_NAMES = {
  ollama: "Ollama (Local)",
  openrouter: "OpenRouter",
  huggingface: "HuggingFace",
  gemini: "Gemini",
};

// User role display names
const ROLE_NAMES = {
  free: "Free User",
  paid: "Paid User",
  admin: "Admin",
};

const AdminDashboard = () => {
  const dispatch = useDispatch();
  const currentUser = useSelector(selectUser);
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

  // Tab state
  const [activeTab, setActiveTab] = useState("models");

  // Users state
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // API Keys state
  const [apiKeys, setApiKeys] = useState({});
  const [apiKeysLoading, setApiKeysLoading] = useState(false);
  const [providerKeys, setProviderKeys] = useState({
    openai: "",
    openrouter: "",
    huggingface: "",
    gemini: "",
  });
  const [savingKey, setSavingKey] = useState(null);

  // Check if user is admin
  if (!authLoading && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  // Load models on mount
  useEffect(() => {
    loadModels();
  }, []);

  // Load data based on active tab
  useEffect(() => {
    if (activeTab === "users") {
      loadUsers();
    } else if (activeTab === "apikeys") {
      loadApiKeys();
    }
  }, [activeTab]);

  const loadModels = async () => {
    setLoading(true);
    setError(null);
    try {
      const modelsData = await getAllModelsAdmin();
      setModels(modelsData || []);
    } catch (err) {
      console.error("Failed to load models:", err);
      setError(err.message || "Failed to load models");
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
          prev.map((m) => (m.id === editingModel.id ? updated : m)),
        );
        showSuccess("Model updated successfully");
      } else {
        const created = await createModel(modelData);
        setModels((prev) => [...prev, created]);
        showSuccess("Model created successfully");
      }
      setShowModelForm(false);
      setEditingModel(null);
    } catch (err) {
      showError(err.message || "Failed to save model");
    } finally {
      setFormLoading(false);
    }
  };

  // Handle model delete
  const handleDeleteModel = async (modelId) => {
    if (!window.confirm("Are you sure you want to delete this model?")) return;

    try {
      await deleteModel(modelId);
      setModels((prev) => prev.filter((m) => m.id !== modelId));
      showSuccess("Model deleted successfully");
    } catch (err) {
      showError(err.message || "Failed to delete model");
    }
  };

  // Handle model status toggle
  const handleToggleModelStatus = async (modelId) => {
    try {
      const updated = await toggleModelStatus(modelId);
      setModels((prev) => prev.map((m) => (m.id === modelId ? updated : m)));
      showSuccess(
        `Model ${updated.isActive ? "activated" : "deactivated"} successfully`,
      );
    } catch (err) {
      showError(err.message || "Failed to toggle model status");
    }
  };

  // Handle model permission update
  const handlePermissionChange = async (modelId, field, value) => {
    try {
      const model = models.find((m) => m.id === modelId);
      if (!model) return;

      const updated = await updateModel(modelId, { [field]: value });
      setModels((prev) => prev.map((m) => (m.id === modelId ? updated : m)));
      showSuccess("Model permissions updated successfully");
    } catch (err) {
      showError(err.message || "Failed to update model permissions");
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

  // Load users
  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const usersData = await getAllUsers();
      setUsers(usersData.users || []);
    } catch (err) {
      console.error("Failed to load users:", err);
      showError(err.message || "Failed to load users");
    } finally {
      setUsersLoading(false);
    }
  };

  // Handle user role update
  const handleUpdateUserRole = async (userId, newRole) => {
    try {
      await updateUserRole(userId, newRole);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)),
      );
      showSuccess("User role updated successfully");
    } catch (err) {
      showError(err.message || "Failed to update user role");
    }
  };

  // Load API keys
  const loadApiKeys = async () => {
    setApiKeysLoading(true);
    try {
      // Load API keys for common providers
      const providers = ["openai", "openrouter", "huggingface", "gemini"];
      const keys = {};
      for (const provider of providers) {
        try {
          const keyData = await getApiKey(provider);
          keys[provider] = keyData.hasKey || false;
        } catch {
          keys[provider] = false;
        }
      }
      setApiKeys(keys);
    } catch (err) {
      console.error("Failed to load API keys:", err);
    } finally {
      setApiKeysLoading(false);
    }
  };

  // Handle API key save
  const handleSaveApiKey = async (provider) => {
    const key = providerKeys[provider]?.trim();
    if (!key) {
      showError("Please enter an API key");
      return;
    }
    setSavingKey(provider);
    try {
      await saveApiKey(provider, key);
      setApiKeys((prev) => ({ ...prev, [provider]: true }));
      setProviderKeys((prev) => ({ ...prev, [provider]: "" }));
      showSuccess(`${provider} API key saved successfully`);
    } catch (err) {
      showError(err.message || "Failed to save API key");
    } finally {
      setSavingKey(null);
    }
  };

  // Stats calculation
  const stats = {
    totalModels: models.length,
    activeModels: models.filter((m) => m.isActive).length,
    freeModels: models.filter((m) => m.isFree).length,
    paidModels: models.filter((m) => !m.isFree).length,
  };

  // Render users tab
  const renderUsers = () => (
    <div className="admin-users">
      <div className="users-header">
        <h3>
          <Users size={20} />
          User Management ({users.length})
        </h3>
      </div>

      {usersLoading ? (
        <div className="loading-container">
          <Loader2 size={32} className="spinner" />
          <span>Loading users...</span>
        </div>
      ) : users.length === 0 ? (
        <div className="empty-state">
          <Users size={48} className="empty-icon" />
          <h3>No Users Found</h3>
          <p>No users have registered yet.</p>
        </div>
      ) : (
        <div className="users-table">
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.email}</td>
                  <td>
                    <span className={`role-badge role-${user.role}`}>
                      {ROLE_NAMES[user.role] || user.role}
                    </span>
                  </td>
                  <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className="action-buttons">
                      <select
                        value={user.role}
                        onChange={(e) =>
                          handleUpdateUserRole(user.id, e.target.value)
                        }
                        className="role-select"
                        disabled={user.id === currentUser?.id || user.id === currentUser?._id}
                      >
                        <option value="free">Free</option>
                        <option value="paid">Paid</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // Render API keys tab
  const renderApiKeys = () => {
    const providers = [
      {
        key: "openai",
        name: "OpenAI",
        description: "GPT-4, GPT-3.5 Turbo models",
      },
      {
        key: "openrouter",
        name: "OpenRouter",
        description: "Unified API for 100+ AI models",
      },
      {
        key: "huggingface",
        name: "HuggingFace",
        description: "Open source LLMs and embeddings",
      },
      {
        key: "gemini",
        name: "Google Gemini",
        description: "Google's advanced AI models",
      },
    ];

    return (
      <div className="admin-apikeys">
        <div className="apikeys-header">
          <h3>
            <Key size={20} />
            API Keys Management
          </h3>
        </div>

        <p className="apikeys-description">
          Configure API keys for external AI providers. These keys will be used
          when users select these models. Each provider requires their own API
          key.
        </p>

        <div className="apikeys-grid">
          {providers.map((provider) => (
            <div
              key={provider.key}
              className="apikey-card"
              data-provider={provider.key}
            >
              <div className="apikey-card-header">
                <h4>{provider.name}</h4>
                <span
                  className={`status-badge ${apiKeys[provider.key] ? "status-active" : "status-inactive"}`}
                >
                  {apiKeys[provider.key] ? (
                    <>
                      <CheckCircle size={12} />
                      Configured
                    </>
                  ) : (
                    <>
                      <AlertCircle size={12} />
                      Not Set
                    </>
                  )}
                </span>
              </div>
              <p className="apikey-description">{provider.description}</p>
              <div className="apikey-input-group">
                <input
                  type="password"
                  placeholder={`Enter ${provider.name} API key`}
                  value={providerKeys[provider.key] || ""}
                  onChange={(e) =>
                    setProviderKeys((prev) => ({
                      ...prev,
                      [provider.key]: e.target.value,
                    }))
                  }
                  className="apikey-input"
                />
                <button
                  className="btn-primary"
                  onClick={() => handleSaveApiKey(provider.key)}
                  disabled={savingKey === provider.key}
                >
                  {savingKey === provider.key ? (
                    <Loader2 size={16} className="spinning" />
                  ) : (
                    "Save"
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render overview
  const renderOverview = () => (
    <div className="admin-overview">
      <h2>Model Dashboard</h2>

      <div className="stats-grid">
        <div className="stat-card">
          <div
            className="stat-icon"
            style={{ backgroundColor: "#10b98120", color: "#10b981" }}
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
            style={{ backgroundColor: "#3b82f620", color: "#3b82f6" }}
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
            style={{ backgroundColor: "#8b5cf620", color: "#8b5cf6" }}
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
            style={{ backgroundColor: "#f59e0b20", color: "#f59e0b" }}
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
          <li>
            Set allowed roles to control which users can access each model
          </li>
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
              className={`model-card ${!model.isActive ? "inactive" : ""}`}
            >
              <div className="model-card-header">
                <div className="model-info">
                  <h4>{model.name}</h4>
                  <span className="model-provider">
                    {PROVIDER_NAMES[model.provider] || model.provider}
                  </span>
                </div>
                <button
                  className={`toggle-btn ${model.isActive ? "active" : ""}`}
                  onClick={() => handleToggleModelStatus(model.id)}
                  title={model.isActive ? "Deactivate model" : "Activate model"}
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
                  <span className="detail-label">Access:</span>
                  <div className="permission-checkboxes">
                    <label className="permission-checkbox">
                      <input
                        type="checkbox"
                        checked={model.isFree || false}
                        onChange={(e) =>
                          handlePermissionChange(
                            model.id,
                            "isFree",
                            e.target.checked,
                          )
                        }
                      />
                      <span>Free</span>
                    </label>
                    <label className="permission-checkbox">
                      <input
                        type="checkbox"
                        checked={model.isPaid !== false}
                        onChange={(e) =>
                          handlePermissionChange(
                            model.id,
                            "isPaid",
                            e.target.checked,
                          )
                        }
                      />
                      <span>Paid</span>
                    </label>
                  </div>
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
            className={`nav-item ${activeTab === "models" ? "active" : ""}`}
            onClick={() => setActiveTab("models")}
          >
            <Bot size={18} />
            <span>Models</span>
          </button>
          <button
            className={`nav-item ${activeTab === "users" ? "active" : ""}`}
            onClick={() => setActiveTab("users")}
          >
            <Users size={18} />
            <span>Users</span>
          </button>
          <button
            className={`nav-item ${activeTab === "apikeys" ? "active" : ""}`}
            onClick={() => setActiveTab("apikeys")}
          >
            <Key size={18} />
            <span>API Keys</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <a href="/" className="back-link">
            <Home size={16} />
            <span>Back to Home</span>
          </a>
          <button className="logout-btn" onClick={() => dispatch(logoutUser())}>
            <LogOut size={16} />
            <span>Logout</span>
          </button>
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
          {activeTab === "models" && renderModels()}
          {activeTab === "users" && renderUsers()}
          {activeTab === "apikeys" && renderApiKeys()}
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
