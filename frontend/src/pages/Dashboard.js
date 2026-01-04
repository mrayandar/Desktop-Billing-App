import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { reportService, productService, userService, inventoryService } from '../services/api';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

function AdminDashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalSales: 0,
    totalTransactions: 0,
    totalProducts: 0,
    totalUsers: 0,
    todaySales: 0
  });
  const [lowStockItems, setLowStockItems] = useState([]);

  useEffect(() => {
    loadStats();
    loadLowStockItems();
  }, []);

  const loadStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const salesResp = await reportService.getSalesReport({
        startDate: today,
        endDate: today
      });
      const todayData = salesResp.data && salesResp.data[0];

      const productsResp = await productService.getAllProducts();
      const usersResp = await userService.getAllUsers();

      setStats({
        totalSales: todayData?.total_sales || 0,
        totalTransactions: todayData?.transaction_count || 0,
        totalProducts: productsResp.data?.length || 0,
        totalUsers: usersResp.data?.length || 0,
        todaySales: todayData?.total_sales || 0
      });
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const loadLowStockItems = async () => {
    try {
      const response = await inventoryService.getLowStock();
      setLowStockItems(response.data || []);
    } catch (err) {
      console.error('Failed to load low stock items:', err);
    }
  };

  return (
    <div className="admin-dashboard">
      <h2>Admin Dashboard</h2>
      <p className="welcome">Welcome, {user?.username}!</p>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <div className="low-stock-alert">
          <div className="alert-header">
            <span className="alert-icon">⚠️</span>
            <h3>Low Stock Alert ({lowStockItems.length} items)</h3>
          </div>
          <div className="alert-items">
            {lowStockItems.slice(0, 5).map(item => (
              <div key={item.id} className="alert-item">
                <span className="item-name">{item.name}</span>
                <span className="item-stock">
                  {item.quantity} / {item.min_stock}
                </span>
              </div>
            ))}
            {lowStockItems.length > 5 && (
              <p className="more-items" onClick={() => navigate('/admin/inventory')}>
                + {lowStockItems.length - 5} more items →
              </p>
            )}
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Today's Sales</h3>
          <p className="stat-value">Rs. {stats.todaySales.toFixed(2)}</p>
          <p className="stat-label">Total sales amount</p>
        </div>

        <div className="stat-card">
          <h3>Transactions</h3>
          <p className="stat-value">{stats.totalTransactions}</p>
          <p className="stat-label">Number of bills today</p>
        </div>

        <div className="stat-card">
          <h3>Total Products</h3>
          <p className="stat-value">{stats.totalProducts}</p>
          <p className="stat-label">Products in catalog</p>
        </div>

        <div className="stat-card">
          <h3>Total Users</h3>
          <p className="stat-value">{stats.totalUsers}</p>
          <p className="stat-label">Registered users</p>
        </div>
      </div>

      {/* Action Cards */}
      <div className="dashboard-grid">
        <div className="dashboard-card" onClick={() => navigate('/admin/users')}>
          <h3>👥 User Management</h3>
          <p>Create and manage cashier accounts</p>
          <a href="/admin/users" className="card-link">Go to Users →</a>
        </div>

        <div className="dashboard-card" onClick={() => navigate('/admin/products')}>
          <h3>📦 Product Management</h3>
          <p>Add, update, and delete products</p>
          <a href="/admin/products" className="card-link">Go to Products →</a>
        </div>

        <div className="dashboard-card" onClick={() => navigate('/admin/inventory')}>
          <h3>📊 Inventory</h3>
          <p>Manage stock and view low stock alerts</p>
          <a href="/admin/inventory" className="card-link">Go to Inventory →</a>
        </div>

        <div className="dashboard-card" onClick={() => navigate('/admin/reports')}>
          <h3>📈 Sales Reports</h3>
          <p>View sales and profit reports with charts</p>
          <a href="/admin/reports" className="card-link">Go to Reports →</a>
        </div>

        <div className="dashboard-card" onClick={() => navigate('/settings')}>
          <h3>⚙️ Settings</h3>
          <p>Configure tax and system settings</p>
          <a href="/settings" className="card-link">Go to Settings →</a>
        </div>

        <div className="dashboard-card" onClick={() => navigate('/settings')}>
          <h3>💾 Backup</h3>
          <p>Backup and restore database</p>
          <a href="/settings" className="card-link">Go to Backup →</a>
        </div>
      </div>
    </div>
  );
}

function CashierDashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalSales: 0,
    transactions: 0
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const salesResp = await reportService.getSalesReport({
        startDate: today,
        endDate: today
      });
      const todayData = salesResp.data && salesResp.data[0];

      setStats({
        totalSales: todayData?.total_sales || 0,
        transactions: todayData?.transaction_count || 0
      });
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  return (
    <div className="cashier-dashboard">
      <h2>Cashier Dashboard</h2>
      <p className="welcome">Welcome back, {user?.username}! Ready to serve customers.</p>

      {/* Quick Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3>💰 Today's Sales</h3>
          <p className="stat-value">Rs {stats.totalSales.toFixed(2)}</p>
        </div>

        <div className="stat-card">
          <h3>🧾 Transactions</h3>
          <p className="stat-value">{stats.transactions}</p>
        </div>
      </div>

      {/* Action Cards */}
      <div className="dashboard-grid">
        <div className="dashboard-card" onClick={() => navigate('/billing/new')}>
          <h3>🛒 New Billing</h3>
          <p>Create and process customer bills quickly</p>
        </div>

        <div className="dashboard-card" onClick={() => navigate('/sales-history')}>
          <h3>📋 Sales History</h3>
          <p>View and track your recent transactions</p>
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  const { user, isAdmin, isCashier } = useContext(AuthContext);

  if (!user) {
    return <div>Please login</div>;
  }

  return (
    <div className="dashboard">
      {isAdmin && <AdminDashboard />}
      {isCashier && <CashierDashboard />}
    </div>
  );
}

export default Dashboard;
