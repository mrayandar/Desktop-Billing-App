const express = require('express');
const { verifyToken, verifyRole } = require('../middleware/auth');

module.exports = (db) => {
  const router = express.Router();

  // Get sales report
  router.get('/sales', verifyToken, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      let query = `SELECT 
                     DATE(sale_date) as date, 
                     SUM(total) as total_sales, 
                     COUNT(*) as transaction_count
                   FROM sales WHERE 1=1`;
      const params = [];

      if (startDate) {
        query += ' AND DATE(sale_date) >= ?';
        params.push(startDate);
      }

      if (endDate) {
        query += ' AND DATE(sale_date) <= ?';
        params.push(endDate);
      }

      query += ' GROUP BY DATE(sale_date) ORDER BY date ASC';

      const report = await db.all(query, params);
      
      // If no data, return empty array
      res.json(report || []);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get profit report
  router.get('/profit', verifyToken, verifyRole('admin'), async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      // Calculate profit using purchase_price from products
      let query = `SELECT 
                     DATE(s.sale_date) as date,
                     SUM(s.subtotal) as total_revenue,
                     SUM(s.tax) as total_tax,
                     SUM(s.discount) as total_discount,
                     SUM(s.total) as total_sales,
                     COUNT(*) as transaction_count,
                     SUM(s.subtotal) - COALESCE(SUM(si.quantity * p.purchase_price), 0) as profit
                   FROM sales s
                   LEFT JOIN sale_items si ON s.id = si.sale_id
                   LEFT JOIN products p ON si.product_id = p.id
                   WHERE 1=1`;
      const params = [];

      if (startDate) {
        query += ' AND DATE(s.sale_date) >= ?';
        params.push(startDate);
      }

      if (endDate) {
        query += ' AND DATE(s.sale_date) <= ?';
        params.push(endDate);
      }

      query += ' GROUP BY DATE(s.sale_date) ORDER BY date ASC';

      const profit = await db.all(query, params);
      res.json(profit || []);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get product-wise sales report (Admin only)
  router.get('/products', verifyToken, verifyRole('admin'), async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      let query = `SELECT 
                     p.id as product_id,
                     p.name as product_name,
                     SUM(si.quantity) as total_quantity_sold,
                     SUM(si.item_total) as total_revenue
                   FROM sale_items si
                   JOIN products p ON si.product_id = p.id
                   JOIN sales s ON si.sale_id = s.id
                   WHERE 1=1`;
      const params = [];

      if (startDate) {
        query += ' AND DATE(s.sale_date) >= ?';
        params.push(startDate);
      }

      if (endDate) {
        query += ' AND DATE(s.sale_date) <= ?';
        params.push(endDate);
      }

      query += ' GROUP BY p.id, p.name ORDER BY total_revenue DESC';

      const report = await db.all(query, params);
      res.json(report || []);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get category-wise sales report (Admin only)
  router.get('/categories', verifyToken, verifyRole('admin'), async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      let query = `SELECT 
                     c.id as category_id,
                     c.name as category_name,
                     SUM(si.quantity) as total_quantity_sold,
                     SUM(si.item_total) as total_revenue
                   FROM sale_items si
                   JOIN products p ON si.product_id = p.id
                   JOIN categories c ON p.category_id = c.id
                   JOIN sales s ON si.sale_id = s.id
                   WHERE 1=1`;
      const params = [];

      if (startDate) {
        query += ' AND DATE(s.sale_date) >= ?';
        params.push(startDate);
      }

      if (endDate) {
        query += ' AND DATE(s.sale_date) <= ?';
        params.push(endDate);
      }

      query += ' GROUP BY c.id, c.name ORDER BY total_revenue DESC';

      const report = await db.all(query, params);
      res.json(report || []);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get cashier-wise sales report (Admin only)
  router.get('/cashiers', verifyToken, verifyRole('admin'), async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      let query = `SELECT 
                     u.id,
                     u.username,
                     COUNT(DISTINCT s.id) as transaction_count,
                     SUM(s.total) as total_sales,
                     AVG(s.total) as average_transaction
                   FROM sales s
                   JOIN users u ON s.cashier_id = u.id
                   WHERE 1=1`;
      const params = [];

      if (startDate) {
        query += ' AND DATE(s.sale_date) >= ?';
        params.push(startDate);
      }

      if (endDate) {
        query += ' AND DATE(s.sale_date) <= ?';
        params.push(endDate);
      }

      query += ' GROUP BY u.id, u.username ORDER BY total_sales DESC';

      const report = await db.all(query, params);
      res.json(report || []);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get low stock report (Admin only)
  router.get('/low-stock', verifyToken, verifyRole('admin'), async (req, res) => {
    try {
      const lowStockItems = await db.all(`
        SELECT 
          p.id,
          p.name,
          p.barcode,
          c.name as category_name,
          i.quantity as current_stock,
          p.min_stock,
          p.price,
          (p.min_stock - i.quantity) as units_below_threshold
        FROM products p
        JOIN inventory i ON p.id = i.product_id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE i.quantity <= p.min_stock AND p.status = 'available'
        ORDER BY i.quantity ASC
      `);

      res.json(lowStockItems || []);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get inventory report (Admin only)
  router.get('/inventory', verifyToken, verifyRole('admin'), async (req, res) => {
    try {
      const inventoryReport = await db.all(`
        SELECT 
          p.id,
          p.name,
          p.barcode,
          c.name as category_name,
          i.quantity as current_stock,
          p.min_stock,
          p.price as unit_price,
          p.purchase_price as cost_price,
          (i.quantity * p.price) as stock_value,
          (i.quantity * p.purchase_price) as stock_cost,
          CASE 
            WHEN i.quantity <= 0 THEN 'Out of Stock'
            WHEN i.quantity <= p.min_stock THEN 'Low Stock'
            ELSE 'In Stock'
          END as stock_status
        FROM products p
        JOIN inventory i ON p.id = i.product_id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.status = 'available'
        ORDER BY c.name, p.name
      `);

      // Calculate summary
      const summary = {
        totalProducts: inventoryReport.length,
        totalStockValue: inventoryReport.reduce((sum, item) => sum + (item.stock_value || 0), 0),
        totalStockCost: inventoryReport.reduce((sum, item) => sum + (item.stock_cost || 0), 0),
        lowStockCount: inventoryReport.filter(item => item.stock_status === 'Low Stock').length,
        outOfStockCount: inventoryReport.filter(item => item.stock_status === 'Out of Stock').length
      };

      res.json({ items: inventoryReport, summary });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get daily sales report
  router.get('/daily', verifyToken, async (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const dailyReport = await db.all(`
        SELECT 
          strftime('%H:00', sale_date) as hour,
          COUNT(*) as transaction_count,
          SUM(total) as total_sales,
          SUM(subtotal) as subtotal,
          SUM(tax) as total_tax,
          SUM(discount) as total_discount
        FROM sales
        WHERE DATE(sale_date) = ?
        GROUP BY strftime('%H', sale_date)
        ORDER BY hour
      `, [today]);

      res.json(dailyReport || []);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get weekly sales report
  router.get('/weekly', verifyToken, async (req, res) => {
    try {
      const weeklyReport = await db.all(`
        SELECT 
          DATE(sale_date) as date,
          strftime('%w', sale_date) as day_of_week,
          COUNT(*) as transaction_count,
          SUM(total) as total_sales,
          SUM(subtotal) as subtotal,
          SUM(tax) as total_tax,
          SUM(discount) as total_discount
        FROM sales
        WHERE DATE(sale_date) >= DATE('now', '-7 days')
        GROUP BY DATE(sale_date)
        ORDER BY date
      `);

      res.json(weeklyReport || []);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get monthly sales report
  router.get('/monthly', verifyToken, async (req, res) => {
    try {
      const { year, month } = req.query;
      const targetYear = year || new Date().getFullYear();
      const targetMonth = month || (new Date().getMonth() + 1);

      const monthlyReport = await db.all(`
        SELECT 
          DATE(sale_date) as date,
          COUNT(*) as transaction_count,
          SUM(total) as total_sales,
          SUM(subtotal) as subtotal,
          SUM(tax) as total_tax,
          SUM(discount) as total_discount
        FROM sales
        WHERE strftime('%Y', sale_date) = ? AND strftime('%m', sale_date) = ?
        GROUP BY DATE(sale_date)
        ORDER BY date
      `, [String(targetYear), String(targetMonth).padStart(2, '0')]);

      res.json(monthlyReport || []);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
