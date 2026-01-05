import React, { useContext } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext, AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminUsers from './pages/AdminUsers';
import AdminProducts from './pages/AdminProducts';
import AdminCategories from './pages/AdminCategories';
import AdminInventory from './pages/AdminInventory';
import Billing from './pages/Billing';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import SalesHistory from './pages/SalesHistory';
import Returns from './pages/Returns';
import Sidebar from './components/Sidebar';
import './App.css';

function PrivateRoute({ children }) {
  const { isAuthenticated } = useContext(AuthContext);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

function AppRoutes() {
  const { isAuthenticated } = useContext(AuthContext);

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <PrivateRoute>
            <AdminUsers />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/products"
        element={
          <PrivateRoute>
            <AdminProducts />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/categories"
        element={
          <PrivateRoute>
            <AdminCategories />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/inventory"
        element={
          <PrivateRoute>
            <AdminInventory />
          </PrivateRoute>
        }
      />
      <Route
        path="/billing/new"
        element={
          <PrivateRoute>
            <Billing />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <PrivateRoute>
            <Reports />
          </PrivateRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <PrivateRoute>
            <Settings />
          </PrivateRoute>
        }
      />
      <Route
        path="/sales-history"
        element={
          <PrivateRoute>
            <SalesHistory />
          </PrivateRoute>
        }
      />
      <Route
        path="/returns"
        element={
          <PrivateRoute>
            <Returns />
          </PrivateRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
