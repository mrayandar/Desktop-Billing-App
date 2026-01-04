import React, { useState, useEffect } from 'react';
import { settingsService } from '../services/api';
import './Receipt.css';

function Receipt({ sale, items, user }) {
  const [shopInfo, setShopInfo] = useState({
    shop_name: 'Toy Shop',
    shop_address: '',
    shop_phone: '',
    shop_email: ''
  });

  useEffect(() => {
    loadShopInfo();
  }, []);

  useEffect(() => {
    console.log('Receipt data:', { sale, items, user });
  }, [sale, items, user]);

  const loadShopInfo = async () => {
    try {
      // Use individual getSetting calls since getAllSettings requires admin
      const [nameRes, addressRes, phoneRes, emailRes] = await Promise.all([
        settingsService.getSetting('shop_name').catch(() => ({ data: { value: 'Toy Shop' } })),
        settingsService.getSetting('shop_address').catch(() => ({ data: { value: '' } })),
        settingsService.getSetting('shop_phone').catch(() => ({ data: { value: '' } })),
        settingsService.getSetting('shop_email').catch(() => ({ data: { value: '' } }))
      ]);
      setShopInfo({
        shop_name: nameRes.data.value || 'Toy Shop',
        shop_address: addressRes.data.value || '',
        shop_phone: phoneRes.data.value || '',
        shop_email: emailRes.data.value || ''
      });
    } catch (err) {
      console.error('Failed to load shop info:', err);
    }
  };

  if (!sale) return null;

  const saleDate = sale.sale_date ? new Date(sale.sale_date) : new Date();

  return (
    <div className="receipt-container print-only">
      <div className="receipt">
        <div className="receipt-header">
          <h1 className="shop-name">{shopInfo.shop_name}</h1>
          {shopInfo.shop_address && (
            <p className="shop-address">{shopInfo.shop_address}</p>
          )}
          {shopInfo.shop_phone && (
            <p className="shop-contact">Phone: {shopInfo.shop_phone}</p>
          )}
          {shopInfo.shop_email && (
            <p className="shop-contact">Email: {shopInfo.shop_email}</p>
          )}
        </div>

        <div className="receipt-divider"></div>

        <div className="receipt-info">
          <div className="receipt-row">
            <span className="label">Bill Number:</span>
            <span className="value">{sale.bill_number}</span>
          </div>
          <div className="receipt-row">
            <span className="label">Date:</span>
            <span className="value">{saleDate.toLocaleDateString()}</span>
          </div>
          <div className="receipt-row">
            <span className="label">Time:</span>
            <span className="value">{saleDate.toLocaleTimeString()}</span>
          </div>
          {user && (
            <div className="receipt-row">
              <span className="label">Cashier:</span>
              <span className="value">{user.username}</span>
            </div>
          )}
          {sale.customer_name && (
            <div className="receipt-row">
              <span className="label">Customer:</span>
              <span className="value">{sale.customer_name}</span>
            </div>
          )}
          {sale.customer_phone && (
            <div className="receipt-row">
              <span className="label">Phone:</span>
              <span className="value">{sale.customer_phone}</span>
            </div>
          )}
        </div>

        <div className="receipt-divider"></div>

        <div className="receipt-items">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {items && items.length > 0 ? items.map((item, index) => (
                <tr key={item.id || index}>
                  <td>{item.name || item.product_name || 'Unknown'}</td>
                  <td>{item.quantity || 0}</td>
                  <td>Rs. {parseFloat(item.unit_price || item.price || 0).toFixed(2)}</td>
                  <td>Rs. {parseFloat(item.item_total || (item.quantity * item.unit_price) || 0).toFixed(2)}</td>
                </tr>
              )) : (
                <tr><td colSpan="4">No items</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="receipt-divider"></div>

        <div className="receipt-totals">
          <div className="receipt-row">
            <span className="label">Subtotal:</span>
            <span className="value">Rs. {parseFloat(sale.subtotal || 0).toFixed(2)}</span>
          </div>
          {sale.tax > 0 && (
            <div className="receipt-row">
              <span className="label">Tax:</span>
              <span className="value">Rs. {parseFloat(sale.tax || 0).toFixed(2)}</span>
            </div>
          )}
          {sale.discount > 0 && (
            <div className="receipt-row">
              <span className="label">Discount:</span>
              <span className="value">-Rs. {parseFloat(sale.discount || 0).toFixed(2)}</span>
            </div>
          )}
          <div className="receipt-row total">
            <span className="label">Total:</span>
            <span className="value">Rs. {parseFloat(sale.total || 0).toFixed(2)}</span>
          </div>
          <div className="receipt-row">
            <span className="label">Payment Method:</span>
            <span className="value">{sale.payment_method?.toUpperCase() || 'CASH'}</span>
          </div>
          <div className="receipt-row">
            <span className="label">Paid:</span>
            <span className="value">Rs. {parseFloat(sale.paid_amount || 0).toFixed(2)}</span>
          </div>
          {sale.change_amount > 0 && (
            <div className="receipt-row">
              <span className="label">Change:</span>
              <span className="value">Rs. {parseFloat(sale.change_amount || 0).toFixed(2)}</span>
            </div>
          )}
        </div>

        <div className="receipt-divider"></div>

        <div className="receipt-footer">
          <p className="thank-you">Thank you for your purchase!</p>
          <p className="footer-note">Please visit us again</p>
        </div>
      </div>
    </div>
  );
}

export default Receipt;

