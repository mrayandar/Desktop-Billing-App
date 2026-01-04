const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { SECRET_KEY } = require('../middleware/auth');

module.exports = (db) => {
  const router = express.Router();

  // Login
  router.post('/login', async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
      }

      const user = await db.get(
        'SELECT * FROM users WHERE username = ? AND status = "active"',
        [username]
      );

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const passwordMatch = await bcrypt.compare(password, user.password);

      if (!passwordMatch) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        SECRET_KEY,
        { expiresIn: '24h' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Register (Admin only)
  router.post('/register', async (req, res) => {
    try {
      const { username, password, email, role } = req.body;

      if (!username || !password || !role) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const existingUser = await db.get(
        'SELECT id FROM users WHERE username = ?',
        [username]
      );

      if (existingUser) {
        return res.status(400).json({ error: 'Username already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const userId = uuidv4();

      await db.run(
        'INSERT INTO users (id, username, password, email, role) VALUES (?, ?, ?, ?, ?)',
        [userId, username, hashedPassword, email, role]
      );

      res.status(201).json({
        message: 'User created successfully',
        userId
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
