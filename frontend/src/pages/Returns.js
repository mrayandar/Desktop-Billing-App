import React, { useState, useEffect, useContext } from 'react';
import { returnsService, salesService } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import './Returns.css';

function Returns() {
  const { user, isAdmin } = useContext(AuthContext);
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saleSearch, setSaleSearch] = useState('');
  const [selectedSale, setSelectedSale] = useState(null);
  const [saleItems, setSaleItems] = useState([]);
  const [returnItems, setReturnItems] = useState([]);
  const [refundMethod, setRefundMethod] = useState('cash');
  const [reason, setReason] = useState('');
  const [viewingReturn, setViewingReturn] = useState(null);
  const [returnDetails, setReturnDetails] = useState(null);

  useEffect(() => {
    if (isAdmin) {
      loadReturns();
    }
  }, [isAdmin]);

  const loadReturns = async () => {
    try {
      setLoading(true);
      const response = await returnsService.getAllReturns();
      setReturns(response.data);
    } catch (err) {
      setError('Failed to load returns');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const searchSale = async () => {
    if (!saleSearch.trim()) {
      setError('Please enter a bill number');
      return;
    }

    try {
      setLoading(true);
      setError('');
      // Search for sale by bill number
      const salesResponse = await salesService.getSalesList({});
      const sales = salesResponse.data;
      const searchValue = saleSearch.trim();
      // Support searching by bill number (numeric or old BILL-xxx format)
      const sale = sales.find(s => 
        s.bill_number === searchValue || 
        s.bill_number === `BILL-${searchValue}` ||
        s.id === searchValue
      );
      
      if (!sale) {
        setError('Sale not found. Please enter a valid bill number.');
        return;
      }

      // Get sale items
      const itemsResponse = await returnsService.getSaleItems(sale.id);
      setSelectedSale(itemsResponse.data.sale);
      setSaleItems(itemsResponse.data.items);
      setReturnItems([]);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load sale details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleReturnItem = (item) => {
    const availableToReturn = item.quantity - (item.returned_quantity || 0);
    if (availableToReturn <= 0) {
      setError('This item has already been fully returned');
      return;
    }

    const existing = returnItems.find(ri => ri.sale_item_id === item.id);
    if (existing) {
      setReturnItems(returnItems.filter(ri => ri.sale_item_id !== item.id));
    } else {
      setReturnItems([...returnItems, {
        sale_item_id: item.id,
        product_id: item.product_id,
        quantity: 1,
        max_quantity: availableToReturn,
        product_name: item.product_name,
        unit_price: item.unit_price
      }]);
    }
  };

  const updateReturnQuantity = (saleItemId, quantity) => {
    const item = returnItems.find(ri => ri.sale_item_id === saleItemId);
    if (!item) return;

    const maxQty = item.max_quantity;
    const qty = Math.max(1, Math.min(quantity, maxQty));

    setReturnItems(returnItems.map(ri =>
      ri.sale_item_id === saleItemId ? { ...ri, quantity: qty } : ri
    ));
  };

  const calculateTotalRefund = () => {
    return returnItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  };

  const handleProcessReturn = async () => {
    if (returnItems.length === 0) {
      setError('Please select at least one item to return');
      return;
    }

    if (!refundMethod) {
      setError('Please select refund method');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const response = await returnsService.createReturn({
        sale_id: selectedSale.id,
        items: returnItems.map(item => ({
          sale_item_id: item.sale_item_id,
          quantity: item.quantity
        })),
        refund_method: refundMethod,
        reason: reason
      });

      setSuccess(`Return processed successfully! Return #${response.data.returnNumber}. Refund: Rs. ${response.data.totalRefund.toFixed(2)}`);
      
      // Reset form
      setSelectedSale(null);
      setSaleItems([]);
      setReturnItems([]);
      setSaleSearch('');
      setReason('');
      setRefundMethod('cash');

      // Reload returns list
      if (isAdmin) {
        loadReturns();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to process return');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && returns.length === 0) {
    return <div className="returns-container"><p>Loading returns...</p></div>;
  }

  return (
    <div className="returns-container">
      <div className="returns-header">
        <h2>🔄 Returns Management</h2>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="return-form-card">
        <h3>Process Return</h3>
        
        <div className="form-group">
          <label>Bill Number *</label>
          <div className="search-sale-input">
            <input
              type="text"
              value={saleSearch}
              onChange={(e) => setSaleSearch(e.target.value)}
              placeholder="Enter bill number"
              onKeyPress={(e) => e.key === 'Enter' && searchSale()}
            />
            <button onClick={searchSale} className="btn-secondary" disabled={loading}>
              Search
            </button>
            {selectedSale && (
              <button 
                onClick={() => {
                  setSelectedSale(null);
                  setSaleItems([]);
                  setReturnItems([]);
                  setSaleSearch('');
                  setError('');
                  setSuccess('');
                }} 
                className="btn-cancel"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {selectedSale && (
            <>
              <div className="sale-info">
                <h4>Sale Information</h4>
                <p><strong>Bill Number:</strong> {selectedSale.bill_number}</p>
                <p><strong>Date:</strong> {new Date(selectedSale.sale_date).toLocaleString()}</p>
                {selectedSale.customer_name && (
                  <p><strong>Customer Name:</strong> {selectedSale.customer_name}</p>
                )}
                {selectedSale.customer_phone && (
                  <p><strong>Customer Phone:</strong> {selectedSale.customer_phone}</p>
                )}
                <p><strong>Total:</strong> Rs. {selectedSale.total.toFixed(2)}</p>
              </div>

              <div className="return-items-section">
                <h4>Select Items to Return</h4>
                {saleItems.length > 0 ? (
                  <div className="items-list">
                    {saleItems.map((item) => {
                      const availableToReturn = item.quantity - (item.returned_quantity || 0);
                      const isSelected = returnItems.some(ri => ri.sale_item_id === item.id);
                      
                      return (
                        <div 
                          key={item.id} 
                          className={`item-card ${isSelected ? 'selected' : ''} ${availableToReturn <= 0 ? 'disabled' : ''}`}
                        >
                          <div className="item-checkbox">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleReturnItem(item)}
                              disabled={availableToReturn <= 0}
                            />
                          </div>
                          <div className="item-details">
                            <p><strong>{item.product_name}</strong></p>
                            <p>Barcode: {item.barcode || 'N/A'}</p>
                            <p>Sold: {item.quantity} × Rs. {item.unit_price.toFixed(2)} = Rs. {item.item_total.toFixed(2)}</p>
                            <p className={availableToReturn <= 0 ? 'error-text' : ''}>
                              Available to return: {availableToReturn}
                            </p>
                          </div>
                          {isSelected && (
                            <div className="item-quantity">
                              <label>Return Qty:</label>
                              <input
                                type="number"
                                min="1"
                                max={availableToReturn}
                                value={returnItems.find(ri => ri.sale_item_id === item.id)?.quantity || 1}
                                onChange={(e) => updateReturnQuantity(item.id, parseInt(e.target.value))}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p>No items found for this sale</p>
                )}
              </div>

              {returnItems.length > 0 && (
                <div className="return-summary">
                  <h4>Return Summary</h4>
                  <div className="summary-items">
                    {returnItems.map((item) => (
                      <div key={item.sale_item_id} className="summary-item">
                        <span>{item.product_name} × {item.quantity}</span>
                        <span>Rs. {(item.quantity * item.unit_price).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="summary-total">
                    <strong>Total Refund: Rs. {calculateTotalRefund().toFixed(2)}</strong>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Refund Method *</label>
                <select
                  value={refundMethod}
                  onChange={(e) => setRefundMethod(e.target.value)}
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                </select>
              </div>

              <div className="form-group">
                <label>Reason (Optional)</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Enter return reason..."
                  rows="3"
                />
              </div>

              <button 
                onClick={handleProcessReturn} 
                className="btn-primary"
                disabled={returnItems.length === 0 || loading}
              >
                {loading ? 'Processing...' : 'Process Return'}
              </button>
            </>
          )}
        </div>

      {isAdmin && (
        <div className="returns-list">
          <h3>All Returns</h3>
          {returns.length > 0 ? (
            <table className="returns-table">
              <thead>
                <tr>
                  <th>Return #</th>
                  <th>Bill #</th>
                  <th>Date</th>
                  <th>Cashier</th>
                  <th>Refund Amount</th>
                  <th>Method</th>
                  <th>Reason</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {returns.map((ret) => (
                  <tr key={ret.id}>
                    <td>{ret.return_number}</td>
                    <td>{ret.bill_number}</td>
                    <td>{new Date(ret.return_date).toLocaleString()}</td>
                    <td>{ret.cashier_name}</td>
                    <td>Rs. {ret.total_refund.toFixed(2)}</td>
                    <td>{ret.refund_method}</td>
                    <td>{ret.reason || '-'}</td>
                    <td>
                      <button 
                        onClick={async () => {
                          try {
                            const response = await returnsService.getReturn(ret.id);
                            // Also get sale details for customer info
                            const saleResponse = await salesService.getSaleDetails(ret.sale_id);
                            setReturnDetails({
                              ...response.data,
                              sale: saleResponse.data.sale
                            });
                            setViewingReturn(ret);
                          } catch (err) {
                            setError('Failed to load return details');
                          }
                        }}
                        className="btn-secondary"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="no-data">No returns found</p>
          )}
        </div>
      )}

      {/* Return Details Modal */}
      {viewingReturn && returnDetails && (
        <div className="modal-overlay" onClick={() => { setViewingReturn(null); setReturnDetails(null); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Return Details - #{viewingReturn.return_number}</h2>
              <button className="close-btn" onClick={() => { setViewingReturn(null); setReturnDetails(null); }}>×</button>
            </div>
            <div className="modal-body">
              <div className="return-info-grid">
                <div className="info-section">
                  <h4>Return Information</h4>
                  <p><strong>Return Number:</strong> {viewingReturn.return_number}</p>
                  <p><strong>Bill Number:</strong> {viewingReturn.bill_number}</p>
                  <p><strong>Date:</strong> {new Date(viewingReturn.return_date).toLocaleString()}</p>
                  <p><strong>Processed By:</strong> {viewingReturn.cashier_name}</p>
                  <p><strong>Refund Method:</strong> {viewingReturn.refund_method?.toUpperCase()}</p>
                  <p><strong>Reason:</strong> {viewingReturn.reason || '-'}</p>
                </div>
                
                <div className="info-section">
                  <h4>Customer Information</h4>
                  {returnDetails.sale?.customer_name ? (
                    <>
                      <p><strong>Name:</strong> {returnDetails.sale.customer_name}</p>
                      <p><strong>Phone:</strong> {returnDetails.sale.customer_phone || '-'}</p>
                    </>
                  ) : (
                    <p className="no-customer">No customer details provided</p>
                  )}
                </div>
              </div>

              <h4>Returned Items</h4>
              <table className="items-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Barcode</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Refund Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {returnDetails.items?.map((item, index) => (
                    <tr key={index}>
                      <td>{item.product_name}</td>
                      <td>{item.barcode || '-'}</td>
                      <td>{item.quantity}</td>
                      <td>Rs. {(item.unit_price || 0).toFixed(2)}</td>
                      <td>Rs. {(item.item_refund || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              <div className="return-total">
                <strong>Total Refund: Rs. {viewingReturn.total_refund.toFixed(2)}</strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Returns;

