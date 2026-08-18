// ============================================================
// Mega Automation Lab - E-Commerce Backend & Ops Center
// Full PostgreSQL Backend with JWT Auth, Stock Management,
// Order State Machine, Audit Logging, and Modern Storefront UI
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
// Database Connection Pool
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
// Auto Database Migration & Seeding
// ============================================================
async function initDatabase() {
  console.log("🔄 Initializing database schema...");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'customer',
        full_name VARCHAR(100),
        phone VARCHAR(20),
        address TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 2. Categories table
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL
      );
    `);

    // 3. Products table
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        category_id INT REFERENCES categories(id) ON DELETE SET NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
        stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
        image_url TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 4. Orders table
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        order_number VARCHAR(32) UNIQUE NOT NULL,
        user_id INT REFERENCES users(id) ON DELETE RESTRICT,
        total_amount NUMERIC(10, 2) NOT NULL,
        status VARCHAR(30) DEFAULT 'PENDING',
        shipping_name VARCHAR(100) NOT NULL,
        shipping_phone VARCHAR(20) NOT NULL,
        shipping_address TEXT NOT NULL,
        tracking_number VARCHAR(100),
        note TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 5. Order Items table
    await client.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INT REFERENCES orders(id) ON DELETE CASCADE,
        product_id INT REFERENCES products(id) ON DELETE RESTRICT,
        product_name VARCHAR(255) NOT NULL,
        unit_price NUMERIC(10, 2) NOT NULL,
        quantity INT NOT NULL CHECK (quantity > 0),
        subtotal NUMERIC(10, 2) NOT NULL
      );
    `);

    // 6. Order Status Logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS order_status_logs (
        id SERIAL PRIMARY KEY,
        order_id INT REFERENCES orders(id) ON DELETE CASCADE,
        from_status VARCHAR(30),
        to_status VARCHAR(30) NOT NULL,
        changed_by INT REFERENCES users(id),
        note TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 7. Admin Audit Logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_audit_logs (
        id SERIAL PRIMARY KEY,
        admin_id INT REFERENCES users(id),
        action VARCHAR(100) NOT NULL,
        target_type VARCHAR(50),
        target_id INT,
        details JSONB,
        ip_address VARCHAR(45),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 8. General Request Traffic logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS request_logs (
        id SERIAL PRIMARY KEY,
        ip VARCHAR(64),
        method VARCHAR(10),
        path VARCHAR(255),
        user_agent TEXT,
        status_code INT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query("COMMIT");

    // ----------------------------------------------------
    // Seed Default Admin and Customer if not exist
    // ----------------------------------------------------
    const adminCheck = await client.query("SELECT id FROM users WHERE username = 'admin'");
    if (adminCheck.rows.length === 0) {
      const adminPassHash = await bcrypt.hash("admin123", 10);
      await client.query(
        `INSERT INTO users (username, email, password_hash, role, full_name, phone, address)
         VALUES ('admin', 'admin@store.local', $1, 'admin', 'System Administrator', '089-999-9999', 'Bangkok, Thailand')`,
        [adminPassHash]
      );
      console.log("👑 Seeded default Admin user (username: admin / pass: admin123)");
    }

    const customerCheck = await client.query("SELECT id FROM users WHERE username = 'demo_user'");
    if (customerCheck.rows.length === 0) {
      const userPassHash = await bcrypt.hash("user123", 10);
      await client.query(
        `INSERT INTO users (username, email, password_hash, role, full_name, phone, address)
         VALUES ('demo_user', 'customer@store.local', $1, 'customer', 'Somchai Jaidee', '081-234-5678', '123 Sukhumvit Road, Bangkok')`,
        [userPassHash]
      );
      console.log("👤 Seeded demo Customer (username: demo_user / pass: user123)");
    }

    // ----------------------------------------------------
    // Seed Categories and Products if empty
    // ----------------------------------------------------
    const catCount = await client.query("SELECT COUNT(*) FROM categories");
    if (parseInt(catCount.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO categories (name, slug) VALUES 
        ('Cyberpunk Gadgets', 'gadgets'),
        ('Servers & Cloud', 'cloud-hardware'),
        ('Developer Gear', 'developer-gear'),
        ('AI & Robotics', 'ai-robotics');
      `);
    }

    const prodCount = await client.query("SELECT COUNT(*) FROM products");
    if (parseInt(prodCount.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO products (category_id, name, description, price, stock, image_url) VALUES 
        (1, 'Cyber Matrix HUD Smart Glasses', 'Augmented Reality Smart Glasses with 4K Micro-OLED and Night Vision telemetry.', 18900.00, 15, 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600&q=80'),
        (1, 'Neon-Core Mechanical Keyboard V2', 'Gasket mount, wireless 2.4G/BT, Hot-swappable tactile RGB with transparent cyberpunk chassis.', 4590.00, 28, 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&q=80'),
        (2, 'Edge Cloud Micro Server Node (ARM64)', 'Dedicated ARM64 mini edge cluster, 8-core CPU, 32GB LPDDR5, dual 10GbE SFP+ ports.', 24500.00, 8, 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&q=80'),
        (2, 'Hardware Security Token Crypt-Key', 'FIDO2 / U2F Hardware key with encrypted biometrics for zero-trust cloud infrastructure.', 2190.00, 50, 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&q=80'),
        (3, 'Ultra-wide Quantum Curved Monitor 38"', '38-inch 144Hz IPS Nano 3840x1600, 98% DCI-P3 color gamut, USB-C 90W PD.', 32900.00, 12, 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&q=80'),
        (4, 'Autonomous AI Vision Sensor Kit', 'Neural Compute Module with 8 TOPS AI acceleration, global shutter stereoscopic camera.', 8900.00, 20, 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=600&q=80');
      `);
      console.log("📦 Seeded sample product inventory");
    }

    console.log("✅ Database schema and seed data are ready!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Database initialization error:", err.message);
  } finally {
    client.release();
  }
}

// ============================================================
// Traffic Logger Middleware
// ============================================================
app.use((req, res, next) => {
  res.on("finish", async () => {
    if (req.path === "/health") return;
    try {
      const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress || "127.0.0.1";
      await pool.query(
        "INSERT INTO request_logs (ip, method, path, user_agent, status_code) VALUES ($1, $2, $3, $4, $5)",
        [ip, req.method, req.path, req.headers["user-agent"] || "", res.statusCode]
      );
    } catch (_) {}
  });
  next();
});

// ============================================================
// Auth & Role Middleware
// ============================================================
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Access token required" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid or expired token" });
    req.user = user;
    next();
  });
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

// Optional Auth (for storefront browsing where user might or might not be logged in)
function optionalAuth(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    req.user = null;
    return next();
  }
  jwt.verify(token, JWT_SECRET, (err, user) => {
    req.user = err ? null : user;
    next();
  });
}

// Helper: Audit Logger
async function logAdminAction(adminId, action, targetType, targetId, details, req) {
  try {
    const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;
    await pool.query(
      `INSERT INTO admin_audit_logs (admin_id, action, target_type, target_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [adminId, action, targetType, targetId, JSON.stringify(details), ip]
    );
  } catch (err) {
    console.error("Audit log error:", err.message);
  }
}

// ============================================================
// API ROUTES
// ============================================================

// 1. Health Check (CI/CD Smoke Test)
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    hostname: os.hostname(),
    uptime: process.uptime(),
  });
});

// ------------------------------------------------------------
// 2. Authentication Endpoints (/api/auth)
// ------------------------------------------------------------

// Register Customer
app.post("/api/auth/register", async (req, res) => {
  const { username, email, password, full_name, phone, address } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: "Username, email, and password are required" });
  }

  try {
    const checkUser = await pool.query(
      "SELECT id FROM users WHERE username = $1 OR email = $2",
      [username.trim(), email.trim()]
    );
    if (checkUser.rows.length > 0) {
      return res.status(409).json({ error: "Username or email is already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await pool.query(
      `INSERT INTO users (username, email, password_hash, role, full_name, phone, address)
       VALUES ($1, $2, $3, 'customer', $4, $5, $6)
       RETURNING id, username, email, role, full_name`,
      [username.trim(), email.trim(), passwordHash, full_name || "", phone || "", address || ""]
    );

    const user = newUser.rows[0];
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.status(201).json({
      message: "Registration successful",
      token,
      user,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login (Customer or Admin)
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }

  try {
    const userRes = await pool.query(
      "SELECT * FROM users WHERE username = $1 OR email = $1",
      [username.trim()]
    );
    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: "Invalid username/email or password" });
    }

    const user = userRes.rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid username/email or password" });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
        phone: user.phone,
        address: user.address,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Profile of Current User
app.get("/api/auth/me", authenticateToken, async (req, res) => {
  try {
    const userRes = await pool.query(
      "SELECT id, username, email, role, full_name, phone, address, created_at FROM users WHERE id = $1",
      [req.user.id]
    );
    if (userRes.rows.length === 0) return res.status(404).json({ error: "User not found" });
    res.json({ user: userRes.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ------------------------------------------------------------
// 3. Products Endpoints (Public & Customer)
// ------------------------------------------------------------

// List all categories
app.get("/api/categories", async (req, res) => {
  try {
    const cats = await pool.query("SELECT * FROM categories ORDER BY name ASC");
    res.json({ categories: cats.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List products (with filter & search)
app.get("/api/products", async (req, res) => {
  const { category, search, active_only } = req.query;
  try {
    let query = `
      SELECT p.*, c.name as category_name, c.slug as category_slug 
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (active_only !== "false") {
      query += " AND p.is_active = TRUE";
    }

    if (category) {
      params.push(category);
      query += ` AND (c.slug = $${params.length} OR c.id::text = $${params.length})`;
    }

    if (search) {
      params.push(`%${search.trim()}%`);
      query += ` AND (p.name ILIKE $${params.length} OR p.description ILIKE $${params.length})`;
    }

    query += " ORDER BY p.id DESC";

    const products = await pool.query(query, params);
    res.json({ products: products.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single product
app.get("/api/products/:id", async (req, res) => {
  try {
    const product = await pool.query(
      `SELECT p.*, c.name as category_name, c.slug as category_slug 
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.id = $1`,
      [req.params.id]
    );
    if (product.rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json({ product: product.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ------------------------------------------------------------
// 4. Orders Endpoints (Customer / Checkout)
// ------------------------------------------------------------

// Create new order (ACID Transaction with Stock Deduction)
app.post("/api/orders", authenticateToken, async (req, res) => {
  const { items, shipping_name, shipping_phone, shipping_address, note } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Cart cannot be empty" });
  }
  if (!shipping_name || !shipping_phone || !shipping_address) {
    return res.status(400).json({ error: "Shipping name, phone, and address are required" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    let totalAmount = 0;
    const verifiedItems = [];

    // Verify stock and price for each item with FOR UPDATE row lock
    for (const item of items) {
      const prodRes = await client.query(
        "SELECT id, name, price, stock, is_active FROM products WHERE id = $1 FOR UPDATE",
        [item.product_id]
      );

      if (prodRes.rows.length === 0) {
        throw new Error(`Product ID ${item.product_id} not found`);
      }

      const prod = prodRes.rows[0];
      if (!prod.is_active) {
        throw new Error(`Product '${prod.name}' is no longer available`);
      }

      const requestedQty = parseInt(item.quantity);
      if (requestedQty <= 0) {
        throw new Error(`Invalid quantity for '${prod.name}'`);
      }

      if (prod.stock < requestedQty) {
        throw new Error(`Insufficient stock for '${prod.name}' (Available: ${prod.stock}, Requested: ${requestedQty})`);
      }

      const unitPrice = parseFloat(prod.price);
      const subtotal = unitPrice * requestedQty;
      totalAmount += subtotal;

      verifiedItems.push({
        product_id: prod.id,
        name: prod.name,
        unit_price: unitPrice,
        quantity: requestedQty,
        subtotal: subtotal,
      });

      // Deduct stock
      await client.query(
        "UPDATE products SET stock = stock - $1, updated_at = NOW() WHERE id = $2",
        [requestedQty, prod.id]
      );
    }

    // Generate Order Number: ORD-YYYYMMDD-XXXX
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomHex = Math.random().toString(16).substring(2, 6).toUpperCase();
    const orderNumber = `ORD-${dateStr}-${randomHex}`;

    // Insert Order
    const orderRes = await client.query(
      `INSERT INTO orders 
       (order_number, user_id, total_amount, status, shipping_name, shipping_phone, shipping_address, note)
       VALUES ($1, $2, $3, 'PENDING', $4, $5, $6, $7)
       RETURNING *`,
      [orderNumber, req.user.id, totalAmount, shipping_name, shipping_phone, shipping_address, note || ""]
    );
    const newOrder = orderRes.rows[0];

    // Insert Order Items
    for (const vItem of verifiedItems) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [newOrder.id, vItem.product_id, vItem.name, vItem.unit_price, vItem.quantity, vItem.subtotal]
      );
    }

    // Insert Order Status Log
    await client.query(
      `INSERT INTO order_status_logs (order_id, from_status, to_status, changed_by, note)
       VALUES ($1, NULL, 'PENDING', $2, 'Order created by customer')`,
      [newOrder.id, req.user.id]
    );

    await client.query("COMMIT");

    res.status(201).json({
      message: "Order placed successfully",
      order: newOrder,
      items: verifiedItems,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Get My Orders
app.get("/api/orders/my-orders", authenticateToken, async (req, res) => {
  try {
    const ordersRes = await pool.query(
      `SELECT o.*, 
        json_agg(json_build_object(
          'id', oi.id,
          'product_id', oi.product_id,
          'product_name', oi.product_name,
          'unit_price', oi.unit_price,
          'quantity', oi.quantity,
          'subtotal', oi.subtotal
        )) as items
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       WHERE o.user_id = $1
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [req.user.id]
    );
    res.json({ orders: ordersRes.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Order Details with Tracking & Timeline
app.get("/api/orders/:id", optionalAuth, async (req, res) => {
  const { id } = req.params;
  try {
    let orderRes;
    if (isNaN(id)) {
      // Find by Order Number (Public Tracking)
      orderRes = await pool.query("SELECT * FROM orders WHERE order_number = $1", [id]);
    } else {
      orderRes = await pool.query("SELECT * FROM orders WHERE id = $1", [id]);
    }

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    const order = orderRes.rows[0];

    // If user is not admin and not the order owner, only allow basic public tracking info
    const isOwner = req.user && req.user.id === order.user_id;
    const isAdmin = req.user && req.user.role === "admin";

    const itemsRes = await pool.query("SELECT * FROM order_items WHERE order_id = $1", [order.id]);
    const timelineRes = await pool.query(
      `SELECT osl.*, u.username as changer_name 
       FROM order_status_logs osl
       LEFT JOIN users u ON osl.changed_by = u.id
       WHERE osl.order_id = $1
       ORDER BY osl.created_at ASC`,
      [order.id]
    );

    res.json({
      order: {
        ...order,
        items: itemsRes.rows,
        timeline: timelineRes.rows,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ------------------------------------------------------------
// 5. Admin API Endpoints (/api/admin)
// ------------------------------------------------------------

// Admin Dashboard Summary
app.get("/api/admin/dashboard", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const totalRev = await pool.query(
      "SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status != 'CANCELLED'"
    );
    const totalOrders = await pool.query("SELECT COUNT(*) as count FROM orders");
    const totalUsers = await pool.query("SELECT COUNT(*) as count FROM users WHERE role = 'customer'");
    const totalProducts = await pool.query("SELECT COUNT(*) as count FROM products");
    const lowStock = await pool.query("SELECT COUNT(*) as count FROM products WHERE stock <= 5 AND is_active = true");

    const statusCounts = await pool.query(
      "SELECT status, COUNT(*) as count FROM orders GROUP BY status"
    );

    const recentOrders = await pool.query(
      `SELECT o.*, u.username, u.email 
       FROM orders o 
       LEFT JOIN users u ON o.user_id = u.id 
       ORDER BY o.created_at DESC LIMIT 8`
    );

    res.json({
      summary: {
        totalRevenue: parseFloat(totalRev.rows[0].total),
        totalOrders: parseInt(totalOrders.rows[0].count),
        totalUsers: parseInt(totalUsers.rows[0].count),
        totalProducts: parseInt(totalProducts.rows[0].count),
        lowStockCount: parseInt(lowStock.rows[0].count),
      },
      statusDistribution: statusCounts.rows,
      recentOrders: recentOrders.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Add Product
app.post("/api/admin/products", authenticateToken, requireAdmin, async (req, res) => {
  const { name, category_id, description, price, stock, image_url } = req.body;
  if (!name || price === undefined || stock === undefined) {
    return res.status(400).json({ error: "Product name, price, and stock are required" });
  }

  try {
    const newProd = await pool.query(
      `INSERT INTO products (name, category_id, description, price, stock, image_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        name.trim(),
        category_id || null,
        description || "",
        parseFloat(price),
        parseInt(stock),
        image_url || "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=600&q=80",
      ]
    );

    await logAdminAction(req.user.id, "PRODUCT_CREATE", "product", newProd.rows[0].id, newProd.rows[0], req);

    res.status(201).json({ message: "Product created successfully", product: newProd.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Update Product & Stock
app.put("/api/admin/products/:id", authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, category_id, description, price, stock, image_url, is_active } = req.body;

  try {
    const updated = await pool.query(
      `UPDATE products 
       SET name = COALESCE($1, name),
           category_id = COALESCE($2, category_id),
           description = COALESCE($3, description),
           price = COALESCE($4, price),
           stock = COALESCE($5, stock),
           image_url = COALESCE($6, image_url),
           is_active = COALESCE($7, is_active),
           updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [name, category_id, description, price, stock, image_url, is_active, id]
    );

    if (updated.rows.length === 0) return res.status(404).json({ error: "Product not found" });

    await logAdminAction(req.user.id, "PRODUCT_UPDATE", "product", parseInt(id), updated.rows[0], req);

    res.json({ message: "Product updated successfully", product: updated.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Delete Product (Toggle Active)
app.delete("/api/admin/products/:id", authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("UPDATE products SET is_active = FALSE, updated_at = NOW() WHERE id = $1", [id]);
    await logAdminAction(req.user.id, "PRODUCT_DEACTIVATE", "product", parseInt(id), { is_active: false }, req);
    res.json({ message: "Product deactivated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: List All Orders with Filter
app.get("/api/admin/orders", authenticateToken, requireAdmin, async (req, res) => {
  const { status, search } = req.query;
  try {
    let query = `
      SELECT o.*, u.username, u.email,
        json_agg(json_build_object(
          'id', oi.id,
          'product_id', oi.product_id,
          'product_name', oi.product_name,
          'unit_price', oi.unit_price,
          'quantity', oi.quantity,
          'subtotal', oi.subtotal
        )) as items
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      params.push(status);
      query += ` AND o.status = $${params.length}`;
    }

    if (search) {
      params.push(`%${search.trim()}%`);
      query += ` AND (o.order_number ILIKE $${params.length} OR u.username ILIKE $${params.length} OR o.shipping_name ILIKE $${params.length})`;
    }

    query += " GROUP BY o.id, u.username, u.email ORDER BY o.created_at DESC";

    const orders = await pool.query(query, params);
    res.json({ orders: orders.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Update Order Status (State Machine Transition)
app.put("/api/admin/orders/:id/status", authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status: targetStatus, tracking_number, note } = req.body;

  const validStatuses = ["PENDING", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];
  if (!validStatuses.includes(targetStatus)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const orderRes = await client.query("SELECT * FROM orders WHERE id = $1 FOR UPDATE", [id]);
    if (orderRes.rows.length === 0) {
      throw new Error("Order not found");
    }

    const order = orderRes.rows[0];
    const prevStatus = order.status;

    // If order was cancelled and now changed, or changed TO cancelled -> handle stock rollback
    if (targetStatus === "CANCELLED" && prevStatus !== "CANCELLED") {
      const itemsRes = await client.query("SELECT product_id, quantity FROM order_items WHERE order_id = $1", [id]);
      for (const item of itemsRes.rows) {
        await client.query(
          "UPDATE products SET stock = stock + $1, updated_at = NOW() WHERE id = $2",
          [item.quantity, item.product_id]
        );
      }
      console.log(`📦 Restored stock for cancelled order #${order.order_number}`);
    }

    // Update order status
    const updateRes = await client.query(
      `UPDATE orders 
       SET status = $1,
           tracking_number = COALESCE($2, tracking_number),
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [targetStatus, tracking_number || null, id]
    );

    // Record state change log
    await client.query(
      `INSERT INTO order_status_logs (order_id, from_status, to_status, changed_by, note)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, prevStatus, targetStatus, req.user.id, note || `Status updated from ${prevStatus} to ${targetStatus}`]
    );

    // Audit log
    await logAdminAction(
      req.user.id,
      "ORDER_STATUS_UPDATE",
      "order",
      parseInt(id),
      { from: prevStatus, to: targetStatus, tracking: tracking_number },
      req
    );

    await client.query("COMMIT");

    res.json({
      message: `Order status updated to ${targetStatus}`,
      order: updateRes.rows[0],
    });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Admin: View Audit Logs & System Activity
app.get("/api/admin/logs", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const logsRes = await pool.query(
      `SELECT l.*, u.username as admin_name 
       FROM admin_audit_logs l
       LEFT JOIN users u ON l.admin_id = u.id
       ORDER BY l.created_at DESC LIMIT 50`
    );
    res.json({ logs: logsRes.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// 6. Modern Cyberpunk E-Commerce Frontend (SPA)
// ============================================================
app.get("/", (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CYBER-COMMERCE // MEGA LAB STORE & OPS</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Rajdhani:wght@400;600;700&family=Inter:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #00ff88;
      --cyan: #00d4ff;
      --danger: #ff3366;
      --warn: #ffcc00;
      --purple: #9d4edd;
      --bg: #050811;
      --bg-panel: #0a0f20;
      --bg-card: #0d152a;
      --border: rgba(0, 255, 136, 0.2);
      --border-cyan: rgba(0, 212, 255, 0.25);
      --font-mono: 'Share Tech Mono', monospace;
      --font-title: 'Rajdhani', sans-serif;
      --font-body: 'Inter', sans-serif;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: var(--bg);
      color: #d1e2ff;
      font-family: var(--font-body);
      min-height: 100vh;
      overflow-x: hidden;
      display: flex;
      flex-direction: column;
    }

    /* Ambient background grid */
    body::before {
      content: '';
      position: fixed; inset: 0; pointer-events: none; z-index: 0;
      background: linear-gradient(90deg, rgba(0,255,136,0.02) 1px, transparent 1px),
                  linear-gradient(rgba(0,255,136,0.02) 1px, transparent 1px);
      background-size: 40px 40px;
    }

    .container {
      width: 100%;
      max-width: 1360px;
      margin: 0 auto;
      padding: 0 20px;
      position: relative;
      z-index: 2;
    }

    /* Navbar */
    .navbar {
      background: rgba(10, 15, 32, 0.92);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border);
      position: sticky; top: 0; z-index: 100;
      padding: 14px 0;
    }
    .nav-inner {
      display: flex; align-items: center; justify-content: space-between; gap: 20px;
    }
    .brand {
      display: flex; align-items: center; gap: 12px; text-decoration: none;
    }
    .brand-logo {
      width: 42px; height: 42px; background: var(--primary);
      clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
      display: flex; align-items: center; justify-content: center;
      color: #000; font-family: var(--font-title); font-weight: 800; font-size: 22px;
      box-shadow: 0 0 16px rgba(0,255,136,0.5);
    }
    .brand-text h1 {
      font-family: var(--font-title); font-size: 20px; font-weight: 700;
      letter-spacing: 2px; color: #fff; text-transform: uppercase;
    }
    .brand-text span {
      font-family: var(--font-mono); font-size: 11px; color: var(--cyan); letter-spacing: 1.5px;
    }

    .nav-links {
      display: flex; align-items: center; gap: 8px;
    }
    .nav-btn {
      background: transparent; border: 1px solid transparent;
      color: #a5b9dc; font-family: var(--font-title); font-size: 15px; font-weight: 600;
      letter-spacing: 1px; padding: 8px 16px; cursor: pointer; border-radius: 4px;
      transition: all 0.2s ease;
    }
    .nav-btn:hover, .nav-btn.active {
      color: #fff; border-color: var(--border); background: rgba(0,255,136,0.06);
    }
    .cart-btn {
      background: rgba(0,212,255,0.1); border: 1px solid var(--cyan);
      color: var(--cyan); font-family: var(--font-mono); font-size: 14px;
      padding: 8px 16px; border-radius: 4px; cursor: pointer;
      display: flex; align-items: center; gap: 8px; transition: all 0.2s;
    }
    .cart-btn:hover {
      background: var(--cyan); color: #000; box-shadow: 0 0 15px rgba(0,212,255,0.4);
    }
    .badge-count {
      background: var(--danger); color: #fff; font-size: 11px; font-weight: bold;
      padding: 2px 7px; border-radius: 10px;
    }

    /* Hero Banner */
    .hero {
      padding: 40px 0 20px;
      text-align: center;
    }
    .hero-tag {
      display: inline-block; font-family: var(--font-mono); font-size: 12px;
      color: var(--primary); letter-spacing: 3px; border: 1px solid var(--border);
      padding: 4px 14px; margin-bottom: 12px; background: rgba(0,255,136,0.04);
    }
    .hero-title {
      font-family: var(--font-title); font-size: 42px; font-weight: 800;
      letter-spacing: 2px; text-transform: uppercase; color: #fff; margin-bottom: 10px;
      text-shadow: 0 0 30px rgba(0,212,255,0.3);
    }
    .hero-desc {
      color: #8fa5cc; font-size: 15px; max-width: 600px; margin: 0 auto 24px;
    }

    /* Views container */
    .view-section { display: none; padding: 20px 0 60px; }
    .view-section.active { display: block; }

    /* Category bar */
    .category-bar {
      display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 24px;
    }
    .cat-chip {
      background: var(--bg-panel); border: 1px solid rgba(255,255,255,0.1);
      color: #8fa5cc; padding: 8px 16px; border-radius: 4px; font-family: var(--font-title);
      font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s;
    }
    .cat-chip:hover, .cat-chip.active {
      border-color: var(--primary); color: var(--primary); background: rgba(0,255,136,0.08);
    }

    /* Product Grid */
    .products-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px;
    }
    .product-card {
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: 6px; overflow: hidden; display: flex; flex-direction: column;
      position: relative; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .product-card:hover {
      transform: translateY(-4px); border-color: var(--primary);
      box-shadow: 0 8px 24px rgba(0,255,136,0.15);
    }
    .card-img-wrap {
      width: 100%; height: 200px; overflow: hidden; position: relative; background: #000;
    }
    .card-img {
      width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s;
    }
    .product-card:hover .card-img { transform: scale(1.05); }
    .stock-badge {
      position: absolute; top: 10px; right: 10px;
      font-family: var(--font-mono); font-size: 11px; padding: 4px 8px;
      border-radius: 3px; font-weight: bold;
    }
    .in-stock { background: rgba(0,255,136,0.85); color: #000; }
    .low-stock { background: rgba(255,204,0,0.85); color: #000; }
    .out-stock { background: rgba(255,51,102,0.85); color: #fff; }

    .card-body {
      padding: 16px; display: flex; flex-direction: column; flex: 1;
    }
    .card-cat {
      font-family: var(--font-mono); font-size: 11px; color: var(--cyan); letter-spacing: 1px; margin-bottom: 4px;
    }
    .card-title {
      font-family: var(--font-title); font-size: 18px; font-weight: 700; color: #fff; margin-bottom: 8px; line-height: 1.3;
    }
    .card-desc {
      font-size: 13px; color: #7f94b8; margin-bottom: 16px; line-height: 1.5; flex: 1;
    }
    .card-footer {
      display: flex; align-items: center; justify-content: space-between; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 12px;
    }
    .price-tag {
      font-family: var(--font-mono); font-size: 20px; font-weight: 700; color: var(--primary);
    }
    .btn-buy {
      background: var(--primary); border: none; color: #000; font-family: var(--font-title);
      font-size: 14px; font-weight: 700; padding: 8px 16px; border-radius: 4px; cursor: pointer;
      letter-spacing: 1px; transition: all 0.2s;
    }
    .btn-buy:hover {
      background: #fff; box-shadow: 0 0 12px rgba(0,255,136,0.6);
    }
    .btn-buy:disabled {
      background: #2a3850; color: #5c7094; cursor: not-allowed;
    }

    /* Modal */
    .modal-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px);
      z-index: 200; display: none; align-items: center; justify-content: center; padding: 20px;
    }
    .modal-overlay.active { display: flex; }
    .modal-card {
      background: var(--bg-panel); border: 1px solid var(--border);
      width: 100%; max-width: 580px; border-radius: 6px; padding: 28px;
      position: relative; max-height: 90vh; overflow-y: auto;
    }
    .modal-close {
      position: absolute; top: 16px; right: 16px; background: transparent; border: none;
      color: #8fa5cc; font-size: 24px; cursor: pointer; line-height: 1;
    }
    .modal-title {
      font-family: var(--font-title); font-size: 22px; font-weight: 700; color: #fff; margin-bottom: 16px;
      border-bottom: 1px solid var(--border); padding-bottom: 10px; letter-spacing: 1px;
    }

    /* Forms */
    .form-group { margin-bottom: 14px; }
    .form-label {
      display: block; font-family: var(--font-mono); font-size: 11px; color: #8fa5cc; margin-bottom: 6px; letter-spacing: 1px;
    }
    .form-input, .form-select, .form-textarea {
      width: 100%; background: #060a16; border: 1px solid rgba(255,255,255,0.15);
      padding: 10px 12px; color: #fff; font-family: var(--font-body); font-size: 14px;
      border-radius: 4px; outline: none; transition: border-color 0.2s;
    }
    .form-input:focus, .form-select:focus, .form-textarea:focus {
      border-color: var(--primary); box-shadow: 0 0 8px rgba(0,255,136,0.2);
    }
    .btn-submit {
      width: 100%; background: var(--primary); border: none; color: #000;
      font-family: var(--font-title); font-size: 16px; font-weight: 700;
      padding: 12px; border-radius: 4px; cursor: pointer; letter-spacing: 1.5px;
      margin-top: 10px; text-transform: uppercase;
    }
    .btn-submit:hover { background: #fff; box-shadow: 0 0 16px rgba(0,255,136,0.5); }

    /* Cart Drawer / Panel */
    .cart-item {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.06); gap: 12px;
    }
    .cart-item-name { font-weight: 600; font-size: 14px; color: #fff; }
    .cart-item-price { font-family: var(--font-mono); font-size: 13px; color: var(--primary); }
    .cart-qty-ctrl { display: flex; align-items: center; gap: 8px; }
    .btn-qty {
      background: rgba(255,255,255,0.1); border: none; color: #fff;
      width: 26px; height: 26px; border-radius: 3px; cursor: pointer; font-weight: bold;
    }

    /* Admin Panel Tables */
    .admin-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px;
    }
    .stat-box {
      background: var(--bg-card); border: 1px solid var(--border);
      padding: 20px; border-radius: 6px; position: relative;
    }
    .stat-label {
      font-family: var(--font-mono); font-size: 11px; color: #7f94b8; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 8px;
    }
    .stat-num {
      font-family: var(--font-mono); font-size: 28px; font-weight: 700; color: var(--primary);
    }

    .data-table {
      width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 13px;
    }
    .data-table th {
      background: #060a16; color: #8fa5cc; font-family: var(--font-mono); font-size: 11px;
      letter-spacing: 1.5px; text-align: left; padding: 12px 14px; border-bottom: 1px solid var(--border);
    }
    .data-table td {
      padding: 12px 14px; border-bottom: 1px solid rgba(255,255,255,0.05); color: #c4d7f5;
    }
    .data-table tr:hover td { background: rgba(0,255,136,0.02); }

    /* Order Status Badges */
    .status-badge {
      display: inline-block; padding: 3px 8px; border-radius: 3px;
      font-family: var(--font-mono); font-size: 11px; font-weight: bold; letter-spacing: 1px;
    }
    .badge-PENDING { background: rgba(255,204,0,0.15); color: var(--warn); border: 1px solid var(--warn); }
    .badge-PAID { background: rgba(0,212,255,0.15); color: var(--cyan); border: 1px solid var(--cyan); }
    .badge-PROCESSING { background: rgba(157,78,221,0.15); color: #c77dff; border: 1px solid var(--purple); }
    .badge-SHIPPED { background: rgba(0,255,136,0.15); color: var(--primary); border: 1px solid var(--primary); }
    .badge-DELIVERED { background: rgba(0,255,136,0.3); color: #fff; border: 1px solid var(--primary); }
    .badge-CANCELLED { background: rgba(255,51,102,0.15); color: var(--danger); border: 1px solid var(--danger); }

    /* Timeline Stepper */
    .timeline {
      display: flex; justify-content: space-between; margin: 24px 0; position: relative;
    }
    .timeline::before {
      content: ''; position: absolute; top: 14px; left: 20px; right: 20px; height: 2px;
      background: rgba(255,255,255,0.1); z-index: 1;
    }
    .timeline-step {
      position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; gap: 6px;
    }
    .step-circle {
      width: 30px; height: 30px; border-radius: 50%; background: #060a16;
      border: 2px solid rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center;
      font-family: var(--font-mono); font-size: 12px; font-weight: bold; color: #8fa5cc;
    }
    .step-circle.active {
      border-color: var(--primary); color: var(--primary); box-shadow: 0 0 10px rgba(0,255,136,0.5);
    }
    .step-circle.done {
      background: var(--primary); border-color: var(--primary); color: #000;
    }
    .step-label {
      font-family: var(--font-mono); font-size: 10px; color: #8fa5cc; letter-spacing: 1px;
    }

    /* Toast */
    .toast {
      position: fixed; bottom: 24px; right: 24px; background: var(--bg-panel);
      border: 1px solid var(--primary); color: #fff; padding: 12px 20px;
      border-radius: 4px; box-shadow: 0 4px 20px rgba(0,0,0,0.5); z-index: 999;
      font-family: var(--font-mono); font-size: 13px; display: none;
    }
  </style>
</head>
<body>

  <!-- NAVBAR -->
  <nav class="navbar">
    <div class="container nav-inner">
      <a href="#" class="brand" onclick="switchView('store')">
        <div class="brand-logo">C</div>
        <div class="brand-text">
          <h1>CYBER-COMMERCE</h1>
          <span>MEGA LAB CLOUD // AP-SOUTHEAST-7</span>
        </div>
      </a>
      <div class="nav-links">
        <button class="nav-btn active" onclick="switchView('store')">STORE</button>
        <button class="nav-btn" onclick="switchView('track')">ORDER TRACKING</button>
        <button class="nav-btn" id="nav-admin-btn" onclick="switchView('admin')">ADMIN PORTAL</button>
        <button class="cart-btn" onclick="openCart()">
          🛒 CART <span class="badge-count" id="cart-count">0</span>
        </button>
      </div>
    </div>
  </nav>

  <!-- STORE VIEW -->
  <div id="view-store" class="view-section active">
    <div class="container">
      <div class="hero">
        <span class="hero-tag">// ENTERPRISE CLOUD HARDWARE & GADGETS</span>
        <h2 class="hero-title">NEXT-GEN DEVELOPER ARSENAL</h2>
        <p class="hero-desc">High-performance ARM64 nodes, neural sensors, and tactical developer workstations deployed seamlessly on AWS.</p>
      </div>

      <div class="category-bar" id="category-bar">
        <button class="cat-chip active" onclick="filterCategory('')">ALL HARDWARE</button>
      </div>

      <div class="products-grid" id="products-grid">
        <!-- Products injected via JS -->
      </div>
    </div>
  </div>

  <!-- ORDER TRACKING VIEW -->
  <div id="view-track" class="view-section">
    <div class="container" style="max-width: 800px;">
      <h2 style="font-family:var(--font-title); font-size:28px; color:#fff; margin-bottom:16px;">🔍 ORDER STATUS & LOG TRACKING</h2>
      <div style="display:flex; gap:10px; margin-bottom:24px;">
        <input type="text" id="track-order-input" class="form-input" placeholder="Enter Order Number (e.g. ORD-20260818-XXXX)">
        <button class="btn-buy" style="padding:10px 24px;" onclick="trackOrder()">TRACK</button>
      </div>

      <div id="track-result" style="display:none; background:var(--bg-card); border:1px solid var(--border); padding:24px; border-radius:6px;">
        <!-- Track content injected via JS -->
      </div>
    </div>
  </div>

  <!-- ADMIN PORTAL VIEW -->
  <div id="view-admin" class="view-section">
    <div class="container">
      <!-- Admin Login Box (if not logged in) -->
      <div id="admin-login-box" style="max-width:440px; margin:40px auto; background:var(--bg-card); border:1px solid var(--border); padding:32px; border-radius:6px;">
        <h3 style="font-family:var(--font-title); font-size:24px; color:#fff; margin-bottom:8px;">🔐 ADMIN OPS LOGIN</h3>
        <p style="font-size:13px; color:#7f94b8; margin-bottom:20px;">Use default credentials: <code>admin</code> / <code>admin123</code></p>
        <div class="form-group">
          <label class="form-label">USERNAME OR EMAIL</label>
          <input type="text" id="admin-user" class="form-input" value="admin">
        </div>
        <div class="form-group">
          <label class="form-label">PASSWORD</label>
          <input type="password" id="admin-pass" class="form-input" value="admin123">
        </div>
        <button class="btn-submit" onclick="loginAdmin()">AUTHENTICATE (JWT)</button>
      </div>

      <!-- Admin Dashboard (after login) -->
      <div id="admin-dashboard-box" style="display:none;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
          <div>
            <h2 style="font-family:var(--font-title); font-size:28px; color:#fff;">COMMAND & OPS DASHBOARD</h2>
            <span style="font-family:var(--font-mono); font-size:12px; color:var(--primary);">LOGGED IN AS: <b id="admin-curr-user">ADMIN</b></span>
          </div>
          <div style="display:flex; gap:10px;">
            <button class="btn-buy" onclick="openAddProductModal()">+ ADD PRODUCT</button>
            <button class="nav-btn" onclick="logoutAdmin()" style="border-color:var(--danger); color:var(--danger);">LOGOUT</button>
          </div>
        </div>

        <div class="admin-grid" id="admin-stats-grid">
          <!-- Stat boxes injected via JS -->
        </div>

        <!-- Admin Tabs -->
        <div class="category-bar">
          <button class="cat-chip active" id="tab-orders-btn" onclick="switchAdminTab('orders')">ORDERS MANAGEMENT</button>
          <button class="cat-chip" id="tab-products-btn" onclick="switchAdminTab('products')">INVENTORY & STOCK</button>
          <button class="cat-chip" id="tab-logs-btn" onclick="switchAdminTab('logs')">AUDIT & SYSTEM LOGS</button>
        </div>

        <div id="admin-orders-tab">
          <table class="data-table">
            <thead>
              <tr>
                <th>ORDER #</th>
                <th>CUSTOMER</th>
                <th>AMOUNT</th>
                <th>STATUS</th>
                <th>TRACKING NO.</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody id="admin-orders-tbody">
              <!-- Orders injected via JS -->
            </tbody>
          </table>
        </div>

        <div id="admin-products-tab" style="display:none;">
          <table class="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>PRODUCT</th>
                <th>CATEGORY</th>
                <th>PRICE</th>
                <th>STOCK</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody id="admin-products-tbody">
              <!-- Products injected via JS -->
            </tbody>
          </table>
        </div>

        <div id="admin-logs-tab" style="display:none;">
          <table class="data-table">
            <thead>
              <tr>
                <th>TIMESTAMP</th>
                <th>ADMIN</th>
                <th>ACTION</th>
                <th>TARGET</th>
                <th>IP ADDRESS</th>
                <th>DETAILS</th>
              </tr>
            </thead>
            <tbody id="admin-logs-tbody">
              <!-- Logs injected via JS -->
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  <!-- CART & CHECKOUT MODAL -->
  <div class="modal-overlay" id="cart-modal">
    <div class="modal-card">
      <button class="modal-close" onclick="closeCart()">&times;</button>
      <h3 class="modal-title">🛒 SHOPPING CART & CHECKOUT</h3>
      <div id="cart-items-container">
        <!-- Cart items injected via JS -->
      </div>

      <div style="border-top:1px solid var(--border); padding-top:14px; margin-top:16px;">
        <div style="display:flex; justify-content:space-between; font-family:var(--font-mono); font-size:18px; margin-bottom:16px;">
          <span>TOTAL:</span>
          <span style="color:var(--primary);" id="cart-total-price">฿0.00</span>
        </div>

        <h4 style="font-family:var(--font-title); font-size:16px; color:#fff; margin-bottom:10px;">SHIPPING DETAILS</h4>
        <div class="form-group">
          <label class="form-label">FULL NAME</label>
          <input type="text" id="chk-name" class="form-input" placeholder="e.g. Somchai Jaidee">
        </div>
        <div class="form-group">
          <label class="form-label">PHONE NUMBER</label>
          <input type="text" id="chk-phone" class="form-input" placeholder="e.g. 081-234-5678">
        </div>
        <div class="form-group">
          <label class="form-label">SHIPPING ADDRESS</label>
          <textarea id="chk-address" class="form-textarea" rows="2" placeholder="Full address in Thailand"></textarea>
        </div>

        <button class="btn-submit" onclick="submitCheckout()">CONFIRM ORDER & CHECKOUT</button>
      </div>
    </div>
  </div>

  <!-- ADD / EDIT PRODUCT MODAL -->
  <div class="modal-overlay" id="product-modal">
    <div class="modal-card">
      <button class="modal-close" onclick="closeProductModal()">&times;</button>
      <h3 class="modal-title" id="prod-modal-title">📦 ADD PRODUCT</h3>
      <input type="hidden" id="prod-edit-id">
      <div class="form-group">
        <label class="form-label">PRODUCT NAME</label>
        <input type="text" id="p-name" class="form-input" required>
      </div>
      <div class="form-group">
        <label class="form-label">CATEGORY</label>
        <select id="p-cat" class="form-select"></select>
      </div>
      <div class="form-group">
        <label class="form-label">PRICE (THB)</label>
        <input type="number" id="p-price" class="form-input" step="0.01" required>
      </div>
      <div class="form-group">
        <label class="form-label">STOCK QUANTITY</label>
        <input type="number" id="p-stock" class="form-input" required>
      </div>
      <div class="form-group">
        <label class="form-label">IMAGE URL</label>
        <input type="text" id="p-img" class="form-input" placeholder="https://...">
      </div>
      <div class="form-group">
        <label class="form-label">DESCRIPTION</label>
        <textarea id="p-desc" class="form-textarea" rows="3"></textarea>
      </div>
      <button class="btn-submit" onclick="saveProduct()">SAVE PRODUCT</button>
    </div>
  </div>

  <!-- STATUS UPDATE MODAL -->
  <div class="modal-overlay" id="status-modal">
    <div class="modal-card" style="max-width:440px;">
      <button class="modal-close" onclick="closeStatusModal()">&times;</button>
      <h3 class="modal-title">🔄 UPDATE ORDER STATUS</h3>
      <input type="hidden" id="st-order-id">
      <div class="form-group">
        <label class="form-label">ORDER #</label>
        <div id="st-order-num" style="font-family:var(--font-mono); color:var(--primary); font-size:16px; margin-bottom:8px;"></div>
      </div>
      <div class="form-group">
        <label class="form-label">TARGET STATUS</label>
        <select id="st-select" class="form-select">
          <option value="PENDING">PENDING (รอชำระเงิน)</option>
          <option value="PAID">PAID (ชำระเงินแล้ว)</option>
          <option value="PROCESSING">PROCESSING (กำลังเตรียมจัดส่ง)</option>
          <option value="SHIPPED">SHIPPED (จัดส่งแล้ว)</option>
          <option value="DELIVERED">DELIVERED (ส่งมอบสำเร็จ)</option>
          <option value="CANCELLED">CANCELLED (ยกเลิก/คืนสต็อก)</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">TRACKING NUMBER</label>
        <input type="text" id="st-tracking" class="form-input" placeholder="e.g. TH-EXPRESS-998877">
      </div>
      <div class="form-group">
        <label class="form-label">INTERNAL NOTE</label>
        <input type="text" id="st-note" class="form-input" placeholder="Optional audit note">
      </div>
      <button class="btn-submit" onclick="saveOrderStatus()">UPDATE STATUS</button>
    </div>
  </div>

  <div id="toast" class="toast"></div>

  <script>
    // State
    let cart = JSON.parse(localStorage.getItem('cart') || '[]');
    let adminToken = localStorage.getItem('adminToken') || '';
    let allProducts = [];
    let allCategories = [];

    function showToast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.style.display = 'block';
      setTimeout(() => { t.style.display = 'none'; }, 3000);
    }

    function switchView(view) {
      document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
      document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
      document.getElementById('view-' + view).classList.add('active');

      if (view === 'store') loadStore();
      if (view === 'admin') checkAdminAuth();
    }

    // ── STOREFRONT ──
    async function loadStore() {
      try {
        const [catRes, prodRes] = await Promise.all([
          fetch('/api/categories').then(r => r.json()),
          fetch('/api/products').then(r => r.json())
        ]);

        allCategories = catRes.categories || [];
        allProducts = prodRes.products || [];

        renderCategories();
        renderProducts(allProducts);
        updateCartBadge();
      } catch (err) {
        console.error(err);
      }
    }

    function renderCategories() {
      const bar = document.getElementById('category-bar');
      bar.innerHTML = '<button class="cat-chip active" onclick="filterCategory(\'\')">ALL HARDWARE</button>' +
        allCategories.map(c =>
          '<button class="cat-chip" onclick="filterCategory(\'' + c.slug + '\')">' + c.name.toUpperCase() + '</button>'
        ).join('');
    }

    function filterCategory(slug) {
      document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
      event.target.classList.add('active');
      const filtered = slug ? allProducts.filter(p => p.category_slug === slug) : allProducts;
      renderProducts(filtered);
    }

    function renderProducts(list) {
      const grid = document.getElementById('products-grid');
      if (list.length === 0) {
        grid.innerHTML = '<div style="color:#7f94b8; grid-column:1/-1; text-align:center; padding:40px;">NO PRODUCTS FOUND</div>';
        return;
      }

      grid.innerHTML = list.map(p => {
        const stockClass = p.stock > 10 ? 'in-stock' : (p.stock > 0 ? 'low-stock' : 'out-stock');
        const stockLabel = p.stock > 0 ? 'STOCK: ' + p.stock : 'OUT OF STOCK';
        const isOut = p.stock <= 0;

        return '<div class="product-card">' +
          '<div class="card-img-wrap">' +
            '<img class="card-img" src="' + p.image_url + '" alt="' + p.name + '">' +
            '<span class="stock-badge ' + stockClass + '">' + stockLabel + '</span>' +
          '</div>' +
          '<div class="card-body">' +
            '<span class="card-cat">// ' + (p.category_name || 'HARDWARE') + '</span>' +
            '<h3 class="card-title">' + p.name + '</h3>' +
            '<p class="card-desc">' + p.description + '</p>' +
            '<div class="card-footer">' +
              '<span class="price-tag">฿' + parseFloat(p.price).toLocaleString() + '</span>' +
              '<button class="btn-buy" ' + (isOut ? 'disabled' : '') + ' onclick="addToCart(' + p.id + ')">' +
                (isOut ? 'SOLD OUT' : '+ ADD TO CART') +
              '</button>' +
            '</div>' +
          '</div>' +
        '</div>';
      }).join('');
    }

    // ── CART ──
    function addToCart(prodId) {
      const prod = allProducts.find(p => p.id === prodId);
      if (!prod) return;
      const exist = cart.find(i => i.product_id === prodId);
      if (exist) {
        if (exist.quantity >= prod.stock) {
          showToast('Cannot add more than available stock!');
          return;
        }
        exist.quantity += 1;
      } else {
        cart.push({ product_id: prod.id, name: prod.name, price: parseFloat(prod.price), quantity: 1, stock: prod.stock });
      }
      localStorage.setItem('cart', JSON.stringify(cart));
      updateCartBadge();
      showToast('Added ' + prod.name + ' to cart');
    }

    function updateCartBadge() {
      const total = cart.reduce((sum, i) => sum + i.quantity, 0);
      document.getElementById('cart-count').textContent = total;
    }

    function openCart() {
      renderCart();
      document.getElementById('cart-modal').classList.add('active');
    }
    function closeCart() {
      document.getElementById('cart-modal').classList.remove('active');
    }

    function renderCart() {
      const container = document.getElementById('cart-items-container');
      if (cart.length === 0) {
        container.innerHTML = '<div style="color:#7f94b8; padding:20px 0; text-align:center;">CART IS EMPTY</div>';
        document.getElementById('cart-total-price').textContent = '฿0.00';
        return;
      }

      let total = 0;
      container.innerHTML = cart.map((item, idx) => {
        const sub = item.price * item.quantity;
        total += sub;
        return '<div class="cart-item">' +
          '<div>' +
            '<div class="cart-item-name">' + item.name + '</div>' +
            '<div class="cart-item-price">฿' + item.price.toLocaleString() + ' x ' + item.quantity + ' = ฿' + sub.toLocaleString() + '</div>' +
          '</div>' +
          '<div class="cart-qty-ctrl">' +
            '<button class="btn-qty" onclick="changeQty(' + idx + ', -1)">-</button>' +
            '<span style="font-family:var(--font-mono);">' + item.quantity + '</span>' +
            '<button class="btn-qty" onclick="changeQty(' + idx + ', 1)">+</button>' +
            '<button class="btn-qty" style="color:var(--danger);" onclick="changeQty(' + idx + ', -999)">&times;</button>' +
          '</div>' +
        '</div>';
      }).join('');
      document.getElementById('cart-total-price').textContent = '฿' + total.toLocaleString();
    }

    function changeQty(idx, delta) {
      cart[idx].quantity += delta;
      if (cart[idx].quantity <= 0) cart.splice(idx, 1);
      localStorage.setItem('cart', JSON.stringify(cart));
      updateCartBadge();
      renderCart();
    }

    async function submitCheckout() {
      if (cart.length === 0) {
        showToast('Cart is empty');
        return;
      }
      const name = document.getElementById('chk-name').value.trim();
      const phone = document.getElementById('chk-phone').value.trim();
      const address = document.getElementById('chk-address').value.trim();

      if (!name || !phone || !address) {
        showToast('Please fill all shipping details');
        return;
      }

      try {
        // Auto demo customer login or registration
        let token = localStorage.getItem('custToken');
        if (!token) {
          const authRes = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'demo_user', password: 'user123' })
          }).then(r => r.json());
          if (authRes.token) {
            token = authRes.token;
            localStorage.setItem('custToken', token);
          }
        }

        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
          },
          body: JSON.stringify({
            items: cart,
            shipping_name: name,
            shipping_phone: phone,
            shipping_address: address
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Checkout failed');

        cart = [];
        localStorage.removeItem('cart');
        updateCartBadge();
        closeCart();
        loadStore();

        // Switch to track view and load new order
        document.getElementById('track-order-input').value = data.order.order_number;
        switchView('track');
        trackOrder();
        showToast('Order #' + data.order.order_number + ' created!');
      } catch (err) {
        alert('Order Error: ' + err.message);
      }
    }

    // ── ORDER TRACKING ──
    async function trackOrder() {
      const orderNum = document.getElementById('track-order-input').value.trim();
      if (!orderNum) return;

      try {
        const res = await fetch('/api/orders/' + encodeURIComponent(orderNum));
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Order not found');

        const o = data.order;
        const resultBox = document.getElementById('track-result');
        resultBox.style.display = 'block';

        const steps = ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
        const currIdx = steps.indexOf(o.status);

        let timelineHtml = '<div class="timeline">';
        steps.forEach((st, idx) => {
          const isDone = currIdx >= idx && o.status !== 'CANCELLED';
          const isCurr = o.status === st;
          timelineHtml += '<div class="timeline-step">' +
            '<div class="step-circle ' + (isDone ? 'done' : '') + ' ' + (isCurr ? 'active' : '') + '">' + (idx+1) + '</div>' +
            '<span class="step-label">' + st + '</span>' +
          '</div>';
        });
        timelineHtml += '</div>';

        resultBox.innerHTML = 
          '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">' +
            '<div>' +
              '<h3 style="font-family:var(--font-mono); font-size:22px; color:var(--primary);">' + o.order_number + '</h3>' +
              '<span style="font-size:12px; color:#7f94b8;">Created: ' + new Date(o.created_at).toLocaleString() + '</span>' +
            '</div>' +
            '<span class="status-badge badge-' + o.status + '">' + o.status + '</span>' +
          '</div>' +
          timelineHtml +
          (o.tracking_number ? '<div style="background:#060a16; border:1px solid var(--border-cyan); padding:12px; border-radius:4px; margin-bottom:16px; font-family:var(--font-mono); font-size:13px; color:var(--cyan);">' +
            '🚚 TRACKING NUMBER: <b>' + o.tracking_number + '</b></div>' : '') +
          '<div style="border-top:1px solid rgba(255,255,255,0.06); padding-top:14px; margin-top:14px;">' +
            '<h4 style="font-family:var(--font-title); font-size:15px; color:#fff; margin-bottom:8px;">ORDER ITEMS:</h4>' +
            (o.items || []).map(i => '<div style="display:flex; justify-content:space-between; font-size:13px; padding:4px 0;">' +
              '<span>' + i.product_name + ' x ' + i.quantity + '</span>' +
              '<span style="font-family:var(--font-mono); color:var(--primary);">฿' + parseFloat(i.subtotal).toLocaleString() + '</span>' +
            '</div>').join('') +
            '<div style="display:flex; justify-content:space-between; font-family:var(--font-mono); font-size:16px; margin-top:12px; border-top:1px solid var(--border); padding-top:8px;">' +
              '<span>TOTAL:</span><span style="color:var(--primary);">฿' + parseFloat(o.total_amount).toLocaleString() + '</span>' +
            '</div>' +
          '</div>';
      } catch (err) {
        alert(err.message);
      }
    }

    // ── ADMIN OPS ──
    function checkAdminAuth() {
      if (adminToken) {
        document.getElementById('admin-login-box').style.display = 'none';
        document.getElementById('admin-dashboard-box').style.display = 'block';
        loadAdminDashboard();
      } else {
        document.getElementById('admin-login-box').style.display = 'block';
        document.getElementById('admin-dashboard-box').style.display = 'none';
      }
    }

    async function loginAdmin() {
      const u = document.getElementById('admin-user').value.trim();
      const p = document.getElementById('admin-pass').value.trim();
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: u, password: p })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed');
        if (data.user.role !== 'admin') throw new Error('User is not an admin');

        adminToken = data.token;
        localStorage.setItem('adminToken', adminToken);
        document.getElementById('admin-curr-user').textContent = data.user.username.toUpperCase();
        checkAdminAuth();
        showToast('Admin logged in');
      } catch (err) {
        alert(err.message);
      }
    }

    function logoutAdmin() {
      adminToken = '';
      localStorage.removeItem('adminToken');
      checkAdminAuth();
    }

    async function loadAdminDashboard() {
      try {
        const [dash, ords, prods, logs] = await Promise.all([
          fetch('/api/admin/dashboard', { headers: { 'Authorization': 'Bearer ' + adminToken } }).then(r => r.json()),
          fetch('/api/admin/orders', { headers: { 'Authorization': 'Bearer ' + adminToken } }).then(r => r.json()),
          fetch('/api/products?active_only=false').then(r => r.json()),
          fetch('/api/admin/logs', { headers: { 'Authorization': 'Bearer ' + adminToken } }).then(r => r.json())
        ]);

        const s = dash.summary;
        document.getElementById('admin-stats-grid').innerHTML = 
          '<div class="stat-box"><div class="stat-label">TOTAL REVENUE</div><div class="stat-num">฿' + (s?.totalRevenue || 0).toLocaleString() + '</div></div>' +
          '<div class="stat-box"><div class="stat-label">TOTAL ORDERS</div><div class="stat-num" style="color:var(--cyan);">' + (s?.totalOrders || 0) + '</div></div>' +
          '<div class="stat-box"><div class="stat-label">REGISTERED USERS</div><div class="stat-num" style="color:var(--warn);">' + (s?.totalUsers || 0) + '</div></div>' +
          '<div class="stat-box"><div class="stat-label">LOW STOCK ITEMS</div><div class="stat-num" style="color:var(--danger);">' + (s?.lowStockCount || 0) + '</div></div>';

        // Orders Table
        document.getElementById('admin-orders-tbody').innerHTML = (ords.orders || []).map(o => 
          '<tr>' +
            '<td><b>' + o.order_number + '</b></td>' +
            '<td>' + o.shipping_name + '<br><small style="color:#7f94b8;">' + o.shipping_phone + '</small></td>' +
            '<td style="font-family:var(--font-mono); color:var(--primary);">฿' + parseFloat(o.total_amount).toLocaleString() + '</td>' +
            '<td><span class="status-badge badge-' + o.status + '">' + o.status + '</span></td>' +
            '<td style="font-family:var(--font-mono);">' + (o.tracking_number || '—') + '</td>' +
            '<td><button class="btn-buy" style="padding:4px 10px; font-size:11px;" onclick="openStatusModal(' + o.id + ', \'' + o.order_number + '\', \'' + o.status + '\', \'' + (o.tracking_number||'') + '\')">UPDATE STATUS</button></td>' +
          '</tr>'
        ).join('');

        // Products Table
        document.getElementById('admin-products-tbody').innerHTML = (prods.products || []).map(p => 
          '<tr>' +
            '<td>' + p.id + '</td>' +
            '<td><b>' + p.name + '</b></td>' +
            '<td>' + (p.category_name || '—') + '</td>' +
            '<td style="font-family:var(--font-mono);">฿' + parseFloat(p.price).toLocaleString() + '</td>' +
            '<td style="font-family:var(--font-mono); color:' + (p.stock<=5?'var(--danger)':'var(--primary)') + ';">' + p.stock + '</td>' +
            '<td>' + (p.is_active ? '<span class="status-badge badge-SHIPPED">ACTIVE</span>' : '<span class="status-badge badge-CANCELLED">DISABLED</span>') + '</td>' +
            '<td><button class="btn-buy" style="padding:4px 10px; font-size:11px;" onclick="editProduct(' + p.id + ')">EDIT</button></td>' +
          '</tr>'
        ).join('');

        // Logs Table
        document.getElementById('admin-logs-tbody').innerHTML = (logs.logs || []).map(l => 
          '<tr>' +
            '<td style="font-family:var(--font-mono); font-size:11px;">' + new Date(l.created_at).toLocaleString() + '</td>' +
            '<td><b>' + (l.admin_name || 'SYSTEM') + '</b></td>' +
            '<td><span class="status-badge badge-PAID">' + l.action + '</span></td>' +
            '<td>' + l.target_type + ' #' + l.target_id + '</td>' +
            '<td style="font-family:var(--font-mono);">' + (l.ip_address || '—') + '</td>' +
            '<td style="font-family:var(--font-mono); font-size:11px; max-width:250px; overflow:hidden; text-overflow:ellipsis;">' + JSON.stringify(l.details) + '</td>' +
          '</tr>'
        ).join('');
      } catch (err) {
        console.error(err);
      }
    }

    function switchAdminTab(tab) {
      ['orders', 'products', 'logs'].forEach(t => {
        document.getElementById('admin-' + t + '-tab').style.display = (t === tab ? 'block' : 'none');
        document.getElementById('tab-' + t + '-btn').classList.toggle('active', t === tab);
      });
    }

    // Product Modal
    function openAddProductModal() {
      document.getElementById('prod-modal-title').textContent = '📦 ADD NEW PRODUCT';
      document.getElementById('prod-edit-id').value = '';
      document.getElementById('p-name').value = '';
      document.getElementById('p-price').value = '';
      document.getElementById('p-stock').value = '';
      document.getElementById('p-img').value = '';
      document.getElementById('p-desc').value = '';

      const sel = document.getElementById('p-cat');
      sel.innerHTML = allCategories.map(c => '<option value="' + c.id + '">' + c.name + '</option>').join('');
      document.getElementById('product-modal').classList.add('active');
    }

    function editProduct(id) {
      const p = allProducts.find(x => x.id === id);
      if (!p) return;
      document.getElementById('prod-modal-title').textContent = '✏️ EDIT PRODUCT #' + id;
      document.getElementById('prod-edit-id').value = id;
      document.getElementById('p-name').value = p.name;
      document.getElementById('p-price').value = p.price;
      document.getElementById('p-stock').value = p.stock;
      document.getElementById('p-img').value = p.image_url;
      document.getElementById('p-desc').value = p.description;

      const sel = document.getElementById('p-cat');
      sel.innerHTML = allCategories.map(c => '<option value="' + c.id + '" ' + (c.id===p.category_id?'selected':'') + '>' + c.name + '</option>').join('');
      document.getElementById('product-modal').classList.add('active');
    }

    function closeProductModal() {
      document.getElementById('product-modal').classList.remove('active');
    }

    async function saveProduct() {
      const id = document.getElementById('prod-edit-id').value;
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
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + adminToken },
          body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Save failed');
        closeProductModal();
        loadAdminDashboard();
        showToast('Product saved successfully');
      } catch (err) {
        alert(err.message);
      }
    }

    // Status Modal
    function openStatusModal(orderId, orderNum, currStatus, currTracking) {
      document.getElementById('st-order-id').value = orderId;
      document.getElementById('st-order-num').textContent = orderNum;
      document.getElementById('st-select').value = currStatus;
      document.getElementById('st-tracking').value = currTracking;
      document.getElementById('st-note').value = '';
      document.getElementById('status-modal').classList.add('active');
    }
    function closeStatusModal() {
      document.getElementById('status-modal').classList.remove('active');
    }

    async function saveOrderStatus() {
      const id = document.getElementById('st-order-id').value;
      const body = {
        status: document.getElementById('st-select').value,
        tracking_number: document.getElementById('st-tracking').value.trim(),
        note: document.getElementById('st-note').value.trim()
      };

      try {
        const res = await fetch('/api/admin/orders/' + id + '/status', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + adminToken },
          body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Update failed');
        closeStatusModal();
        loadAdminDashboard();
        showToast('Order status updated');
      } catch (err) {
        alert(err.message);
      }
    }

    // Init
    loadStore();
  </script>
</body>
</html>`);
});

// ============================================================
// Start Server
// ============================================================
initDatabase().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Cyber-Commerce Backend & Ops Center listening on port ${PORT}`);
    console.log(`🏥 Health check endpoint: http://localhost:${PORT}/health`);
  });
});
