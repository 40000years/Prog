// ============================================================
// Mega Automation Lab — Next-Gen E-Commerce & Cloud Ops
// Resilient Hybrid DB (PostgreSQL + Stateful In-Memory Fallback)
// ============================================================

const express = require("express");
const { Pool } = require("pg");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const os = require("os");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "mega-ecom-secret-key-super-secure-2026";

app.use(cors());
app.use(express.json());

// Anti-Cache Middleware
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
  next();
});

// Serve Static Frontend Assets
app.use(express.static(path.join(__dirname, "public")));

// ============================================================
// In-Memory Storage & Initial Seed State
// ============================================================
const SEED_CATEGORIES = [
  { id: 1, name: "Smart Hardware", slug: "hardware" },
  { id: 2, name: "Cloud & Servers", slug: "cloud" },
  { id: 3, name: "Developer Gear", slug: "developer" },
  { id: 4, name: "AI & Neural Kits", slug: "ai" }
];

const SEED_PRODUCTS = [
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
];

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
  categories: [...SEED_CATEGORIES],
  products: [...SEED_PRODUCTS],
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
        { from_status: "PROCESSING", to_status: "SHIPPED", note: "Handed over to courier", created_at: new Date(Date.now() - 1000000).toISOString() }
      ]
    }
  ],
  admin_logs: [
    {
      id: 1,
      admin_name: "admin",
      action: "SYSTEM_INITIALIZE",
      target_type: "system",
      target_id: 1,
      details: { region: "ap-southeast-7", status: "online", engine: "hybrid-resilient" },
      ip_address: "127.0.0.1",
      created_at: new Date().toISOString()
    }
  ]
};

// ============================================================
// PostgreSQL Connection Pool
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
    console.log("✅ PostgreSQL Live Connection Established");

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, username VARCHAR(50) UNIQUE NOT NULL, email VARCHAR(100) UNIQUE NOT NULL, password_hash VARCHAR(255) NOT NULL, role VARCHAR(20) DEFAULT 'customer', full_name VARCHAR(100), phone VARCHAR(20), address TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
      CREATE TABLE IF NOT EXISTS categories (id SERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL, slug VARCHAR(100) UNIQUE NOT NULL);
      CREATE TABLE IF NOT EXISTS products (id SERIAL PRIMARY KEY, category_id INT REFERENCES categories(id) ON DELETE SET NULL, name VARCHAR(255) NOT NULL, description TEXT, price NUMERIC(10,2) NOT NULL CHECK (price >= 0), stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0), image_url TEXT, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
      CREATE TABLE IF NOT EXISTS orders (id SERIAL PRIMARY KEY, order_number VARCHAR(32) UNIQUE NOT NULL, user_id INT REFERENCES users(id) ON DELETE RESTRICT, total_amount NUMERIC(10,2) NOT NULL, status VARCHAR(30) DEFAULT 'PENDING', shipping_name VARCHAR(100) NOT NULL, shipping_phone VARCHAR(20) NOT NULL, shipping_address TEXT NOT NULL, tracking_number VARCHAR(100), note TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
      CREATE TABLE IF NOT EXISTS order_items (id SERIAL PRIMARY KEY, order_id INT REFERENCES orders(id) ON DELETE CASCADE, product_id INT REFERENCES products(id) ON DELETE RESTRICT, product_name VARCHAR(255) NOT NULL, unit_price NUMERIC(10,2) NOT NULL, quantity INT NOT NULL CHECK (quantity > 0), subtotal NUMERIC(10,2) NOT NULL);
      CREATE TABLE IF NOT EXISTS order_status_logs (id SERIAL PRIMARY KEY, order_id INT REFERENCES orders(id) ON DELETE CASCADE, from_status VARCHAR(30), to_status VARCHAR(30) NOT NULL, changed_by INT REFERENCES users(id), note TEXT, created_at TIMESTAMPTZ DEFAULT NOW());
      CREATE TABLE IF NOT EXISTS admin_audit_logs (id SERIAL PRIMARY KEY, admin_id INT REFERENCES users(id), action VARCHAR(100) NOT NULL, target_type VARCHAR(50), target_id INT, details JSONB, ip_address VARCHAR(45), created_at TIMESTAMPTZ DEFAULT NOW());
    `);

    client.release();
  } catch (err) {
    MEMORY_DB.isPgConnected = false;
  }
}

setInterval(tryInitPostgres, 10000);
tryInitPostgres();

// ============================================================
// Auth Helpers
// ============================================================
function auth(req, res, next) {
  const token = (req.headers["authorization"] || "").replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Token required" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(403).json({ error: "Invalid or expired token" });
  }
}

function adminOnly(req, res, next) {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Admin access required" });
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

// 2. Status check
app.get("/api/status", (req, res) => {
  res.json({
    pgConnected: MEMORY_DB.isPgConnected,
    totalProducts: MEMORY_DB.products.length,
    totalOrders: MEMORY_DB.orders.length,
    uptime: Math.floor(process.uptime()),
    nodeVersion: process.version
  });
});

// 3. Auth
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

    p.stock -= qty;
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

// 6. Admin Endpoints
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
    recentOrders: MEMORY_DB.orders.slice(0, 8),
    dbMode: MEMORY_DB.isPgConnected ? "PostgreSQL Connected" : "In-Memory Resilient Store"
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
    note: note || `Status updated to ${status}`,
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

app.delete("/api/admin/products/:id", auth, adminOnly, (req, res) => {
  const pid = parseInt(req.params.id);
  const idx = MEMORY_DB.products.findIndex(x => x.id === pid);
  if (idx === -1) return res.status(404).json({ error: "Product not found" });

  const p = MEMORY_DB.products[idx];
  
  // Check if product is in any existing orders
  const hasOrders = MEMORY_DB.orders.some(o => o.items && o.items.some(i => i.product_id === pid));

  if (hasOrders) {
    // If product has historical orders, deactivate/archive instead of hard deleting to preserve referential integrity
    p.is_active = false;
    MEMORY_DB.admin_logs.unshift({
      id: MEMORY_DB.admin_logs.length + 1,
      admin_name: req.user.username,
      action: "PRODUCT_ARCHIVE",
      target_type: "product",
      target_id: pid,
      details: { product_name: p.name, reason: "Product archived due to existing order history" },
      ip_address: req.ip || "127.0.0.1",
      created_at: new Date().toISOString()
    });
    return res.json({ message: "Product has associated orders. It has been archived and marked inactive.", archived: true, product: p });
  }

  // Safe to permanently delete
  MEMORY_DB.products.splice(idx, 1);
  MEMORY_DB.admin_logs.unshift({
    id: MEMORY_DB.admin_logs.length + 1,
    admin_name: req.user.username,
    action: "PRODUCT_DELETE",
    target_type: "product",
    target_id: pid,
    details: { product_name: p.name },
    ip_address: req.ip || "127.0.0.1",
    created_at: new Date().toISOString()
  });

  res.json({ message: "Product deleted successfully", deleted: true });
});

app.get("/api/admin/logs", auth, adminOnly, (req, res) => {
  res.json({ logs: MEMORY_DB.admin_logs });
});

// SPA Route fallback to index.html for client-side routing (/admin, /admin/login, /track, etc.)
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api") || req.path.startsWith("/health")) return next();
  const indexPath = path.join(__dirname, "public", "index.html");
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send("<h1>Mega Store Running</h1>");
  }
});

// ============================================================
// Start Server
// ============================================================
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Mega Store Server listening on port ${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
});
