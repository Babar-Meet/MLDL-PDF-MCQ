import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logoutUser, selectUser, selectIsAuthenticated, selectIsAdmin } from '../store/authSlice';
import { BrainCircuit, LogOut, User, Shield, Crown, Settings, UserCircle } from 'lucide-react';

const Header = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isAdmin = useSelector(selectIsAdmin);

  const isPaid = user?.role === 'paid';

  const handleLogout = () => {
    dispatch(logoutUser());
    navigate('/login');
  };

  // Get role badge color
  const getRoleBadge = () => {
    if (isAdmin) {
      return (
        <span className="role-badge role-admin">
          <Shield size={12} />
          Admin
        </span>
      );
    } else if (isPaid) {
      return (
        <span className="role-badge role-paid">
          <Crown size={12} />
          Paid
        </span>
      );
    } else {
      return (
        <span className="role-badge role-free">
          <User size={12} />
          Free
        </span>
      );
    }
  };

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
          <Link to="/" className="header-logo">
            <div className="header-icon">
              <BrainCircuit size={32} />
            </div>
            <div>
              <h1 className="header-title">AI MCQ Generator</h1>
              <p className="header-subtitle">Extract text from PDFs & Images, Generate MCQs</p>
            </div>
          </Link>
        </div>

        <div className="header-right">
          {isAuthenticated ? (
            <div className="auth-info">
              {isAdmin && (
                <Link to="/admin" className="admin-link" title="Admin Dashboard">
                  <Settings size={18} />
                </Link>
              )}
              <Link to="/profile" className="profile-link" title="Profile">
                <UserCircle size={20} />
              </Link>
              <div className="user-info">
                <span className="user-email">{user?.email}</span>
                {getRoleBadge()}
              </div>
              <button
                className="logout-btn"
                onClick={handleLogout}
                title="Logout"
              >
                <LogOut size={18} />
                <span className="logout-text">Logout</span>
              </button>
            </div>
          ) : (
            <div className="guest-links">
              <Link to="/login" className="auth-link">
                Login
              </Link>
              <Link to="/register" className="auth-link btn-primary">
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
