const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { verifyToken, verifyRole } = require('../middleware/auth');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

module.exports = (db) => {
  const router = express.Router();
  
  // Configure multer for file uploads
  const upload = multer({ 
    dest: path.join(__dirname, '../../uploads/'),
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
  });

  // Get all settings (Admin only)
  router.get('/', verifyToken, verifyRole('admin'), async (req, res) => {
    try {
      const settings = await db.all('SELECT * FROM settings ORDER BY key');
      const settingsObj = {};
      settings.forEach(setting => {
        settingsObj[setting.key] = setting.value;
      });
      res.json(settingsObj);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Backup database (Admin only)
  router.get('/backup', verifyToken, verifyRole('admin'), (req, res) => {
    console.log('Backup route accessed');
    try {
      const dbPath = path.join(__dirname, '../../data/toyshop.db');
      console.log('Database path:', dbPath);
      
      if (!fs.existsSync(dbPath)) {
        console.error('Database file not found at:', dbPath);
        return res.status(404).json({ error: 'Database file not found' });
      }

      console.log('Sending database file...');
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename=toyshop-backup-${Date.now()}.db`);
      
      const fileStream = fs.createReadStream(dbPath);
      
      fileStream.on('error', (err) => {
        console.error('File stream error:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: err.message });
        } else {
          res.end();
        }
      });
      
      fileStream.on('end', () => {
        console.log('File stream ended successfully');
        res.end();
      });
      
      fileStream.pipe(res);
    } catch (err) {
      console.error('Backup route error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: err.message });
      }
    }
  });

  // Restore database (Admin only)
  router.post('/restore', verifyToken, verifyRole('admin'), upload.single('backup'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No backup file provided' });
      }

      const dbPath = path.join(__dirname, '../../data/toyshop.db');
      const backupPath = req.file.path;

      // Create backup of current database before restoring
      const backupCurrentPath = `${dbPath}.backup.${Date.now()}`;
      if (fs.existsSync(dbPath)) {
        fs.copyFileSync(dbPath, backupCurrentPath);
      }

      // Copy uploaded file to database location
      fs.copyFileSync(backupPath, dbPath);

      // Clean up uploaded file
      fs.unlinkSync(backupPath);

      res.json({ 
        message: 'Database restored successfully. Please refresh the page.',
        backupCreated: path.basename(backupCurrentPath)
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get single setting
  router.get('/:key', verifyToken, async (req, res) => {
    try {
      const setting = await db.get(
        'SELECT * FROM settings WHERE key = ?',
        [req.params.key]
      );
      if (!setting) {
        return res.status(404).json({ error: 'Setting not found' });
      }
      res.json({ key: setting.key, value: setting.value });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Update setting (Admin only)
  router.put('/:key', verifyToken, verifyRole('admin'), async (req, res) => {
    try {
      const { value } = req.body;
      const { key } = req.params;

      if (value === undefined || value === null) {
        return res.status(400).json({ error: 'Value is required' });
      }

      // Check if setting exists
      const existing = await db.get(
        'SELECT id FROM settings WHERE key = ?',
        [key]
      );

      if (existing) {
        await db.run(
          'UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?',
          [String(value), key]
        );
      } else {
        await db.run(
          'INSERT INTO settings (id, key, value) VALUES (?, ?, ?)',
          [uuidv4(), key, String(value)]
        );
      }

      res.json({ message: 'Setting updated', key, value });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
