import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { salesService } from '../services/api';
import './SalesHistory.css';

function SalesHistory() {
  const { user } = useContext(AuthContext);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);
  const [selectedSale, setSelectedSale] = useState(null);
  const [saleDetails, setSaleDetails] = useState(null);

  useEffect(() => {
    loadSales();
  }, [filter]);

  const loadSales = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await salesService.getSalesList({});
      
      let data = [];
      if (response && response.data) {
        if (Array.isArray(response.data)) {
          data = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          data = response.data.data;
        }
      }

      if (filter !== 'all' && data.length > 0) {
        const filterDate = new Date();

        if (filter === 'today') {
          filterDate.setHours(0, 0, 0, 0);
        } else if (filter === '7days') {
          filterDate.setDate(filterDate.getDate() - 7);
        } else if (filter === '30days') {
          filterDate.setDate(filterDate.getDate() - 30);
        }

        data = data.filter(sale => {
          if (!sale.sale_date) return false;
          const saleDate = new Date(sale.sale_date);
          return saleDate >= filterDate;
        });
      }

      setSales(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load sales:', error);
      setError(error.message || 'Failed to load sales data');
      setSales([]);
      setLoading(false);
    }
  };

  const loadSaleDetails = async (saleId) => {
    try {
      const response = await salesService.getSaleDetails(saleId);
      setSaleDetails(response.data);
      setSelectedSale(saleId);
    } catch (err) {
      console.error('Failed to load sale details:', err);
    }
  };

  const filteredSales = sales.filter(sale => 
    (sale.bill_number && sale.bill_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (sale.id && sale.id.toString().includes(searchTerm)) ||
    (sale.notes && sale.notes.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalAmount = filteredSales.reduce((sum, sale) => sum + (Number(sale.total) || 0), 0);

  return (
    <div className="sales-history-container">
      <div className="history-header">
        <h1>📜 Sales History</h1>
        <p className="history-subtitle">View all past transactions and billing records</p>
      </div>

      <div className="history-controls">
        <div className="filter-group">
          <label>Time Period</label>
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
          </select>
        </div>

        <div className="search-group">
          <input
            type="text"
            placeholder="Search by Bill Number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="stats-summary">
          <div className="summary-stat">
            <span className="stat-label">Total Bills</span>
            <span className="stat-value">{filteredSales.length}</span>
          </div>
          <div className="summary-stat">
            <span className="stat-label">Total Amount</span>
            <span className="stat-value">Rs. {totalAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading">⏳ Loading sales history...</div>
      ) : error ? (
        <div className="error-state">
          <p>⚠️ {error}</p>
          <p className="error-note">Please try refreshing or check the console for more details.</p>
        </div>
      ) : filteredSales.length === 0 ? (
        <div className="empty-state">
          <p>📭 No sales records found</p>
          {searchTerm && <p className="empty-note">Try adjusting your search criteria</p>}
          {sales.length === 0 && !searchTerm && <p className="empty-note">No sales data available in the system</p>}
        </div>
      ) : (
        <div className="sales-table-container">
          <table className="sales-table">
            <thead>
              <tr>
                <th>Bill Number</th>
                <th>Date & Time</th>
                <th>Subtotal</th>
                <th>Tax</th>
                <th>Discount</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.map(sale => (
                <tr key={sale.id} className="sale-row">
                  <td className="bill-id">{sale.bill_number}</td>
                  <td className="date-time">
                    {sale.sale_date ? (
                      <>
                        {new Date(sale.sale_date).toLocaleDateString()} 
                        <br/>
                        <small>{new Date(sale.sale_date).toLocaleTimeString()}</small>
                      </>
                    ) : '-'}
                  </td>
                  <td className="amount">Rs. {(Number(sale.subtotal) || 0).toFixed(2)}</td>
                  <td className="amount">Rs. {(Number(sale.tax) || 0).toFixed(2)}</td>
                  <td className="discount">Rs. {(Number(sale.discount) || 0).toFixed(2)}</td>
                  <td className="total-amount">Rs. {(Number(sale.total) || 0).toFixed(2)}</td>
                  <td className="payment-method">
                    <span className={`payment-badge ${sale.payment_method}`}>
                      {sale.payment_method?.toUpperCase() || 'CASH'}
                    </span>
                  </td>
                  <td>
                    <button 
                      className="btn-view"
                      onClick={() => loadSaleDetails(sale.id)}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sale Details Modal */}
      {selectedSale && saleDetails && (
        <div className="modal-overlay" onClick={() => setSelectedSale(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Bill Details - {saleDetails.sale?.bill_number}</h2>
              <button className="close-btn" onClick={() => setSelectedSale(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="sale-info">
                <p><strong>Date:</strong> {new Date(saleDetails.sale?.sale_date).toLocaleString()}</p>
                <p><strong>Payment Method:</strong> {saleDetails.sale?.payment_method?.toUpperCase()}</p>
                {saleDetails.sale?.customer_name && (
                  <p><strong>Customer Name:</strong> {saleDetails.sale.customer_name}</p>
                )}
                {saleDetails.sale?.customer_phone && (
                  <p><strong>Customer Phone:</strong> {saleDetails.sale.customer_phone}</p>
                )}
                <p><strong>Paid Amount:</strong> Rs. {(saleDetails.sale?.paid_amount || 0).toFixed(2)}</p>
                <p><strong>Change:</strong> Rs. {(saleDetails.sale?.change_amount || 0).toFixed(2)}</p>
              </div>
              
              <h3>Items</h3>
              <table className="items-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {saleDetails.items?.map((item, index) => (
                    <tr key={index}>
                      <td>{item.name}</td>
                      <td>{item.quantity}</td>
                      <td>Rs. {(item.unit_price || 0).toFixed(2)}</td>
                      <td>Rs. {(item.item_total || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              <div className="sale-totals">
                <p><strong>Subtotal:</strong> Rs. {(saleDetails.sale?.subtotal || 0).toFixed(2)}</p>
                <p><strong>Tax:</strong> Rs. {(saleDetails.sale?.tax || 0).toFixed(2)}</p>
                <p><strong>Discount:</strong> Rs. {(saleDetails.sale?.discount || 0).toFixed(2)}</p>
                <p className="grand-total"><strong>Grand Total:</strong> Rs. {(saleDetails.sale?.total || 0).toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SalesHistory;
