const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { verifyToken, verifyRole } = require('../middleware/auth');

module.exports = (db) => {
  const router = express.Router();

  // Get tax setting
  router.get('/tax', verifyToken, async (req, res) => {
    try {
      const taxSetting = await db.get(
        'SELECT value FROM settings WHERE key = "tax_percentage"'
      );
      const taxPercentage = taxSetting ? parseFloat(taxSetting.value) : 0;
      res.json({ taxPercentage });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Create sale
  router.post('/', verifyToken, verifyRole('cashier'), async (req, res) => {
    try {
      const { items, payment_method, paid_amount, discount = 0, customer_name = null, customer_phone = null, notes = '' } = req.body;

      if (!items || items.length === 0) {
        return res.status(400).json({ error: 'No items in sale' });
      }

      // Check discount permission - only admin can apply discounts, or check setting
      if (discount > 0 && req.user.role !== 'admin') {
        const discountAllowed = await db.get(
          'SELECT value FROM settings WHERE key = "cashier_discount_allowed"'
        );
        const allowDiscount = discountAllowed && discountAllowed.value === 'true';
        
        if (!allowDiscount) {
          return res.status(403).json({ error: 'You do not have permission to apply discounts. Only administrators can apply discounts.' });
        }
      }

      // Validate stock availability before processing
      for (const item of items) {
        const inventory = await db.get(
          'SELECT quantity FROM inventory WHERE product_id = ?',
          [item.product_id]
        );

        if (!inventory) {
          return res.status(400).json({ error: `Product ${item.product_id} not found in inventory` });
        }

        if (inventory.quantity < item.quantity) {
          const product = await db.get('SELECT name FROM products WHERE id = ?', [item.product_id]);
          return res.status(400).json({ 
            error: `Insufficient stock for ${product?.name || 'product'}. Available: ${inventory.quantity}, Requested: ${item.quantity}` 
          });
        }
      }

      const saleId = uuidv4();
      
      // Generate incremental bill number
      const lastSale = await db.get('SELECT bill_number FROM sales ORDER BY CAST(bill_number AS INTEGER) DESC LIMIT 1');
      let nextBillNumber = 1;
      if (lastSale && lastSale.bill_number) {
        const lastNumber = parseInt(lastSale.bill_number, 10);
        if (!isNaN(lastNumber)) {
          nextBillNumber = lastNumber + 1;
        }
      }
      const billNumber = String(nextBillNumber);

      // Calculate totals
      let subtotal = 0;
      for (const item of items) {
        subtotal += item.unit_price * item.quantity;
      }

      // Get tax percentage
      const taxSetting = await db.get(
        'SELECT value FROM settings WHERE key = "tax_percentage"'
      );
      const taxPercentage = taxSetting ? parseFloat(taxSetting.value) : 0;
      const tax = (subtotal * taxPercentage) / 100;
      const total = subtotal + tax - discount;
      const change = paid_amount - total;

      // Insert sale
      await db.run(
        `INSERT INTO sales (id, bill_number, cashier_id, customer_name, customer_phone, subtotal, tax, discount, total, payment_method, paid_amount, change_amount, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [saleId, billNumber, req.user.id, customer_name, customer_phone, subtotal, tax, discount, total, payment_method, paid_amount, change, notes]
      );

      // Insert sale items and update inventory
      for (const item of items) {
        await db.run(
          'INSERT INTO sale_items (id, sale_id, product_id, quantity, unit_price, item_total) VALUES (?, ?, ?, ?, ?, ?)',
          [uuidv4(), saleId, item.product_id, item.quantity, item.unit_price, item.unit_price * item.quantity]
        );

        // Reduce inventory
        await db.run(
          'UPDATE inventory SET quantity = quantity - ? WHERE product_id = ?',
          [item.quantity, item.product_id]
        );
      }

      res.status(201).json({
        message: 'Sale created',
        saleId,
        billNumber,
        total,
        change
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get sales by date range
  router.get('/list', verifyToken, async (req, res) => {
    try {
      const { start_date, end_date } = req.query;

      let query = 'SELECT * FROM sales WHERE 1=1';
      const params = [];

      // Filter by cashier if user is cashier (not admin)
      if (req.user.role === 'cashier') {
        query += ' AND cashier_id = ?';
        params.push(req.user.id);
      }

      if (start_date) {
        query += ' AND DATE(sale_date) >= ?';
        params.push(start_date);
      }

      if (end_date) {
        query += ' AND DATE(sale_date) <= ?';
        params.push(end_date);
      }

      query += ' ORDER BY sale_date DESC';

      const sales = await db.all(query, params);
      res.json(sales);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get sale details
  router.get('/:id', verifyToken, async (req, res) => {
    try {
      const sale = await db.get('SELECT * FROM sales WHERE id = ?', [req.params.id]);
      const items = await db.all(
        `SELECT si.*, p.name, p.barcode FROM sale_items si
         JOIN products p ON si.product_id = p.id
         WHERE si.sale_id = ?`,
        [req.params.id]
      );

      res.json({ sale, items });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
