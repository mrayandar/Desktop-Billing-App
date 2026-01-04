const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { verifyToken, verifyRole } = require('../middleware/auth');

module.exports = (db) => {
  const router = express.Router();

  // Get all inventory
  router.get('/', verifyToken, verifyRole('admin'), async (req, res) => {
    try {
      const inventory = await db.all(`
        SELECT i.*, p.name, p.barcode, p.min_stock
        FROM inventory i
        JOIN products p ON i.product_id = p.id
        ORDER BY p.name
      `);

      res.json(inventory);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get low stock items
  router.get('/low-stock', verifyToken, async (req, res) => {
    try {
      const lowStock = await db.all(`
        SELECT p.id, p.name, p.barcode, i.quantity, p.min_stock
        FROM inventory i
        JOIN products p ON i.product_id = p.id
        WHERE i.quantity <= p.min_stock AND p.status = 'available'
        ORDER BY i.quantity ASC
      `);

      res.json(lowStock);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Update stock (Admin only)
  router.put('/update/:product_id', verifyToken, verifyRole('admin'), async (req, res) => {
    try {
      const { quantity, adjustment_type } = req.body;
      const { product_id } = req.params;

      if (adjustment_type === 'add') {
        await db.run(
          'UPDATE inventory SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE product_id = ?',
          [quantity, product_id]
        );
      } else if (adjustment_type === 'subtract') {
        // Use CASE to ensure quantity doesn't go below 0
        await db.run(
          'UPDATE inventory SET quantity = CASE WHEN quantity - ? < 0 THEN 0 ELSE quantity - ? END, updated_at = CURRENT_TIMESTAMP WHERE product_id = ?',
          [quantity, quantity, product_id]
        );
      } else if (adjustment_type === 'set') {
        await db.run(
          'UPDATE inventory SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE product_id = ?',
          [quantity, product_id]
        );
      }

      res.json({ message: 'Inventory updated' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
