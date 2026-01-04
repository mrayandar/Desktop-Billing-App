import React, { useState, useEffect } from 'react';
import { inventoryService } from '../services/api';
import './AdminInventory.css';

function AdminInventory() {
  const [inventory, setInventory] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [editingId, setEditingId] = useState(null);
  const [editQuantity, setEditQuantity] = useState('');

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    try {
      setLoading(true);
      const [inventoryRes, lowStockRes] = await Promise.all([
        inventoryService.getInventory(),
        inventoryService.getLowStock()
      ]);
      setInventory(inventoryRes.data);
      setLowStock(lowStockRes.data);
      setError('');
    } catch (err) {
      setError('Failed to load inventory');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (productId) => {
    if (!editQuantity) {
      setError('Please enter a quantity');
      return;
    }

    try {
      await inventoryService.updateStock(productId, {
        quantity: parseInt(editQuantity),
        adjustment_type: 'set'
      });
      setEditingId(null);
      setEditQuantity('');
      loadInventory();
    } catch (err) {
      setError('Failed to update inventory');
    }
  };

  if (loading) return <div className="admin-inventory-container"><p>Loading inventory...</p></div>;

  const displayData = activeTab === 'low-stock' ? lowStock : inventory;

  return (
    <div className="admin-inventory-container">
      <h2>Inventory Management</h2>

      {error && <div className="error-message">{error}</div>}

      <div className="inventory-tabs">
        <button
          className={`tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All Items ({inventory.length})
        </button>
        <button
          className={`tab ${activeTab === 'low-stock' ? 'active' : ''}`}
          onClick={() => setActiveTab('low-stock')}
        >
          Low Stock ({lowStock.length})
        </button>
      </div>

      <div className="inventory-table">
        <table>
          <thead>
            <tr>
              <th>Product Name</th>
              <th>Barcode</th>
              <th>Current Stock</th>
              <th>Min Stock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayData.length > 0 ? (
              displayData.map((item) => (
                <tr key={item.product_id || item.id}>
                  <td>{item.name}</td>
                  <td>{item.barcode || '-'}</td>
                  <td>
                    {editingId === (item.product_id || item.id) ? (
                      <input
                        type="number"
                        value={editQuantity}
                        onChange={(e) => setEditQuantity(e.target.value)}
                        autoFocus
                      />
                    ) : (
                      item.quantity || 0
                    )}
                  </td>
                  <td>{item.min_stock || '-'}</td>
                  <td>
                    <span className={`status ${item.quantity <= item.min_stock ? 'low' : 'ok'}`}>
                      {item.quantity <= item.min_stock ? 'Low' : 'OK'}
                    </span>
                  </td>
                  <td>
                    {editingId === (item.product_id || item.id) ? (
                      <>
                        <button
                          onClick={() => handleUpdate(item.product_id || item.id)}
                          className="btn-success"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="btn-secondary"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingId(item.product_id || item.id);
                          setEditQuantity(item.quantity || 0);
                        }}
                        className="btn-edit"
                      >
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="6">No items found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminInventory;
