const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('./database/database');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 5000;

// Determine database path (support Electron packaged app)
const dataDir = process.env.DATA_DIR || path.join(__dirname, '../data');
const dbPath = path.join(dataDir, 'toyshop.db');

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint for Electron
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Initialize database
const db = new Database(dbPath);

// Initialize default data
async function initializeDefaultData() {
  try {
    // Wait a bit for database to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Run migrations - add customer columns if they don't exist
    try {
      await db.run('ALTER TABLE sales ADD COLUMN customer_name TEXT');
      console.log('✅ Added customer_name column to sales table');
    } catch (e) {
      // Column already exists, ignore
    }
    try {
      await db.run('ALTER TABLE sales ADD COLUMN customer_phone TEXT');
      console.log('✅ Added customer_phone column to sales table');
    } catch (e) {
      // Column already exists, ignore
    }
    // Add description column to products table
    try {
      await db.run('ALTER TABLE products ADD COLUMN description TEXT');
      console.log('✅ Added description column to products table');
    } catch (e) {
      // Column already exists, ignore
    }

    // Check if admin user exists
    const adminUser = await db.get(
      'SELECT id FROM users WHERE username = "admin" LIMIT 1'
    );

    if (!adminUser) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await db.run(
        'INSERT INTO users (id, username, password, email, role, status) VALUES (?, ?, ?, ?, ?, ?)',
        [
          uuidv4(),
          'admin',
          hashedPassword,
          'admin@toyshop.local',
          'admin',
          'active'
        ]
      );
      console.log('✅ Default admin user created - Username: admin, Password: admin123');
    }

    // Create default settings
    const taxSetting = await db.get(
      'SELECT value FROM settings WHERE key = "tax_percentage"'
    );

    if (!taxSetting) {
      await db.run(
        'INSERT INTO settings (id, key, value) VALUES (?, ?, ?)',
        [uuidv4(), 'tax_percentage', '10']
      );
      console.log('✅ Default tax percentage set to 10%');
    }

    // Create sample category and products
    const sampleCategory = await db.get(
      'SELECT id FROM categories LIMIT 1'
    );

    if (!sampleCategory) {
      const categoryId = uuidv4();
      await db.run(
        'INSERT INTO categories (id, name, description) VALUES (?, ?, ?)',
        [categoryId, 'Action Figures', 'Collectible action figures']
      );

      const products = [
        { name: 'Robot Hero', barcode: 'PROD001', category_id: categoryId, price: 29.99, age_group: '5-10', quantity: 50 },
        { name: 'Dinosaur Set', barcode: 'PROD002', category_id: categoryId, price: 39.99, age_group: '3-8', quantity: 35 },
        { name: 'Building Blocks', barcode: 'PROD003', category_id: categoryId, price: 49.99, age_group: '4-12', quantity: 20 }
      ];

      for (const product of products) {
        const productId = uuidv4();
        await db.run(
          'INSERT INTO products (id, barcode, name, category_id, price, age_group) VALUES (?, ?, ?, ?, ?, ?)',
          [productId, product.barcode, product.name, product.category_id, product.price, product.age_group]
        );

        await db.run(
          'INSERT INTO inventory (id, product_id, quantity) VALUES (?, ?, ?)',
          [uuidv4(), productId, product.quantity]
        );
      }
      console.log('✅ Sample products created');
    }

    console.log('✅ Database initialization complete');
  } catch (err) {
    console.error('❌ Database initialization error:', err.message);
  }
}

// Routes
app.use('/api/auth', require('./routes/auth')(db));
app.use('/api/categories', require('./routes/categories')(db));
app.use('/api/products', require('./routes/products')(db));
app.use('/api/inventory', require('./routes/inventory')(db));
app.use('/api/sales', require('./routes/sales')(db));
app.use('/api/returns', require('./routes/returns')(db));
app.use('/api/users', require('./routes/users')(db));
app.use('/api/reports', require('./routes/reports')(db));
app.use('/api/settings', require('./routes/settings')(db));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server after initialization
initializeDefaultData().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize:', err);
  process.exit(1);
});

module.exports = app;
