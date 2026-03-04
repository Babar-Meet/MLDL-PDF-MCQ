import React, { useState } from 'react';
import { Users as UsersIcon, Shield, Crown, User, Loader2, AlertCircle } from 'lucide-react';

const ROLES = [
  { value: 'free', label: 'Free', icon: User, color: '#6b7280' },
  { value: 'paid', label: 'Paid', icon: Crown, color: '#f59e0b' },
  { value: 'admin', label: 'Admin', icon: Shield, color: '#8b5cf6' },
];

const UserList = ({ users, onUpdateRole, loading, currentUserId }) => {
  const [updatingUserId, setUpdatingUserId] = useState(null);
  const [selectedRole, setSelectedRole] = useState({});

  const handleRoleChange = (userId, newRole) => {
    setSelectedRole(prev => ({ ...prev, [userId]: newRole }));
  };

  const handleUpdateRole = async (userId) => {
    const newRole = selectedRole[userId];
    if (!newRole) return;

    setUpdatingUserId(userId);
    try {
      await onUpdateRole(userId, newRole);
      setSelectedRole(prev => ({ ...prev, [userId]: null }));
    } catch (error) {
      console.error('Failed to update role:', error);
    } finally {
      setUpdatingUserId(null);
    }
  };

  const getRoleInfo = (role) => {
    return ROLES.find(r => r.value === role) || ROLES[0];
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatQuota = (used, limit) => {
    if (limit === null || limit === undefined) return `${used} (Unlimited)`;
    return `${used} / ${limit}`;
  };

  if (!users || users.length === 0) {
    return (
      <div className="user-list-empty">
        <UsersIcon size={48} className="empty-icon" />
        <h3>No Users Found</h3>
        <p>There are no registered users yet.</p>
      </div>
    );
  }

  return (
    <div className="user-list-container">
      <div className="user-list-header">
        <h3>
          <UsersIcon size={20} />
          All Users ({users.length})
        </h3>
      </div>

      <div className="user-table-wrapper">
        <table className="user-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th>Quota Used</th>
              <th>Quota Limit</th>
              <th>Created At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => {
              const roleInfo = getRoleInfo(user.role);
              const RoleIcon = roleInfo.icon;
              const isCurrentUser = user.id === currentUserId;
              const isUpdating = updatingUserId === user.id;

              return (
                <tr key={user.id} className={isCurrentUser ? 'current-user' : ''}>
                  <td className="user-email">
                    {user.email}
                    {isCurrentUser && (
                      <span className="you-badge">You</span>
                    )}
                  </td>
                  <td>
                    <span 
                      className="role-badge"
                      style={{ 
                        backgroundColor: `${roleInfo.color}20`,
                        color: roleInfo.color,
                        borderColor: roleInfo.color
                      }}
                    >
                      <RoleIcon size={12} />
                      {roleInfo.label}
                    </span>
                  </td>
                  <td className="quota-cell">
                    {user.quotaUsed ?? 0}
                  </td>
                  <td className="quota-cell">
                    {user.quotaLimit === null || user.quotaLimit === undefined 
                      ? 'Unlimited' 
                      : user.quotaLimit}
                  </td>
                  <td className="date-cell">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="actions-cell">
                    {isCurrentUser ? (
                      <span className="self-badge">Current User</span>
                    ) : (
                      <div className="role-actions">
                        <select
                          value={selectedRole[user.id] || user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          disabled={isUpdating}
                          className="role-select"
                        >
                          {ROLES.map(role => (
                            <option key={role.value} value={role.value}>
                              {role.label}
                            </option>
                          ))}
                        </select>
                        <button
                          className="update-role-btn"
                          onClick={() => handleUpdateRole(user.id)}
                          disabled={isUpdating || selectedRole[user.id] === user.role || !selectedRole[user.id]}
                          title="Update role"
                        >
                          {isUpdating ? (
                            <Loader2 size={14} className="spinner" />
                          ) : (
                            'Update'
                          )}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {loading && (
        <div className="user-list-loading">
          <Loader2 size={24} className="spinner" />
          <span>Loading users...</span>
        </div>
      )}

      {users.length > 0 && (
        <div className="user-list-summary">
          <div className="summary-item">
            <Shield size={16} style={{ color: '#8b5cf6' }} />
            <span>Admins: {users.filter(u => u.role === 'admin').length}</span>
          </div>
          <div className="summary-item">
            <Crown size={16} style={{ color: '#f59e0b' }} />
            <span>Paid: {users.filter(u => u.role === 'paid').length}</span>
          </div>
          <div className="summary-item">
            <User size={16} style={{ color: '#6b7280' }} />
            <span>Free: {users.filter(u => u.role === 'free').length}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserList;
