const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { verifyToken, verifyRole } = require('../middleware/auth');

module.exports = (db) => {
  const router = express.Router();

  // Get all products
  router.get('/', verifyToken, async (req, res) => {
    try {
      const products = await db.all(`
        SELECT p.*, c.name as category_name, i.quantity
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN inventory i ON p.id = i.product_id
        ORDER BY p.name
      `);

      res.json(products);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Search products by name or barcode
  router.get('/search/:query', verifyToken, async (req, res) => {
    try {
      const { query } = req.params;
      const products = await db.all(`
        SELECT p.*, c.name as category_name, i.quantity
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN inventory i ON p.id = i.product_id
        WHERE p.name LIKE ? OR p.barcode LIKE ?
        LIMIT 10
      `, [`%${query}%`, `%${query}%`]);

      res.json(products);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get products by category
  router.get('/category/:categoryId', verifyToken, async (req, res) => {
    try {
      const { categoryId } = req.params;
      const products = await db.all(`
        SELECT p.*, c.name as category_name, i.quantity
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN inventory i ON p.id = i.product_id
        WHERE p.category_id = ?
        ORDER BY p.name
      `, [categoryId]);

      res.json(products);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Create product (Admin only)
  router.post('/', verifyToken, verifyRole('admin'), async (req, res) => {
    try {
      const { barcode, name, description, category_id, price, purchase_price, min_stock, age_group } = req.body;

      if (!name || !category_id || !price) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const productId = uuidv4();

      await db.run(
        'INSERT INTO products (id, barcode, name, description, category_id, price, purchase_price, min_stock, age_group) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [productId, barcode, name, description || '', category_id, price, purchase_price || 0, min_stock || 10, age_group]
      );

      // Create inventory entry
      await db.run(
        'INSERT INTO inventory (id, product_id, quantity) VALUES (?, ?, ?)',
        [uuidv4(), productId, 0]
      );

      res.status(201).json({ message: 'Product created', productId });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Update product (Admin only)
  router.put('/:id', verifyToken, verifyRole('admin'), async (req, res) => {
    try {
      const { name, description, barcode, category_id, price, purchase_price, min_stock, age_group, status } = req.body;

      await db.run(
        'UPDATE products SET name = ?, description = ?, barcode = ?, category_id = ?, price = ?, purchase_price = ?, min_stock = ?, age_group = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [name, description || '', barcode || '', category_id, price, purchase_price || 0, min_stock, age_group, status, req.params.id]
      );

      res.json({ message: 'Product updated' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete product (Admin only)
  router.delete('/:id', verifyToken, verifyRole('admin'), async (req, res) => {
    try {
      await db.run('DELETE FROM products WHERE id = ?', [req.params.id]);
      res.json({ message: 'Product deleted' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
