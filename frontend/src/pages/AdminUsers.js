import React, { useState, useEffect } from 'react';
import { userService } from '../services/api';
import './AdminUsers.css';

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ username: '', password: '', email: '', role: 'cashier', status: 'active' });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await userService.getAllUsers();
      setUsers(response.data);
      setError('');
    } catch (err) {
      setError('Failed to load users');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (editingUser) {
      // Update existing user
      if (!formData.email) {
        setError('Email is required');
        return;
      }
      if (!formData.username) {
        setError('Username is required');
        return;
      }
      try {
        const updateData = {
          username: formData.username,
          email: formData.email,
          role: formData.role,
          status: formData.status
        };
        // Only include password if it's provided
        if (formData.password) {
          updateData.password = formData.password;
        }
        await userService.updateUser(editingUser.id, updateData);
        setFormData({ username: '', password: '', email: '', role: 'cashier', status: 'active' });
        setEditingUser(null);
        setShowForm(false);
        loadUsers();
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to update user');
      }
    } else {
      // Create new user
      if (!formData.username || !formData.password || !formData.email) {
        setError('All fields are required');
        return;
      }
      try {
        await userService.createUser(formData);
        setFormData({ username: '', password: '', email: '', role: 'cashier', status: 'active' });
        setShowForm(false);
        loadUsers();
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to create user');
      }
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '',
      email: user.email || '',
      role: user.role,
      status: user.status || 'active'
    });
    setShowForm(true);
    setError('');
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setFormData({ username: '', password: '', email: '', role: 'cashier', status: 'active' });
    setShowForm(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await userService.deleteUser(id);
        loadUsers();
      } catch (err) {
        setError('Failed to delete user');
      }
    }
  };

  if (loading) return <div className="admin-users-container"><p>Loading users...</p></div>;

  return (
    <div className="admin-users-container">
      <div className="users-header">
        <h2>User Management</h2>
        {!editingUser && (
          <button onClick={() => {
            if (showForm) {
              handleCancelEdit();
            } else {
              setShowForm(true);
            }
          }} className="btn-primary">
            {showForm ? 'Cancel' : 'Create New User'}
          </button>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      {showForm && (
        <div className="user-form">
          <h3>{editingUser ? 'Edit User' : 'Create New User'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="Enter username"
                required
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter email"
                required
              />
            </div>

            <div className="form-group">
              <label>Password {editingUser && <span style={{ color: '#666', fontWeight: 'normal' }}>(leave blank to keep current)</span>}</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={editingUser ? 'Enter new password (optional)' : 'Enter password'}
                required={!editingUser}
              />
            </div>

            <div className="form-group">
              <label>Role</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              >
                <option value="cashier">Cashier</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {editingUser && (
              <div className="form-group">
                <label>Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            )}

            <div className="form-actions">
              <button type="submit" className="btn-primary">
                {editingUser ? 'Update User' : 'Create User'}
              </button>
              {editingUser && (
                <button type="button" className="btn-secondary" onClick={handleCancelEdit}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      <div className="users-table">
        <table>
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length > 0 ? (
              users.map((user) => (
                <tr key={user.id}>
                  <td>{user.username}</td>
                  <td>{user.email || '-'}</td>
                  <td><span className={`role-badge ${user.role}`}>{user.role}</span></td>
                  <td><span className={`status-badge ${user.status}`}>{user.status}</span></td>
                  <td>{new Date(user.created_at).toLocaleDateString()}</td>
                  <td>
                    <button onClick={() => handleEdit(user)} className="btn-edit">Edit</button>
                    <button onClick={() => handleDelete(user.id)} className="btn-danger">Delete</button>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="6">No users found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminUsers;
