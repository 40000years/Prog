// ============================================================
// Mega Automation Lab — E-Commerce Platform
// Clean rewrite: fixed JS bugs + modern UI
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
// Database Pool
// ============================================================
const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: 5432,
  database: process.env.DB_NAME || "myapp_db",
  user: process.env.DB_USER || "myapp_user",
  password: process.env.DB_PASSWORD || "SuperSecretPass123!",
  connectionTimeoutMillis: 5000,
});

// ============================================================
// Auto Migration & Seed
// ============================================================
async function initDatabase() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, username VARCHAR(50) UNIQUE NOT NULL, email VARCHAR(100) UNIQUE NOT NULL, password_hash VARCHAR(255) NOT NULL, role VARCHAR(20) DEFAULT 'customer', full_name VARCHAR(100), phone VARCHAR(20), address TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());`);
    await client.query(`CREATE TABLE IF NOT EXISTS categories (id SERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL, slug VARCHAR(100) UNIQUE NOT NULL);`);
    await client.query(`CREATE TABLE IF NOT EXISTS products (id SERIAL PRIMARY KEY, category_id INT REFERENCES categories(id) ON DELETE SET NULL, name VARCHAR(255) NOT NULL, description TEXT, price NUMERIC(10,2) NOT NULL CHECK (price >= 0), stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0), image_url TEXT, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());`);
    await client.query(`CREATE TABLE IF NOT EXISTS orders (id SERIAL PRIMARY KEY, order_number VARCHAR(32) UNIQUE NOT NULL, user_id INT REFERENCES users(id) ON DELETE RESTRICT, total_amount NUMERIC(10,2) NOT NULL, status VARCHAR(30) DEFAULT 'PENDING', shipping_name VARCHAR(100) NOT NULL, shipping_phone VARCHAR(20) NOT NULL, shipping_address TEXT NOT NULL, tracking_number VARCHAR(100), note TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());`);
    await client.query(`CREATE TABLE IF NOT EXISTS order_items (id SERIAL PRIMARY KEY, order_id INT REFERENCES orders(id) ON DELETE CASCADE, product_id INT REFERENCES products(id) ON DELETE RESTRICT, product_name VARCHAR(255) NOT NULL, unit_price NUMERIC(10,2) NOT NULL, quantity INT NOT NULL CHECK (quantity > 0), subtotal NUMERIC(10,2) NOT NULL);`);
    await client.query(`CREATE TABLE IF NOT EXISTS order_status_logs (id SERIAL PRIMARY KEY, order_id INT REFERENCES orders(id) ON DELETE CASCADE, from_status VARCHAR(30), to_status VARCHAR(30) NOT NULL, changed_by INT REFERENCES users(id), note TEXT, created_at TIMESTAMPTZ DEFAULT NOW());`);
    await client.query(`CREATE TABLE IF NOT EXISTS admin_audit_logs (id SERIAL PRIMARY KEY, admin_id INT REFERENCES users(id), action VARCHAR(100) NOT NULL, target_type VARCHAR(50), target_id INT, details JSONB, ip_address VARCHAR(45), created_at TIMESTAMPTZ DEFAULT NOW());`);
    await client.query(`CREATE TABLE IF NOT EXISTS request_logs (id SERIAL PRIMARY KEY, ip VARCHAR(64), method VARCHAR(10), path VARCHAR(255), user_agent TEXT, status_code INT, created_at TIMESTAMPTZ DEFAULT NOW());`);
    await client.query("COMMIT");

    const adminCheck = await client.query("SELECT id FROM users WHERE username = 'admin'");
    if (adminCheck.rows.length === 0) {
      const h = await bcrypt.hash("admin123", 10);
      await client.query("INSERT INTO users (username, email, password_hash, role, full_name) VALUES ('admin','admin@store.local',$1,'admin','System Administrator')", [h]);
    }
    const custCheck = await client.query("SELECT id FROM users WHERE username = 'demo_user'");
    if (custCheck.rows.length === 0) {
      const h = await bcrypt.hash("user123", 10);
      await client.query("INSERT INTO users (username, email, password_hash, role, full_name, phone, address) VALUES ('demo_user','customer@store.local',$1,'customer','Somchai Jaidee','081-234-5678','123 Sukhumvit, Bangkok')", [h]);
    }
    const catCount = await client.query("SELECT COUNT(*) FROM categories");
    if (parseInt(catCount.rows[0].count) === 0) {
      await client.query("INSERT INTO categories (name, slug) VALUES ('Cyberpunk Gadgets','gadgets'),('Servers & Cloud','cloud-hardware'),('Developer Gear','developer-gear'),('AI & Robotics','ai-robotics')");
    }
    const prodCount = await client.query("SELECT COUNT(*) FROM products");
    if (parseInt(prodCount.rows[0].count) === 0) {
      await client.query(`INSERT INTO products (category_id, name, description, price, stock, image_url) VALUES
        (1,'Cyber Matrix HUD Smart Glasses','Augmented Reality Smart Glasses with 4K Micro-OLED and Night Vision telemetry.',18900.00,15,'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600&q=80'),
        (1,'Neon-Core Mechanical Keyboard V2','Gasket mount, wireless, Hot-swappable RGB with transparent chassis.',4590.00,28,'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&q=80'),
        (2,'Edge Cloud Micro Server Node (ARM64)','Dedicated ARM64 mini edge cluster, 8-core, 32GB LPDDR5, dual 10GbE.',24500.00,8,'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&q=80'),
        (2,'Hardware Security Token Crypt-Key','FIDO2/U2F hardware key with encrypted biometrics for zero-trust infra.',2190.00,50,'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&q=80'),
        (3,'Ultra-wide Quantum Curved Monitor 38"','38-inch 144Hz IPS Nano 3840x1600, 98% DCI-P3, USB-C 90W PD.',32900.00,12,'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&q=80'),
        (4,'Autonomous AI Vision Sensor Kit','Neural Compute Module with 8 TOPS AI acceleration, stereoscopic camera.',8900.00,20,'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=600&q=80')`);
    }
    console.log("✅ Database ready");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("DB init error:", err.message);
  } finally {
    client.release();
  }
}

// ============================================================
// Traffic Logger
// ============================================================
app.use((req, res, next) => {
  res.on("finish", async () => {
    if (req.path === "/health" || req.path.startsWith("/api/stats")) return;
    try {
      const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;
      await pool.query("INSERT INTO request_logs (ip, method, path, user_agent, status_code) VALUES ($1,$2,$3,$4,$5)", [ip, req.method, req.path, req.headers["user-agent"] || "", res.statusCode]);
    } catch (_) {}
  });
  next();
});

// ============================================================
// Auth Middleware
// ============================================================
function auth(req, res, next) {
  const token = (req.headers["authorization"] || "").replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Token required" });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(403).json({ error: "Invalid token" }); }
}

function adminOnly(req, res, next) {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Admin only" });
  next();
}

async function logAdmin(adminId, action, type, id, details, req) {
  try {
    const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;
    await pool.query("INSERT INTO admin_audit_logs (admin_id, action, target_type, target_id, details, ip_address) VALUES ($1,$2,$3,$4,$5,$6)", [adminId, action, type, id, JSON.stringify(details), ip]);
  } catch (_) {}
}

// ============================================================
// API Routes
// ============================================================

app.get("/health", (req, res) => res.json({ status: "healthy", timestamp: new Date().toISOString(), hostname: os.hostname(), uptime: process.uptime() }));

// Auth
app.post("/api/auth/register", async (req, res) => {
  const { username, email, password, full_name, phone, address } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: "Username, email, password required" });
  try {
    const exists = await pool.query("SELECT id FROM users WHERE username=$1 OR email=$2", [username, email]);
    if (exists.rows.length > 0) return res.status(409).json({ error: "Username or email already taken" });
    const hash = await bcrypt.hash(password, 10);
    const u = (await pool.query("INSERT INTO users (username,email,password_hash,role,full_name,phone,address) VALUES ($1,$2,$3,'customer',$4,$5,$6) RETURNING id,username,email,role,full_name", [username, email, hash, full_name || "", phone || "", address || ""])).rows[0];
    const token = jwt.sign({ id: u.id, username: u.username, email: u.email, role: u.role }, JWT_SECRET, { expiresIn: "24h" });
    res.status(201).json({ message: "Registered successfully", token, user: u });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Username and password required" });
  try {
    const r = await pool.query("SELECT * FROM users WHERE username=$1 OR email=$1", [username]);
    if (!r.rows.length || !(await bcrypt.compare(password, r.rows[0].password_hash))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const u = r.rows[0];
    const token = jwt.sign({ id: u.id, username: u.username, email: u.email, role: u.role }, JWT_SECRET, { expiresIn: "24h" });
    res.json({ message: "Login successful", token, user: { id: u.id, username: u.username, email: u.email, role: u.role, full_name: u.full_name } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/auth/me", auth, async (req, res) => {
  const r = await pool.query("SELECT id,username,email,role,full_name,phone,address,created_at FROM users WHERE id=$1", [req.user.id]);
  if (!r.rows.length) return res.status(404).json({ error: "Not found" });
  res.json({ user: r.rows[0] });
});

// Products
app.get("/api/categories", async (req, res) => {
  const r = await pool.query("SELECT * FROM categories ORDER BY name");
  res.json({ categories: r.rows });
});

app.get("/api/products", async (req, res) => {
  const { category, search, active_only } = req.query;
  try {
    let q = "SELECT p.*, c.name as category_name, c.slug as category_slug FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE 1=1";
    const params = [];
    if (active_only !== "false") q += " AND p.is_active = TRUE";
    if (category) { params.push(category); q += ` AND (c.slug=$${params.length} OR c.id::text=$${params.length})`; }
    if (search) { params.push(`%${search.trim()}%`); q += ` AND (p.name ILIKE $${params.length} OR p.description ILIKE $${params.length})`; }
    q += " ORDER BY p.id DESC";
    const r = await pool.query(q, params);
    res.json({ products: r.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/products/:id", async (req, res) => {
  const r = await pool.query("SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id=c.id WHERE p.id=$1", [req.params.id]);
  if (!r.rows.length) return res.status(404).json({ error: "Not found" });
  res.json({ product: r.rows[0] });
});

// Orders
app.post("/api/orders", auth, async (req, res) => {
  const { items, shipping_name, shipping_phone, shipping_address, note } = req.body;
  if (!items?.length) return res.status(400).json({ error: "Cart is empty" });
  if (!shipping_name || !shipping_phone || !shipping_address) return res.status(400).json({ error: "Shipping info required" });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    let total = 0;
    const verified = [];
    for (const item of items) {
      const p = (await client.query("SELECT * FROM products WHERE id=$1 FOR UPDATE", [item.product_id])).rows[0];
      if (!p) throw new Error(`Product #${item.product_id} not found`);
      if (!p.is_active) throw new Error(`${p.name} is no longer available`);
      const qty = parseInt(item.quantity);
      if (p.stock < qty) throw new Error(`Insufficient stock for ${p.name} (available: ${p.stock})`);
      const sub = parseFloat(p.price) * qty;
      total += sub;
      verified.push({ product_id: p.id, name: p.name, unit_price: parseFloat(p.price), quantity: qty, subtotal: sub });
      await client.query("UPDATE products SET stock=stock-$1, updated_at=NOW() WHERE id=$2", [qty, p.id]);
    }
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const orderNumber = `ORD-${dateStr}-${Math.random().toString(16).substring(2, 6).toUpperCase()}`;
    const o = (await client.query("INSERT INTO orders (order_number,user_id,total_amount,status,shipping_name,shipping_phone,shipping_address,note) VALUES ($1,$2,$3,'PENDING',$4,$5,$6,$7) RETURNING *", [orderNumber, req.user.id, total, shipping_name, shipping_phone, shipping_address, note || ""])).rows[0];
    for (const v of verified) await client.query("INSERT INTO order_items (order_id,product_id,product_name,unit_price,quantity,subtotal) VALUES ($1,$2,$3,$4,$5,$6)", [o.id, v.product_id, v.name, v.unit_price, v.quantity, v.subtotal]);
    await client.query("INSERT INTO order_status_logs (order_id,from_status,to_status,changed_by,note) VALUES ($1,NULL,'PENDING',$2,'Order created by customer')", [o.id, req.user.id]);
    await client.query("COMMIT");
    res.status(201).json({ message: "Order placed", order: o, items: verified });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(400).json({ error: err.message });
  } finally { client.release(); }
});

app.get("/api/orders/my-orders", auth, async (req, res) => {
  const r = await pool.query("SELECT o.*, json_agg(json_build_object('product_name',oi.product_name,'quantity',oi.quantity,'subtotal',oi.subtotal)) as items FROM orders o LEFT JOIN order_items oi ON o.id=oi.order_id WHERE o.user_id=$1 GROUP BY o.id ORDER BY o.created_at DESC", [req.user.id]);
  res.json({ orders: r.rows });
});

app.get("/api/orders/:id", async (req, res) => {
  try {
    const q = isNaN(req.params.id) ? "SELECT * FROM orders WHERE order_number=$1" : "SELECT * FROM orders WHERE id=$1";
    const r = await pool.query(q, [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: "Order not found" });
    const o = r.rows[0];
    const items = await pool.query("SELECT * FROM order_items WHERE order_id=$1", [o.id]);
    const timeline = await pool.query("SELECT osl.*, u.username as changer FROM order_status_logs osl LEFT JOIN users u ON osl.changed_by=u.id WHERE osl.order_id=$1 ORDER BY osl.created_at ASC", [o.id]);
    res.json({ order: { ...o, items: items.rows, timeline: timeline.rows } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Admin
app.get("/api/admin/dashboard", auth, adminOnly, async (req, res) => {
  try {
    const rev = await pool.query("SELECT COALESCE(SUM(total_amount),0) as total FROM orders WHERE status != 'CANCELLED'");
    const orders = await pool.query("SELECT COUNT(*) as count FROM orders");
    const users = await pool.query("SELECT COUNT(*) as count FROM users WHERE role='customer'");
    const products = await pool.query("SELECT COUNT(*) as count FROM products");
    const lowStock = await pool.query("SELECT COUNT(*) as count FROM products WHERE stock <= 5 AND is_active=true");
    const statusDist = await pool.query("SELECT status, COUNT(*) as count FROM orders GROUP BY status");
    const recent = await pool.query("SELECT o.*, u.username FROM orders o LEFT JOIN users u ON o.user_id=u.id ORDER BY o.created_at DESC LIMIT 8");
    res.json({ summary: { totalRevenue: parseFloat(rev.rows[0].total), totalOrders: parseInt(orders.rows[0].count), totalUsers: parseInt(users.rows[0].count), totalProducts: parseInt(products.rows[0].count), lowStockCount: parseInt(lowStock.rows[0].count) }, statusDistribution: statusDist.rows, recentOrders: recent.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/admin/products", auth, adminOnly, async (req, res) => {
  const { name, category_id, description, price, stock, image_url } = req.body;
  if (!name || price === undefined || stock === undefined) return res.status(400).json({ error: "Name, price, stock required" });
  try {
    const p = (await pool.query("INSERT INTO products (name,category_id,description,price,stock,image_url) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *", [name, category_id || null, description || "", parseFloat(price), parseInt(stock), image_url || "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=600&q=80"])).rows[0];
    await logAdmin(req.user.id, "PRODUCT_CREATE", "product", p.id, p, req);
    res.status(201).json({ message: "Product created", product: p });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put("/api/admin/products/:id", auth, adminOnly, async (req, res) => {
  const { name, category_id, description, price, stock, image_url, is_active } = req.body;
  try {
    const p = (await pool.query("UPDATE products SET name=COALESCE($1,name), category_id=COALESCE($2,category_id), description=COALESCE($3,description), price=COALESCE($4,price), stock=COALESCE($5,stock), image_url=COALESCE($6,image_url), is_active=COALESCE($7,is_active), updated_at=NOW() WHERE id=$8 RETURNING *", [name, category_id, description, price, stock, image_url, is_active, req.params.id])).rows[0];
    if (!p) return res.status(404).json({ error: "Not found" });
    await logAdmin(req.user.id, "PRODUCT_UPDATE", "product", p.id, p, req);
    res.json({ message: "Updated", product: p });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/admin/products/:id", auth, adminOnly, async (req, res) => {
  await pool.query("UPDATE products SET is_active=FALSE WHERE id=$1", [req.params.id]);
  await logAdmin(req.user.id, "PRODUCT_DEACTIVATE", "product", parseInt(req.params.id), {}, req);
  res.json({ message: "Deactivated" });
});

app.get("/api/admin/orders", auth, adminOnly, async (req, res) => {
  const { status, search } = req.query;
  let q = "SELECT o.*, u.username, u.email FROM orders o LEFT JOIN users u ON o.user_id=u.id WHERE 1=1";
  const params = [];
  if (status) { params.push(status); q += ` AND o.status=$${params.length}`; }
  if (search) { params.push(`%${search}%`); q += ` AND (o.order_number ILIKE $${params.length} OR u.username ILIKE $${params.length})`; }
  q += " ORDER BY o.created_at DESC";
  const r = await pool.query(q, params);
  res.json({ orders: r.rows });
});

app.put("/api/admin/orders/:id/status", auth, adminOnly, async (req, res) => {
  const { status, tracking_number, note } = req.body;
  const valid = ["PENDING", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];
  if (!valid.includes(status)) return res.status(400).json({ error: "Invalid status" });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const prev = (await client.query("SELECT * FROM orders WHERE id=$1 FOR UPDATE", [req.params.id])).rows[0];
    if (!prev) throw new Error("Order not found");
    if (status === "CANCELLED" && prev.status !== "CANCELLED") {
      const items = (await client.query("SELECT product_id, quantity FROM order_items WHERE order_id=$1", [req.params.id])).rows;
      for (const i of items) await client.query("UPDATE products SET stock=stock+$1 WHERE id=$2", [i.quantity, i.product_id]);
    }
    const o = (await client.query("UPDATE orders SET status=$1, tracking_number=COALESCE($2,tracking_number), updated_at=NOW() WHERE id=$3 RETURNING *", [status, tracking_number || null, req.params.id])).rows[0];
    await client.query("INSERT INTO order_status_logs (order_id,from_status,to_status,changed_by,note) VALUES ($1,$2,$3,$4,$5)", [req.params.id, prev.status, status, req.user.id, note || ""]);
    await client.query("COMMIT");
    await logAdmin(req.user.id, "ORDER_STATUS_UPDATE", "order", parseInt(req.params.id), { from: prev.status, to: status }, req);
    res.json({ message: "Status updated", order: o });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(400).json({ error: err.message });
  } finally { client.release(); }
});

app.get("/api/admin/logs", auth, adminOnly, async (req, res) => {
  const r = await pool.query("SELECT l.*, u.username as admin_name FROM admin_audit_logs l LEFT JOIN users u ON l.admin_id=u.id ORDER BY l.created_at DESC LIMIT 50");
  res.json({ logs: r.rows });
});

// ============================================================
// Frontend SPA — Clean Modern UI
// ============================================================
app.get("/", (req, res) => {
  const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mega Store — Modern E-Commerce</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    *,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
    :root{
      --primary:#4f46e5;
      --primary-light:#6366f1;
      --primary-dark:#3730a3;
      --accent:#06b6d4;
      --success:#10b981;
      --warn:#f59e0b;
      --danger:#ef4444;
      --bg:#f8f9fc;
      --surface:#ffffff;
      --surface2:#f1f5f9;
      --border:#e2e8f0;
      --text:#0f172a;
      --text2:#475569;
      --text3:#94a3b8;
      --shadow:0 1px 3px rgba(0,0,0,.08),0 4px 12px rgba(0,0,0,.05);
      --shadow-lg:0 10px 40px rgba(0,0,0,.1);
      --radius:12px;
      --radius-sm:8px;
    }
    html{scroll-behavior:smooth;}
    body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;line-height:1.5;}

    /* Layout */
    .container{max-width:1280px;margin:0 auto;padding:0 24px;}

    /* Nav */
    .navbar{
      background:rgba(255,255,255,.85);
      backdrop-filter:blur(16px);
      border-bottom:1px solid var(--border);
      position:sticky;top:0;z-index:100;
    }
    .nav-inner{
      display:flex;align-items:center;justify-content:space-between;
      height:64px;gap:24px;
    }
    .brand{display:flex;align-items:center;gap:10px;text-decoration:none;cursor:pointer;}
    .brand-mark{
      width:36px;height:36px;border-radius:10px;
      background:linear-gradient(135deg,var(--primary),var(--accent));
      display:flex;align-items:center;justify-content:center;
      color:#fff;font-weight:800;font-size:16px;
      box-shadow:0 4px 12px rgba(79,70,229,.35);
    }
    .brand-name{font-weight:800;font-size:17px;color:var(--text);}
    .brand-sub{font-size:11px;color:var(--text3);font-weight:400;}

    .nav-tabs{display:flex;gap:4px;}
    .nav-tab{
      background:none;border:none;padding:8px 16px;border-radius:8px;
      font-family:'Inter',sans-serif;font-size:14px;font-weight:500;
      color:var(--text2);cursor:pointer;transition:all .2s;
    }
    .nav-tab:hover{background:var(--surface2);color:var(--text);}
    .nav-tab.active{background:var(--primary);color:#fff;}

    .nav-right{display:flex;align-items:center;gap:10px;}
    .cart-pill{
      display:flex;align-items:center;gap:8px;
      background:var(--primary);color:#fff;
      border:none;border-radius:50px;
      padding:8px 18px;font-family:'Inter',sans-serif;font-size:14px;font-weight:600;
      cursor:pointer;transition:all .25s;
    }
    .cart-pill:hover{background:var(--primary-dark);transform:translateY(-1px);box-shadow:0 6px 20px rgba(79,70,229,.35);}
    .cart-pill .badge{
      background:rgba(255,255,255,.25);color:#fff;
      font-size:11px;font-weight:700;padding:1px 7px;border-radius:20px;
    }

    /* Views */
    .view{display:none;animation:fadeUp .3s ease;}
    .view.active{display:block;}
    @keyframes fadeUp{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}

    /* Hero */
    .hero{
      padding:56px 0 32px;
      background:linear-gradient(135deg,#eef2ff 0%,#f0fdff 100%);
      border-bottom:1px solid var(--border);
      margin-bottom:32px;
    }
    .hero-inner{text-align:center;}
    .hero-tag{
      display:inline-flex;align-items:center;gap:6px;
      background:#fff;border:1px solid var(--border);
      padding:5px 14px;border-radius:50px;font-size:13px;
      color:var(--text2);font-weight:500;margin-bottom:16px;
      box-shadow:0 2px 8px rgba(0,0,0,.05);
    }
    .hero-tag span{width:6px;height:6px;border-radius:50%;background:var(--success);display:inline-block;animation:blink 1.5s infinite;}
    @keyframes blink{0%,100%{opacity:1;}50%{opacity:.3;}}
    .hero-title{
      font-size:48px;font-weight:800;line-height:1.1;
      background:linear-gradient(135deg,var(--primary),var(--accent));
      -webkit-background-clip:text;-webkit-text-fill-color:transparent;
      margin-bottom:12px;
    }
    .hero-desc{font-size:17px;color:var(--text2);max-width:520px;margin:0 auto;}

    /* Section Header */
    .section-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;}
    .section-title{font-size:18px;font-weight:700;color:var(--text);}

    /* Filter Chips */
    .chips{display:flex;gap:8px;flex-wrap:wrap;padding:20px 0;}
    .chip{
      background:var(--surface);border:1.5px solid var(--border);
      color:var(--text2);padding:8px 18px;border-radius:50px;
      font-size:13px;font-weight:500;cursor:pointer;
      transition:all .2s;white-space:nowrap;
    }
    .chip:hover{border-color:var(--primary);color:var(--primary);}
    .chip.active{background:var(--primary);border-color:var(--primary);color:#fff;}

    /* Product Grid */
    .products-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:20px;padding-bottom:48px;}
    .product-card{
      background:var(--surface);border:1.5px solid var(--border);
      border-radius:var(--radius);overflow:hidden;
      display:flex;flex-direction:column;
      transition:all .3s cubic-bezier(.16,1,.3,1);
      cursor:pointer;
    }
    .product-card:hover{
      transform:translateY(-4px);
      box-shadow:var(--shadow-lg);
      border-color:var(--primary);
    }
    .card-img-wrap{position:relative;height:210px;overflow:hidden;background:#f1f5f9;}
    .card-img{width:100%;height:100%;object-fit:cover;transition:transform .4s ease;}
    .product-card:hover .card-img{transform:scale(1.04);}

    .stock-chip{
      position:absolute;top:10px;right:10px;
      font-size:11px;font-weight:700;padding:4px 10px;border-radius:50px;
    }
    .stock-in{background:#dcfce7;color:#16a34a;}
    .stock-low{background:#fef3c7;color:#92400e;}
    .stock-out{background:#fee2e2;color:#b91c1c;}

    .card-body{padding:16px;display:flex;flex-direction:column;flex:1;gap:4px;}
    .card-cat{font-size:11px;font-weight:600;color:var(--primary);text-transform:uppercase;letter-spacing:.5px;}
    .card-name{font-size:15px;font-weight:700;color:var(--text);line-height:1.3;margin-top:2px;}
    .card-desc{font-size:13px;color:var(--text2);line-height:1.5;flex:1;margin-top:4px;}
    .card-footer{display:flex;align-items:center;justify-content:space-between;margin-top:14px;padding-top:12px;border-top:1px solid var(--border);}
    .price{font-size:20px;font-weight:800;color:var(--text);}
    .price span{font-size:13px;font-weight:400;color:var(--text3);}

    /* Buttons */
    .btn{
      display:inline-flex;align-items:center;justify-content:center;gap:8px;
      border:none;border-radius:var(--radius-sm);font-family:'Inter',sans-serif;
      font-weight:600;cursor:pointer;transition:all .2s;
    }
    .btn-primary{background:var(--primary);color:#fff;padding:10px 20px;font-size:14px;}
    .btn-primary:hover{background:var(--primary-dark);transform:translateY(-1px);box-shadow:0 4px 14px rgba(79,70,229,.3);}
    .btn-primary:disabled{background:#c7d2fe;cursor:not-allowed;transform:none;box-shadow:none;}
    .btn-outline{background:none;border:1.5px solid var(--border);color:var(--text2);padding:9px 18px;font-size:14px;}
    .btn-outline:hover{border-color:var(--primary);color:var(--primary);}
    .btn-danger{background:#fee2e2;color:#b91c1c;padding:9px 18px;font-size:14px;}
    .btn-danger:hover{background:#fecaca;}
    .btn-sm{padding:6px 14px;font-size:13px;border-radius:6px;}
    .btn-icon{background:none;border:none;padding:8px;border-radius:6px;cursor:pointer;color:var(--text3);transition:all .2s;display:inline-flex;align-items:center;}
    .btn-icon:hover{background:var(--surface2);color:var(--text);}

    /* Modal */
    .modal-overlay{
      position:fixed;inset:0;background:rgba(15,23,42,.4);backdrop-filter:blur(8px);
      z-index:200;display:none;align-items:center;justify-content:center;padding:20px;
    }
    .modal-overlay.open{display:flex;}
    .modal{
      background:var(--surface);border-radius:16px;
      width:100%;max-width:540px;max-height:90vh;overflow-y:auto;
      box-shadow:0 24px 64px rgba(0,0,0,.15);
      animation:modalIn .25s cubic-bezier(.16,1,.3,1);
    }
    @keyframes modalIn{from{opacity:0;transform:scale(.96) translateY(10px);}to{opacity:1;transform:none;}}
    .modal-header{display:flex;align-items:center;justify-content:space-between;padding:24px 24px 0;}
    .modal-title{font-size:18px;font-weight:700;color:var(--text);}
    .modal-close{background:none;border:none;width:32px;height:32px;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--text3);font-size:20px;transition:all .2s;}
    .modal-close:hover{background:var(--surface2);color:var(--text);}
    .modal-body{padding:24px;}
    .modal-footer{padding:0 24px 24px;display:flex;gap:10px;justify-content:flex-end;}

    /* Forms */
    .form-group{margin-bottom:16px;}
    .form-label{display:block;font-size:13px;font-weight:600;color:var(--text);margin-bottom:6px;}
    .form-input,.form-select,.form-textarea{
      width:100%;background:var(--bg);border:1.5px solid var(--border);
      padding:10px 14px;border-radius:var(--radius-sm);color:var(--text);
      font-family:'Inter',sans-serif;font-size:14px;outline:none;
      transition:border-color .2s;
    }
    .form-input:focus,.form-select:focus,.form-textarea:focus{border-color:var(--primary);box-shadow:0 0 0 3px rgba(79,70,229,.1);}
    .form-textarea{resize:vertical;}
    .form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;}

    /* Cart Modal */
    .cart-item{display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--border);}
    .cart-item:last-child{border:none;}
    .cart-item-img{width:52px;height:52px;border-radius:8px;object-fit:cover;flex-shrink:0;background:var(--surface2);}
    .cart-item-info{flex:1;min-width:0;}
    .cart-item-name{font-size:14px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .cart-item-price{font-size:13px;color:var(--text3);}
    .qty-ctrl{display:flex;align-items:center;gap:8px;}
    .qty-btn{
      width:28px;height:28px;border-radius:8px;border:1.5px solid var(--border);
      background:none;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;
      transition:all .2s;color:var(--text2);font-weight:600;
    }
    .qty-btn:hover{border-color:var(--primary);color:var(--primary);}
    .qty-num{font-size:14px;font-weight:700;min-width:20px;text-align:center;}

    /* Cart total bar */
    .cart-total-row{display:flex;justify-content:space-between;align-items:center;padding:16px 0;margin-top:4px;}
    .cart-total-label{font-size:15px;font-weight:600;color:var(--text2);}
    .cart-total-amount{font-size:24px;font-weight:800;color:var(--text);}

    /* Admin */
    .admin-login{max-width:440px;margin:60px auto;background:var(--surface);border:1.5px solid var(--border);border-radius:16px;padding:36px;box-shadow:var(--shadow);}
    .admin-login-logo{width:52px;height:52px;background:linear-gradient(135deg,var(--primary),var(--accent));border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:24px;margin-bottom:16px;}

    .stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:24px;}
    .stat-card{background:var(--surface);border:1.5px solid var(--border);border-radius:var(--radius);padding:20px;transition:all .2s;}
    .stat-card:hover{box-shadow:var(--shadow);}
    .stat-label{font-size:12px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;}
    .stat-value{font-size:28px;font-weight:800;color:var(--text);}
    .stat-accent{color:var(--primary);}

    /* Tables */
    .data-table-wrap{background:var(--surface);border:1.5px solid var(--border);border-radius:var(--radius);overflow:hidden;margin-top:4px;}
    .data-table-head{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--border);}
    table{width:100%;border-collapse:collapse;}
    th{text-align:left;font-size:12px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;padding:12px 16px;border-bottom:1px solid var(--border);background:var(--surface2);}
    td{padding:14px 16px;border-bottom:1px solid var(--border);font-size:14px;color:var(--text2);}
    tr:last-child td{border:none;}
    tr:hover td{background:#fafbff;}

    /* Status badges */
    .badge{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:50px;font-size:12px;font-weight:600;}
    .badge-PENDING{background:#fef3c7;color:#92400e;}
    .badge-PAID{background:#dbeafe;color:#1e40af;}
    .badge-PROCESSING{background:#ede9fe;color:#5b21b6;}
    .badge-SHIPPED{background:#d1fae5;color:#065f46;}
    .badge-DELIVERED{background:#d1fae5;color:#065f46;}
    .badge-CANCELLED{background:#fee2e2;color:#b91c1c;}

    /* Tracking Timeline */
    .track-result{background:var(--surface);border:1.5px solid var(--border);border-radius:16px;padding:28px;margin-top:16px;}
    .timeline-track{display:flex;align-items:center;margin:24px 0;}
    .timeline-step{display:flex;flex-direction:column;align-items:center;flex:1;position:relative;}
    .timeline-step + .timeline-step::before{content:'';position:absolute;top:14px;right:50%;width:100%;height:2px;background:var(--border);z-index:0;}
    .timeline-step.done + .timeline-step::before{background:var(--success);}
    .t-circle{
      width:30px;height:30px;border-radius:50%;border:2px solid var(--border);
      background:var(--surface);display:flex;align-items:center;justify-content:center;
      font-size:12px;font-weight:700;color:var(--text3);position:relative;z-index:1;
      transition:all .3s;
    }
    .t-circle.done{background:var(--success);border-color:var(--success);color:#fff;}
    .t-circle.current{background:var(--primary);border-color:var(--primary);color:#fff;box-shadow:0 0 0 4px rgba(79,70,229,.15);}
    .t-label{font-size:11px;font-weight:600;color:var(--text3);margin-top:6px;text-align:center;}
    .t-label.done{color:var(--success);}
    .t-label.current{color:var(--primary);}

    /* Section tabs */
    .admin-tabs{display:flex;gap:4px;background:var(--surface2);border-radius:10px;padding:4px;margin-bottom:20px;display:inline-flex;}
    .admin-tab{padding:8px 20px;border-radius:8px;border:none;background:none;font-family:'Inter',sans-serif;font-size:14px;font-weight:500;color:var(--text2);cursor:pointer;transition:all .2s;}
    .admin-tab.active{background:var(--surface);color:var(--text);box-shadow:var(--shadow);}

    /* Toast */
    .toast{
      position:fixed;bottom:24px;right:24px;z-index:999;
      background:var(--text);color:#fff;padding:14px 20px;border-radius:12px;
      font-size:14px;font-weight:500;box-shadow:var(--shadow-lg);
      display:none;animation:toastIn .3s ease;max-width:320px;
    }
    .toast.success{background:#10b981;}
    .toast.error{background:#ef4444;}
    @keyframes toastIn{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}

    /* Divider */
    .divider{height:1px;background:var(--border);margin:20px 0;}

    /* Empty state */
    .empty{text-align:center;padding:48px;color:var(--text3);}
    .empty-icon{font-size:40px;margin-bottom:12px;}

    /* Responsive */
    @media(max-width:640px){
      .hero-title{font-size:30px;}
      .form-row{grid-template-columns:1fr;}
      .nav-tabs{display:none;}
    }
  </style>
</head>
<body>

<!-- NAVBAR -->
<nav class="navbar">
  <div class="container nav-inner">
    <div class="brand" onclick="switchView('store')">
      <div class="brand-mark">M</div>
      <div>
        <div class="brand-name">Mega Store</div>
        <div class="brand-sub">AP-SOUTHEAST-7 · Bangkok</div>
      </div>
    </div>
    <div class="nav-tabs">
      <button class="nav-tab active" id="tab-btn-store" onclick="switchView('store')">Store</button>
      <button class="nav-tab" id="tab-btn-track" onclick="switchView('track')">Track Order</button>
      <button class="nav-tab" id="tab-btn-admin" onclick="switchView('admin')">Admin Portal</button>
    </div>
    <div class="nav-right">
      <button class="cart-pill" onclick="openModal('cart-modal')">
        🛒 Cart <span class="badge" id="cart-badge">0</span>
      </button>
    </div>
  </div>
</nav>

<!-- STORE VIEW -->
<div id="view-store" class="view active">
  <div class="hero">
    <div class="container hero-inner">
      <div class="hero-tag"><span></span> Live Store · Real-time Inventory</div>
      <h1 class="hero-title">Future-Ready Hardware</h1>
      <p class="hero-desc">Cloud nodes, AI kits & developer gear — deployed straight from our AWS Thailand cluster.</p>
    </div>
  </div>
  <div class="container">
    <div class="chips" id="chip-bar">
      <button class="chip active" data-slug="">All Products</button>
    </div>
    <div class="products-grid" id="products-grid">
      <div class="empty"><div class="empty-icon">⏳</div>Loading products...</div>
    </div>
  </div>
</div>

<!-- TRACK VIEW -->
<div id="view-track" class="view">
  <div class="container" style="max-width:720px; padding-top:40px;">
    <h2 style="font-size:24px;font-weight:800;margin-bottom:8px;">📦 Track Your Order</h2>
    <p style="color:var(--text2);margin-bottom:24px;">Enter your order number to see real-time status and delivery updates.</p>
    <div style="display:flex;gap:10px;">
      <input type="text" id="track-input" class="form-input" placeholder="e.g. ORD-20260818-XXXX" style="flex:1;">
      <button class="btn btn-primary" onclick="trackOrder()">Track</button>
    </div>
    <div id="track-result"></div>
  </div>
</div>

<!-- ADMIN VIEW -->
<div id="view-admin" class="view">
  <div class="container" style="padding-top:40px;">

    <!-- Login -->
    <div id="admin-login" class="admin-login">
      <div class="admin-login-logo">🔐</div>
      <h2 style="font-size:22px;font-weight:800;margin-bottom:4px;">Admin Portal</h2>
      <p style="color:var(--text2);font-size:14px;margin-bottom:24px;">Default: <code>admin</code> / <code>admin123</code></p>
      <div class="form-group">
        <label class="form-label">Username or Email</label>
        <input type="text" id="a-username" class="form-input" value="admin">
      </div>
      <div class="form-group">
        <label class="form-label">Password</label>
        <input type="password" id="a-password" class="form-input" value="admin123">
      </div>
      <button class="btn btn-primary" style="width:100%;" onclick="adminLogin()">Sign In</button>
    </div>

    <!-- Dashboard -->
    <div id="admin-dash" style="display:none;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;">
        <div>
          <h2 style="font-size:24px;font-weight:800;">Operations Dashboard</h2>
          <p style="color:var(--text2);font-size:14px;">Logged in as <b id="admin-username-label">admin</b></p>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-primary btn-sm" onclick="openAddProduct()">+ Add Product</button>
          <button class="btn btn-outline btn-sm" onclick="adminLogout()">Sign Out</button>
        </div>
      </div>

      <!-- Stats -->
      <div class="stats-grid" id="admin-stats"></div>

      <!-- Tabs -->
      <div class="admin-tabs">
        <button class="admin-tab active" id="atab-orders" onclick="switchAdminTab('orders')">Orders</button>
        <button class="admin-tab" id="atab-products" onclick="switchAdminTab('products')">Products</button>
        <button class="admin-tab" id="atab-logs" onclick="switchAdminTab('logs')">Audit Log</button>
      </div>

      <div id="apanel-orders">
        <div class="data-table-wrap">
          <table><thead><tr><th>Order #</th><th>Customer</th><th>Amount</th><th>Status</th><th>Tracking</th><th>Actions</th></tr></thead>
          <tbody id="orders-tbody"><tr><td colspan="6" class="empty">Loading...</td></tr></tbody></table>
        </div>
      </div>

      <div id="apanel-products" style="display:none;">
        <div class="data-table-wrap">
          <table><thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody id="products-tbody"><tr><td colspan="6" class="empty">Loading...</td></tr></tbody></table>
        </div>
      </div>

      <div id="apanel-logs" style="display:none;">
        <div class="data-table-wrap">
          <table><thead><tr><th>Time</th><th>Admin</th><th>Action</th><th>Target</th><th>IP</th></tr></thead>
          <tbody id="logs-tbody"><tr><td colspan="5" class="empty">Loading...</td></tr></tbody></table>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- CART MODAL -->
<div class="modal-overlay" id="cart-modal">
  <div class="modal" style="max-width:560px;">
    <div class="modal-header">
      <span class="modal-title">Shopping Cart</span>
      <button class="modal-close" onclick="closeModal('cart-modal')">×</button>
    </div>
    <div class="modal-body">
      <div id="cart-items-list"></div>
      <div id="cart-total-section"></div>
      <div id="cart-checkout-form" style="display:none;">
        <div class="divider"></div>
        <h4 style="font-size:15px;font-weight:700;margin-bottom:14px;">Shipping Details</h4>
        <div class="form-group">
          <label class="form-label">Full Name</label>
          <input type="text" id="chk-name" class="form-input" placeholder="Somchai Jaidee">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Phone</label>
            <input type="text" id="chk-phone" class="form-input" placeholder="081-234-5678">
          </div>
          <div class="form-group">
            <label class="form-label">Note (optional)</label>
            <input type="text" id="chk-note" class="form-input" placeholder="Leave at door">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Shipping Address</label>
          <textarea id="chk-addr" class="form-textarea" rows="2" placeholder="123 Sukhumvit Rd, Bangkok 10110"></textarea>
        </div>
      </div>
    </div>
    <div class="modal-footer" id="cart-footer-btns"></div>
  </div>
</div>

<!-- ADD/EDIT PRODUCT MODAL -->
<div class="modal-overlay" id="product-modal">
  <div class="modal">
    <div class="modal-header">
      <span class="modal-title" id="product-modal-title">Add Product</span>
      <button class="modal-close" onclick="closeModal('product-modal')">×</button>
    </div>
    <div class="modal-body">
      <input type="hidden" id="p-edit-id">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Product Name *</label>
          <input type="text" id="p-name" class="form-input">
        </div>
        <div class="form-group">
          <label class="form-label">Category</label>
          <select id="p-cat" class="form-select"></select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Price (THB) *</label>
          <input type="number" id="p-price" class="form-input" step="0.01">
        </div>
        <div class="form-group">
          <label class="form-label">Stock *</label>
          <input type="number" id="p-stock" class="form-input">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Image URL</label>
        <input type="text" id="p-img" class="form-input" placeholder="https://...">
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <textarea id="p-desc" class="form-textarea" rows="3"></textarea>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal('product-modal')">Cancel</button>
      <button class="btn btn-primary" onclick="saveProduct()">Save Product</button>
    </div>
  </div>
</div>

<!-- STATUS MODAL -->
<div class="modal-overlay" id="status-modal">
  <div class="modal" style="max-width:440px;">
    <div class="modal-header">
      <span class="modal-title">Update Order Status</span>
      <button class="modal-close" onclick="closeModal('status-modal')">×</button>
    </div>
    <div class="modal-body">
      <input type="hidden" id="st-order-id">
      <div style="background:var(--surface2);border-radius:8px;padding:12px;margin-bottom:16px;">
        <div style="font-size:12px;color:var(--text3);font-weight:600;">Order Number</div>
        <div id="st-order-num" style="font-size:16px;font-weight:700;color:var(--primary);margin-top:2px;"></div>
      </div>
      <div class="form-group">
        <label class="form-label">New Status</label>
        <select id="st-status" class="form-select">
          <option value="PENDING">PENDING — Awaiting payment</option>
          <option value="PAID">PAID — Payment confirmed</option>
          <option value="PROCESSING">PROCESSING — Packing</option>
          <option value="SHIPPED">SHIPPED — Dispatched</option>
          <option value="DELIVERED">DELIVERED — Completed</option>
          <option value="CANCELLED">CANCELLED — Refund stock</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Tracking Number</label>
        <input type="text" id="st-tracking" class="form-input" placeholder="EMS-1234567TH">
      </div>
      <div class="form-group">
        <label class="form-label">Internal Note</label>
        <input type="text" id="st-note" class="form-input" placeholder="Optional">
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal('status-modal')">Cancel</button>
      <button class="btn btn-primary" onclick="saveOrderStatus()">Save Changes</button>
    </div>
  </div>
</div>

<div id="toast" class="toast"></div>

<script>
// ── State ──────────────────────────────────────────────────
let cart = JSON.parse(localStorage.getItem('ms-cart') || '[]');
let adminToken = localStorage.getItem('ms-admin-token') || '';
let allProducts = [];
let allCategories = [];
let cartStep = 'view'; // 'view' | 'checkout'
let currentAdminTab = 'orders';

// ── Utilities ──────────────────────────────────────────────
function toast(msg, type='') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast' + (type ? ' ' + type : '');
  el.style.display = 'block';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.display = 'none'; }, 3000);
}

function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

function fmt(n) { return parseFloat(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

async function api(url, opts={}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (adminToken && !headers['Authorization']) headers['Authorization'] = 'Bearer ' + adminToken;
  const res = await fetch(url, { ...opts, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ── Views ──────────────────────────────────────────────────
function switchView(view) {
  ['store','track','admin'].forEach(v => {
    document.getElementById('view-' + v).classList.toggle('active', v === view);
    const btn = document.getElementById('tab-btn-' + v);
    if (btn) btn.classList.toggle('active', v === view);
  });
  if (view === 'store') loadStore();
  if (view === 'admin') initAdmin();
}

// ── Store ──────────────────────────────────────────────────
async function loadStore() {
  try {
    const [cr, pr] = await Promise.all([
      api('/api/categories'),
      api('/api/products')
    ]);
    allCategories = cr.categories || [];
    allProducts = pr.products || [];
    renderChips(allCategories);
    renderProducts(allProducts);
    updateCartBadge();
  } catch(e) { console.error(e); }
}

function renderChips(cats) {
  const bar = document.getElementById('chip-bar');
  const chips = [{ name: 'All Products', slug: '' }, ...cats.map(c => ({ name: c.name, slug: c.slug }))];
  bar.innerHTML = chips.map((c, i) =>
    '<button class="chip' + (i === 0 ? ' active' : '') + '" data-slug="' + c.slug + '">' + c.name + '</button>'
  ).join('');
  bar.querySelectorAll('.chip').forEach(btn => {
    btn.addEventListener('click', function() {
      bar.querySelectorAll('.chip').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      const slug = this.dataset.slug;
      renderProducts(slug ? allProducts.filter(p => p.category_slug === slug) : allProducts);
    });
  });
}

function renderProducts(list) {
  const grid = document.getElementById('products-grid');
  if (!list.length) {
    grid.innerHTML = '<div class="empty"><div class="empty-icon">🔍</div>No products found.</div>';
    return;
  }
  grid.innerHTML = list.map(p => {
    const stockClass = p.stock > 10 ? 'stock-in' : p.stock > 0 ? 'stock-low' : 'stock-out';
    const stockLabel = p.stock > 0 ? (p.stock > 10 ? 'In Stock' : p.stock + ' left') : 'Out of Stock';
    return [
      '<div class="product-card">',
        '<div class="card-img-wrap">',
          '<img class="card-img" src="' + (p.image_url || '') + '" alt="' + p.name + '" loading="lazy">',
          '<span class="stock-chip ' + stockClass + '">' + stockLabel + '</span>',
        '</div>',
        '<div class="card-body">',
          '<div class="card-cat">' + (p.category_name || 'Hardware') + '</div>',
          '<div class="card-name">' + p.name + '</div>',
          '<div class="card-desc">' + p.description + '</div>',
          '<div class="card-footer">',
            '<div class="price">฿' + fmt(p.price) + '</div>',
            '<button class="btn btn-primary btn-sm" ' + (p.stock <= 0 ? 'disabled' : '') + ' data-pid="' + p.id + '">',
              p.stock > 0 ? '+ Add to Cart' : 'Sold Out',
            '</button>',
          '</div>',
        '</div>',
      '</div>'
    ].join('');
  }).join('');

  grid.querySelectorAll('[data-pid]').forEach(btn => {
    btn.addEventListener('click', function() {
      addToCart(parseInt(this.dataset.pid));
    });
  });
}

// ── Cart ──────────────────────────────────────────────────
function updateCartBadge() {
  const total = cart.reduce((s, i) => s + i.quantity, 0);
  document.getElementById('cart-badge').textContent = total;
}

function saveCart() {
  localStorage.setItem('ms-cart', JSON.stringify(cart));
  updateCartBadge();
}

function addToCart(productId) {
  const p = allProducts.find(x => x.id === productId);
  if (!p) return;
  const ex = cart.find(i => i.product_id === productId);
  if (ex) {
    if (ex.quantity >= p.stock) { toast('Maximum stock reached!', 'error'); return; }
    ex.quantity++;
  } else {
    cart.push({ product_id: p.id, name: p.name, price: parseFloat(p.price), image_url: p.image_url, quantity: 1, stock: p.stock });
  }
  saveCart();
  toast('Added to cart: ' + p.name, 'success');
}

function changeQty(idx, delta) {
  if (!cart[idx]) return;
  cart[idx].quantity += delta;
  if (cart[idx].quantity <= 0) cart.splice(idx, 1);
  saveCart();
  renderCart();
}

function openCart() {
  cartStep = 'view';
  renderCart();
  openModal('cart-modal');
}

function renderCart() {
  const list = document.getElementById('cart-items-list');
  const totalSec = document.getElementById('cart-total-section');
  const checkoutForm = document.getElementById('cart-checkout-form');
  const footerBtns = document.getElementById('cart-footer-btns');

  if (!cart.length) {
    list.innerHTML = '<div class="empty"><div class="empty-icon">🛒</div>Your cart is empty</div>';
    totalSec.innerHTML = '';
    checkoutForm.style.display = 'none';
    footerBtns.innerHTML = '<button class="btn btn-primary" onclick="closeModal(\'cart-modal\'); switchView(\'store\')">Browse Products</button>';
    return;
  }

  const grandTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  list.innerHTML = cart.map((item, idx) =>
    '<div class="cart-item">' +
      '<img class="cart-item-img" src="' + (item.image_url || '') + '" alt="' + item.name + '">' +
      '<div class="cart-item-info">' +
        '<div class="cart-item-name">' + item.name + '</div>' +
        '<div class="cart-item-price">฿' + fmt(item.price) + ' each</div>' +
      '</div>' +
      '<div class="qty-ctrl">' +
        '<button class="qty-btn" data-idx="' + idx + '" data-d="-1">−</button>' +
        '<span class="qty-num">' + item.quantity + '</span>' +
        '<button class="qty-btn" data-idx="' + idx + '" data-d="1">+</button>' +
      '</div>' +
    '</div>'
  ).join('');

  list.querySelectorAll('.qty-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      changeQty(parseInt(this.dataset.idx), parseInt(this.dataset.d));
    });
  });

  totalSec.innerHTML =
    '<div class="cart-total-row">' +
      '<span class="cart-total-label">Total (' + cart.reduce((s,i)=>s+i.quantity,0) + ' items)</span>' +
      '<span class="cart-total-amount">฿' + fmt(grandTotal) + '</span>' +
    '</div>';

  if (cartStep === 'checkout') {
    checkoutForm.style.display = 'block';
    footerBtns.innerHTML =
      '<button class="btn btn-outline" onclick="cartStep=\'view\'; renderCart();">← Back</button>' +
      '<button class="btn btn-primary" onclick="submitCheckout()">Confirm Order</button>';
  } else {
    checkoutForm.style.display = 'none';
    footerBtns.innerHTML = '<button class="btn btn-primary" style="width:100%;" onclick="cartStep=\'checkout\'; renderCart();">Proceed to Checkout</button>';
  }
}

async function submitCheckout() {
  const name = document.getElementById('chk-name').value.trim();
  const phone = document.getElementById('chk-phone').value.trim();
  const addr = document.getElementById('chk-addr').value.trim();
  const note = document.getElementById('chk-note').value.trim();
  if (!name || !phone || !addr) { toast('Please fill in all shipping details', 'error'); return; }

  try {
    let token = localStorage.getItem('ms-cust-token');
    if (!token) {
      const loginRes = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ username: 'demo_user', password: 'user123' }), headers: {} });
      token = loginRes.token;
      localStorage.setItem('ms-cust-token', token);
    }
    const orderRes = await api('/api/orders', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ items: cart, shipping_name: name, shipping_phone: phone, shipping_address: addr, note })
    });
    cart = [];
    saveCart();
    closeModal('cart-modal');
    loadStore();
    switchView('track');
    document.getElementById('track-input').value = orderRes.order.order_number;
    trackOrder();
    toast('Order placed! #' + orderRes.order.order_number, 'success');
  } catch(e) { toast(e.message, 'error'); }
}

// ── Order Tracking ──────────────────────────────────────────
async function trackOrder() {
  const num = document.getElementById('track-input').value.trim();
  if (!num) return;
  try {
    const data = await api('/api/orders/' + encodeURIComponent(num), { headers: {} });
    const o = data.order;
    const steps = ['PENDING','PAID','PROCESSING','SHIPPED','DELIVERED'];
    const currIdx = steps.indexOf(o.status);

    const timeline = steps.map((s, i) => {
      const done = currIdx > i;
      const curr = o.status === s && o.status !== 'CANCELLED';
      return '<div class="timeline-step' + (done ? ' done' : '') + '">' +
        '<div class="t-circle' + (done ? ' done' : curr ? ' current' : '') + '">' + (done ? '✓' : (i+1)) + '</div>' +
        '<div class="t-label' + (done ? ' done' : curr ? ' current' : '') + '">' + s + '</div>' +
      '</div>';
    }).join('');

    document.getElementById('track-result').innerHTML =
      '<div class="track-result">' +
        '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:4px;">' +
          '<div>' +
            '<div style="font-size:11px;color:var(--text3);font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Order Number</div>' +
            '<div style="font-size:22px;font-weight:800;color:var(--text);margin-top:2px;">' + o.order_number + '</div>' +
            '<div style="font-size:13px;color:var(--text3);margin-top:4px;">Placed ' + new Date(o.created_at).toLocaleDateString('th-TH', { year:'numeric', month:'long', day:'numeric' }) + '</div>' +
          '</div>' +
          '<span class="badge badge-' + o.status + '">' + o.status + '</span>' +
        '</div>' +
        (o.status === 'CANCELLED' ? '<div style="background:#fee2e2;border-radius:8px;padding:12px 16px;margin-top:16px;color:#b91c1c;font-weight:600;font-size:14px;">⚠️ This order has been cancelled.</div>' :
          '<div class="timeline-track">' + timeline + '</div>') +
        (o.tracking_number ? '<div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:8px;padding:12px 16px;margin:16px 0;"><div style="font-size:11px;color:#16a34a;font-weight:700;letter-spacing:.5px;">TRACKING NUMBER</div><div style="font-size:17px;font-weight:800;color:#15803d;margin-top:2px;">' + o.tracking_number + '</div></div>' : '') +
        '<div class="divider"></div>' +
        '<div style="font-weight:700;margin-bottom:10px;">Order Items</div>' +
        (o.items || []).map(i => '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:14px;"><span>' + i.product_name + ' × ' + i.quantity + '</span><span style="font-weight:600;">฿' + fmt(i.subtotal) + '</span></div>').join('') +
        '<div style="display:flex;justify-content:space-between;margin-top:12px;font-size:16px;font-weight:800;"><span>Total</span><span>฿' + fmt(o.total_amount) + '</span></div>' +
      '</div>';
  } catch(e) { toast(e.message, 'error'); }
}

// ── Admin ──────────────────────────────────────────────────
function initAdmin() {
  if (adminToken) {
    document.getElementById('admin-login').style.display = 'none';
    document.getElementById('admin-dash').style.display = 'block';
    loadAdminDashboard();
  } else {
    document.getElementById('admin-login').style.display = 'block';
    document.getElementById('admin-dash').style.display = 'none';
  }
}

async function adminLogin() {
  try {
    const data = await api('/api/auth/login', {
      method: 'POST',
      headers: {},
      body: JSON.stringify({ username: document.getElementById('a-username').value, password: document.getElementById('a-password').value })
    });
    if (data.user.role !== 'admin') throw new Error('Not an admin account');
    adminToken = data.token;
    localStorage.setItem('ms-admin-token', adminToken);
    document.getElementById('admin-username-label').textContent = data.user.username;
    initAdmin();
    toast('Welcome, ' + data.user.username + '!', 'success');
  } catch(e) { toast(e.message, 'error'); }
}

function adminLogout() {
  adminToken = '';
  localStorage.removeItem('ms-admin-token');
  initAdmin();
}

function switchAdminTab(tab) {
  ['orders','products','logs'].forEach(t => {
    document.getElementById('apanel-' + t).style.display = t === tab ? 'block' : 'none';
    document.getElementById('atab-' + t).classList.toggle('active', t === tab);
  });
  currentAdminTab = tab;
}

async function loadAdminDashboard() {
  try {
    const [dash, orders, prods, logs] = await Promise.all([
      api('/api/admin/dashboard'),
      api('/api/admin/orders'),
      api('/api/products?active_only=false'),
      api('/api/admin/logs')
    ]);
    allProducts = prods.products || [];
    const s = dash.summary;
    document.getElementById('admin-stats').innerHTML = [
      ['💰 Revenue', '฿' + fmt(s.totalRevenue), 'stat-accent'],
      ['📦 Orders', s.totalOrders, ''],
      ['👥 Customers', s.totalUsers, ''],
      ['⚠️ Low Stock', s.lowStockCount, s.lowStockCount > 0 ? 'color:var(--danger)' : '']
    ].map(([label, val, cls]) =>
      '<div class="stat-card"><div class="stat-label">' + label + '</div>' +
      '<div class="stat-value ' + cls + '" style="' + (cls.includes(':') ? cls : '') + '">' + val + '</div></div>'
    ).join('');

    // Orders table
    document.getElementById('orders-tbody').innerHTML = (orders.orders || []).length === 0
      ? '<tr><td colspan="6" class="empty">No orders yet</td></tr>'
      : (orders.orders || []).map(o =>
          '<tr><td><b>' + o.order_number + '</b><br><small style="color:var(--text3);">' + o.shipping_name + '</small></td>' +
          '<td>' + (o.username || '—') + '</td>' +
          '<td>฿' + fmt(o.total_amount) + '</td>' +
          '<td><span class="badge badge-' + o.status + '">' + o.status + '</span></td>' +
          '<td style="font-size:13px;color:var(--text3);">' + (o.tracking_number || '—') + '</td>' +
          '<td><button class="btn btn-outline btn-sm" data-oid="' + o.id + '" data-onum="' + o.order_number + '" data-ostatus="' + o.status + '" data-otrack="' + (o.tracking_number || '') + '" onclick="openStatusModal(this)">Update</button></td>' +
          '</tr>'
        ).join('');

    // Products table
    document.getElementById('products-tbody').innerHTML = (prods.products || []).length === 0
      ? '<tr><td colspan="6" class="empty">No products</td></tr>'
      : (prods.products || []).map(p =>
          '<tr><td><b>' + p.name + '</b></td>' +
          '<td>' + (p.category_name || '—') + '</td>' +
          '<td>฿' + fmt(p.price) + '</td>' +
          '<td style="' + (p.stock <= 5 ? 'color:var(--danger);font-weight:600;' : '') + '">' + p.stock + '</td>' +
          '<td>' + (p.is_active ? '<span class="badge badge-SHIPPED">Active</span>' : '<span class="badge badge-CANCELLED">Off</span>') + '</td>' +
          '<td><button class="btn btn-outline btn-sm" data-pid="' + p.id + '" onclick="openEditProduct(this)">Edit</button></td>' +
          '</tr>'
        ).join('');

    // Logs table
    document.getElementById('logs-tbody').innerHTML = (logs.logs || []).length === 0
      ? '<tr><td colspan="5" class="empty">No logs yet</td></tr>'
      : (logs.logs || []).map(l =>
          '<tr>' +
          '<td style="font-size:12px;color:var(--text3);">' + new Date(l.created_at).toLocaleString('th-TH') + '</td>' +
          '<td><b>' + (l.admin_name || 'system') + '</b></td>' +
          '<td><span class="badge badge-PAID" style="font-size:11px;">' + l.action + '</span></td>' +
          '<td style="font-size:13px;">' + l.target_type + ' #' + l.target_id + '</td>' +
          '<td style="font-size:12px;color:var(--text3);">' + (l.ip_address || '—') + '</td>' +
          '</tr>'
        ).join('');
  } catch(e) { console.error(e); toast(e.message, 'error'); }
}

function openStatusModal(btn) {
  document.getElementById('st-order-id').value = btn.dataset.oid;
  document.getElementById('st-order-num').textContent = btn.dataset.onum;
  document.getElementById('st-status').value = btn.dataset.ostatus;
  document.getElementById('st-tracking').value = btn.dataset.otrack;
  document.getElementById('st-note').value = '';
  openModal('status-modal');
}

async function saveOrderStatus() {
  const id = document.getElementById('st-order-id').value;
  try {
    await api('/api/admin/orders/' + id + '/status', {
      method: 'PUT',
      body: JSON.stringify({ status: document.getElementById('st-status').value, tracking_number: document.getElementById('st-tracking').value.trim(), note: document.getElementById('st-note').value.trim() })
    });
    closeModal('status-modal');
    loadAdminDashboard();
    toast('Order status updated', 'success');
  } catch(e) { toast(e.message, 'error'); }
}

function openAddProduct() {
  document.getElementById('product-modal-title').textContent = 'Add Product';
  document.getElementById('p-edit-id').value = '';
  ['p-name','p-price','p-stock','p-img','p-desc'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const sel = document.getElementById('p-cat');
  sel.innerHTML = allCategories.map(c => '<option value="' + c.id + '">' + c.name + '</option>').join('');
  openModal('product-modal');
}

function openEditProduct(btn) {
  const pid = parseInt(btn.dataset.pid);
  const p = allProducts.find(x => x.id === pid);
  if (!p) return;
  document.getElementById('product-modal-title').textContent = 'Edit Product';
  document.getElementById('p-edit-id').value = pid;
  document.getElementById('p-name').value = p.name;
  document.getElementById('p-price').value = p.price;
  document.getElementById('p-stock').value = p.stock;
  document.getElementById('p-img').value = p.image_url || '';
  document.getElementById('p-desc').value = p.description || '';
  const sel = document.getElementById('p-cat');
  sel.innerHTML = allCategories.map(c => '<option value="' + c.id + '" ' + (c.id === p.category_id ? 'selected' : '') + '>' + c.name + '</option>').join('');
  openModal('product-modal');
}

async function saveProduct() {
  const id = document.getElementById('p-edit-id').value;
  const body = {
    name: document.getElementById('p-name').value.trim(),
    category_id: parseInt(document.getElementById('p-cat').value),
    price: parseFloat(document.getElementById('p-price').value),
    stock: parseInt(document.getElementById('p-stock').value),
    image_url: document.getElementById('p-img').value.trim(),
    description: document.getElementById('p-desc').value.trim()
  };
  try {
    const url = id ? '/api/admin/products/' + id : '/api/admin/products';
    const method = id ? 'PUT' : 'POST';
    await api(url, { method, body: JSON.stringify(body) });
    closeModal('product-modal');
    loadAdminDashboard();
    toast((id ? 'Product updated' : 'Product added') + ' successfully', 'success');
  } catch(e) { toast(e.message, 'error'); }
}

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', function(e) {
    if (e.target === this) this.classList.remove('open');
  });
});

// Connect cart button
document.querySelector('.cart-pill').addEventListener('click', openCart);

// Init
loadStore();
</script>
</body>
</html>`;
  res.send(html);
});

// ============================================================
// Start
// ============================================================
initDatabase().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log("🚀 Mega Store running on port", PORT);
    console.log("🏥 Health: http://localhost:" + PORT + "/health");
  });
});
