import React, { useState, useEffect } from 'react';
import { productService, categoryService } from '../services/api';
import './AdminProducts.css';

function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    category_id: '',
    price: '',
    purchase_price: '',
    min_stock: '10',
    age_group: '',
    description: ''
  });

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await productService.getAllProducts();
      setProducts(response.data);
      setError('');
    } catch (err) {
      setError('Failed to load products');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await categoryService.getAllCategories();
      setCategories(response.data);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.category_id || !formData.price) {
      setError('Name, category, and price are required');
      return;
    }

    try {
      if (editingProduct) {
        // Update existing product
        await productService.updateProduct(editingProduct.id, {
          ...formData,
          price: parseFloat(formData.price),
          purchase_price: parseFloat(formData.purchase_price) || 0,
          min_stock: parseInt(formData.min_stock) || 10,
          status: 'available'
        });
        setEditingProduct(null);
      } else {
        // Create new product
        await productService.createProduct({
          ...formData,
          price: parseFloat(formData.price),
          purchase_price: parseFloat(formData.purchase_price) || 0,
          min_stock: parseInt(formData.min_stock) || 10
        });
      }
      setFormData({ name: '', barcode: '', category_id: '', price: '', purchase_price: '', min_stock: '10', age_group: '', description: '' });
      setShowForm(false);
      loadProducts();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save product');
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || '',
      barcode: product.barcode || '',
      category_id: product.category_id || '',
      price: product.price?.toString() || '',
      purchase_price: product.purchase_price?.toString() || '',
      min_stock: product.min_stock?.toString() || '10',
      age_group: product.age_group || '',
      description: product.description || ''
    });
    setShowForm(true);
    setError('');
  };

  const handleCancelEdit = () => {
    setEditingProduct(null);
    setFormData({ name: '', barcode: '', category_id: '', price: '', purchase_price: '', min_stock: '10', age_group: '', description: '' });
    setShowForm(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await productService.deleteProduct(id);
        loadProducts();
      } catch (err) {
        setError('Failed to delete product');
      }
    }
  };

  if (loading) return <div className="admin-products-container"><p>Loading products...</p></div>;

  return (
    <div className="admin-products-container">
      <div className="products-header">
        <h2>Product Management</h2>
        {!editingProduct && (
          <button onClick={() => {
            if (showForm) {
              handleCancelEdit();
            } else {
              setShowForm(true);
            }
          }} className="btn-primary">
            {showForm ? 'Cancel' : 'Add New Product'}
          </button>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      {showForm && (
        <div className="product-form">
          <h3>{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Product Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter product name"
                required
              />
            </div>

            <div className="form-group">
              <label>Barcode</label>
              <input
                type="text"
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                placeholder="Enter barcode"
              />
            </div>

            <div className="form-group">
              <label>Category *</label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                required
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {categories.length === 0 && (
                <small style={{ color: '#e74c3c', marginTop: '5px' }}>
                  No categories available. Please create a category first.
                </small>
              )}
            </div>

            <div className="form-group">
              <label>Selling Price *</label>
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="Enter selling price"
                required
              />
            </div>

            <div className="form-group">
              <label>Purchase Price (Cost) *</label>
              <input
                type="number"
                step="0.01"
                value={formData.purchase_price}
                onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                placeholder="Enter purchase/cost price"
                required
              />
              <small style={{ color: '#666', marginTop: '5px', display: 'block' }}>
                The price you paid to purchase this product
              </small>
            </div>

            <div className="form-group">
              <label>Min Stock</label>
              <input
                type="number"
                value={formData.min_stock}
                onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
                placeholder="Minimum stock"
              />
            </div>

            <div className="form-group">
              <label>Age Group</label>
              <input
                type="text"
                value={formData.age_group}
                onChange={(e) => setFormData({ ...formData, age_group: e.target.value })}
                placeholder="e.g., 3-5, 5-8"
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter product description"
                rows="3"
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary">
                {editingProduct ? 'Update Product' : 'Add Product'}
              </button>
              {editingProduct && (
                <button type="button" className="btn-secondary" onClick={handleCancelEdit}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      <div className="products-table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Barcode</th>
              <th>Selling Price</th>
              <th>Purchase Price</th>
              <th>Profit Margin</th>
              <th>Category</th>
              <th>Stock</th>
              <th>Age Group</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length > 0 ? (
              products.map((product) => (
                <tr key={product.id}>
                  <td>{product.name}</td>
                  <td>{product.barcode || '-'}</td>
                  <td>Rs. {parseFloat(product.price || 0).toFixed(2)}</td>
                  <td>Rs. {parseFloat(product.purchase_price || 0).toFixed(2)}</td>
                  <td>
                    {product.purchase_price > 0 
                      ? `${(((product.price - product.purchase_price) / product.purchase_price) * 100).toFixed(1)}%`
                      : '-'
                    }
                  </td>
                  <td>{product.category_name || '-'}</td>
                  <td>{product.quantity || 0}</td>
                  <td>{product.age_group || '-'}</td>
                  <td>
                    <button onClick={() => handleEdit(product)} className="btn-edit">Edit</button>
                    <button onClick={() => handleDelete(product.id)} className="btn-danger">Delete</button>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="9">No products found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminProducts;
