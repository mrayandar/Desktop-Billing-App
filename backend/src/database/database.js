const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

class Database {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.db = null;
    this.initialize();
  }

  initialize() {
    // Create data directory if it doesn't exist
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new sqlite3.Database(this.dbPath, (err) => {
      if (err) {
        console.error('Database connection error:', err);
      } else {
        console.log('Connected to SQLite database');
        this.runSchema();
      }
    });

    // Enable foreign keys
    this.db.run('PRAGMA foreign_keys = ON');
  }

  runSchema() {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    this.db.exec(schema, (err) => {
      if (err) {
        console.error('Schema execution error:', err);
      } else {
        console.log('Database schema initialized');
        this.runMigrations();
      }
    });
  }

  runMigrations() {
    // Migration: Add purchase_price column to products if it doesn't exist
    this.db.all("PRAGMA table_info(products)", (err, columns) => {
      if (err) {
        console.error('Migration check error:', err);
        return;
      }
      
      const hasPurchasePrice = columns.some(col => col.name === 'purchase_price');
      if (!hasPurchasePrice) {
        this.db.run("ALTER TABLE products ADD COLUMN purchase_price REAL NOT NULL DEFAULT 0", (err) => {
          if (err) {
            console.error('Migration error adding purchase_price:', err);
          } else {
            console.log('✅ Migration: Added purchase_price column to products');
          }
        });
      }
    });
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}

module.exports = Database;
