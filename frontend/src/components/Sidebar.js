import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Sidebar.css';

function Sidebar() {
  const { logout, user, isAdmin } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavigation = (path) => {
    navigate(path);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>🎪 Lucky Toys</h2>
        <p className="user-info">👤 {user?.username} ({user?.role})</p>
      </div>

      <nav className="sidebar-nav">
        <button onClick={() => handleNavigation('/')} className="nav-item">Dashboard</button>

        {isAdmin && (
          <>
            <h3>Admin Menu</h3>
            <button onClick={() => handleNavigation('/admin/users')} className="nav-item">Users</button>
            <button onClick={() => handleNavigation('/admin/products')} className="nav-item">Products</button>
            <button onClick={() => handleNavigation('/admin/categories')} className="nav-item">Categories</button>
            <button onClick={() => handleNavigation('/admin/inventory')} className="nav-item">Inventory</button>
            <button onClick={() => handleNavigation('/admin/reports')} className="nav-item">Reports</button>
            <button onClick={() => handleNavigation('/returns')} className="nav-item">Returns</button>
            <h3>Preferences</h3>
            <button onClick={() => handleNavigation('/settings')} className="nav-item">Settings</button>
          </>
        )}

        {!isAdmin && (
          <>
            <h3>Billing</h3>
            <button onClick={() => handleNavigation('/billing/new')} className="nav-item">New Bill</button>
            <button onClick={() => handleNavigation('/sales-history')} className="nav-item">History</button>
            <button onClick={() => handleNavigation('/returns')} className="nav-item">Returns</button>
            <h3>Preferences</h3>
            <button onClick={() => handleNavigation('/settings')} className="nav-item">Settings</button>
          </>
        )}
      </nav>

      <button onClick={handleLogout} className="logout-btn">
        Logout
      </button>
    </aside>
  );
}

export default Sidebar;
