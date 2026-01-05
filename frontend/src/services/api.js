import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const authService = {
  login: (username, password) => apiClient.post('/auth/login', { username, password }),
  register: (username, password, email, role) =>
    apiClient.post('/auth/register', { username, password, email, role })
};

export const categoryService = {
  getAllCategories: () => apiClient.get('/categories'),
  getCategory: (id) => apiClient.get(`/categories/${id}`),
  createCategory: (data) => apiClient.post('/categories', data),
  updateCategory: (id, data) => apiClient.put(`/categories/${id}`, data),
  deleteCategory: (id) => apiClient.delete(`/categories/${id}`)
};

export const productService = {
  getAllProducts: () => apiClient.get('/products'),
  searchProducts: (query) => apiClient.get(`/products/search/${query}`),
  getProductsByCategory: (categoryId) => apiClient.get(`/products/category/${categoryId}`),
  createProduct: (data) => apiClient.post('/products', data),
  updateProduct: (id, data) => apiClient.put(`/products/${id}`, data),
  deleteProduct: (id) => apiClient.delete(`/products/${id}`)
};

export const inventoryService = {
  getInventory: () => apiClient.get('/inventory'),
  getLowStock: () => apiClient.get('/inventory/low-stock'),
  updateStock: (productId, data) => apiClient.put(`/inventory/update/${productId}`, data)
};

export const salesService = {
  createSale: (data) => apiClient.post('/sales', data),
  getSalesList: (params) => apiClient.get('/sales/list', { params }),
  getSaleDetails: (id) => apiClient.get(`/sales/${id}`),
  getTaxSetting: () => apiClient.get('/sales/tax')
};

export const returnsService = {
  getAllReturns: () => apiClient.get('/returns'),
  getReturn: (id) => apiClient.get(`/returns/${id}`),
  getSaleItems: (saleId) => apiClient.get(`/returns/sale/${saleId}/items`),
  createReturn: (data) => apiClient.post('/returns', data),
  getReturnsByDate: (params) => apiClient.get('/returns/list/filter', { params })
};

export const userService = {
  getAllUsers: () => apiClient.get('/users'),
  createUser: (data) => apiClient.post('/users', data),
  updateUser: (id, data) => apiClient.put(`/users/${id}`, data),
  deleteUser: (id) => apiClient.delete(`/users/${id}`)
};

export const reportService = {
  getSalesReport: (params) => apiClient.get('/reports/sales', { params }),
  getProfitReport: (params) => apiClient.get('/reports/profit', { params }),
  getProductWiseReport: (params) => apiClient.get('/reports/products', { params }),
  getCategoryWiseReport: (params) => apiClient.get('/reports/categories', { params }),
  getCashierWiseReport: (params) => apiClient.get('/reports/cashiers', { params }),
  getLowStockReport: () => apiClient.get('/reports/low-stock'),
  getInventoryReport: () => apiClient.get('/reports/inventory'),
  getDailyReport: () => apiClient.get('/reports/daily'),
  getWeeklyReport: () => apiClient.get('/reports/weekly'),
  getMonthlyReport: (params) => apiClient.get('/reports/monthly', { params })
};

export const settingsService = {
  getAllSettings: () => apiClient.get('/settings'),
  getSetting: (key) => apiClient.get(`/settings/${key}`),
  updateSetting: (key, value) => apiClient.put(`/settings/${key}`, { value }),
  backupDatabase: () => apiClient.get('/settings/backup', { responseType: 'blob' }),
  clearDatabase: () => apiClient.post('/settings/clear-database'),
  restoreDatabase: (file) => {
    const formData = new FormData();
    formData.append('backup', file);
    return apiClient.post('/settings/restore', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }
};

export default apiClient;
