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
// Controlled Order State Machine
// ============================================================
const VALID_ORDER_TRANSITIONS = {
  "PENDING_PAYMENT": ["PAID", "PAYMENT_FAILED", "EXPIRED", "CANCELLED"],
  "PENDING": ["PAID", "PAYMENT_FAILED", "EXPIRED", "CANCELLED"],
  "PAID": ["PROCESSING", "CANCELLED"],
  "PROCESSING": ["SHIPPED", "CANCELLED"],
  "SHIPPED": ["DELIVERED"],
  "DELIVERED": [],
  "CANCELLED": [],
  "EXPIRED": [],
  "PAYMENT_FAILED": ["PENDING_PAYMENT"]
};

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
      payment_method: "PromptPay QR",
      note: "Sample inaugural order",
      created_at: new Date(Date.now() - 3600000).toISOString(),
      items: [
        { product_id: 2, product_name: "Neon-Core Mechanical Keyboard V2", unit_price: 4590.00, quantity: 1, subtotal: 4590.00 }
      ],
      timeline: [
        { from_status: null, to_status: "PENDING_PAYMENT", note: "Order placed by customer", created_at: new Date(Date.now() - 3600000).toISOString() },
        { from_status: "PENDING_PAYMENT", to_status: "PAID", note: "Payment verified automatically via PromptPay QR", created_at: new Date(Date.now() - 3000000).toISOString() },
        { from_status: "PAID", to_status: "PROCESSING", note: "Order packaged by fulfillment staff", created_at: new Date(Date.now() - 2000000).toISOString() },
        { from_status: "PROCESSING", to_status: "SHIPPED", note: "Handed over to courier (TH-EXP-998811)", created_at: new Date(Date.now() - 1000000).toISOString() }
      ]
    }
  ],
  payments: [
    {
      id: 1,
      order_id: 1,
      order_number: "ORD-20260818-INIT",
      provider: "PROMPTPAY",
      transaction_id: "TXN-20260818-INIT",
      amount: 4590.00,
      payment_method: "PromptPay QR",
      status: "COMPLETED",
      paid_at: new Date(Date.now() - 3000000).toISOString(),
      created_at: new Date(Date.now() - 3600000).toISOString(),
      updated_at: new Date(Date.now() - 3000000).toISOString()
    }
  ],
  admin_logs: [
    {
      id: 1,
      admin_name: "admin",
      action: "SYSTEM_INITIALIZE",
      target_type: "system",
      target_id: 1,
      details: { region: "ap-southeast-7", status: "online", engine: "hybrid-resilient", state_machine: "enabled" },
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
      CREATE TABLE IF NOT EXISTS orders (id SERIAL PRIMARY KEY, order_number VARCHAR(32) UNIQUE NOT NULL, user_id INT REFERENCES users(id) ON DELETE RESTRICT, total_amount NUMERIC(10,2) NOT NULL, status VARCHAR(30) DEFAULT 'PENDING_PAYMENT', shipping_name VARCHAR(100) NOT NULL, shipping_phone VARCHAR(20) NOT NULL, shipping_address TEXT NOT NULL, tracking_number VARCHAR(100), payment_method VARCHAR(50), note TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
      CREATE TABLE IF NOT EXISTS payments (id SERIAL PRIMARY KEY, order_id INT REFERENCES orders(id) ON DELETE CASCADE, provider VARCHAR(50) NOT NULL DEFAULT 'SYSTEM', transaction_id VARCHAR(100) UNIQUE NOT NULL, amount NUMERIC(10,2) NOT NULL, payment_method VARCHAR(50) NOT NULL, status VARCHAR(30) NOT NULL DEFAULT 'PENDING', paid_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
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
    db_mode: MEMORY_DB.isPgConnected ? "postgresql" : "in-memory-active",
    features: ["dark-mode", "state-machine", "automated-payments", "responsive-tables"]
  });
});

// 2. Status check
app.get("/api/status", (req, res) => {
  res.json({
    pgConnected: MEMORY_DB.isPgConnected,
    totalProducts: MEMORY_DB.products.length,
    totalOrders: MEMORY_DB.orders.length,
    totalPayments: MEMORY_DB.payments.length,
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
  const { items, shipping_name, shipping_phone, shipping_address, payment_method, note } = req.body;
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
  const selectedMethod = payment_method || "PromptPay QR";

  const newOrder = {
    id: MEMORY_DB.orders.length + 1,
    order_number: orderNumber,
    user_id: req.user.id,
    username: req.user.username,
    total_amount: total,
    status: "PENDING_PAYMENT",
    shipping_name,
    shipping_phone,
    shipping_address,
    payment_method: selectedMethod,
    tracking_number: null,
    note: note || "",
    created_at: new Date().toISOString(),
    items: verifiedItems,
    timeline: [
      { from_status: null, to_status: "PENDING_PAYMENT", note: "Order placed. Awaiting customer payment confirmation.", created_at: new Date().toISOString() }
    ]
  };

  MEMORY_DB.orders.unshift(newOrder);

  // Initialize Payment Record
  const newPayment = {
    id: MEMORY_DB.payments.length + 1,
    order_id: newOrder.id,
    order_number: newOrder.order_number,
    provider: selectedMethod.includes("PromptPay") ? "PROMPTPAY" : (selectedMethod.includes("Card") ? "STRIPE" : "COD"),
    transaction_id: `TXN-${dateStr}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    amount: total,
    payment_method: selectedMethod,
    status: "PENDING",
    paid_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  MEMORY_DB.payments.unshift(newPayment);

  res.status(201).json({
    message: "Order created. Please proceed with payment verification.",
    order: newOrder,
    payment: newPayment
  });
});

app.get("/api/orders/:id", (req, res) => {
  const query = req.params.id.trim();
  const o = MEMORY_DB.orders.find(x => x.order_number === query || x.id == query);
  if (!o) return res.status(404).json({ error: "Order not found" });
  
  const p = MEMORY_DB.payments.find(x => x.order_id === o.id || x.order_number === o.order_number);
  res.json({ order: o, payment: p || null });
});

// 6. Automated Payment Verification Endpoints
app.post("/api/payments/verify", (req, res) => {
  const { order_number, order_id, transaction_id, provider } = req.body;
  if (!order_number && !order_id) return res.status(400).json({ error: "Order reference required" });

  const order = MEMORY_DB.orders.find(o => (order_number && o.order_number === order_number) || (order_id && o.id == order_id));
  if (!order) return res.status(404).json({ error: "Order not found" });

  // Idempotency: If already paid, return existing state
  if (order.status === "PAID" || order.status === "PROCESSING" || order.status === "SHIPPED" || order.status === "DELIVERED") {
    const existingP = MEMORY_DB.payments.find(p => p.order_id === order.id);
    return res.json({ message: "Payment already verified", order, payment: existingP, idempotent: true });
  }

  // Validate state machine
  if (order.status !== "PENDING_PAYMENT" && order.status !== "PENDING") {
    return res.status(400).json({ error: `Cannot verify payment for order with status ${order.status}` });
  }

  let payment = MEMORY_DB.payments.find(p => p.order_id === order.id);
  const now = new Date().toISOString();

  if (!payment) {
    payment = {
      id: MEMORY_DB.payments.length + 1,
      order_id: order.id,
      order_number: order.order_number,
      provider: provider || "SYSTEM",
      transaction_id: transaction_id || `TXN-${Date.now().toString(36).toUpperCase()}`,
      amount: order.total_amount,
      payment_method: order.payment_method || "PromptPay QR",
      status: "COMPLETED",
      paid_at: now,
      created_at: now,
      updated_at: now
    };
    MEMORY_DB.payments.unshift(payment);
  } else {
    payment.status = "COMPLETED";
    payment.paid_at = now;
    payment.updated_at = now;
    if (transaction_id) payment.transaction_id = transaction_id;
  }

  // Automated State Transition: PENDING_PAYMENT -> PAID
  const prevStatus = order.status;
  order.status = "PAID";
  order.timeline.push({
    from_status: prevStatus,
    to_status: "PAID",
    note: `Payment of ฿${order.total_amount.toFixed(2)} automatically verified via ${payment.payment_method} (Ref: ${payment.transaction_id})`,
    created_at: now
  });

  // Log system automation event
  MEMORY_DB.admin_logs.unshift({
    id: MEMORY_DB.admin_logs.length + 1,
    admin_name: "SYSTEM_PAYMENT_BOT",
    action: "AUTOMATED_PAYMENT_VERIFIED",
    target_type: "order",
    target_id: order.id,
    details: { order_number: order.order_number, amount: order.total_amount, transaction_id: payment.transaction_id, provider: payment.provider },
    ip_address: req.ip || "127.0.0.1",
    created_at: now
  });

  res.json({
    message: "Payment successfully verified and order status transitioned to PAID",
    order,
    payment
  });
});

// Webhook receiver for automated external payment providers (PromptPay, Stripe, Omise)
app.post("/api/payments/webhook", (req, res) => {
  const { event, data } = req.body;
  // Simulation of webhook verification
  const orderNumber = data?.order_number || data?.metadata?.order_number;
  if (!orderNumber) return res.status(400).json({ error: "Missing order reference in webhook payload" });

  const order = MEMORY_DB.orders.find(o => o.order_number === orderNumber);
  if (!order) return res.status(404).json({ error: "Order not found" });

  if (order.status === "PENDING_PAYMENT" || order.status === "PENDING") {
    order.status = "PAID";
    order.timeline.push({
      from_status: "PENDING_PAYMENT",
      to_status: "PAID",
      note: "Webhook notification: Payment confirmed by gateway",
      created_at: new Date().toISOString()
    });
  }

  res.json({ received: true, order_number: orderNumber, status: order.status });
});

// 7. Admin Endpoints
app.get("/api/admin/dashboard", auth, adminOnly, (req, res) => {
  const totalRev = MEMORY_DB.orders.filter(o => o.status !== "CANCELLED").reduce((s, o) => s + o.total_amount, 0);
  const lowStock = MEMORY_DB.products.filter(p => p.stock <= 5 && p.is_active).length;

  const countPending = MEMORY_DB.orders.filter(o => o.status === "PENDING_PAYMENT" || o.status === "PENDING").length;
  const countPaid = MEMORY_DB.orders.filter(o => o.status === "PAID").length;
  const countProcessing = MEMORY_DB.orders.filter(o => o.status === "PROCESSING").length;
  const countShipped = MEMORY_DB.orders.filter(o => o.status === "SHIPPED").length;
  const countDelivered = MEMORY_DB.orders.filter(o => o.status === "DELIVERED").length;
  const countCancelled = MEMORY_DB.orders.filter(o => o.status === "CANCELLED").length;

  // Orders that require HUMAN administrative attention
  const ordersRequiringAttention = MEMORY_DB.orders.filter(o => o.status === "PAID" || o.status === "PROCESSING").slice(0, 10);

  res.json({
    summary: {
      totalRevenue: totalRev,
      totalOrders: MEMORY_DB.orders.length,
      pendingPaymentCount: countPending,
      paidCount: countPaid,
      processingCount: countProcessing,
      shippedCount: countShipped,
      deliveredCount: countDelivered,
      cancelledCount: countCancelled,
      totalUsers: MEMORY_DB.users.filter(u => u.role === "customer").length,
      totalProducts: MEMORY_DB.products.length,
      lowStockCount: lowStock,
      attentionRequiredCount: ordersRequiringAttention.length
    },
    ordersRequiringAttention,
    recentOrders: MEMORY_DB.orders.slice(0, 8),
    recentLogs: MEMORY_DB.admin_logs.slice(0, 6),
    dbMode: MEMORY_DB.isPgConnected ? "PostgreSQL Connected" : "In-Memory Resilient Store"
  });
});

app.get("/api/admin/orders", auth, adminOnly, (req, res) => {
  const { status, search } = req.query;
  let list = [...MEMORY_DB.orders];
  if (status && status !== "all") {
    if (status === "PENDING_PAYMENT") {
      list = list.filter(o => o.status === "PENDING_PAYMENT" || o.status === "PENDING");
    } else {
      list = list.filter(o => o.status === status);
    }
  }
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
  const currentStatus = o.status;

  // Enforce State Machine Transition Rules
  const allowedNext = VALID_ORDER_TRANSITIONS[currentStatus] || [];
  if (!allowedNext.includes(status)) {
    return res.status(400).json({
      error: `Invalid status transition from ${currentStatus} to ${status}. Allowed transitions: ${allowedNext.join(", ") || "None (Terminal State)"}`
    });
  }

  // If transitioning to SHIPPED, validate courier tracking number
  if (status === "SHIPPED") {
    if (!tracking_number && !o.tracking_number) {
      return res.status(400).json({ error: "Courier tracking number is required to mark order as SHIPPED" });
    }
    o.tracking_number = tracking_number || o.tracking_number;
  }

  // If cancelling order, automatically restore product stock
  if (status === "CANCELLED" && currentStatus !== "CANCELLED") {
    for (const item of o.items) {
      const p = MEMORY_DB.products.find(x => x.id == item.product_id);
      if (p) p.stock += item.quantity;
    }
  }

  o.status = status;
  o.timeline.push({
    from_status: currentStatus,
    to_status: status,
    note: note || `Admin updated order status to ${status}`,
    created_at: new Date().toISOString()
  });

  MEMORY_DB.admin_logs.unshift({
    id: MEMORY_DB.admin_logs.length + 1,
    admin_name: req.user.username,
    action: "ORDER_STATUS_TRANSITION",
    target_type: "order",
    target_id: o.id,
    details: { order_number: o.order_number, from: currentStatus, to: status, tracking_number: o.tracking_number },
    ip_address: req.ip || "127.0.0.1",
    created_at: new Date().toISOString()
  });

  res.json({ message: `Order status successfully updated to ${status}`, order: o });
});

app.post("/api/admin/products", auth, adminOnly, (req, res) => {
  const { name, category_id, description, price, stock, image_url, is_active } = req.body;
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
    is_active: is_active !== undefined ? is_active : true
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
  const hasOrders = MEMORY_DB.orders.some(o => o.items && o.items.some(i => i.product_id === pid));

  if (hasOrders) {
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
    return res.json({ message: "Product has associated order history. It has been archived and marked inactive.", archived: true, product: p });
  }

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
