import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  User,
  Mail,
  Crown,
  Shield,
  Zap,
  Calendar,
  BarChart3,
  Settings,
  Loader,
  ArrowLeft,
} from "lucide-react";
import Header from "../components/Header";
import { selectUser, selectIsAdmin } from "../store/authSlice";
import { getUserQuota, getAvailableModels } from "../services/api";
import "../App.css";

function Profile() {
  const navigate = useNavigate();
  const user = useSelector(selectUser);
  const isAdmin = useSelector(selectIsAdmin);

  const isPaid = user?.role === 'paid';
  const isFree = user?.role === 'free';

  const [quota, setQuota] = useState(null);
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      // Load quota
      const quotaData = await getUserQuota();
      setQuota(quotaData.quota);

      // Load available models
      const modelsData = await getAvailableModels();
      setModels(modelsData.models || []);
    } catch (error) {
      console.error("Failed to load profile data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Get role display info
  const getRoleInfo = () => {
    if (isAdmin) {
      return {
        role: "admin",
        label: "Administrator",
        icon: Shield,
        color: "#ef4444",
        description: "Full system access and user management",
      };
    } else if (isPaid) {
      return {
        role: "paid",
        label: "Premium",
        icon: Crown,
        color: "#f59e0b",
        description: "Unlimited MCQ generation with all AI models",
      };
    } else {
      return {
        role: "free",
        label: "Free",
        icon: Zap,
        color: "#6b7280",
        description: "Limited to 10 MCQs per month",
      };
    }
  };

  const roleInfo = getRoleInfo();
  const RoleIcon = roleInfo.icon;

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="app">
        <Header />
        <main className="main-content">
          <div className="loading-screen">
            <Loader size={40} className="spinning" />
            <p>Loading profile...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <Header />

      <main className="main-content">
        <div className="profile-container">
          {/* Back Button */}
          <Link to="/" className="back-link">
            <ArrowLeft size={18} />
            Back to Home
          </Link>

          {/* Profile Header */}
          <div className="profile-header">
            <div className="profile-avatar">
              <User size={48} />
            </div>
            <div className="profile-info">
              <h1>{user?.email?.split("@")[0]}</h1>
              <p className="profile-email">
                <Mail size={16} />
                {user?.email}
              </p>
              <div className="profile-role" style={{ color: roleInfo.color }}>
                <RoleIcon size={16} />
                <span>{roleInfo.label}</span>
              </div>
            </div>
          </div>

          {/* Plan Card */}
          <div className="profile-section">
            <h2>
              <Crown size={20} />
              Current Plan
            </h2>
            <div className="plan-card" style={{ borderColor: roleInfo.color }}>
              <div className="plan-card-header">
                <RoleIcon size={24} style={{ color: roleInfo.color }} />
                <div>
                  <h3 style={{ color: roleInfo.color }}>{roleInfo.label} Plan</h3>
                  <p>{roleInfo.description}</p>
                </div>
              </div>

              {/* Quota Info */}
              {quota && (
                <div className="quota-details">
                  <div className="quota-stat">
                    <span className="quota-label">Used</span>
                    <span className="quota-value">
                      {quota.used === "unlimited" ? "∞" : quota.used}
                    </span>
                  </div>
                  <div className="quota-stat">
                    <span className="quota-label">Limit</span>
                    <span className="quota-value">
                      {quota.limit === "unlimited" ? "∞" : quota.limit}
                    </span>
                  </div>
                  <div className="quota-stat">
                    <span className="quota-label">Remaining</span>
                    <span className="quota-value">
                      {quota.remaining === "unlimited"
                        ? "∞"
                        : quota.remaining}
                    </span>
                  </div>
                </div>
              )}

              {/* Upgrade Button for Free Users */}
              {isFree && (
                <Link to="/upgrade" className="upgrade-profile-btn">
                  <Crown size={16} />
                  Upgrade to Premium
                </Link>
              )}
            </div>
          </div>

          {/* Account Details */}
          <div className="profile-section">
            <h2>
              <User size={20} />
              Account Details
            </h2>
            <div className="details-card">
              <div className="detail-row">
                <span className="detail-label">Email</span>
                <span className="detail-value">{user?.email}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Account Type</span>
                <span className="detail-value" style={{ color: roleInfo.color }}>
                  {roleInfo.label}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Member Since</span>
                <span className="detail-value">
                  {formatDate(user?.createdAt)}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">User ID</span>
                <span className="detail-value detail-id">{user?._id}</span>
              </div>
            </div>
          </div>

          {/* Available Models */}
          <div className="profile-section">
            <h2>
              <BarChart3 size={20} />
              Available Models
            </h2>
            <div className="models-card">
              {models.length > 0 ? (
                <div className="models-list">
                  {models.map((model, index) => (
                    <div key={index} className="model-item">
                      <span className="model-name">{model.name}</span>
                      <span className="model-provider">{model.provider}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-models">No models available</p>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="profile-section">
            <h2>
              <Settings size={20} />
              Quick Actions
            </h2>
            <div className="actions-grid">
              {isFree && (
                <Link to="/upgrade" className="action-card">
                  <Crown size={24} />
                  <span>Upgrade Plan</span>
                </Link>
              )}
              <Link to="/" className="action-card">
                <Zap size={24} />
                <span>Generate MCQs</span>
              </Link>
              {isAdmin && (
                <Link to="/admin" className="action-card">
                  <Shield size={24} />
                  <span>Admin Dashboard</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="footer">
        <p>AI MCQ Generator - Powered by Advanced Language Models</p>
      </footer>
    </div>
  );
}

export default Profile;
