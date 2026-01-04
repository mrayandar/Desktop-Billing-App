import React, { useState, useEffect, useCallback } from 'react';
import { reportService } from '../services/api';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import './Reports.css';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

function Reports() {
  const [salesData, setSalesData] = useState([]);
  const [profitData, setProfitData] = useState([]);
  const [productSalesData, setProductSalesData] = useState([]);
  const [categorySalesData, setCategorySalesData] = useState([]);
  const [cashierSalesData, setCashierSalesData] = useState([]);
  const [dateRange, setDateRange] = useState('7days');
  const [activeTab, setActiveTab] = useState('daily');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [useCustomDate, setUseCustomDate] = useState(false);

  const getDateRange = () => {
    if (useCustomDate && customStartDate && customEndDate) {
      return { startDate: customStartDate, endDate: customEndDate };
    }

    const end = new Date();
    const start = new Date();

    switch (dateRange) {
      case '7days':
        start.setDate(end.getDate() - 7);
        break;
      case '30days':
        start.setDate(end.getDate() - 30);
        break;
      case '90days':
        start.setDate(end.getDate() - 90);
        break;
      case 'year':
        start.setFullYear(end.getFullYear() - 1);
        break;
      default:
        start.setDate(end.getDate() - 7);
    }

    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    };
  };

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = getDateRange();

      // Load all reports in parallel
      const [
        salesResponse,
        profitResponse,
        productResponse,
        categoryResponse,
        cashierResponse
      ] = await Promise.all([
        reportService.getSalesReport(params),
        reportService.getProfitReport(params),
        reportService.getProductWiseReport(params),
        reportService.getCategoryWiseReport(params),
        reportService.getCashierWiseReport(params)
      ]);

      setSalesData(salesResponse.data || []);
      setProfitData(profitResponse.data || []);
      setProductSalesData(productResponse.data || []);
      setCategorySalesData(categoryResponse.data || []);
      setCashierSalesData(cashierResponse.data || []);
    } catch (err) {
      setError('Failed to load reports: ' + (err.response?.data?.error || err.message));
      console.error('Report error:', err);
    } finally {
      setLoading(false);
    }
  }, [dateRange, useCustomDate, customStartDate, customEndDate]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const calculateSummary = () => {
    const totalSales = salesData.reduce((sum, item) => sum + (item.total_sales || 0), 0);
    const totalTransactions = salesData.reduce((sum, item) => sum + (item.transaction_count || 0), 0);
    const totalProfit = profitData.reduce((sum, item) => sum + (item.profit || 0), 0);
    const avgOrderValue = totalTransactions > 0 ? totalSales / totalTransactions : 0;

    return {
      totalSales,
      totalTransactions,
      totalProfit,
      avgOrderValue
    };
  };

  const summary = calculateSummary();

  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).join(','));
    const csv = [headers, ...rows].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="reports-container">
      <div className="reports-header-section">
        <div>
          <h2>📊 Sales & Analytics Reports</h2>
          <p className="reports-subtitle">Comprehensive insights into your business performance</p>
        </div>
      </div>

      <div className="reports-controls">
        <div className="date-controls">
          <div className="date-range-selector">
            <label htmlFor="dateRange">Quick Range:</label>
            <select
              id="dateRange"
              value={dateRange}
              onChange={(e) => {
                setDateRange(e.target.value);
                setUseCustomDate(false);
              }}
              disabled={useCustomDate}
            >
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="90days">Last 90 Days</option>
              <option value="year">Last Year</option>
            </select>
          </div>

          <div className="custom-date-toggle">
            <label>
              <input
                type="checkbox"
                checked={useCustomDate}
                onChange={(e) => setUseCustomDate(e.target.checked)}
              />
              Custom Date Range
            </label>
          </div>

          {useCustomDate && (
            <div className="custom-date-inputs">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                placeholder="Start Date"
              />
              <span>to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                placeholder="End Date"
              />
            </div>
          )}
        </div>

        <button onClick={loadReports} disabled={loading} className="refresh-btn">
          {loading ? '⏳ Loading...' : '🔄 Refresh'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card sales">
          <div className="summary-icon">💰</div>
          <div className="summary-content">
            <h4>Total Sales</h4>
            <p className="summary-value">Rs. {summary.totalSales.toFixed(2)}</p>
          </div>
        </div>

        <div className="summary-card transactions">
          <div className="summary-icon">📝</div>
          <div className="summary-content">
            <h4>Total Transactions</h4>
            <p className="summary-value">{summary.totalTransactions}</p>
          </div>
        </div>

        <div className="summary-card profit">
          <div className="summary-icon">📈</div>
          <div className="summary-content">
            <h4>Total Profit</h4>
            <p className="summary-value">Rs. {summary.totalProfit.toFixed(2)}</p>
          </div>
        </div>

        <div className="summary-card aov">
          <div className="summary-icon">📊</div>
          <div className="summary-content">
            <h4>Average Order Value</h4>
            <p className="summary-value">Rs. {summary.avgOrderValue.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={activeTab === 'daily' ? 'active' : ''}
          onClick={() => setActiveTab('daily')}
        >
          📅 Daily Overview
        </button>
        <button
          className={activeTab === 'products' ? 'active' : ''}
          onClick={() => setActiveTab('products')}
        >
          🛍️ Product Sales
        </button>
        <button
          className={activeTab === 'categories' ? 'active' : ''}
          onClick={() => setActiveTab('categories')}
        >
          📦 Category Analysis
        </button>
        <button
          className={activeTab === 'cashiers' ? 'active' : ''}
          onClick={() => setActiveTab('cashiers')}
        >
          👥 Cashier Performance
        </button>
      </div>

      {/* Tab Content */}
      <div className="reports-content">
        {loading && (
          <div className="loading-spinner">
            <p>Loading reports...</p>
          </div>
        )}

        {activeTab === 'daily' && !loading && (
          <>
            <div className="reports-grid">
              <div className="report-card">
                <div className="report-card-header">
                  <h3>Daily Sales Trend</h3>
                  <button
                    onClick={() => exportToCSV(salesData, 'daily-sales')}
                    className="export-btn"
                    title="Export to CSV"
                  >
                    📥 Export
                  </button>
                </div>
                {salesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={salesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(value) => `Rs. ${Number(value).toFixed(2)}`} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="total_sales"
                        stroke="#667eea"
                        name="Sales Amount"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="no-data">No sales data available</p>
                )}
              </div>

              <div className="report-card">
                <div className="report-card-header">
                  <h3>Transaction Count</h3>
                  <button
                    onClick={() => exportToCSV(salesData, 'transactions')}
                    className="export-btn"
                    title="Export to CSV"
                  >
                    📥 Export
                  </button>
                </div>
                {salesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={salesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="transaction_count" fill="#82ca9d" name="Transactions" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="no-data">No transaction data available</p>
                )}
              </div>

              <div className="report-card">
                <div className="report-card-header">
                  <h3>Daily Profit</h3>
                  <button
                    onClick={() => exportToCSV(profitData, 'daily-profit')}
                    className="export-btn"
                    title="Export to CSV"
                  >
                    📥 Export
                  </button>
                </div>
                {profitData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={profitData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(value) => `Rs. ${Number(value).toFixed(2)}`} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="profit"
                        stroke="#ffc658"
                        name="Profit"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="no-data">No profit data available</p>
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === 'products' && !loading && (
          <div className="report-card">
            <div className="report-card-header">
              <h3>Product Sales Report</h3>
              <button
                onClick={() => exportToCSV(productSalesData, 'product-sales')}
                className="export-btn"
                title="Export to CSV"
              >
                📥 Export
              </button>
            </div>
            {productSalesData.length > 0 ? (
              <>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={productSalesData.slice(0, 10)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="product_name" type="category" width={150} />
                      <Tooltip formatter={(value) => `Rs. ${Number(value).toFixed(2)}`} />
                      <Legend />
                      <Bar dataKey="total_revenue" fill="#8884d8" name="Revenue" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="data-table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Product Name</th>
                        <th>Quantity Sold</th>
                        <th>Total Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productSalesData.map((item, index) => (
                        <tr key={item.product_id}>
                          <td>{index + 1}</td>
                          <td>{item.product_name}</td>
                          <td>{item.total_quantity_sold}</td>
                          <td>Rs. {Number(item.total_revenue).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="no-data">No product sales data available</p>
            )}
          </div>
        )}

        {activeTab === 'categories' && !loading && (
          <div className="report-card">
            <div className="report-card-header">
              <h3>Category Sales Report</h3>
              <button
                onClick={() => exportToCSV(categorySalesData, 'category-sales')}
                className="export-btn"
                title="Export to CSV"
              >
                📥 Export
              </button>
            </div>
            {categorySalesData.length > 0 ? (
              <>
                <div className="charts-row">
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={categorySalesData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="total_revenue"
                        >
                          {categorySalesData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `Rs. ${Number(value).toFixed(2)}`} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={categorySalesData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="category_name" />
                        <YAxis />
                        <Tooltip formatter={(value) => `Rs. ${Number(value).toFixed(2)}`} />
                        <Legend />
                        <Bar dataKey="total_revenue" fill="#82ca9d" name="Revenue" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="data-table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Category Name</th>
                        <th>Quantity Sold</th>
                        <th>Total Revenue</th>
                        <th>Percentage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categorySalesData.map((item) => {
                        const total = categorySalesData.reduce((sum, cat) => sum + Number(cat.total_revenue), 0);
                        const percentage = total > 0 ? ((Number(item.total_revenue) / total) * 100).toFixed(1) : 0;
                        return (
                          <tr key={item.category_id}>
                            <td>{item.category_name}</td>
                            <td>{item.total_quantity_sold}</td>
                            <td>Rs. {Number(item.total_revenue).toFixed(2)}</td>
                            <td>{percentage}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="no-data">No category sales data available</p>
            )}
          </div>
        )}

        {activeTab === 'cashiers' && !loading && (
          <div className="report-card">
            <div className="report-card-header">
              <h3>Cashier Performance Report</h3>
              <button
                onClick={() => exportToCSV(cashierSalesData, 'cashier-performance')}
                className="export-btn"
                title="Export to CSV"
              >
                📥 Export
              </button>
            </div>
            {cashierSalesData.length > 0 ? (
              <>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={cashierSalesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="username" />
                      <YAxis />
                      <Tooltip formatter={(value) => `Rs. ${Number(value).toFixed(2)}`} />
                      <Legend />
                      <Bar dataKey="total_sales" fill="#8884d8" name="Total Sales" />
                      <Bar dataKey="average_transaction" fill="#82ca9d" name="Avg Transaction" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="data-table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Cashier Username</th>
                        <th>Transactions</th>
                        <th>Total Sales</th>
                        <th>Average Transaction</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cashierSalesData.map((item) => (
                        <tr key={item.id}>
                          <td>{item.username}</td>
                          <td>{item.transaction_count}</td>
                          <td>Rs. {Number(item.total_sales).toFixed(2)}</td>
                          <td>Rs. {Number(item.average_transaction).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="no-data">No cashier performance data available</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Reports;
