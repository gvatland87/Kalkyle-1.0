import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// For Render: bruk /var/data for persistent storage (krever disk)
// Fallback til ./data hvis /var/data ikke finnes
// For lokal utvikling: bruk prosjektmappen
let dbDir: string;

if (process.env.NODE_ENV === 'production') {
  if (fs.existsSync('/var/data')) {
    dbDir = '/var/data';
  } else {
    dbDir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
  }
} else {
  dbDir = path.resolve(process.cwd());
}

const dbPath = path.join(dbDir, 'database.sqlite');

console.log(`Database path: ${dbPath}`);
console.log(`Directory exists: ${fs.existsSync(dbDir)}`);

const db = new Database(dbPath);

// Aktiver foreign keys
db.pragma('foreign_keys = ON');

// Opprett tabeller - FORENKLET VERSJON
db.exec(`
  -- Brukere (for innlogging)
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Globale kostnadskategorier (delt for alle brukere)
  CREATE TABLE IF NOT EXISTS cost_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('labor', 'material', 'consumable', 'transport', 'ndt')),
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Globale kostnadsposter (delt for alle brukere)
  CREATE TABLE IF NOT EXISTS cost_items (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    unit TEXT NOT NULL,
    unit_price REAL NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (category_id) REFERENCES cost_categories(id) ON DELETE CASCADE
  );

  -- Kalkyler (regneark-stil)
  CREATE TABLE IF NOT EXISTS calculations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    target_margin_percent REAL DEFAULT 15,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- Kalkulasjonslinjer
  CREATE TABLE IF NOT EXISTS calculation_lines (
    id TEXT PRIMARY KEY,
    calculation_id TEXT NOT NULL,
    cost_item_id TEXT,
    description TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 1,
    unit TEXT NOT NULL,
    unit_cost REAL NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (calculation_id) REFERENCES calculations(id) ON DELETE CASCADE,
    FOREIGN KEY (cost_item_id) REFERENCES cost_items(id) ON DELETE SET NULL
  );

  -- Indekser
  CREATE INDEX IF NOT EXISTS idx_cost_items_category ON cost_items(category_id);
  CREATE INDEX IF NOT EXISTS idx_calculations_user ON calculations(user_id);
  CREATE INDEX IF NOT EXISTS idx_calculation_lines_calc ON calculation_lines(calculation_id);
`);

// Seed standard kategorier hvis de ikke finnes
const categoryCount = db.prepare('SELECT COUNT(*) as count FROM cost_categories').get() as { count: number };
if (categoryCount.count === 0) {
  const insertCategory = db.prepare('INSERT INTO cost_categories (id, name, type, sort_order) VALUES (?, ?, ?, ?)');

  insertCategory.run('cat-labor', 'Arbeid', 'labor', 1);
  insertCategory.run('cat-material', 'Materialer', 'material', 2);
  insertCategory.run('cat-consumable', 'Forbruksmateriell', 'consumable', 3);
  insertCategory.run('cat-transport', 'Transport', 'transport', 4);
  insertCategory.run('cat-ndt', 'NDT', 'ndt', 5);

  console.log('Standard kategorier opprettet');
}

export default db;
