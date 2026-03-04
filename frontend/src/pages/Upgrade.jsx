import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Crown,
  Zap,
  Check,
  X,
  CreditCard,
  ArrowLeft,
  Shield,
  Star,
  Infinity,
  Bot,
  Loader,
} from "lucide-react";
import Header from "../components/Header";
import { selectUser, selectIsAdmin, setUser } from "../store/authSlice";
import { upgradeToPaid } from "../services/api";
import "../App.css";

// Premium benefits data
const PREMIUM_BENEFITS = [
  {
    icon: Infinity,
    title: "Unlimited MCQs",
    description: "Generate as many questions as you need without any restrictions",
  },
  {
    icon: Bot,
    title: "All AI Models",
    description: "Access to GPT-4, Claude, Gemini, and all premium models",
  },
  {
    icon: Zap,
    title: "Priority Processing",
    description: "Faster generation with dedicated resources",
  },
  {
    icon: Shield,
    title: "Priority Support",
    description: "Get help faster with priority email support",
  },
];

const FREE_LIMIT = 10;

function Upgrade() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const isAdmin = useSelector(selectIsAdmin);

  const isPaid = user?.role === 'paid';

  const [isUpgrading, setIsUpgrading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // If user is already paid or admin, redirect to home
  useEffect(() => {
    if (isPaid || isAdmin) {
      navigate("/");
    }
  }, [isPaid, isAdmin, navigate]);

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    setError("");

    try {
      // Call the upgrade API (mock payment)
      const result = await upgradeToPaid();
      
      // Update local user state
      if (result.user) {
        dispatch(setUser(result.user));
      }

      setSuccess(true);
      
      // Redirect to home after short delay
      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (err) {
      setError(err.message || "Failed to upgrade. Please try again.");
    } finally {
      setIsUpgrading(false);
    }
  };

  return (
    <div className="app">
      <Header />

      <main className="main-content">
        <div className="upgrade-container">
          {/* Back Button */}
          <Link to="/" className="back-link">
            <ArrowLeft size={18} />
            Back to Home
          </Link>

          {/* Header */}
          <div className="upgrade-header">
            <div className="upgrade-icon">
              <Crown size={48} />
            </div>
            <h1>Upgrade to Premium</h1>
            <p className="upgrade-subtitle">
              Unlock unlimited MCQ generation and all AI models
            </p>
          </div>

          {/* Current Plan Alert */}
          <div className="current-plan-alert">
            <Zap size={18} />
            <span>
              You're currently on the <strong>Free Plan</strong> with{" "}
              {FREE_LIMIT} MCQs per month
            </span>
          </div>

          {/* Benefits List */}
          <div className="benefits-grid">
            {PREMIUM_BENEFITS.map((benefit, index) => (
              <div key={index} className="benefit-card">
                <div className="benefit-icon">
                  <benefit.icon size={24} />
                </div>
                <h3>{benefit.title}</h3>
                <p>{benefit.description}</p>
              </div>
            ))}
          </div>

          {/* Pricing Card */}
          <div className="pricing-card">
            <div className="pricing-header">
              <div className="pricing-badge">PREMIUM</div>
              <div className="pricing-amount">
                <span className="currency">$</span>
                <span className="price">9</span>
                <span className="period">/month</span>
              </div>
              <p className="pricing-description">
                One-time payment, cancel anytime
              </p>
            </div>

            {/* Features List */}
            <ul className="pricing-features">
              <li>
                <Check size={18} className="check-icon" />
                <span>Unlimited MCQ generation</span>
              </li>
              <li>
                <Check size={18} className="check-icon" />
                <span>Access to all AI models (GPT-4, Claude, Gemini)</span>
              </li>
              <li>
                <Check size={18} className="check-icon" />
                <span>Faster processing speed</span>
              </li>
              <li>
                <Check size={18} className="check-icon" />
                <span>Priority support</span>
              </li>
              <li>
                <Check size={18} className="check-icon" />
                <span>No watermarks on output</span>
              </li>
              <li>
                <Check size={18} className="check-icon" />
                <span>Export to multiple formats</span>
              </li>
            </ul>

            {/* Error Message */}
            {error && (
              <div className="upgrade-error">
                <X size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="upgrade-success">
                <Check size={16} />
                <span>Successfully upgraded! Redirecting...</span>
              </div>
            )}

            {/* Upgrade Button */}
            <button
              className="upgrade-button"
              onClick={handleUpgrade}
              disabled={isUpgrading || success}
            >
              {isUpgrading ? (
                <>
                  <Loader size={20} className="spinning" />
                  Processing...
                </>
              ) : success ? (
                <>
                  <Check size={20} />
                  Upgraded Successfully!
                </>
              ) : (
                <>
                  <CreditCard size={20} />
                  Upgrade Now - $9/month
                </>
              )}
            </button>

            {/* Disclaimer */}
            <p className="disclaimer">
              This is a mock payment. No real charges will be made.
            </p>
          </div>

          {/* Comparison Table */}
          <div className="comparison-section">
            <h2>Free vs Premium</h2>
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>Feature</th>
                  <th>Free</th>
                  <th>Premium</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>MCQs per month</td>
                  <td>{FREE_LIMIT}</td>
                  <td>Unlimited</td>
                </tr>
                <tr>
                  <td>AI Models</td>
                  <td>Limited</td>
                  <td>All Models</td>
                </tr>
                <tr>
                  <td>Processing Speed</td>
                  <td>Standard</td>
                  <td>Priority</td>
                </tr>
                <tr>
                  <td>File Size Limit</td>
                  <td>5MB</td>
                  <td>50MB</td>
                </tr>
                <tr>
                  <td>Support</td>
                  <td>Community</td>
                  <td>Priority Email</td>
                </tr>
                <tr>
                  <td>Export Formats</td>
                  <td>Text only</td>
                  <td>Text, PDF, DOCX</td>
                </tr>
              </tbody>
            </table>
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

export default Upgrade;
