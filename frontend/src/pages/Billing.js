import React, { useState, useEffect, useContext } from 'react';
import { productService, salesService, settingsService, categoryService } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import Receipt from '../components/Receipt';
import './Billing.css';

function Billing() {
  const { user, isAdmin } = useContext(AuthContext);
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [cartItems, setCartItems] = useState([]);
  const [taxPercentage, setTaxPercentage] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [manualDiscount, setManualDiscount] = useState(0);
  const [discountAllowed, setDiscountAllowed] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paidAmount, setPaidAmount] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [completedSale, setCompletedSale] = useState(null);

  useEffect(() => {
    loadTaxSetting();
    loadProducts();
    loadCategories();
    checkDiscountPermission();
  }, []);

  // Auto-hide success message after 3 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const checkDiscountPermission = async () => {
    if (isAdmin) {
      setDiscountAllowed(true);
      return;
    }
    
    try {
      const response = await settingsService.getSetting('cashier_discount_allowed');
      setDiscountAllowed(response.data?.value === 'true');
    } catch (err) {
      setDiscountAllowed(false);
    }
  };

  const loadTaxSetting = async () => {
    try {
      const response = await salesService.getTaxSetting();
      setTaxPercentage(response.data.taxPercentage || 0);
    } catch (err) {
      console.error('Failed to load tax setting');
    }
  };

  const loadCategories = async () => {
    try {
      const response = await categoryService.getAllCategories();
      setCategories(response.data);
    } catch (err) {
      console.error('Failed to load categories');
    }
  };

  const loadProducts = async (query = '', categoryId = '') => {
    try {
      let response;
      if (query) {
        response = await productService.searchProducts(query);
      } else if (categoryId) {
        response = await productService.getProductsByCategory(categoryId);
      } else {
        response = await productService.getAllProducts();
      }
      setProducts(response.data);
    } catch (err) {
      setError('Failed to load products');
    }
  };

  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    setSelectedCategory(''); // Clear category filter when searching
    if (query.length > 0) {
      loadProducts(query);
    } else {
      loadProducts();
    }
  };

  const handleCategoryChange = (e) => {
    const categoryId = e.target.value;
    setSelectedCategory(categoryId);
    setSearchQuery(''); // Clear search when filtering by category
    loadProducts('', categoryId);
  };

  const addToCart = (product) => {
    const existingItem = cartItems.find(item => item.product_id === product.id);

    if (existingItem) {
      if (existingItem.quantity < product.quantity) {
        updateCartItem(product.id, existingItem.quantity + 1);
      }
    } else {
      if (product.quantity > 0) {
        setCartItems([
          ...cartItems,
          {
            product_id: product.id,
            name: product.name,
            unit_price: product.price,
            quantity: 1,
            available_stock: product.quantity
          }
        ]);
      }
    }
  };

  const updateCartItem = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
    } else {
      const item = cartItems.find(i => i.product_id === productId);
      if (item && quantity > item.available_stock) {
        setError(`Cannot add more than available stock (${item.available_stock})`);
        return;
      }
      setCartItems(cartItems.map(item =>
        item.product_id === productId ? { ...item, quantity } : item
      ));
    }
  };

  const removeFromCart = (productId) => {
    setCartItems(cartItems.filter(item => item.product_id !== productId));
  };

  // Update discount when cart changes
  useEffect(() => {
    setDiscountAmount(manualDiscount);
  }, [manualDiscount]);

  const handleManualDiscountChange = (value) => {
    const discount = parseFloat(value) || 0;
    setManualDiscount(discount);
    setDiscountAmount(discount);
  };

  const calculateTotals = () => {
    const subtotal = cartItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    const tax = (subtotal * taxPercentage) / 100;
    const total = subtotal + tax - discountAmount;
    const change = paidAmount ? parseFloat(paidAmount) - total : 0;

    return { subtotal, tax, total, change };
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      setError('Cart is empty');
      return;
    }

    if (!paidAmount) {
      setError('Please enter paid amount');
      return;
    }

    const { total, change } = calculateTotals();

    if (change < 0) {
      setError('Insufficient payment');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await salesService.createSale({
        items: cartItems,
        payment_method: paymentMethod,
        paid_amount: parseFloat(paidAmount),
        discount: discountAmount,
        customer_name: customerName || null,
        customer_phone: customerPhone || null,
        notes: ''
      });

      const saleDetails = await salesService.getSaleDetails(response.data.saleId);
      
      setCompletedSale({
        sale: saleDetails.data.sale,
        items: saleDetails.data.items
      });

      setSuccess(`Sale completed! Bill #${response.data.billNumber}`);
      setCartItems([]);
      setPaidAmount('');
      setCustomerName('');
      setCustomerPhone('');
      setDiscountAmount(0);
      setManualDiscount(0);
      setSearchQuery('');
      loadProducts();

      setTimeout(() => {
        window.print();
      }, 500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create sale');
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, tax, total, change } = calculateTotals();

  return (
    <>
    <div className="billing-page">
      {/* Header - Consistent with Admin */}
      <div className="billing-header">
        <h2>New Bill</h2>
        <div className="header-info">
          <span className="item-count">{cartItems.length} items in cart</span>
        </div>
      </div>

      <div className="billing-main">
        {/* LEFT: Products */}
        <div className="products-panel">
          <div className="panel-header">
            <h3>Products</h3>
            <span className="item-count">{products.length} available</span>
          </div>
          
          <div className="filter-bar">
            <div className="search-box">
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={handleSearch}
              />
            </div>
            <div className="category-filter">
              <select value={selectedCategory} onChange={handleCategoryChange}>
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="products-grid">
            {products.length > 0 ? (
              products.map(product => (
                <div 
                key={product.id} 
                className={`product-card ${product.quantity <= 0 ? 'out-of-stock' : ''}`}
                onClick={() => product.quantity > 0 && addToCart(product)}
              >
                <div className="product-name">{product.name}</div>
                <div className="product-price">Rs. {parseFloat(product.price).toFixed(0)}</div>
                <div className="product-stock">
                  {product.quantity > 0 ? `${product.quantity} in stock` : 'Out of stock'}
                </div>
              </div>
            ))
          ) : (
            <p className="no-results">No products found</p>
          )}
        </div>
        </div>

        {/* RIGHT: Cart & Checkout */}
        <div className="cart-panel">
          <div className="panel-header">
            <h3>Current Bill</h3>
            <span className="item-count">{cartItems.length} items</span>
          </div>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          {/* Cart Items */}
          <div className="cart-list">
            {cartItems.length > 0 ? (
              cartItems.map(item => (
              <div key={item.product_id} className="cart-row">
                <div className="cart-item-info">
                  <span className="cart-item-name">{item.name}</span>
                  <span className="cart-item-price">Rs. {parseFloat(item.unit_price).toFixed(0)}</span>
                </div>
                <div className="cart-item-qty">
                  <button onClick={() => updateCartItem(item.product_id, item.quantity - 1)}>−</button>
                  <span>{item.quantity}</span>
                  <button onClick={() => updateCartItem(item.product_id, item.quantity + 1)}>+</button>
                </div>
                <div className="cart-item-total">
                  Rs. {(item.unit_price * item.quantity).toFixed(0)}
                </div>
              </div>
            ))
          ) : (
            <div className="empty-cart">
              <span>🛒</span>
              <p>No items in cart</p>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="bill-summary">
          <div className="summary-line">
            <span>Subtotal</span>
            <span>Rs. {subtotal.toFixed(0)}</span>
          </div>
          
          {taxPercentage > 0 && (
            <div className="summary-line">
              <span>Tax ({taxPercentage}%)</span>
              <span>Rs. {tax.toFixed(0)}</span>
            </div>
          )}

          {discountAllowed && (
            <div className="discount-input">
              <span>Discount</span>
              <input
                type="number"
                value={manualDiscount || ''}
                onChange={(e) => handleManualDiscountChange(e.target.value)}
                placeholder="0"
              />
            </div>
          )}

          {discountAmount > 0 && (
            <div className="summary-line discount">
              <span>Discount</span>
              <span>-Rs. {discountAmount.toFixed(0)}</span>
            </div>
          )}

          <div className="summary-line total-line">
            <span>TOTAL</span>
            <span>Rs. {total.toFixed(0)}</span>
          </div>
        </div>

        {/* Payment */}
        <div className="payment-box">
          <div className="payment-row">
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              <option value="cash">💵 Cash</option>
              <option value="card">💳 Card</option>
            </select>
            <input
              type="number"
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              placeholder="Amount Paid"
            />
          </div>

          {paidAmount && change >= 0 && (
            <div className="change-display">
              <span>Change</span>
              <span>Rs. {change.toFixed(0)}</span>
            </div>
          )}
        </div>

        {/* Customer Info */}
        <div className="customer-section">
          <h4>Customer Info (Optional)</h4>
          <div className="customer-inputs">
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Customer Name"
            />
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="Phone Number"
            />
          </div>
        </div>

        {/* Checkout Button */}
        <button
          onClick={handleCheckout}
          disabled={loading || cartItems.length === 0}
          className="checkout-btn"
        >
          {loading ? 'Processing...' : `Checkout — Rs. ${total.toFixed(0)}`}
        </button>
        </div>
      </div>
    </div>

      {/* Receipt for printing - Outside main billing div */}
      {completedSale && (
        <Receipt 
          sale={completedSale.sale} 
          items={completedSale.items} 
          user={user}
        />
      )}
    </>
  );
}

export default Billing;
