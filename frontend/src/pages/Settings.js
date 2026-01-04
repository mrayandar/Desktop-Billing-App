import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { settingsService } from '../services/api';
import './Settings.css';

function Settings() {
  const { user, isAdmin } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('shop');
  
  // Shop Settings
  const [shopSettings, setShopSettings] = useState({
    shop_name: 'Toy Shop',
    shop_address: '',
    shop_phone: '',
    shop_email: ''
  });

  // Tax & Discount Settings
  const [taxSettings, setTaxSettings] = useState({
    tax_percentage: '10',
    cashier_discount_allowed: 'false',
    max_discount_percentage: '10'
  });

  // System Settings
  const [systemSettings, setSystemSettings] = useState({
    receipt_footer_message: 'Thank you for your purchase!',
    currency_symbol: 'Rs.',
    auto_logout_minutes: '30'
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await settingsService.getAllSettings();
      const data = response.data || {};
      
      setShopSettings({
        shop_name: data.shop_name || 'Toy Shop',
        shop_address: data.shop_address || '',
        shop_phone: data.shop_phone || '',
        shop_email: data.shop_email || ''
      });

      setTaxSettings({
        tax_percentage: data.tax_percentage || '10',
        cashier_discount_allowed: data.cashier_discount_allowed || 'false',
        max_discount_percentage: data.max_discount_percentage || '10'
      });

      setSystemSettings({
        receipt_footer_message: data.receipt_footer_message || 'Thank you for your purchase!',
        currency_symbol: data.currency_symbol || 'Rs.',
        auto_logout_minutes: data.auto_logout_minutes || '30'
      });

      setError('');
    } catch (err) {
      setError('Failed to load settings');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (settings) => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      for (const [key, value] of Object.entries(settings)) {
        await settingsService.updateSetting(key, value);
      }
      setSuccess('Settings saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to save settings: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleBackup = async () => {
    try {
      setError('');
      const response = await settingsService.backupDatabase();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `toyshop-backup-${Date.now()}.db`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setSuccess('Backup downloaded successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to create backup: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleRestore = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!window.confirm('Are you sure you want to restore this backup? This will replace all current data.')) {
      event.target.value = '';
      return;
    }

    try {
      setError('');
      await settingsService.restoreDatabase(file);
      setSuccess('Database restored successfully! Please refresh the page.');
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      setError('Failed to restore backup: ' + (err.response?.data?.error || err.message));
    }
    event.target.value = '';
  };

  if (loading) {
    return (
      <div className="settings-container">
        <div className="loading">⏳ Loading settings...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="settings-container">
        <div className="settings-header">
          <h1>⚙️ Settings</h1>
          <p className="settings-subtitle">Personal preferences</p>
        </div>
        
        <div className="settings-grid">
          <div className="settings-card">
            <h2>👤 Account Information</h2>
            <div className="setting-item">
              <label>Username</label>
              <input type="text" value={user?.username || ''} disabled />
            </div>
            <div className="setting-item">
              <label>Role</label>
              <input type="text" value={user?.role || ''} disabled />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h1>⚙️ System Settings</h1>
        <p className="settings-subtitle">Configure your toy shop system</p>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-alert">{success}</div>}

      <div className="settings-tabs">
        <button className={activeTab === 'shop' ? 'active' : ''} onClick={() => setActiveTab('shop')}>
          🏪 Shop Info
        </button>
        <button className={activeTab === 'tax' ? 'active' : ''} onClick={() => setActiveTab('tax')}>
          💰 Tax & Pricing
        </button>
        <button className={activeTab === 'system' ? 'active' : ''} onClick={() => setActiveTab('system')}>
          🔧 System
        </button>
        <button className={activeTab === 'backup' ? 'active' : ''} onClick={() => setActiveTab('backup')}>
          💾 Backup & Restore
        </button>
      </div>

      <div className="settings-content">
        {activeTab === 'shop' && (
          <div className="settings-card full-width">
            <h2>🏪 Shop Information</h2>
            <p className="card-description">This information will appear on receipts and reports.</p>
            
            <div className="form-grid">
              <div className="setting-item">
                <label>Shop Name *</label>
                <input
                  type="text"
                  value={shopSettings.shop_name}
                  onChange={(e) => setShopSettings({ ...shopSettings, shop_name: e.target.value })}
                  placeholder="Enter shop name"
                />
              </div>

              <div className="setting-item">
                <label>Shop Address</label>
                <textarea
                  value={shopSettings.shop_address}
                  onChange={(e) => setShopSettings({ ...shopSettings, shop_address: e.target.value })}
                  placeholder="Enter shop address"
                  rows="3"
                />
              </div>

              <div className="setting-item">
                <label>Phone Number</label>
                <input
                  type="tel"
                  value={shopSettings.shop_phone}
                  onChange={(e) => setShopSettings({ ...shopSettings, shop_phone: e.target.value })}
                  placeholder="Enter phone number"
                />
              </div>

              <div className="setting-item">
                <label>Email Address</label>
                <input
                  type="email"
                  value={shopSettings.shop_email}
                  onChange={(e) => setShopSettings({ ...shopSettings, shop_email: e.target.value })}
                  placeholder="Enter email address"
                />
              </div>
            </div>

            <div className="settings-actions">
              <button className="btn btn-primary" onClick={() => saveSettings(shopSettings)} disabled={saving}>
                {saving ? '⏳ Saving...' : '💾 Save Shop Info'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'tax' && (
          <div className="settings-card full-width">
            <h2>💰 Tax & Pricing Settings</h2>
            <p className="card-description">Configure tax rates and pricing rules.</p>
            
            <div className="form-grid">
              <div className="setting-item">
                <label>Tax Percentage (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={taxSettings.tax_percentage}
                  onChange={(e) => setTaxSettings({ ...taxSettings, tax_percentage: e.target.value })}
                  placeholder="Enter tax percentage"
                />
                <small>Applied to all sales (e.g., GST, VAT)</small>
              </div>

              <div className="setting-item">
                <label>Allow Cashiers to Apply Discounts</label>
                <select
                  value={taxSettings.cashier_discount_allowed}
                  onChange={(e) => setTaxSettings({ ...taxSettings, cashier_discount_allowed: e.target.value })}
                >
                  <option value="false">No - Admin Only</option>
                  <option value="true">Yes - Allow Cashiers</option>
                </select>
                <small>Control who can apply discounts during billing</small>
              </div>

              <div className="setting-item">
                <label>Maximum Discount Percentage (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={taxSettings.max_discount_percentage}
                  onChange={(e) => setTaxSettings({ ...taxSettings, max_discount_percentage: e.target.value })}
                  placeholder="Maximum discount allowed"
                />
                <small>Maximum discount that can be applied to any bill</small>
              </div>
            </div>

            <div className="settings-actions">
              <button className="btn btn-primary" onClick={() => saveSettings(taxSettings)} disabled={saving}>
                {saving ? '⏳ Saving...' : '💾 Save Tax Settings'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'system' && (
          <div className="settings-card full-width">
            <h2>🔧 System Settings</h2>
            <p className="card-description">Configure system-wide preferences.</p>
            
            <div className="form-grid">
              <div className="setting-item">
                <label>Auto Logout (minutes)</label>
                <input
                  type="number"
                  min="5"
                  max="120"
                  value={systemSettings.auto_logout_minutes}
                  onChange={(e) => setSystemSettings({ ...systemSettings, auto_logout_minutes: e.target.value })}
                  placeholder="Minutes of inactivity"
                />
                <small>Automatically logout after inactivity</small>
              </div>

              <div className="setting-item full-width">
                <label>Receipt Footer Message</label>
                <textarea
                  value={systemSettings.receipt_footer_message}
                  onChange={(e) => setSystemSettings({ ...systemSettings, receipt_footer_message: e.target.value })}
                  placeholder="Thank you message for receipts"
                  rows="2"
                />
                <small>Message displayed at the bottom of receipts</small>
              </div>
            </div>

            <div className="system-info">
              <h4>📊 System Information</h4>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Application Version</span>
                  <span className="info-value">2.0.0</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Database</span>
                  <span className="info-value">SQLite3</span>
                </div>
                <div className="info-item">
                  <span className="info-label">API Server</span>
                  <span className="info-value">http://localhost:5000</span>
                </div>
              </div>
            </div>

            <div className="settings-actions">
              <button className="btn btn-primary" onClick={() => saveSettings(systemSettings)} disabled={saving}>
                {saving ? '⏳ Saving...' : '💾 Save System Settings'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'backup' && (
          <div className="settings-card full-width">
            <h2>💾 Backup & Restore</h2>
            <p className="card-description">Manage your database backups.</p>
            
            <div className="backup-section">
              <div className="backup-card">
                <h3>📥 Create Backup</h3>
                <p>Download a complete backup of your database including all products, sales, users, and settings.</p>
                <button className="btn btn-primary" onClick={handleBackup}>
                  📥 Download Backup
                </button>
              </div>

              <div className="backup-card">
                <h3>📤 Restore Backup</h3>
                <p>Restore your database from a previous backup file. <strong>Warning:</strong> This will replace all current data.</p>
                <label className="file-upload-btn">
                  📤 Select Backup File
                  <input 
                    type="file" 
                    accept=".db"
                    onChange={handleRestore}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            </div>

            <div className="backup-info">
              <h4>📋 Backup Guidelines</h4>
              <ul>
                <li>Create regular backups to prevent data loss</li>
                <li>Store backups in a secure location</li>
                <li>Test restore functionality periodically</li>
                <li>Keep multiple backup copies</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Settings;
