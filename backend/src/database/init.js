const Database = require('./database');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

async function initializeDatabase() {
  const db = new Database(path.join(__dirname, '../data/toyshop.db'));

  try {
    // Wait for database to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check if admin user exists
    const adminUser = await db.get(
      'SELECT id FROM users WHERE username = "admin" LIMIT 1'
    );

    if (!adminUser) {
      // Create default admin user
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
      console.log('Default admin user created - Username: admin, Password: admin123');
    }

    // Create default settings if they don't exist
    const taxSetting = await db.get(
      'SELECT value FROM settings WHERE key = "tax_percentage"'
    );

    if (!taxSetting) {
      await db.run(
        'INSERT INTO settings (id, key, value) VALUES (?, ?, ?)',
        [uuidv4(), 'tax_percentage', '10']
      );
      console.log('Default tax percentage set to 10%');
    }

    // Create some sample categories and products
    const sampleCategory = await db.get(
      'SELECT id FROM categories LIMIT 1'
    );

    if (!sampleCategory) {
      const categoryId = uuidv4();
      await db.run(
        'INSERT INTO categories (id, name, description) VALUES (?, ?, ?)',
        [categoryId, 'Action Figures', 'Collectible action figures']
      );

      // Add sample products
      const products = [
        {
          name: 'Robot Hero',
          barcode: 'PROD001',
          category_id: categoryId,
          price: 29.99,
          age_group: '5-10',
          quantity: 50
        },
        {
          name: 'Dinosaur Set',
          barcode: 'PROD002',
          category_id: categoryId,
          price: 39.99,
          age_group: '3-8',
          quantity: 35
        },
        {
          name: 'Building Blocks',
          barcode: 'PROD003',
          category_id: categoryId,
          price: 49.99,
          age_group: '4-12',
          quantity: 20
        }
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

      console.log('Sample products created');
    }

    console.log('Database initialization complete');
    await db.close();
  } catch (err) {
    console.error('Database initialization error:', err);
    process.exit(1);
  }
}

// Run initialization
if (require.main === module) {
  initializeDatabase().then(() => {
    console.log('Initialization finished');
    process.exit(0);
  }).catch(err => {
    console.error('Initialization failed:', err);
    process.exit(1);
  });
}

module.exports = initializeDatabase;
