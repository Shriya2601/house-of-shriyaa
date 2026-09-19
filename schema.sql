-- Cloudflare D1 Database Schema for House of Shriya
-- Run via: npx wrangler d1 execute <DATABASE_NAME> --file=./schema.sql

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  title TEXT,
  price REAL NOT NULL,
  original_price REAL,
  category TEXT,
  subcategory TEXT,
  image TEXT,
  hover_image TEXT,
  images TEXT,
  colors TEXT,
  sizes TEXT,
  stock INTEGER DEFAULT 10,
  in_stock INTEGER DEFAULT 1,
  is_bestseller INTEGER DEFAULT 0,
  is_new INTEGER DEFAULT 0,
  featured INTEGER DEFAULT 0,
  description TEXT,
  variants TEXT,
  sku TEXT,
  created_at TEXT,
  updated_at TEXT,
  data_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS site_content (
  id TEXT PRIMARY KEY,
  content_json TEXT NOT NULL,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  count INTEGER DEFAULT 0,
  image TEXT,
  data_json TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_number TEXT,
  customer_email TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  total_amount REAL,
  status TEXT DEFAULT 'pending',
  payment_status TEXT DEFAULT 'Pending',
  payment_method TEXT DEFAULT 'UPI',
  utr_number TEXT,
  data_json TEXT NOT NULL,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  booking_number TEXT,
  email TEXT,
  phone TEXT,
  patron_name TEXT,
  service TEXT,
  date TEXT,
  slot TEXT,
  status TEXT DEFAULT 'confirmed',
  data_json TEXT NOT NULL,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS deleted_ids (
  entity TEXT NOT NULL,
  item_id TEXT NOT NULL,
  deleted_at TEXT NOT NULL,
  PRIMARY KEY (entity, item_id)
);

CREATE TABLE IF NOT EXISTS stored_images (
  key TEXT PRIMARY KEY,
  data_url TEXT,
  mime_type TEXT,
  filename TEXT,
  size INTEGER,
  slot TEXT,
  product_id TEXT,
  r2_url TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS brand_styles (
  id TEXT PRIMARY KEY,
  data_json TEXT NOT NULL,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS custom_overrides (
  id TEXT PRIMARY KEY,
  data_json TEXT NOT NULL,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS customers (
  uid TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  full_name TEXT,
  phone TEXT,
  password_hash TEXT,
  data_json TEXT NOT NULL,
  created_at TEXT,
  updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_bookings_email ON bookings(email);
CREATE INDEX IF NOT EXISTS idx_stored_images_product_id ON stored_images(product_id);
