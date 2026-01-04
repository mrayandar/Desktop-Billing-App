const express = require('express');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { verifyToken, verifyRole } = require('../middleware/auth');

module.exports = (db) => {
  const router = express.Router();

  // Get all users (Admin only)
  router.get('/', verifyToken, verifyRole('admin'), async (req, res) => {
    try {
      const users = await db.all('SELECT id, username, email, role, status, created_at FROM users ORDER BY created_at DESC');
      res.json(users);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Create user (Admin only)
  router.post('/', verifyToken, verifyRole('admin'), async (req, res) => {
    try {
      const { username, password, email, role } = req.body;

      if (!username || !password || !role) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const existingUser = await db.get('SELECT id FROM users WHERE username = ?', [username]);
      if (existingUser) {
        return res.status(400).json({ error: 'Username already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const userId = uuidv4();

      await db.run(
        'INSERT INTO users (id, username, password, email, role) VALUES (?, ?, ?, ?, ?)',
        [userId, username, hashedPassword, email, role]
      );

      res.status(201).json({ message: 'User created', userId });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Update user (Admin only)
  router.put('/:id', verifyToken, verifyRole('admin'), async (req, res) => {
    try {
      const { username, password, email, role, status } = req.body;

      // Check if username is being changed and if it already exists
      if (username) {
        const existingUser = await db.get(
          'SELECT id FROM users WHERE username = ? AND id != ?',
          [username, req.params.id]
        );
        if (existingUser) {
          return res.status(400).json({ error: 'Username already exists' });
        }
      }

      // Build dynamic update query
      let updateFields = [];
      let params = [];

      if (username) {
        updateFields.push('username = ?');
        params.push(username);
      }
      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        updateFields.push('password = ?');
        params.push(hashedPassword);
      }
      if (email !== undefined) {
        updateFields.push('email = ?');
        params.push(email);
      }
      if (role) {
        updateFields.push('role = ?');
        params.push(role);
      }
      if (status) {
        updateFields.push('status = ?');
        params.push(status);
      }

      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      params.push(req.params.id);

      await db.run(
        `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
        params
      );

      res.json({ message: 'User updated' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete user (Admin only)
  router.delete('/:id', verifyToken, verifyRole('admin'), async (req, res) => {
    try {
      await db.run('DELETE FROM users WHERE id = ?', [req.params.id]);
      res.json({ message: 'User deleted' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
