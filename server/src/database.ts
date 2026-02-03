import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// For Render: bruk /var/data for persistent storage (krever disk)
// Fallback til ./data hvis /var/data ikke finnes
// For lokal utvikling: bruk prosjektmappen
let dbDir: string;

if (process.env.NODE_ENV === 'production') {
  // Sjekk om /var/data eksisterer (Render persistent disk)
  if (fs.existsSync('/var/data')) {
    dbDir = '/var/data';
  } else {
    // Fallback: bruk lokal data-mappe i prosjektet
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

// Opprett tabeller
db.exec(`
  -- Brukere
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    company TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Kostnadskategorier
  CREATE TABLE IF NOT EXISTS cost_categories (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('labor', 'material', 'consumable', 'transport', 'ndt')),
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- Kostnadsposter
  CREATE TABLE IF NOT EXISTS cost_items (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    unit TEXT NOT NULL,
    unit_price REAL NOT NULL,
    ndt_method TEXT CHECK (ndt_method IN ('RT', 'UT', 'MT', 'PT', 'VT', NULL)),
    ndt_level TEXT CHECK (ndt_level IN ('Level I', 'Level II', 'Level III', NULL)),
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (category_id) REFERENCES cost_categories(id) ON DELETE CASCADE
  );

  -- Tilbud
  CREATE TABLE IF NOT EXISTS quotes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    quote_number TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    customer_address TEXT,
    project_name TEXT NOT NULL,
    project_description TEXT,
    reference TEXT,
    valid_until TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected')),
    markup_percent REAL DEFAULT 0,
    notes TEXT,
    terms TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- Tilbudslinjer
  CREATE TABLE IF NOT EXISTS quote_lines (
    id TEXT PRIMARY KEY,
    quote_id TEXT NOT NULL,
    cost_item_id TEXT,
    category_type TEXT NOT NULL,
    description TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit TEXT NOT NULL,
    unit_price REAL NOT NULL,
    line_markup REAL DEFAULT 0,
    line_total REAL NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE,
    FOREIGN KEY (cost_item_id) REFERENCES cost_items(id) ON DELETE SET NULL
  );

  -- Bedriftsinnstillinger
  CREATE TABLE IF NOT EXISTS company_settings (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL,
    company_name TEXT,
    org_number TEXT,
    address TEXT,
    postal_code TEXT,
    city TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    logo_url TEXT,
    default_terms TEXT,
    default_validity_days INTEGER DEFAULT 30,
    vat_percent REAL DEFAULT 25,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- Indekser for ytelse
  CREATE INDEX IF NOT EXISTS idx_cost_categories_user ON cost_categories(user_id);
  CREATE INDEX IF NOT EXISTS idx_cost_items_category ON cost_items(category_id);
  CREATE INDEX IF NOT EXISTS idx_quotes_user ON quotes(user_id);
  CREATE INDEX IF NOT EXISTS idx_quote_lines_quote ON quote_lines(quote_id);
`);

export default db;
