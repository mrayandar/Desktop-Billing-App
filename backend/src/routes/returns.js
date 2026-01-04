const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { verifyToken, verifyRole } = require('../middleware/auth');

module.exports = (db) => {
  const router = express.Router();

  // Get all returns (Admin only)
  router.get('/', verifyToken, verifyRole('admin'), async (req, res) => {
    try {
      const returns = await db.all(`
        SELECT r.*, s.bill_number, u.username as cashier_name
        FROM returns r
        JOIN sales s ON r.sale_id = s.id
        JOIN users u ON r.cashier_id = u.id
        ORDER BY r.return_date DESC
      `);
      res.json(returns);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get return details with items
  router.get('/:id', verifyToken, async (req, res) => {
    try {
      const returnData = await db.get(`
        SELECT r.*, s.bill_number, u.username as cashier_name
        FROM returns r
        JOIN sales s ON r.sale_id = s.id
        JOIN users u ON r.cashier_id = u.id
        WHERE r.id = ?
      `, [req.params.id]);

      if (!returnData) {
        return res.status(404).json({ error: 'Return not found' });
      }

      const items = await db.all(`
        SELECT ri.*, p.name as product_name, p.barcode
        FROM return_items ri
        JOIN products p ON ri.product_id = p.id
        WHERE ri.return_id = ?
      `, [req.params.id]);

      res.json({ return: returnData, items });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get sale items for a specific sale (to process return)
  router.get('/sale/:saleId/items', verifyToken, async (req, res) => {
    try {
      const sale = await db.get('SELECT * FROM sales WHERE id = ?', [req.params.saleId]);
      
      if (!sale) {
        return res.status(404).json({ error: 'Sale not found' });
      }

      // Check if user has permission (admin or the cashier who made the sale)
      if (req.user.role !== 'admin' && sale.cashier_id !== req.user.id) {
        return res.status(403).json({ error: 'Unauthorized access' });
      }

      const items = await db.all(`
        SELECT si.*, p.name as product_name, p.barcode,
               (SELECT COALESCE(SUM(ri.quantity), 0) 
                FROM return_items ri 
                WHERE ri.sale_item_id = si.id) as returned_quantity
        FROM sale_items si
        JOIN products p ON si.product_id = p.id
        WHERE si.sale_id = ?
      `, [req.params.saleId]);

      res.json({ sale, items });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Create return
  router.post('/', verifyToken, verifyRole('cashier'), async (req, res) => {
    try {
      const { sale_id, items, refund_method, reason = '' } = req.body;

      if (!sale_id || !items || items.length === 0) {
        return res.status(400).json({ error: 'Sale ID and items are required' });
      }

      // Verify sale exists
      const sale = await db.get('SELECT * FROM sales WHERE id = ?', [sale_id]);
      if (!sale) {
        return res.status(404).json({ error: 'Sale not found' });
      }

      // Check if user has permission (admin or the cashier who made the sale)
      if (req.user.role !== 'admin' && sale.cashier_id !== req.user.id) {
        return res.status(403).json({ error: 'Unauthorized: You can only return your own sales' });
      }

      // Validate return items
      let totalRefund = 0;
      for (const item of items) {
        const saleItem = await db.get('SELECT * FROM sale_items WHERE id = ?', [item.sale_item_id]);
        if (!saleItem) {
          return res.status(400).json({ error: `Sale item ${item.sale_item_id} not found` });
        }

        // Check if already returned
        const alreadyReturned = await db.get(`
          SELECT COALESCE(SUM(quantity), 0) as returned_qty
          FROM return_items
          WHERE sale_item_id = ?
        `, [item.sale_item_id]);

        const availableToReturn = saleItem.quantity - (alreadyReturned.returned_qty || 0);
        if (item.quantity > availableToReturn) {
          return res.status(400).json({ 
            error: `Cannot return ${item.quantity} items. Only ${availableToReturn} available to return.` 
          });
        }

        totalRefund += item.quantity * saleItem.unit_price;
      }

      const returnId = uuidv4();
      const returnNumber = `RET-${Date.now()}`;

      // Create return record
      await db.run(
        `INSERT INTO returns (id, return_number, sale_id, cashier_id, total_refund, refund_method, reason)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [returnId, returnNumber, sale_id, req.user.id, totalRefund, refund_method, reason]
      );

      // Create return items and update inventory
      for (const item of items) {
        const saleItem = await db.get('SELECT * FROM sale_items WHERE id = ?', [item.sale_item_id]);
        const itemRefund = item.quantity * saleItem.unit_price;

        await db.run(
          `INSERT INTO return_items (id, return_id, sale_item_id, product_id, quantity, unit_price, item_refund)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [uuidv4(), returnId, item.sale_item_id, saleItem.product_id, item.quantity, saleItem.unit_price, itemRefund]
        );

        // Update inventory - add back the returned quantity
        await db.run(
          'UPDATE inventory SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE product_id = ?',
          [item.quantity, saleItem.product_id]
        );
      }

      res.status(201).json({ 
        message: 'Return processed successfully', 
        returnId, 
        returnNumber,
        totalRefund 
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get returns by date range
  router.get('/list/filter', verifyToken, verifyRole('admin'), async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      let query = `
        SELECT r.*, s.bill_number, u.username as cashier_name
        FROM returns r
        JOIN sales s ON r.sale_id = s.id
        JOIN users u ON r.cashier_id = u.id
        WHERE 1=1
      `;
      const params = [];

      if (startDate) {
        query += ' AND DATE(r.return_date) >= ?';
        params.push(startDate);
      }

      if (endDate) {
        query += ' AND DATE(r.return_date) <= ?';
        params.push(endDate);
      }

      query += ' ORDER BY r.return_date DESC';

      const returns = await db.all(query, params);
      res.json(returns);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};

