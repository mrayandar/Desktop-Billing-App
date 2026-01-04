const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { verifyToken, verifyRole } = require('../middleware/auth');

module.exports = (db) => {
  const router = express.Router();

  // Get all categories
  router.get('/', verifyToken, async (req, res) => {
    try {
      const categories = await db.all(
        'SELECT * FROM categories ORDER BY name'
      );
      res.json(categories);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get single category
  router.get('/:id', verifyToken, async (req, res) => {
    try {
      const category = await db.get(
        'SELECT * FROM categories WHERE id = ?',
        [req.params.id]
      );
      if (!category) {
        return res.status(404).json({ error: 'Category not found' });
      }
      res.json(category);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Create category (Admin only)
  router.post('/', verifyToken, verifyRole('admin'), async (req, res) => {
    try {
      const { name, description } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Category name is required' });
      }

      // Check if category name already exists
      const existing = await db.get(
        'SELECT id FROM categories WHERE name = ?',
        [name]
      );

      if (existing) {
        return res.status(400).json({ error: 'Category name already exists' });
      }

      const categoryId = uuidv4();

      await db.run(
        'INSERT INTO categories (id, name, description) VALUES (?, ?, ?)',
        [categoryId, name, description || null]
      );

      res.status(201).json({
        message: 'Category created',
        categoryId,
        category: { id: categoryId, name, description }
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Update category (Admin only)
  router.put('/:id', verifyToken, verifyRole('admin'), async (req, res) => {
    try {
      const { name, description } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Category name is required' });
      }

      // Check if category exists
      const existing = await db.get(
        'SELECT id FROM categories WHERE id = ?',
        [req.params.id]
      );

      if (!existing) {
        return res.status(404).json({ error: 'Category not found' });
      }

      // Check if new name conflicts with another category
      const nameConflict = await db.get(
        'SELECT id FROM categories WHERE name = ? AND id != ?',
        [name, req.params.id]
      );

      if (nameConflict) {
        return res.status(400).json({ error: 'Category name already exists' });
      }

      await db.run(
        'UPDATE categories SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [name, description || null, req.params.id]
      );

      res.json({ message: 'Category updated' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete category (Admin only)
  router.delete('/:id', verifyToken, verifyRole('admin'), async (req, res) => {
    try {
      // Check if category exists
      const category = await db.get(
        'SELECT id FROM categories WHERE id = ?',
        [req.params.id]
      );

      if (!category) {
        return res.status(404).json({ error: 'Category not found' });
      }

      // Check if category is used by any products
      const productsUsingCategory = await db.get(
        'SELECT id FROM products WHERE category_id = ? LIMIT 1',
        [req.params.id]
      );

      if (productsUsingCategory) {
        return res.status(400).json({
          error: 'Cannot delete category. It is being used by one or more products.'
        });
      }

      await db.run('DELETE FROM categories WHERE id = ?', [req.params.id]);

      res.json({ message: 'Category deleted' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};

