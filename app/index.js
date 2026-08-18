// ============================================================
// Mega Automation Lab — Next-Gen E-Commerce & Ops Platform
// Resilient Hybrid DB (PostgreSQL + In-Memory Fallback)
// Ultra-Slick Apple/Linear-inspired Clean Glassmorphism UI
// ============================================================

const express = require("express");
const { Pool } = require("pg");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const os = require("os");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "mega-ecom-secret-key-super-secure-2026";

app.use(cors());
app.use(express.json());

// ============================================================
// In-Memory Storage & Resilient State (Guaranteed Uptime)
// ============================================================
const MEMORY_DB = {
  isPgConnected: false,
  users: [
    {
      id: 1,
      username: "admin",
      email: "admin@store.local",
      password_hash: bcrypt.hashSync("admin123", 10),
      role: "admin",
      full_name: "System Administrator",
      phone: "089-999-9999",
      address: "Bangkok Cloud Center",
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      username: "demo_user",
      email: "customer@store.local",
      password_hash: bcrypt.hashSync("user123", 10),
      role: "customer",
      full_name: "Somchai Jaidee",
      phone: "081-234-5678",
      address: "123 Sukhumvit Road, Bangkok",
      created_at: new Date().toISOString()
    }
  ],
  categories: [
    { id: 1, name: "Smart Hardware", slug: "hardware", icon: "⚡" },
    { id: 2, name: "Cloud & Servers", slug: "cloud", icon: "☁️" },
    { id: 3, name: "Developer Gear", slug: "developer", icon: "💻" },
    { id: 4, name: "AI & Neural Kits", slug: "ai", icon: "🧠" }
  ],
  products: [
    {
      id: 1,
      category_id: 1,
      name: "Cyber Matrix HUD Smart Glasses",
      description: "Augmented Reality Smart Glasses with 4K Micro-OLED and Night Vision telemetry.",
      price: 18900.00,
      stock: 15,
      image_url: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600&q=80",
      is_active: true,
      category_name: "Smart Hardware",
      category_slug: "hardware"
    },
    {
      id: 2,
      category_id: 1,
      name: "Neon-Core Mechanical Keyboard V2",
      description: "Gasket mount, wireless 2.4G/BT, Hot-swappable tactile RGB with transparent chassis.",
      price: 4590.00,
      stock: 28,
      image_url: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&q=80",
      is_active: true,
      category_name: "Smart Hardware",
      category_slug: "hardware"
    },
    {
      id: 3,
      category_id: 2,
      name: "Edge Cloud Micro Server Node (ARM64)",
      description: "Dedicated ARM64 mini edge cluster, 8-core CPU, 32GB LPDDR5, dual 10GbE SFP+ ports.",
      price: 24500.00,
      stock: 8,
      image_url: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&q=80",
      is_active: true,
      category_name: "Cloud & Servers",
      category_slug: "cloud"
    },
    {
      id: 4,
      category_id: 2,
      name: "Hardware Security Token Crypt-Key",
      description: "FIDO2 / U2F Hardware key with encrypted biometrics for zero-trust cloud infrastructure.",
      price: 2190.00,
      stock: 50,
      image_url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&q=80",
      is_active: true,
      category_name: "Cloud & Servers",
      category_slug: "cloud"
    },
    {
      id: 5,
      category_id: 3,
      name: "Ultra-wide Quantum Curved Monitor 38\"",
      description: "38-inch 144Hz IPS Nano 3840x1600, 98% DCI-P3 color gamut, USB-C 90W PD.",
      price: 32900.00,
      stock: 12,
      image_url: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&q=80",
      is_active: true,
      category_name: "Developer Gear",
      category_slug: "developer"
    },
    {
      id: 6,
      category_id: 4,
      name: "Autonomous AI Vision Sensor Kit",
      description: "Neural Compute Module with 8 TOPS AI acceleration, global shutter stereoscopic camera.",
      price: 8900.00,
      stock: 20,
      image_url: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=600&q=80",
      is_active: true,
      category_name: "AI & Neural Kits",
      category_slug: "ai"
    }
  ],
  orders: [
    {
      id: 1,
      order_number: "ORD-20260818-INIT",
      user_id: 2,
      username: "demo_user",
      total_amount: 4590.00,
      status: "SHIPPED",
      shipping_name: "Somchai Jaidee",
      shipping_phone: "081-234-5678",
      shipping_address: "123 Sukhumvit Road, Bangkok",
      tracking_number: "TH-EXP-998811",
      note: "Sample inaugural order",
      created_at: new Date(Date.now() - 3600000).toISOString(),
      items: [
        { product_id: 2, product_name: "Neon-Core Mechanical Keyboard V2", unit_price: 4590.00, quantity: 1, subtotal: 4590.00 }
      ],
      timeline: [
        { from_status: null, to_status: "PENDING", note: "Order placed by customer", created_at: new Date(Date.now() - 3600000).toISOString() },
        { from_status: "PENDING", to_status: "PAID", note: "Payment verified", created_at: new Date(Date.now() - 3000000).toISOString() },
        { from_status: "PAID", to_status: "PROCESSING", note: "Preparing for dispatch", created_at: new Date(Date.now() - 2000000).toISOString() },
        { from_status: "PROCESSING", to_status: "SHIPPED", note: "Handed over to carrier", created_at: new Date(Date.now() - 1000000).toISOString() }
      ]
    }
  ],
  admin_logs: [
    {
      id: 1,
      admin_name: "admin",
      action: "SYSTEM_STARTUP",
      target_type: "system",
      target_id: 1,
      details: { region: "ap-southeast-7", status: "online" },
      ip_address: "127.0.0.1",
      created_at: new Date().toISOString()
    }
  ]
};

// ============================================================
// PostgreSQL Pool & Connection Handling
// ============================================================
const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: 5432,
  database: process.env.DB_NAME || "myapp_db",
  user: process.env.DB_USER || "myapp_user",
  password: process.env.DB_PASSWORD || "SuperSecretPass123!",
  connectionTimeoutMillis: 3000,
});

async function tryInitPostgres() {
  try {
    const client = await pool.connect();
    await client.query("SELECT 1");
    MEMORY_DB.isPgConnected = true;
    console.log("✅ PostgreSQL Connected successfully");

    // Initialize Tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, username VARCHAR(50) UNIQUE NOT NULL, email VARCHAR(100) UNIQUE NOT NULL, password_hash VARCHAR(255) NOT NULL, role VARCHAR(20) DEFAULT 'customer', full_name VARCHAR(100), phone VARCHAR(20), address TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
      CREATE TABLE IF NOT EXISTS categories (id SERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL, slug VARCHAR(100) UNIQUE NOT NULL);
      CREATE TABLE IF NOT EXISTS products (id SERIAL PRIMARY KEY, category_id INT REFERENCES categories(id) ON DELETE SET NULL, name VARCHAR(255) NOT NULL, description TEXT, price NUMERIC(10,2) NOT NULL CHECK (price >= 0), stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0), image_url TEXT, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
      CREATE TABLE IF NOT EXISTS orders (id SERIAL PRIMARY KEY, order_number VARCHAR(32) UNIQUE NOT NULL, user_id INT REFERENCES users(id) ON DELETE RESTRICT, total_amount NUMERIC(10,2) NOT NULL, status VARCHAR(30) DEFAULT 'PENDING', shipping_name VARCHAR(100) NOT NULL, shipping_phone VARCHAR(20) NOT NULL, shipping_address TEXT NOT NULL, tracking_number VARCHAR(100), note TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
      CREATE TABLE IF NOT EXISTS order_items (id SERIAL PRIMARY KEY, order_id INT REFERENCES orders(id) ON DELETE CASCADE, product_id INT REFERENCES products(id) ON DELETE RESTRICT, product_name VARCHAR(255) NOT NULL, unit_price NUMERIC(10,2) NOT NULL, quantity INT NOT NULL CHECK (quantity > 0), subtotal NUMERIC(10,2) NOT NULL);
      CREATE TABLE IF NOT EXISTS order_status_logs (id SERIAL PRIMARY KEY, order_id INT REFERENCES orders(id) ON DELETE CASCADE, from_status VARCHAR(30), to_status VARCHAR(30) NOT NULL, changed_by INT REFERENCES users(id), note TEXT, created_at TIMESTAMPTZ DEFAULT NOW());
      CREATE TABLE IF NOT EXISTS admin_audit_logs (id SERIAL PRIMARY KEY, admin_id INT REFERENCES users(id), action VARCHAR(100) NOT NULL, target_type VARCHAR(50), target_id INT, details JSONB, ip_address VARCHAR(45), created_at TIMESTAMPTZ DEFAULT NOW());
    `);

    // Sync in-memory products & categories to PG if empty
    const count = await client.query("SELECT COUNT(*) FROM products");
    if (parseInt(count.rows[0].count) === 0) {
      for (const c of MEMORY_DB.categories) {
        await client.query("INSERT INTO categories (id, name, slug) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING", [c.id, c.name, c.slug]);
      }
      for (const p of MEMORY_DB.products) {
        await client.query("INSERT INTO products (id, category_id, name, description, price, stock, image_url) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING", [p.id, p.category_id, p.name, p.description, p.price, p.stock, p.image_url]);
      }
      for (const u of MEMORY_DB.users) {
        await client.query("INSERT INTO users (id, username, email, password_hash, role, full_name, phone, address) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING", [u.id, u.username, u.email, u.password_hash, u.role, u.full_name, u.phone, u.address]);
      }
    }
    client.release();
  } catch (err) {
    MEMORY_DB.isPgConnected = false;
    console.log("ℹ️  PostgreSQL initializing / standby mode. In-memory engine active:", err.message);
  }
}

// Background reconnect worker
setInterval(tryInitPostgres, 10000);
tryInitPostgres();

// ============================================================
// Auth Middleware
// ============================================================
function auth(req, res, next) {
  const token = (req.headers["authorization"] || "").replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Token required" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(403).json({ error: "Invalid token" });
  }
}

function adminOnly(req, res, next) {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Admin only" });
  next();
}

// ============================================================
// API Endpoints
// ============================================================

// 1. Health Endpoint (for CI/CD Smoke tests)
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    hostname: os.hostname(),
    uptime: process.uptime(),
    db_mode: MEMORY_DB.isPgConnected ? "postgresql" : "in-memory-active"
  });
});

// 2. Status check API
app.get("/api/status", (req, res) => {
  res.json({
    pgConnected: MEMORY_DB.isPgConnected,
    totalProducts: MEMORY_DB.products.length,
    totalOrders: MEMORY_DB.orders.length,
    uptime: Math.floor(process.uptime()),
    nodeVersion: process.version
  });
});

// 3. Auth Endpoints
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Missing username or password" });

  const user = MEMORY_DB.users.find(u => u.username === username.trim() || u.email === username.trim());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign({ id: user.id, username: user.username, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "24h" });
  res.json({
    message: "Login successful",
    token,
    user: { id: user.id, username: user.username, email: user.email, role: user.role, full_name: user.full_name }
  });
});

app.post("/api/auth/register", (req, res) => {
  const { username, email, password, full_name, phone, address } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: "Required fields missing" });

  if (MEMORY_DB.users.some(u => u.username === username.trim() || u.email === email.trim())) {
    return res.status(409).json({ error: "Username or email already registered" });
  }

  const newUser = {
    id: MEMORY_DB.users.length + 1,
    username: username.trim(),
    email: email.trim(),
    password_hash: bcrypt.hashSync(password, 10),
    role: "customer",
    full_name: full_name || "Customer",
    phone: phone || "",
    address: address || "",
    created_at: new Date().toISOString()
  };
  MEMORY_DB.users.push(newUser);

  const token = jwt.sign({ id: newUser.id, username: newUser.username, email: newUser.email, role: newUser.role }, JWT_SECRET, { expiresIn: "24h" });
  res.status(201).json({ message: "Registration successful", token, user: newUser });
});

// 4. Products & Categories
app.get("/api/categories", (req, res) => {
  res.json({ categories: MEMORY_DB.categories });
});

app.get("/api/products", (req, res) => {
  const { category, search, active_only } = req.query;
  let list = [...MEMORY_DB.products];

  if (active_only !== "false") list = list.filter(p => p.is_active);
  if (category) list = list.filter(p => p.category_slug === category || p.category_id == category);
  if (search) {
    const s = search.toLowerCase();
    list = list.filter(p => p.name.toLowerCase().includes(s) || (p.description && p.description.toLowerCase().includes(s)));
  }

  res.json({ products: list });
});

app.get("/api/products/:id", (req, res) => {
  const p = MEMORY_DB.products.find(x => x.id == req.params.id);
  if (!p) return res.status(404).json({ error: "Product not found" });
  res.json({ product: p });
});

// 5. Orders & Checkout
app.post("/api/orders", auth, (req, res) => {
  const { items, shipping_name, shipping_phone, shipping_address, note } = req.body;
  if (!items || !items.length) return res.status(400).json({ error: "Cart is empty" });
  if (!shipping_name || !shipping_phone || !shipping_address) return res.status(400).json({ error: "Shipping details required" });

  let total = 0;
  const verifiedItems = [];

  for (const item of items) {
    const p = MEMORY_DB.products.find(x => x.id == item.product_id);
    if (!p) return res.status(400).json({ error: `Product #${item.product_id} not found` });
    if (!p.is_active) return res.status(400).json({ error: `${p.name} is not available` });
    const qty = parseInt(item.quantity) || 1;
    if (p.stock < qty) return res.status(400).json({ error: `Insufficient stock for ${p.name} (available: ${p.stock})` });

    p.stock -= qty; // deduct stock
    const sub = p.price * qty;
    total += sub;
    verifiedItems.push({
      product_id: p.id,
      product_name: p.name,
      unit_price: p.price,
      quantity: qty,
      subtotal: sub
    });
  }

  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(16).substring(2, 6).toUpperCase();
  const orderNumber = `ORD-${dateStr}-${rand}`;

  const newOrder = {
    id: MEMORY_DB.orders.length + 1,
    order_number: orderNumber,
    user_id: req.user.id,
    username: req.user.username,
    total_amount: total,
    status: "PENDING",
    shipping_name,
    shipping_phone,
    shipping_address,
    tracking_number: null,
    note: note || "",
    created_at: new Date().toISOString(),
    items: verifiedItems,
    timeline: [
      { from_status: null, to_status: "PENDING", note: "Order placed by customer", created_at: new Date().toISOString() }
    ]
  };

  MEMORY_DB.orders.unshift(newOrder);
  res.status(201).json({ message: "Order placed successfully", order: newOrder });
});

app.get("/api/orders/:id", (req, res) => {
  const query = req.params.id.trim();
  const o = MEMORY_DB.orders.find(x => x.order_number === query || x.id == query);
  if (!o) return res.status(404).json({ error: "Order not found" });
  res.json({ order: o });
});

// 6. Admin APIs
app.get("/api/admin/dashboard", auth, adminOnly, (req, res) => {
  const totalRev = MEMORY_DB.orders.filter(o => o.status !== "CANCELLED").reduce((s, o) => s + o.total_amount, 0);
  const lowStock = MEMORY_DB.products.filter(p => p.stock <= 5 && p.is_active).length;

  res.json({
    summary: {
      totalRevenue: totalRev,
      totalOrders: MEMORY_DB.orders.length,
      totalUsers: MEMORY_DB.users.filter(u => u.role === "customer").length,
      totalProducts: MEMORY_DB.products.length,
      lowStockCount: lowStock
    },
    recentOrders: MEMORY_DB.orders.slice(0, 6),
    dbMode: MEMORY_DB.isPgConnected ? "PostgreSQL Active" : "In-Memory Resilient Store"
  });
});

app.get("/api/admin/orders", auth, adminOnly, (req, res) => {
  const { status, search } = req.query;
  let list = [...MEMORY_DB.orders];
  if (status) list = list.filter(o => o.status === status);
  if (search) {
    const s = search.toLowerCase();
    list = list.filter(o => o.order_number.toLowerCase().includes(s) || o.shipping_name.toLowerCase().includes(s));
  }
  res.json({ orders: list });
});

app.put("/api/admin/orders/:id/status", auth, adminOnly, (req, res) => {
  const o = MEMORY_DB.orders.find(x => x.id == req.params.id);
  if (!o) return res.status(404).json({ error: "Order not found" });

  const { status, tracking_number, note } = req.body;
  const prev = o.status;

  if (status === "CANCELLED" && prev !== "CANCELLED") {
    // restore stock
    for (const item of o.items) {
      const p = MEMORY_DB.products.find(x => x.id == item.product_id);
      if (p) p.stock += item.quantity;
    }
  }

  o.status = status;
  if (tracking_number) o.tracking_number = tracking_number;
  o.timeline.push({
    from_status: prev,
    to_status: status,
    note: note || `Status transitioned to ${status}`,
    created_at: new Date().toISOString()
  });

  MEMORY_DB.admin_logs.unshift({
    id: MEMORY_DB.admin_logs.length + 1,
    admin_name: req.user.username,
    action: "ORDER_STATUS_UPDATE",
    target_type: "order",
    target_id: o.id,
    details: { order_number: o.order_number, from: prev, to: status },
    ip_address: req.ip || "127.0.0.1",
    created_at: new Date().toISOString()
  });

  res.json({ message: "Status updated", order: o });
});

app.post("/api/admin/products", auth, adminOnly, (req, res) => {
  const { name, category_id, description, price, stock, image_url } = req.body;
  if (!name || price === undefined || stock === undefined) return res.status(400).json({ error: "Name, price, and stock required" });

  const cat = MEMORY_DB.categories.find(c => c.id == category_id) || MEMORY_DB.categories[0];
  const newP = {
    id: MEMORY_DB.products.length + 1,
    category_id: cat.id,
    category_name: cat.name,
    category_slug: cat.slug,
    name: name.trim(),
    description: description || "",
    price: parseFloat(price),
    stock: parseInt(stock),
    image_url: image_url || "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=600&q=80",
    is_active: true
  };
  MEMORY_DB.products.unshift(newP);
  res.status(201).json({ message: "Product created", product: newP });
});

app.put("/api/admin/products/:id", auth, adminOnly, (req, res) => {
  const p = MEMORY_DB.products.find(x => x.id == req.params.id);
  if (!p) return res.status(404).json({ error: "Product not found" });

  const { name, category_id, description, price, stock, image_url, is_active } = req.body;
  if (name) p.name = name;
  if (category_id) {
    const cat = MEMORY_DB.categories.find(c => c.id == category_id);
    if (cat) { p.category_id = cat.id; p.category_name = cat.name; p.category_slug = cat.slug; }
  }
  if (description !== undefined) p.description = description;
  if (price !== undefined) p.price = parseFloat(price);
  if (stock !== undefined) p.stock = parseInt(stock);
  if (image_url) p.image_url = image_url;
  if (is_active !== undefined) p.is_active = is_active;

  res.json({ message: "Product updated", product: p });
});

app.put("/api/admin/products/:id/stock-adjust", auth, adminOnly, (req, res) => {
  const p = MEMORY_DB.products.find(x => x.id == req.params.id);
  if (!p) return res.status(404).json({ error: "Product not found" });
  const delta = parseInt(req.body.delta) || 0;
  p.stock = Math.max(0, p.stock + delta);
  res.json({ message: "Stock adjusted", stock: p.stock });
});

app.get("/api/admin/logs", auth, adminOnly, (req, res) => {
  res.json({ logs: MEMORY_DB.admin_logs });
});

// ============================================================
// Frontend SPA — Ultra-Modern Slick Glassmorphism UI
// ============================================================
app.get("/", (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mega Store — Cloud Hardware & Developer Gear</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
    :root {
      --primary: #4338ca;
      --primary-gradient: linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%);
      --accent: #06b6d4;
      --success: #10b981;
      --danger: #ef4444;
      --warn: #f59e0b;
      --bg: #f8fafc;
      --surface: rgba(255, 255, 255, 0.85);
      --surface-card: #ffffff;
      --border: #e2e8f0;
      --text: #0f172a;
      --text-muted: #64748b;
      --shadow-sm: 0 2px 8px rgba(15, 23, 42, 0.04);
      --shadow-md: 0 10px 30px rgba(15, 23, 42, 0.08);
      --shadow-lg: 0 20px 50px rgba(15, 23, 42, 0.12);
      --radius: 16px;
      --radius-sm: 10px;
    }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      overflow-x: hidden;
      -webkit-font-smoothing: antialiased;
    }
    /* Animated Gradient Mesh Background */
    .bg-mesh {
      position: fixed; inset: 0; pointer-events: none; z-index: 0;
      background: 
        radial-gradient(circle at 10% 20%, rgba(99, 102, 241, 0.07) 0%, transparent 40%),
        radial-gradient(circle at 90% 80%, rgba(6, 182, 212, 0.07) 0%, transparent 40%);
    }

    .container { max-width: 1280px; margin: 0 auto; padding: 0 24px; position: relative; z-index: 1; }

    /* Navbar */
    .navbar {
      position: sticky; top: 0; z-index: 100;
      background: rgba(255, 255, 255, 0.8);
      backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
      border-bottom: 1px solid rgba(226, 232, 240, 0.8);
      transition: all 0.3s ease;
    }
    .nav-inner {
      height: 72px; display: flex; align-items: center; justify-content: space-between; gap: 20px;
    }
    .brand {
      display: flex; align-items: center; gap: 12px; cursor: pointer; user-select: none;
    }
    .brand-logo {
      width: 42px; height: 42px; border-radius: 12px;
      background: var(--primary-gradient);
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-weight: 800; font-size: 18px;
      box-shadow: 0 8px 20px rgba(79, 70, 229, 0.3);
      transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .brand:hover .brand-logo { transform: scale(1.08) rotate(4deg); }
    .brand-title { font-weight: 800; font-size: 18px; letter-spacing: -0.5px; }
    .brand-subtitle { font-size: 11px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }

    .nav-tabs {
      display: flex; background: rgba(241, 245, 249, 0.8);
      padding: 5px; border-radius: 12px; gap: 4px;
    }
    .nav-tab {
      padding: 8px 18px; border-radius: 8px; border: none; background: transparent;
      font-family: inherit; font-size: 14px; font-weight: 600; color: var(--text-muted);
      cursor: pointer; transition: all 0.25s ease;
    }
    .nav-tab:hover { color: var(--text); }
    .nav-tab.active {
      background: #fff; color: var(--primary);
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }

    .nav-right { display: flex; align-items: center; gap: 12px; }
    .btn-cart {
      background: #fff; border: 1.5px solid var(--border);
      padding: 8px 18px; border-radius: 50px; font-family: inherit;
      font-weight: 700; font-size: 14px; color: var(--text);
      cursor: pointer; display: flex; align-items: center; gap: 8px;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .btn-cart:hover {
      border-color: var(--primary); transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(79, 70, 229, 0.15);
    }
    .badge-count {
      background: var(--primary-gradient); color: #fff;
      font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 20px;
    }

    /* Views */
    .view-pane { display: none; animation: slideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1); }
    .view-pane.active { display: block; }
    @keyframes slideIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }

    /* Hero */
    .hero {
      padding: 56px 0 36px; text-align: center; position: relative;
    }
    .hero-pill {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 6px 16px; border-radius: 50px; background: rgba(79, 70, 229, 0.08);
      color: var(--primary); font-size: 13px; font-weight: 700; margin-bottom: 20px;
      border: 1px solid rgba(79, 70, 229, 0.15);
    }
    .pulse-dot {
      width: 8px; height: 8px; border-radius: 50%; background: var(--success);
      box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
      animation: pulse 1.8s infinite;
    }
    @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); } 70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); } 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); } }
    .hero-title {
      font-size: 46px; font-weight: 800; letter-spacing: -1.5px; line-height: 1.15; margin-bottom: 14px;
      background: linear-gradient(135deg, #0f172a 30%, #4338ca 100%);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    }
    .hero-desc {
      font-size: 17px; color: var(--text-muted); max-width: 580px; margin: 0 auto 32px; line-height: 1.6;
    }

    /* Filters & Search */
    .filter-bar {
      display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 32px;
    }
    .cat-chips { display: flex; gap: 8px; flex-wrap: wrap; }
    .cat-chip {
      padding: 9px 18px; border-radius: 50px; border: 1.5px solid var(--border);
      background: #fff; font-family: inherit; font-size: 13px; font-weight: 600;
      color: var(--text-muted); cursor: pointer; transition: all 0.2s;
    }
    .cat-chip:hover { border-color: var(--primary); color: var(--primary); }
    .cat-chip.active {
      background: var(--primary-gradient); color: #fff; border-color: transparent;
      box-shadow: 0 4px 14px rgba(79, 70, 229, 0.25);
    }
    .search-box {
      position: relative; min-width: 260px;
    }
    .search-input {
      width: 100%; padding: 10px 16px 10px 38px; border-radius: 50px;
      border: 1.5px solid var(--border); background: #fff; font-family: inherit;
      font-size: 14px; outline: none; transition: all 0.2s;
    }
    .search-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1); }
    .search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); font-size: 14px; opacity: 0.5; }

    /* Product Grid */
    .products-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px; margin-bottom: 60px;
    }
    .product-card {
      background: var(--surface-card); border: 1.5px solid var(--border);
      border-radius: var(--radius); overflow: hidden; display: flex; flex-direction: column;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
    }
    .product-card:hover {
      transform: translateY(-6px);
      box-shadow: var(--shadow-lg);
      border-color: rgba(79, 70, 229, 0.4);
    }
    .card-img-wrap {
      height: 220px; overflow: hidden; position: relative; background: #f1f5f9;
    }
    .card-img {
      width: 100%; height: 100%; object-fit: cover;
      transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .product-card:hover .card-img { transform: scale(1.08); }
    .stock-badge {
      position: absolute; top: 12px; right: 12px;
      padding: 4px 10px; border-radius: 50px; font-size: 11px; font-weight: 700;
      backdrop-filter: blur(10px);
    }
    .stock-in { background: rgba(220, 252, 231, 0.9); color: #15803d; }
    .stock-low { background: rgba(254, 243, 199, 0.9); color: #b45309; }
    .stock-out { background: rgba(254, 226, 226, 0.9); color: #b91c1c; }

    .card-body { padding: 20px; display: flex; flex-direction: column; flex: 1; gap: 6px; }
    .card-cat { font-size: 11px; font-weight: 700; color: var(--accent); text-transform: uppercase; letter-spacing: 0.5px; }
    .card-title { font-size: 16px; font-weight: 700; color: var(--text); line-height: 1.35; }
    .card-desc { font-size: 13px; color: var(--text-muted); line-height: 1.5; flex: 1; margin-top: 4px; }
    .card-footer {
      display: flex; align-items: center; justify-content: space-between;
      margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--border);
    }
    .price-num { font-size: 22px; font-weight: 800; color: var(--text); letter-spacing: -0.5px; }
    .price-num span { font-size: 14px; font-weight: 600; color: var(--text-muted); }

    /* Buttons */
    .btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      border: none; border-radius: var(--radius-sm); font-family: inherit; font-weight: 700;
      cursor: pointer; transition: all 0.25s ease;
    }
    .btn-primary {
      background: var(--primary-gradient); color: #fff; padding: 10px 20px; font-size: 14px;
      box-shadow: 0 4px 14px rgba(79, 70, 229, 0.25);
    }
    .btn-primary:hover {
      transform: translateY(-2px); box-shadow: 0 8px 25px rgba(79, 70, 229, 0.35);
    }
    .btn-primary:disabled {
      background: #cbd5e1; cursor: not-allowed; transform: none; box-shadow: none;
    }
    .btn-outline {
      background: #fff; border: 1.5px solid var(--border); color: var(--text);
      padding: 9px 18px; font-size: 14px;
    }
    .btn-outline:hover { border-color: var(--primary); color: var(--primary); }
    .btn-sm { padding: 6px 14px; font-size: 12px; border-radius: 6px; }

    /* Modals & Drawers */
    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(15, 23, 42, 0.45);
      backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
      z-index: 200; display: none; align-items: center; justify-content: center; padding: 20px;
    }
    .modal-backdrop.open { display: flex; }
    .modal-box {
      background: #fff; border-radius: 24px; width: 100%; max-width: 560px;
      max-height: 90vh; overflow-y: auto; box-shadow: var(--shadow-lg);
      animation: modalPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      position: relative;
    }
    @keyframes modalPop { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: none; } }
    .modal-header {
      padding: 24px 28px 16px; display: flex; align-items: center; justify-content: space-between;
      border-bottom: 1px solid var(--border);
    }
    .modal-title { font-size: 20px; font-weight: 800; }
    .modal-close {
      width: 36px; height: 36px; border-radius: 50%; border: none; background: #f1f5f9;
      display: flex; align-items: center; justify-content: center; font-size: 18px;
      cursor: pointer; transition: all 0.2s;
    }
    .modal-close:hover { background: #e2e8f0; transform: rotate(90deg); }
    .modal-body { padding: 24px 28px; }
    .modal-footer {
      padding: 16px 28px 24px; display: flex; gap: 12px; justify-content: flex-end;
      border-top: 1px solid var(--border);
    }

    /* Cart Items */
    .cart-row {
      display: flex; align-items: center; gap: 14px; padding: 14px 0; border-bottom: 1px solid var(--border);
    }
    .cart-row:last-child { border: none; }
    .cart-thumb { width: 56px; height: 56px; border-radius: 10px; object-fit: cover; background: #f1f5f9; }
    .cart-info { flex: 1; }
    .cart-name { font-weight: 700; font-size: 14px; }
    .cart-price { font-size: 13px; color: var(--text-muted); }
    .qty-box {
      display: flex; align-items: center; gap: 8px; background: #f8fafc;
      border: 1px solid var(--border); border-radius: 8px; padding: 3px 6px;
    }
    .qty-btn {
      width: 24px; height: 24px; border-radius: 6px; border: none; background: #fff;
      font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .qty-val { font-weight: 700; font-size: 13px; min-width: 18px; text-align: center; }

    /* Forms */
    .form-group { margin-bottom: 16px; }
    .form-label { display: block; font-size: 13px; font-weight: 700; margin-bottom: 6px; color: var(--text); }
    .form-input, .form-select, .form-textarea {
      width: 100%; padding: 11px 16px; border-radius: var(--radius-sm);
      border: 1.5px solid var(--border); background: #f8fafc; font-family: inherit;
      font-size: 14px; outline: none; transition: all 0.2s;
    }
    .form-input:focus, .form-select:focus, .form-textarea:focus {
      border-color: var(--primary); background: #fff; box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.12);
    }

    /* Tracking Stepper */
    .stepper {
      display: flex; align-items: center; justify-content: space-between; margin: 30px 0; position: relative;
    }
    .stepper-line {
      position: absolute; top: 18px; left: 30px; right: 30px; height: 3px;
      background: var(--border); z-index: 0;
    }
    .stepper-progress {
      position: absolute; top: 18px; left: 30px; height: 3px;
      background: var(--primary-gradient); z-index: 0; transition: width 0.5s ease;
    }
    .step-node {
      display: flex; flex-direction: column; align-items: center; gap: 8px; position: relative; z-index: 1;
    }
    .step-circle {
      width: 36px; height: 36px; border-radius: 50%; background: #fff;
      border: 2.5px solid var(--border); display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 13px; color: var(--text-muted); transition: all 0.3s;
    }
    .step-node.done .step-circle {
      background: var(--success); border-color: var(--success); color: #fff;
    }
    .step-node.active .step-circle {
      background: var(--primary); border-color: var(--primary); color: #fff;
      box-shadow: 0 0 0 6px rgba(79, 70, 229, 0.2);
    }
    .step-label { font-size: 11px; font-weight: 700; color: var(--text-muted); }
    .step-node.active .step-label { color: var(--primary); }

    /* Admin Styles */
    .admin-card {
      background: #fff; border: 1.5px solid var(--border); border-radius: var(--radius);
      padding: 24px; margin-bottom: 24px; box-shadow: var(--shadow-sm);
    }
    .stats-row {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 28px;
    }
    .stat-pill {
      background: #f8fafc; border: 1.5px solid var(--border); border-radius: var(--radius-sm);
      padding: 20px; transition: transform 0.2s;
    }
    .stat-pill:hover { transform: translateY(-2px); }
    .stat-title { font-size: 12px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 8px; }
    .stat-value { font-size: 26px; font-weight: 800; color: var(--text); }

    /* Data Table */
    .tbl-wrap { overflow-x: auto; border: 1.5px solid var(--border); border-radius: var(--radius-sm); }
    table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13.5px; }
    th {
      background: #f8fafc; padding: 12px 18px; font-weight: 700; color: var(--text-muted);
      border-bottom: 1.5px solid var(--border); font-size: 12px; text-transform: uppercase;
    }
    td { padding: 14px 18px; border-bottom: 1px solid var(--border); }
    tr:last-child td { border: none; }
    tr:hover td { background: #fafcff; }

    /* Status Badges */
    .badge {
      display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 50px;
      font-size: 11px; font-weight: 800;
    }
    .badge-PENDING { background: #fef3c7; color: #b45309; }
    .badge-PAID { background: #dbeafe; color: #1d4ed8; }
    .badge-PROCESSING { background: #f3e8ff; color: #7e22ce; }
    .badge-SHIPPED { background: #dcfce7; color: #15803d; }
    .badge-DELIVERED { background: #bbf7d0; color: #166534; }
    .badge-CANCELLED { background: #fee2e2; color: #b91c1c; }

    /* Toast */
    .toast {
      position: fixed; bottom: 24px; right: 24px; z-index: 999;
      background: #0f172a; color: #fff; padding: 14px 22px; border-radius: 12px;
      font-weight: 600; font-size: 14px; box-shadow: var(--shadow-lg);
      display: none; animation: toastUp 0.3s ease;
    }
    @keyframes toastUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }

    /* Confetti Canvas */
    #confetti-canvas { position: fixed; inset: 0; pointer-events: none; z-index: 300; }
  </style>
</head>
<body>
  <div class="bg-mesh"></div>
  <canvas id="confetti-canvas"></canvas>

  <!-- NAVBAR -->
  <nav class="navbar">
    <div class="container nav-inner">
      <div class="brand" onclick="goView('store')">
        <div class="brand-logo">M</div>
        <div>
          <div class="brand-title">Mega Store</div>
          <div class="brand-subtitle">Cloud Ops · ap-southeast-7</div>
        </div>
      </div>
      <div class="nav-tabs">
        <button class="nav-tab active" id="tab-store" onclick="goView('store')">Storefront</button>
        <button class="nav-tab" id="tab-track" onclick="goView('track')">Track Order</button>
        <button class="nav-tab" id="tab-admin" onclick="goView('admin')">Admin Center</button>
      </div>
      <div class="nav-right">
        <button class="btn-cart" onclick="openCartModal()">
          🛒 Cart <span class="badge-count" id="cart-badge-count">0</span>
        </button>
      </div>
    </div>
  </nav>

  <!-- STORE VIEW -->
  <div id="view-store" class="view-pane active">
    <div class="container">
      <div class="hero">
        <div class="hero-pill"><div class="pulse-dot"></div> Enterprise Cloud & Edge Hardware</div>
        <h1 class="hero-title">High-Performance Gear.<br>Zero Bottlenecks.</h1>
        <p class="hero-desc">Deploy and scale with dedicated ARM64 nodes, neural vision modules, and developer workstations.</p>
      </div>

      <div class="filter-bar">
        <div class="cat-chips" id="category-chips">
          <button class="cat-chip active" onclick="setCategoryFilter('')">All Hardware</button>
        </div>
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input type="text" id="product-search" class="search-input" placeholder="Search devices..." oninput="handleSearch(this.value)">
        </div>
      </div>

      <div class="products-grid" id="products-container">
        <!-- Rendered via JS -->
      </div>
    </div>
  </div>

  <!-- TRACK ORDER VIEW -->
  <div id="view-track" class="view-pane">
    <div class="container" style="max-width: 760px; padding-top: 48px;">
      <h2 style="font-size: 28px; font-weight: 800; margin-bottom: 8px;">📦 Real-Time Order Tracking</h2>
      <p style="color: var(--text-muted); margin-bottom: 24px;">Enter your tracking code or order number to view delivery progress.</p>
      <div style="display:flex; gap:12px; margin-bottom: 32px;">
        <input type="text" id="track-number-input" class="form-input" placeholder="e.g. ORD-20260818-XXXX" value="ORD-20260818-INIT" style="flex:1;">
        <button class="btn btn-primary" onclick="lookupOrder()">Track Progress</button>
      </div>

      <div id="tracking-display-card" style="display:none; background:#fff; border:1.5px solid var(--border); border-radius:var(--radius); padding:32px; box-shadow:var(--shadow-md);">
        <!-- Injected via JS -->
      </div>
    </div>
  </div>

  <!-- ADMIN PORTAL VIEW -->
  <div id="view-admin" class="view-pane">
    <div class="container" style="padding-top: 36px;">
      <!-- Login Section -->
      <div id="admin-login-panel" style="max-width: 440px; margin: 40px auto; background:#fff; border:1.5px solid var(--border); border-radius:24px; padding:36px; box-shadow:var(--shadow-md);">
        <div style="font-size: 32px; margin-bottom: 12px;">🔐</div>
        <h2 style="font-size: 22px; font-weight: 800; margin-bottom: 6px;">Admin Authentication</h2>
        <p style="color: var(--text-muted); font-size: 13px; margin-bottom: 24px;">Default credentials: <code>admin</code> / <code>admin123</code></p>
        <div class="form-group">
          <label class="form-label">Username</label>
          <input type="text" id="adm-u" class="form-input" value="admin">
        </div>
        <div class="form-group">
          <label class="form-label">Password</label>
          <input type="password" id="adm-p" class="form-input" value="admin123">
        </div>
        <button class="btn btn-primary" style="width:100%; padding:12px;" onclick="doAdminLogin()">Sign In (JWT)</button>
      </div>

      <!-- Dashboard Section -->
      <div id="admin-dash-panel" style="display:none;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
          <div>
            <h2 style="font-size: 26px; font-weight: 800;">Operations Control Center</h2>
            <div style="font-size: 13px; color:var(--text-muted); margin-top:2px;">Logged in as: <b id="adm-user-badge">ADMIN</b> · <span id="adm-db-status" style="color:var(--success); font-weight:700;">PostgreSQL Connected</span></div>
          </div>
          <div style="display:flex; gap:10px;">
            <button class="btn btn-primary btn-sm" onclick="openAddProductModal()">+ Add Product</button>
            <button class="btn btn-outline btn-sm" onclick="doAdminLogout()">Sign Out</button>
          </div>
        </div>

        <div class="stats-row" id="admin-stats-container"></div>

        <!-- Admin Tabs -->
        <div style="display:flex; gap:8px; margin-bottom:16px;">
          <button class="cat-chip active" id="atab-btn-orders" onclick="switchAdminSubTab('orders')">Orders Manager</button>
          <button class="cat-chip" id="atab-btn-products" onclick="switchAdminSubTab('products')">Inventory & Stock</button>
          <button class="cat-chip" id="atab-btn-logs" onclick="switchAdminSubTab('logs')">Audit Trail</button>
        </div>

        <div id="asub-orders" class="admin-card">
          <h3 style="font-size:16px; font-weight:700; margin-bottom:14px;">Recent Customer Orders</h3>
          <div class="tbl-wrap">
            <table>
              <thead><tr><th>Order #</th><th>Customer</th><th>Total</th><th>Status</th><th>Tracking No.</th><th>Actions</th></tr></thead>
              <tbody id="admin-orders-tbody"></tbody>
            </table>
          </div>
        </div>

        <div id="asub-products" class="admin-card" style="display:none;">
          <h3 style="font-size:16px; font-weight:700; margin-bottom:14px;">Product Stock Catalog</h3>
          <div class="tbl-wrap">
            <table>
              <thead><tr><th>ID</th><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Quick Stock</th></tr></thead>
              <tbody id="admin-products-tbody"></tbody>
            </table>
          </div>
        </div>

        <div id="asub-logs" class="admin-card" style="display:none;">
          <h3 style="font-size:16px; font-weight:700; margin-bottom:14px;">Security & Audit Logs</h3>
          <div class="tbl-wrap">
            <table>
              <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Target</th><th>Details</th></tr></thead>
              <tbody id="admin-logs-tbody"></tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- CART & CHECKOUT MODAL -->
  <div class="modal-backdrop" id="cart-modal">
    <div class="modal-box">
      <div class="modal-header">
        <span class="modal-title">Shopping Cart & Checkout</span>
        <button class="modal-close" onclick="closeModal('cart-modal')">×</button>
      </div>
      <div class="modal-body">
        <div id="cart-items-list"></div>
        <div id="cart-summary-box" style="margin-top:16px; padding-top:16px; border-top:1.5px solid var(--border);">
          <div style="display:flex; justify-content:space-between; font-size:18px; font-weight:800; margin-bottom:16px;">
            <span>Total Amount:</span>
            <span style="color:var(--primary);" id="cart-total-val">฿0.00</span>
          </div>

          <div id="checkout-fields" style="display:none;">
            <h4 style="font-size:14px; font-weight:700; margin-bottom:12px; color:var(--primary);">Shipping Details</h4>
            <div class="form-group">
              <label class="form-label">Full Name *</label>
              <input type="text" id="chk-name" class="form-input" value="Somchai Jaidee">
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
              <div class="form-group">
                <label class="form-label">Phone *</label>
                <input type="text" id="chk-phone" class="form-input" value="081-234-5678">
              </div>
              <div class="form-group">
                <label class="form-label">Payment Method</label>
                <select class="form-select" id="chk-pay"><option>PromptPay QR</option><option>Credit Card</option><option>Cash on Delivery</option></select>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Shipping Address *</label>
              <textarea id="chk-addr" class="form-textarea" rows="2">123 Sukhumvit Road, Bangkok 10110</textarea>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer" id="cart-modal-actions"></div>
    </div>
  </div>

  <!-- STATUS UPDATE MODAL -->
  <div class="modal-backdrop" id="status-modal">
    <div class="modal-box" style="max-width: 440px;">
      <div class="modal-header">
        <span class="modal-title">Update Order Status</span>
        <button class="modal-close" onclick="closeModal('status-modal')">×</button>
      </div>
      <div class="modal-body">
        <input type="hidden" id="st-oid">
        <div style="font-size:14px; font-weight:700; margin-bottom:14px;">Order: <span id="st-onum" style="color:var(--primary);"></span></div>
        <div class="form-group">
          <label class="form-label">Target Status</label>
          <select id="st-val" class="form-select">
            <option value="PENDING">PENDING (Waiting Payment)</option>
            <option value="PAID">PAID (Payment Verified)</option>
            <option value="PROCESSING">PROCESSING (Packing Item)</option>
            <option value="SHIPPED">SHIPPED (Handed to Courier)</option>
            <option value="DELIVERED">DELIVERED (Completed)</option>
            <option value="CANCELLED">CANCELLED (Refund Stock)</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Courier Tracking Number</label>
          <input type="text" id="st-trackno" class="form-input" placeholder="e.g. TH-EXP-992288">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="closeModal('status-modal')">Cancel</button>
        <button class="btn btn-primary" onclick="submitStatusUpdate()">Update Status</button>
      </div>
    </div>
  </div>

  <!-- ADD PRODUCT MODAL -->
  <div class="modal-backdrop" id="product-modal">
    <div class="modal-box">
      <div class="modal-header">
        <span class="modal-title">Add New Hardware</span>
        <button class="modal-close" onclick="closeModal('product-modal')">×</button>
      </div>
      <div class="modal-body">
        <div class="form-group"><label class="form-label">Product Name *</label><input type="text" id="np-name" class="form-input" placeholder="e.g. RISC-V Neural Board"></div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          <div class="form-group"><label class="form-label">Category</label><select id="np-cat" class="form-select"></select></div>
          <div class="form-group"><label class="form-label">Price (THB) *</label><input type="number" id="np-price" class="form-input" placeholder="4900"></div>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          <div class="form-group"><label class="form-label">Stock Quantity *</label><input type="number" id="np-stock" class="form-input" placeholder="20"></div>
          <div class="form-group"><label class="form-label">Image URL</label><input type="text" id="np-img" class="form-input" placeholder="https://..."></div>
        </div>
        <div class="form-group"><label class="form-label">Description</label><textarea id="np-desc" class="form-textarea" rows="2" placeholder="Technical specifications..."></textarea></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="closeModal('product-modal')">Cancel</button>
        <button class="btn btn-primary" onclick="submitNewProduct()">Save Product</button>
      </div>
    </div>
  </div>

  <div id="toast" class="toast"></div>

  <script>
    // ── Global State ──
    let cart = JSON.parse(localStorage.getItem('mega_cart') || '[]');
    let adminToken = localStorage.getItem('mega_admin_token') || '';
    let storeProducts = [];
    let storeCategories = [];
    let selectedCatSlug = '';
    let searchQuery = '';
    let isCheckingOut = false;

    function toast(msg) {
      const el = document.getElementById('toast');
      el.textContent = msg;
      el.style.display = 'block';
      clearTimeout(el._t);
      el._t = setTimeout(() => { el.style.display = 'none'; }, 2600);
    }

    function openModal(id) { document.getElementById(id).classList.add('open'); }
    function closeModal(id) { document.getElementById(id).classList.remove('open'); }

    function fmt(n) { return parseFloat(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

    // ── Navigation ──
    function goView(v) {
      ['store', 'track', 'admin'].forEach(x => {
        document.getElementById('view-' + x).classList.toggle('active', x === v);
        document.getElementById('tab-' + x).classList.toggle('active', x === v);
      });
      if (v === 'store') loadStoreData();
      if (v === 'admin') initAdminDashboard();
    }

    // ── Storefront Data ──
    async function loadStoreData() {
      try {
        const [cRes, pRes] = await Promise.all([
          fetch('/api/categories').then(r => r.json()),
          fetch('/api/products').then(r => r.json())
        ]);
        storeCategories = cRes.categories || [];
        storeProducts = pRes.products || [];
        renderCategoryChips();
        renderProducts();
        updateCartBadge();
      } catch (err) {
        console.error(err);
      }
    }

    function renderCategoryChips() {
      const container = document.getElementById('category-chips');
      let html = '<button class="cat-chip ' + (selectedCatSlug === '' ? 'active' : '') + '" onclick="setCategoryFilter(\'\')">All Hardware</button>';
      storeCategories.forEach(c => {
        html += '<button class="cat-chip ' + (selectedCatSlug === c.slug ? 'active' : '') + '" onclick="setCategoryFilter(\'' + c.slug + '\')">' + (c.icon || '') + ' ' + c.name + '</button>';
      });
      container.innerHTML = html;
    }

    function setCategoryFilter(slug) {
      selectedCatSlug = slug;
      renderCategoryChips();
      renderProducts();
    }

    function handleSearch(q) {
      searchQuery = q.toLowerCase();
      renderProducts();
    }

    function renderProducts() {
      const container = document.getElementById('products-container');
      let list = storeProducts;
      if (selectedCatSlug) list = list.filter(p => p.category_slug === selectedCatSlug);
      if (searchQuery) list = list.filter(p => p.name.toLowerCase().includes(searchQuery) || (p.description && p.description.toLowerCase().includes(searchQuery)));

      if (list.length === 0) {
        container.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:60px 0; color:var(--text-muted); font-weight:600;">No devices found matching your filter.</div>';
        return;
      }

      container.innerHTML = list.map(p => {
        const isOut = p.stock <= 0;
        const stockClass = p.stock > 10 ? 'stock-in' : (p.stock > 0 ? 'stock-low' : 'stock-out');
        const stockLabel = p.stock > 10 ? 'In Stock (' + p.stock + ')' : (p.stock > 0 ? 'Low Stock (' + p.stock + ')' : 'Sold Out');

        return '<div class="product-card">' +
          '<div class="card-img-wrap">' +
            '<img class="card-img" src="' + p.image_url + '" alt="' + p.name + '" loading="lazy">' +
            '<span class="stock-badge ' + stockClass + '">' + stockLabel + '</span>' +
          '</div>' +
          '<div class="card-body">' +
            '<div class="card-cat">' + (p.category_name || 'Hardware') + '</div>' +
            '<h3 class="card-title">' + p.name + '</h3>' +
            '<p class="card-desc">' + p.description + '</p>' +
            '<div class="card-footer">' +
              '<div class="price-num"><span>฿</span>' + fmt(p.price) + '</div>' +
              '<button class="btn btn-primary btn-sm" ' + (isOut ? 'disabled' : '') + ' onclick="addToCart(' + p.id + ')">' +
                (isOut ? 'Out of Stock' : '+ Add to Cart') +
              '</button>' +
            '</div>' +
          '</div>' +
        '</div>';
      }).join('');
    }

    // ── Cart Operations ──
    function updateCartBadge() {
      const count = cart.reduce((s, i) => s + i.quantity, 0);
      document.getElementById('cart-badge-count').textContent = count;
      localStorage.setItem('mega_cart', JSON.stringify(cart));
    }

    function addToCart(pid) {
      const p = storeProducts.find(x => x.id === pid);
      if (!p) return;
      const exist = cart.find(i => i.product_id === pid);
      if (exist) {
        if (exist.quantity >= p.stock) { toast('Reached maximum available stock!'); return; }
        exist.quantity++;
      } else {
        cart.push({ product_id: p.id, name: p.name, price: p.price, image_url: p.image_url, quantity: 1 });
      }
      updateCartBadge();
      toast('⚡ Added ' + p.name + ' to Cart');
    }

    function openCartModal() {
      isCheckingOut = false;
      renderCartView();
      openModal('cart-modal');
    }

    function changeQty(idx, delta) {
      cart[idx].quantity += delta;
      if (cart[idx].quantity <= 0) cart.splice(idx, 1);
      updateCartBadge();
      renderCartView();
    }

    function renderCartView() {
      const listEl = document.getElementById('cart-items-list');
      const checkoutEl = document.getElementById('checkout-fields');
      const actionsEl = document.getElementById('cart-modal-actions');
      const totalEl = document.getElementById('cart-total-val');

      if (cart.length === 0) {
        listEl.innerHTML = '<div style="text-align:center; padding:40px 0; color:var(--text-muted); font-weight:600;">Your cart is currently empty 🛒</div>';
        checkoutEl.style.display = 'none';
        totalEl.textContent = '฿0.00';
        actionsEl.innerHTML = '<button class="btn btn-outline" onclick="closeModal(\'cart-modal\')">Continue Shopping</button>';
        return;
      }

      const total = cart.reduce((s, i) => s + (i.price * i.quantity), 0);
      totalEl.textContent = '฿' + fmt(total);

      listEl.innerHTML = cart.map((item, idx) =>
        '<div class="cart-row">' +
          '<img class="cart-thumb" src="' + item.image_url + '">' +
          '<div class="cart-info">' +
            '<div class="cart-name">' + item.name + '</div>' +
            '<div class="cart-price">฿' + fmt(item.price) + ' × ' + item.quantity + '</div>' +
          '</div>' +
          '<div class="qty-box">' +
            '<button class="qty-btn" onclick="changeQty(' + idx + ', -1)">−</button>' +
            '<span class="qty-val">' + item.quantity + '</span>' +
            '<button class="qty-btn" onclick="changeQty(' + idx + ', 1)">+</button>' +
          '</div>' +
        '</div>'
      ).join('');

      if (isCheckingOut) {
        checkoutEl.style.display = 'block';
        actionsEl.innerHTML = 
          '<button class="btn btn-outline" onclick="isCheckingOut=false; renderCartView();">← Back</button>' +
          '<button class="btn btn-primary" onclick="confirmOrder()">Confirm & Place Order</button>';
      } else {
        checkoutEl.style.display = 'none';
        actionsEl.innerHTML = 
          '<button class="btn btn-outline" onclick="closeModal(\'cart-modal\')">Close</button>' +
          '<button class="btn btn-primary" onclick="isCheckingOut=true; renderCartView();">Proceed to Checkout →</button>';
      }
    }

    async function confirmOrder() {
      const name = document.getElementById('chk-name').value.trim();
      const phone = document.getElementById('chk-phone').value.trim();
      const addr = document.getElementById('chk-addr').value.trim();
      if (!name || !phone || !addr) { toast('Please complete all shipping fields'); return; }

      try {
        // Auto authenticate demo customer
        let token = localStorage.getItem('mega_cust_token');
        if (!token) {
          const authRes = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'demo_user', password: 'user123' })
          }).then(r => r.json());
          token = authRes.token;
          localStorage.setItem('mega_cust_token', token);
        }

        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
          body: JSON.stringify({
            items: cart,
            shipping_name: name,
            shipping_phone: phone,
            shipping_address: addr
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to place order');

        cart = [];
        updateCartBadge();
        closeModal('cart-modal');
        loadStoreData();

        // Celebration Confetti 🎉
        launchConfetti();

        // Switch to track view
        goView('track');
        document.getElementById('track-number-input').value = data.order.order_number;
        lookupOrder();
        toast('🎉 Order #' + data.order.order_number + ' Placed Successfully!');
      } catch (err) {
        alert(err.message);
      }
    }

    // ── Order Tracking ──
    async function lookupOrder() {
      const num = document.getElementById('track-number-input').value.trim();
      if (!num) return;

      try {
        const res = await fetch('/api/orders/' + encodeURIComponent(num));
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Order not found');

        const o = data.order;
        const steps = ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
        const currIdx = steps.indexOf(o.status);
        const progressPct = currIdx >= 0 ? (currIdx / (steps.length - 1)) * 100 : 0;

        const card = document.getElementById('tracking-display-card');
        card.style.display = 'block';

        let stepperHtml = '<div class="stepper">' +
          '<div class="stepper-line"></div>' +
          '<div class="stepper-progress" style="width: calc(' + progressPct + '% - 30px)"></div>';

        steps.forEach((st, idx) => {
          const isDone = currIdx >= idx;
          const isActive = o.status === st;
          stepperHtml += '<div class="step-node ' + (isDone ? 'done' : '') + ' ' + (isActive ? 'active' : '') + '">' +
            '<div class="step-circle">' + (isDone && !isActive ? '✓' : (idx+1)) + '</div>' +
            '<span class="step-label">' + st + '</span>' +
          '</div>';
        });
        stepperHtml += '</div>';

        card.innerHTML = 
          '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px;">' +
            '<div>' +
              '<div style="font-size:11px; font-weight:700; color:var(--accent); text-transform:uppercase;">Verified Order</div>' +
              '<h3 style="font-size:22px; font-weight:800; margin-top:2px;">' + o.order_number + '</h3>' +
              '<div style="font-size:13px; color:var(--text-muted); margin-top:4px;">Recipient: ' + o.shipping_name + ' (' + o.shipping_phone + ')</div>' +
            '</div>' +
            '<span class="badge badge-' + o.status + '" style="font-size:13px; padding:6px 14px;">' + o.status + '</span>' +
          '</div>' +
          (o.tracking_number ? '<div style="background:#f0fdf4; border:1.5px solid #86efac; border-radius:12px; padding:14px 18px; margin-bottom:20px; font-weight:700; color:#15803d;">🚚 Express Tracking: <span style="font-family:monospace; font-size:15px; color:#047857;">' + o.tracking_number + '</span></div>' : '') +
          stepperHtml +
          '<div style="margin-top:24px; padding-top:16px; border-top:1.5px solid var(--border);">' +
            '<div style="font-weight:700; font-size:14px; margin-bottom:8px;">Purchased Items:</div>' +
            (o.items || []).map(i => '<div style="display:flex; justify-content:space-between; font-size:13.5px; padding:6px 0; border-bottom:1px dashed var(--border);">' +
              '<span>' + (i.product_name || i.name) + ' × ' + i.quantity + '</span>' +
              '<span style="font-weight:700;">฿' + fmt(i.subtotal || (i.unit_price * i.quantity)) + '</span>' +
            '</div>').join('') +
            '<div style="display:flex; justify-content:space-between; font-size:16px; font-weight:800; margin-top:12px;">' +
              '<span>Total Paid</span><span style="color:var(--primary);">฿' + fmt(o.total_amount) + '</span>' +
            '</div>' +
          '</div>';
      } catch (err) {
        alert(err.message);
      }
    }

    // ── Admin Portal ──
    function initAdminDashboard() {
      if (adminToken) {
        document.getElementById('admin-login-panel').style.display = 'none';
        document.getElementById('admin-dash-panel').style.display = 'block';
        fetchAdminOverview();
      } else {
        document.getElementById('admin-login-panel').style.display = 'block';
        document.getElementById('admin-dash-panel').style.display = 'none';
      }
    }

    async function doAdminLogin() {
      const u = document.getElementById('adm-u').value.trim();
      const p = document.getElementById('adm-p').value.trim();
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: u, password: p })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed');
        if (data.user.role !== 'admin') throw new Error('Account does not have admin permissions');

        adminToken = data.token;
        localStorage.setItem('mega_admin_token', adminToken);
        document.getElementById('adm-user-badge').textContent = data.user.username.toUpperCase();
        initAdminDashboard();
        toast('Welcome back, ' + data.user.username);
      } catch (err) {
        alert(err.message);
      }
    }

    function doAdminLogout() {
      adminToken = '';
      localStorage.removeItem('mega_admin_token');
      initAdminDashboard();
    }

    async function fetchAdminOverview() {
      try {
        const [dashRes, ordRes, prodRes, logRes] = await Promise.all([
          fetch('/api/admin/dashboard', { headers: { 'Authorization': 'Bearer ' + adminToken } }).then(r => r.json()),
          fetch('/api/admin/orders', { headers: { 'Authorization': 'Bearer ' + adminToken } }).then(r => r.json()),
          fetch('/api/products?active_only=false').then(r => r.json()),
          fetch('/api/admin/logs', { headers: { 'Authorization': 'Bearer ' + adminToken } }).then(r => r.json())
        ]);

        const s = dashRes.summary || {};
        document.getElementById('admin-stats-container').innerHTML = 
          '<div class="stat-pill"><div class="stat-title">💰 Total Gross Revenue</div><div class="stat-value" style="color:var(--primary);">฿' + fmt(s.totalRevenue) + '</div></div>' +
          '<div class="stat-pill"><div class="stat-title">📦 Total Orders</div><div class="stat-value">' + (s.totalOrders || 0) + '</div></div>' +
          '<div class="stat-pill"><div class="stat-title">👥 Registered Customers</div><div class="stat-value">' + (s.totalUsers || 0) + '</div></div>' +
          '<div class="stat-pill"><div class="stat-title">⚠️ Low Stock Alerts</div><div class="stat-value" style="color:' + (s.lowStockCount > 0 ? 'var(--danger)' : 'var(--success)') + ';">' + (s.lowStockCount || 0) + '</div></div>';

        // Orders Table
        document.getElementById('admin-orders-tbody').innerHTML = (ordRes.orders || []).map(o => 
          '<tr>' +
            '<td><b>' + o.order_number + '</b></td>' +
            '<td>' + o.shipping_name + '<br><small style="color:var(--text-muted);">' + o.shipping_phone + '</small></td>' +
            '<td style="font-weight:700;">฿' + fmt(o.total_amount) + '</td>' +
            '<td><span class="badge badge-' + o.status + '">' + o.status + '</span></td>' +
            '<td style="font-family:monospace;">' + (o.tracking_number || '—') + '</td>' +
            '<td><button class="btn btn-outline btn-sm" onclick="openStatusModal(' + o.id + ',\'' + o.order_number + '\',\'' + o.status + '\',\'' + (o.tracking_number||'') + '\')">Update</button></td>' +
          '</tr>'
        ).join('');

        // Products Table
        document.getElementById('admin-products-tbody').innerHTML = (prodRes.products || []).map(p => 
          '<tr>' +
            '<td>' + p.id + '</td>' +
            '<td><b>' + p.name + '</b></td>' +
            '<td>' + (p.category_name || '—') + '</td>' +
            '<td style="font-weight:700;">฿' + fmt(p.price) + '</td>' +
            '<td style="font-weight:800; color:' + (p.stock<=5?'var(--danger)':'var(--text)') + ';">' + p.stock + '</td>' +
            '<td>' + (p.is_active ? '<span class="badge badge-SHIPPED">Active</span>' : '<span class="badge badge-CANCELLED">Disabled</span>') + '</td>' +
            '<td>' +
              '<button class="btn btn-outline btn-sm" style="padding:2px 8px; margin-right:4px;" onclick="adjustStock(' + p.id + ', 5)">+5</button>' +
              '<button class="btn btn-outline btn-sm" style="padding:2px 8px;" onclick="adjustStock(' + p.id + ', -1)">−1</button>' +
            '</td>' +
          '</tr>'
        ).join('');

        // Logs Table
        document.getElementById('admin-logs-tbody').innerHTML = (logRes.logs || []).map(l => 
          '<tr>' +
            '<td style="font-size:12px; color:var(--text-muted);">' + new Date(l.created_at).toLocaleTimeString() + '</td>' +
            '<td><b>' + (l.admin_name || 'system') + '</b></td>' +
            '<td><span class="badge badge-PAID">' + l.action + '</span></td>' +
            '<td>' + l.target_type + ' #' + l.target_id + '</td>' +
            '<td style="font-size:11px; font-family:monospace; max-width:200px; overflow:hidden;">' + JSON.stringify(l.details) + '</td>' +
          '</tr>'
        ).join('');
      } catch (err) {
        console.error(err);
      }
    }

    function switchAdminSubTab(tab) {
      ['orders', 'products', 'logs'].forEach(t => {
        document.getElementById('asub-' + t).style.display = (t === tab ? 'block' : 'none');
        document.getElementById('atab-btn-' + t).classList.toggle('active', t === tab);
      });
    }

    async function adjustStock(pid, delta) {
      await fetch('/api/admin/products/' + pid + '/stock-adjust', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + adminToken },
        body: JSON.stringify({ delta })
      });
      fetchAdminOverview();
      loadStoreData();
      toast('Stock updated (' + (delta > 0 ? '+' + delta : delta) + ')');
    }

    function openStatusModal(oid, onum, st, track) {
      document.getElementById('st-oid').value = oid;
      document.getElementById('st-onum').textContent = onum;
      document.getElementById('st-val').value = st;
      document.getElementById('st-trackno').value = track || '';
      openModal('status-modal');
    }

    async function submitStatusUpdate() {
      const id = document.getElementById('st-oid').value;
      const status = document.getElementById('st-val').value;
      const tracking = document.getElementById('st-trackno').value.trim();

      await fetch('/api/admin/orders/' + id + '/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + adminToken },
        body: JSON.stringify({ status, tracking_number: tracking })
      });

      closeModal('status-modal');
      fetchAdminOverview();
      toast('Order status updated to ' + status);
    }

    function openAddProductModal() {
      const sel = document.getElementById('np-cat');
      sel.innerHTML = storeCategories.map(c => '<option value="' + c.id + '">' + c.name + '</option>').join('');
      openModal('product-modal');
    }

    async function submitNewProduct() {
      const name = document.getElementById('np-name').value.trim();
      const price = parseFloat(document.getElementById('np-price').value);
      const stock = parseInt(document.getElementById('np-stock').value);
      const catId = parseInt(document.getElementById('np-cat').value);
      const img = document.getElementById('np-img').value.trim();
      const desc = document.getElementById('np-desc').value.trim();

      if (!name || isNaN(price) || isNaN(stock)) { toast('Please complete required fields'); return; }

      await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + adminToken },
        body: JSON.stringify({ name, price, stock, category_id: catId, image_url: img, description: desc })
      });

      closeModal('product-modal');
      fetchAdminOverview();
      loadStoreData();
      toast('✨ Product Added Successfully!');
    }

    // ── Confetti Animation 🎉 ──
    function launchConfetti() {
      const canvas = document.getElementById('confetti-canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      const pieces = [];
      const colors = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'];
      for (let i = 0; i < 80; i++) {
        pieces.push({
          x: canvas.width / 2,
          y: canvas.height / 2,
          vx: (Math.random() - 0.5) * 14,
          vy: (Math.random() - 0.7) * 14,
          size: Math.random() * 8 + 4,
          color: colors[Math.floor(Math.random() * colors.length)],
          rot: Math.random() * 360,
          vrot: (Math.random() - 0.5) * 10
        });
      }

      let frames = 0;
      function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        pieces.forEach(p => {
          p.x += p.vx; p.y += p.vy;
          p.vy += 0.3; // gravity
          p.rot += p.vrot;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot * Math.PI / 180);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
          ctx.restore();
        });
        frames++;
        if (frames < 90) requestAnimationFrame(animate);
        else ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      animate();
    }

    // Initialize
    loadStoreData();
  </script>
</body>
</html>`);
});

// ============================================================
// Start Server
// ============================================================
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Mega Store Server listening on port ${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
});
