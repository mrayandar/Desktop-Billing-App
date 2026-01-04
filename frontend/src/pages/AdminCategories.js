import React, { useState, useEffect } from 'react';
import { categoryService } from '../services/api';
import './AdminCategories.css';

function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await categoryService.getAllCategories();
      setCategories(response.data);
      setError('');
    } catch (err) {
      setError('Failed to load categories');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      setError('Category name is required');
      return;
    }

    try {
      if (editingCategory) {
        await categoryService.updateCategory(editingCategory.id, formData);
        setError('');
        setEditingCategory(null);
      } else {
        await categoryService.createCategory(formData);
        setError('');
      }
      setFormData({ name: '', description: '' });
      setShowForm(false);
      loadCategories();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save category');
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || ''
    });
    setShowForm(true);
  };

  const handleCancel = () => {
    setFormData({ name: '', description: '' });
    setEditingCategory(null);
    setShowForm(false);
    setError('');
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this category? Products using this category cannot be deleted.')) {
      try {
        await categoryService.deleteCategory(id);
        loadCategories();
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to delete category');
      }
    }
  };

  if (loading) return <div className="admin-categories-container"><p>Loading categories...</p></div>;

  return (
    <div className="admin-categories-container">
      <div className="categories-header">
        <h2>Category Management</h2>
        {!editingCategory && (
          <button onClick={() => setShowForm(!showForm)} className="btn-primary">
            {showForm ? 'Cancel' : 'Add New Category'}
          </button>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      {showForm && (
        <div className="category-form">
          <form onSubmit={handleSubmit}>
            <h3>{editingCategory ? 'Edit Category' : 'Add New Category'}</h3>
            <div className="form-group">
              <label>Category Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter category name"
                required
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter category description (optional)"
                rows="3"
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary">
                {editingCategory ? 'Update Category' : 'Add Category'}
              </button>
              {editingCategory && (
                <button type="button" onClick={handleCancel} className="btn-secondary">
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      <div className="categories-table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.length > 0 ? (
              categories.map((category) => (
                <tr key={category.id}>
                  <td>{category.name}</td>
                  <td>{category.description || '-'}</td>
                  <td>{category.created_at ? new Date(category.created_at).toLocaleDateString() : '-'}</td>
                  <td>
                    <button onClick={() => handleEdit(category)} className="btn-edit">Edit</button>
                    <button onClick={() => handleDelete(category.id)} className="btn-danger">Delete</button>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="4">No categories found. Create your first category!</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminCategories;

