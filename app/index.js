// ============================================================
// Mega Automation Lab - Web Application
// Real PostgreSQL + Real-time Dashboard
// ============================================================

const express = require("express");
const { Pool } = require("pg");
const os = require("os");

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());

// ============================================================
// PostgreSQL Connection
// ============================================================
const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: 5432,
  database: process.env.DB_NAME || "appdb",
  user: process.env.DB_USER || "appuser",
  password: process.env.DB_PASSWORD || "apppassword",
  connectionTimeoutMillis: 3000,
});

// สร้าง table ถ้ายังไม่มี
async function initDB() {
  try {
    await pool.query(`
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
    console.log("✅ Database initialized");
  } catch (err) {
    console.error("⚠️  DB init failed (will retry):", err.message);
  }
}

// Middleware - บันทึก request ทุกครั้ง
app.use(async (req, res, next) => {
  res.on("finish", async () => {
    if (req.path === "/health" || req.path === "/api/stats") return;
    try {
      const ip =
        req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;
      await pool.query(
        "INSERT INTO request_logs (ip, method, path, user_agent, status_code) VALUES ($1,$2,$3,$4,$5)",
        [ip, req.method, req.path, req.headers["user-agent"] || "", res.statusCode]
      );
    } catch (_) {}
  });
  next();
});

// ============================================================
// API Routes
// ============================================================

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    hostname: os.hostname(),
    uptime: process.uptime(),
  });
});

app.get("/api/stats", async (req, res) => {
  let dbStatus = "disconnected";
  let totalRequests = 0;
  let requestsToday = 0;
  let topPaths = [];
  let recentLogs = [];

  try {
    await pool.query("SELECT 1");
    dbStatus = "connected";

    const total = await pool.query("SELECT COUNT(*) FROM request_logs");
    totalRequests = parseInt(total.rows[0].count);

    const today = await pool.query(
      "SELECT COUNT(*) FROM request_logs WHERE created_at > NOW() - INTERVAL '24 hours'"
    );
    requestsToday = parseInt(today.rows[0].count);

    const paths = await pool.query(
      `SELECT path, COUNT(*) as count FROM request_logs
       GROUP BY path ORDER BY count DESC LIMIT 5`
    );
    topPaths = paths.rows;

    const recent = await pool.query(
      `SELECT ip, method, path, status_code,
       to_char(created_at AT TIME ZONE 'Asia/Bangkok', 'HH24:MI:SS') as time
       FROM request_logs ORDER BY created_at DESC LIMIT 10`
    );
    recentLogs = recent.rows;
  } catch (err) {
    dbStatus = "error: " + err.message;
  }

  const mem = process.memoryUsage();
  res.json({
    system: {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      uptime: Math.floor(process.uptime()),
      memUsedMB: Math.round(mem.rss / 1024 / 1024),
      memTotalMB: Math.round(os.totalmem() / 1024 / 1024),
      nodeVersion: process.version,
      env: process.env.NODE_ENV || "production",
    },
    db: {
      status: dbStatus,
      totalRequests,
      requestsToday,
      topPaths,
      recentLogs,
    },
  });
});

// ============================================================
// Main Dashboard
// ============================================================
app.get("/", (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MEGA AUTOMATION LAB — OPS CENTER</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Rajdhani:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --g: #00ff88;
      --b: #00d4ff;
      --r: #ff3366;
      --y: #ffcc00;
      --bg: #050810;
      --bg2: #0a0f1e;
      --bg3: #0f1628;
      --border: rgba(0,255,136,0.2);
      --mono: 'Share Tech Mono', monospace;
      --sans: 'Rajdhani', sans-serif;
    }
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }

    body {
      background: var(--bg);
      color: #c8e0ff;
      font-family: var(--sans);
      min-height: 100vh;
      overflow-x: hidden;
    }

    /* ── Canvas BG ── */
    #canvas-bg {
      position: fixed; inset: 0; z-index: 0; pointer-events: none;
    }

    /* ── Scan line overlay ── */
    body::after {
      content: '';
      position: fixed; inset: 0; z-index: 1; pointer-events: none;
      background: repeating-linear-gradient(
        0deg,
        transparent,
        transparent 2px,
        rgba(0,0,0,0.07) 2px,
        rgba(0,0,0,0.07) 4px
      );
    }

    /* ── Layout ── */
    .shell {
      position: relative; z-index: 2;
      max-width: 1400px; margin: 0 auto;
      padding: 0 24px 40px;
    }

    /* ── TOP BAR ── */
    .topbar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 18px 0 12px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 28px;
    }
    .logo-block { display: flex; align-items: center; gap: 16px; }
    .logo-hex {
      width: 48px; height: 48px;
      background: var(--g);
      clip-path: polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);
      display: flex; align-items: center; justify-content: center;
      color: #000; font-size: 22px; font-weight: 900;
      animation: pulse-hex 3s ease-in-out infinite;
    }
    @keyframes pulse-hex {
      0%,100% { box-shadow: 0 0 0 0 rgba(0,255,136,.6); }
      50% { box-shadow: 0 0 0 12px rgba(0,255,136,0); }
    }
    .logo-text { line-height: 1.1; }
    .logo-text h1 {
      font-size: 22px; font-weight: 700; letter-spacing: 4px;
      color: var(--g); text-transform: uppercase;
      text-shadow: 0 0 20px rgba(0,255,136,.5);
    }
    .logo-text span {
      font-family: var(--mono); font-size: 11px; color: #4a6080; letter-spacing: 2px;
    }

    .topbar-right { display: flex; align-items: center; gap: 20px; }
    .clock {
      font-family: var(--mono); font-size: 15px; color: var(--b);
      text-shadow: 0 0 10px rgba(0,212,255,.4);
    }
    .status-pill {
      display: flex; align-items: center; gap: 8px;
      padding: 6px 14px;
      border: 1px solid var(--g);
      clip-path: polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%);
      font-family: var(--mono); font-size: 11px;
      color: var(--g); letter-spacing: 2px;
    }
    .dot {
      width: 7px; height: 7px; border-radius: 50%;
      background: var(--g);
      animation: blink 1.5s ease-in-out infinite;
    }
    @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.2} }

    /* ── GRID ── */
    .grid-4 {
      display: grid; grid-template-columns: repeat(4,1fr); gap: 16px;
      margin-bottom: 20px;
    }
    .grid-3 {
      display: grid; grid-template-columns: 2fr 1fr; gap: 16px;
      margin-bottom: 20px;
    }
    @media(max-width:900px) {
      .grid-4 { grid-template-columns: repeat(2,1fr); }
      .grid-3 { grid-template-columns: 1fr; }
    }

    /* ── CARDS ── */
    .card {
      background: var(--bg2);
      border: 1px solid var(--border);
      padding: 20px 22px;
      position: relative;
      overflow: hidden;
      transition: border-color .3s, transform .2s;
    }
    .card::before {
      content: '';
      position: absolute; top: 0; left: 0;
      width: 3px; height: 100%;
    }
    .card.green::before  { background: var(--g); box-shadow: 0 0 12px var(--g); }
    .card.blue::before   { background: var(--b); box-shadow: 0 0 12px var(--b); }
    .card.red::before    { background: var(--r); box-shadow: 0 0 12px var(--r); }
    .card.yellow::before { background: var(--y); box-shadow: 0 0 12px var(--y); }
    .card:hover { border-color: rgba(0,255,136,.5); transform: translateY(-2px); }

    /* corner deco */
    .card::after {
      content: '';
      position: absolute; bottom: 0; right: 0;
      width: 20px; height: 20px;
      border-bottom: 2px solid var(--border);
      border-right: 2px solid var(--border);
    }

    .card-label {
      font-family: var(--mono); font-size: 10px;
      letter-spacing: 3px; color: #4a6080;
      text-transform: uppercase; margin-bottom: 8px;
    }
    .card-value {
      font-family: var(--mono); font-size: 32px; font-weight: 700;
      line-height: 1;
    }
    .card-value.green  { color: var(--g); text-shadow: 0 0 20px rgba(0,255,136,.4); }
    .card-value.blue   { color: var(--b); text-shadow: 0 0 20px rgba(0,212,255,.4); }
    .card-value.red    { color: var(--r); text-shadow: 0 0 20px rgba(255,51,102,.4); }
    .card-value.yellow { color: var(--y); text-shadow: 0 0 20px rgba(255,204,0,.4); }
    .card-sub { font-size: 12px; color: #4a6080; margin-top: 6px; font-family: var(--mono); }

    /* ── PANEL ── */
    .panel {
      background: var(--bg2);
      border: 1px solid var(--border);
      padding: 22px;
      position: relative;
    }
    .panel-title {
      font-family: var(--mono); font-size: 11px; letter-spacing: 3px;
      color: var(--g); text-transform: uppercase;
      margin-bottom: 18px;
      display: flex; align-items: center; gap: 10px;
    }
    .panel-title::after {
      content: ''; flex: 1; height: 1px;
      background: linear-gradient(90deg, rgba(0,255,136,.3), transparent);
    }

    /* ── LOG TABLE ── */
    .log-table { width: 100%; border-collapse: collapse; font-family: var(--mono); font-size: 12px; }
    .log-table th {
      text-align: left; color: #4a6080; letter-spacing: 2px;
      padding: 6px 10px; border-bottom: 1px solid var(--border);
      font-weight: 400; font-size: 10px;
    }
    .log-table td {
      padding: 8px 10px; border-bottom: 1px solid rgba(255,255,255,.03);
      color: #8099c0;
    }
    .log-table tr:hover td { background: rgba(0,255,136,.03); color: #c8e0ff; }
    .log-table tr:first-child td { animation: row-flash .5s ease; }
    @keyframes row-flash {
      from { background: rgba(0,255,136,.1); }
      to { background: transparent; }
    }
    .method-badge {
      display: inline-block; padding: 1px 6px;
      font-size: 10px; font-weight: 700; letter-spacing: 1px;
    }
    .method-GET  { color: var(--g); border: 1px solid rgba(0,255,136,.4); }
    .method-POST { color: var(--b); border: 1px solid rgba(0,212,255,.4); }
    .status-ok   { color: var(--g); }
    .status-err  { color: var(--r); }

    /* ── SYSTEM PANEL ── */
    .sys-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,.04);
      font-size: 13px;
    }
    .sys-row:last-child { border-bottom: none; }
    .sys-key { color: #4a6080; font-family: var(--mono); font-size: 11px; letter-spacing: 1px; }
    .sys-val { color: #c8e0ff; font-family: var(--mono); font-size: 12px; }

    /* ── PROGRESS BAR ── */
    .prog-bar {
      height: 4px; background: rgba(255,255,255,.05);
      margin-top: 14px; position: relative; overflow: hidden;
    }
    .prog-fill {
      height: 100%; background: linear-gradient(90deg, var(--g), var(--b));
      box-shadow: 0 0 8px var(--g);
      transition: width 1s ease;
    }
    .prog-label {
      display: flex; justify-content: space-between;
      font-family: var(--mono); font-size: 10px; color: #4a6080;
      margin-top: 4px;
    }

    /* ── CHART ── */
    #uptime-chart {
      width: 100%; height: 70px; margin-top: 8px;
    }

    /* ── DB badge ── */
    .db-badge {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 4px 12px;
      font-family: var(--mono); font-size: 11px; letter-spacing: 2px;
    }
    .db-badge.ok  { color: var(--g); border: 1px solid rgba(0,255,136,.3); }
    .db-badge.err { color: var(--r); border: 1px solid rgba(255,51,102,.3); }

    /* ── FOOTER ── */
    .footer {
      border-top: 1px solid var(--border);
      padding-top: 16px; margin-top: 8px;
      display: flex; justify-content: space-between; align-items: center;
    }
    .footer-left { font-family: var(--mono); font-size: 11px; color: #2a3850; letter-spacing: 2px; }
    .footer-right { font-family: var(--mono); font-size: 11px; color: var(--g); letter-spacing: 1px; }

    /* ── Number counter animation ── */
    @keyframes count-up { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
    .count-anim { animation: count-up .4s ease; }
  </style>
</head>
<body>
<canvas id="canvas-bg"></canvas>
<div class="shell">

  <!-- TOP BAR -->
  <div class="topbar">
    <div class="logo-block">
      <div class="logo-hex">M</div>
      <div class="logo-text">
        <h1>Mega Automation Lab</h1>
        <span>OPS CENTER // AP-SOUTHEAST-7 // BANGKOK</span>
      </div>
    </div>
    <div class="topbar-right">
      <div class="clock" id="clock">--:--:--</div>
      <div class="status-pill"><div class="dot"></div>LIVE</div>
    </div>
  </div>

  <!-- STAT CARDS -->
  <div class="grid-4">
    <div class="card green">
      <div class="card-label">// total requests</div>
      <div class="card-value green" id="stat-total">—</div>
      <div class="card-sub" id="stat-today">today: —</div>
    </div>
    <div class="card blue">
      <div class="card-label">// uptime</div>
      <div class="card-value blue" id="stat-uptime">—</div>
      <div class="card-sub">process uptime</div>
    </div>
    <div class="card yellow">
      <div class="card-label">// memory</div>
      <div class="card-value yellow" id="stat-mem">—</div>
      <div class="card-sub" id="stat-membar-label">of — MB</div>
    </div>
    <div class="card red">
      <div class="card-label">// cpu cores</div>
      <div class="card-value red" id="stat-cpus">—</div>
      <div class="card-sub" id="stat-arch">—</div>
    </div>
  </div>

  <!-- MAIN GRID -->
  <div class="grid-3">
    <!-- LOG PANEL -->
    <div class="panel">
      <div class="panel-title">// request log — live feed</div>
      <table class="log-table" id="log-table">
        <thead>
          <tr>
            <th>TIME</th>
            <th>METHOD</th>
            <th>PATH</th>
            <th>IP</th>
            <th>STATUS</th>
          </tr>
        </thead>
        <tbody id="log-body">
          <tr><td colspan="5" style="color:#2a3850;padding:20px 10px;font-family:var(--mono);font-size:11px">LOADING...</td></tr>
        </tbody>
      </table>
    </div>

    <!-- SYSTEM PANEL -->
    <div class="panel">
      <div class="panel-title">// system info</div>
      <div id="sys-info">
        <div class="sys-row"><span class="sys-key">HOSTNAME</span><span class="sys-val" id="s-hostname">—</span></div>
        <div class="sys-row"><span class="sys-key">PLATFORM</span><span class="sys-val" id="s-platform">—</span></div>
        <div class="sys-row"><span class="sys-key">NODE.JS</span><span class="sys-val" id="s-node">—</span></div>
        <div class="sys-row"><span class="sys-key">ENV</span><span class="sys-val" id="s-env">—</span></div>
        <div class="sys-row">
          <span class="sys-key">DATABASE</span>
          <span id="s-db">—</span>
        </div>
      </div>

      <div style="margin-top:20px">
        <div class="panel-title" style="font-size:10px">// memory usage</div>
        <div class="prog-bar"><div class="prog-fill" id="mem-bar" style="width:0%"></div></div>
        <div class="prog-label">
          <span id="mem-used-label">0 MB used</span>
          <span id="mem-pct-label">0%</span>
        </div>
      </div>

      <div style="margin-top:20px">
        <div class="panel-title" style="font-size:10px">// uptime graph (60s)</div>
        <canvas id="uptime-chart"></canvas>
      </div>
    </div>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <div class="footer-left">TERRAFORM // ANSIBLE // GITHUB ACTIONS // AWS EC2</div>
    <div class="footer-right" id="refresh-label">REFRESH IN 2s</div>
  </div>
</div>

<script>
// ── Canvas particle background ──
const canvas = document.getElementById('canvas-bg');
const ctx = canvas.getContext('2d');
let W, H, particles = [];

function resize() {
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
}
resize(); window.addEventListener('resize', resize);

function mkParticle() {
  return {
    x: Math.random() * W, y: Math.random() * H,
    vx: (Math.random() - .5) * .3, vy: -Math.random() * .4 - .1,
    size: Math.random() * 1.5 + .3,
    alpha: Math.random() * .4 + .1,
    color: Math.random() > .5 ? '0,255,136' : '0,212,255'
  };
}
for (let i = 0; i < 120; i++) particles.push(mkParticle());

function drawParticles() {
  ctx.clearRect(0, 0, W, H);
  // grid
  ctx.strokeStyle = 'rgba(0,255,136,0.03)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for (let y = 0; y < H; y += 60) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

  particles.forEach((p, i) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(' + p.color + ',' + p.alpha + ')';
    ctx.fill();
    p.x += p.vx; p.y += p.vy;
    if (p.y < -5) particles[i] = mkParticle(), particles[i].y = H + 5;
  });
  requestAnimationFrame(drawParticles);
}
drawParticles();

// ── Clock ──
function updateClock() {
  const now = new Date();
  document.getElementById('clock').textContent =
    now.toLocaleTimeString('th-TH', { hour12: false, timeZone: 'Asia/Bangkok' });
}
setInterval(updateClock, 1000); updateClock();

// ── Uptime chart (sparkline) ──
const uptimeChart = document.getElementById('uptime-chart');
const uc = uptimeChart.getContext('2d');
const uptimeData = [];
const MAX_POINTS = 30;

function drawUptimeChart() {
  const W = uptimeChart.width = uptimeChart.offsetWidth;
  const H = uptimeChart.height = 70;
  uc.clearRect(0, 0, W, H);
  if (uptimeData.length < 2) return;
  const min = Math.min(...uptimeData), max = Math.max(...uptimeData);
  const range = max - min || 1;

  uc.beginPath();
  uc.strokeStyle = '#00ff88';
  uc.lineWidth = 1.5;
  uc.shadowColor = '#00ff88';
  uc.shadowBlur = 6;
  uptimeData.forEach((v, i) => {
    const x = (i / (uptimeData.length - 1)) * W;
    const y = H - ((v - min) / range) * (H - 8) - 4;
    i === 0 ? uc.moveTo(x, y) : uc.lineTo(x, y);
  });
  uc.stroke();

  // fill
  uc.shadowBlur = 0;
  uc.lineTo((uptimeData.length - 1) / (uptimeData.length - 1) * W, H);
  uc.lineTo(0, H);
  uc.closePath();
  uc.fillStyle = 'rgba(0,255,136,0.06)';
  uc.fill();
}

// ── Format helpers ──
function fmtUptime(s) {
  if (s < 60) return s + 's';
  if (s < 3600) return Math.floor(s/60) + 'm ' + (s%60) + 's';
  return Math.floor(s/3600) + 'h ' + Math.floor((s%3600)/60) + 'm';
}
function animNum(el, val) {
  el.classList.remove('count-anim');
  void el.offsetWidth;
  el.textContent = val;
  el.classList.add('count-anim');
}

// ── Countdown ──
let countdown = 2;
function tickCountdown() {
  countdown--;
  if (countdown < 0) countdown = 2;
  document.getElementById('refresh-label').textContent = 'REFRESH IN ' + countdown + 's';
}
setInterval(tickCountdown, 1000);

// ── Fetch stats ──
async function fetchStats() {
  try {
    const r = await fetch('/api/stats');
    const d = await r.json();
    const sys = d.system, db = d.db;

    // Cards
    animNum(document.getElementById('stat-total'), db.totalRequests.toLocaleString());
    document.getElementById('stat-today').textContent = 'today: ' + db.requestsToday.toLocaleString();
    animNum(document.getElementById('stat-uptime'), fmtUptime(sys.uptime));
    animNum(document.getElementById('stat-mem'), sys.memUsedMB + ' MB');
    document.getElementById('stat-membar-label').textContent = 'of ' + sys.memTotalMB + ' MB total';
    animNum(document.getElementById('stat-cpus'), sys.cpus);
    document.getElementById('stat-arch').textContent = sys.platform + ' / ' + sys.arch;

    // Sys panel
    document.getElementById('s-hostname').textContent = sys.hostname;
    document.getElementById('s-platform').textContent = sys.platform + ' ' + sys.arch;
    document.getElementById('s-node').textContent = sys.nodeVersion;
    document.getElementById('s-env').textContent = sys.env.toUpperCase();

    const dbEl = document.getElementById('s-db');
    const dbOk = db.status === 'connected';
    dbEl.innerHTML = '<span class="db-badge ' + (dbOk?'ok':'err') + '"><span class="dot" style="background:' + (dbOk?'var(--g)':'var(--r)') + '"></span>' + (dbOk?'CONNECTED':'OFFLINE') + '</span>';

    // Memory bar
    const pct = Math.round((sys.memUsedMB / sys.memTotalMB) * 100);
    document.getElementById('mem-bar').style.width = pct + '%';
    document.getElementById('mem-used-label').textContent = sys.memUsedMB + ' MB used';
    document.getElementById('mem-pct-label').textContent = pct + '%';

    // Uptime chart
    uptimeData.push(sys.uptime);
    if (uptimeData.length > MAX_POINTS) uptimeData.shift();
    drawUptimeChart();

    // Log table
    const tbody = document.getElementById('log-body');
    if (db.recentLogs && db.recentLogs.length > 0) {
      tbody.innerHTML = db.recentLogs.map(r =>
        '<tr><td>' + r.time + '</td>' +
        '<td><span class="method-badge method-' + r.method + '">' + r.method + '</span></td>' +
        '<td>' + r.path + '</td>' +
        '<td>' + (r.ip || '—').replace('::ffff:','') + '</td>' +
        '<td class="' + (r.status_code < 400 ? 'status-ok' : 'status-err') + '">' + r.status_code + '</td></tr>'
      ).join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="5" style="color:#2a3850;padding:20px 10px;font-family:var(--mono);font-size:11px">NO REQUESTS YET — WAITING...</td></tr>';
    }
  } catch(e) {
    console.error('fetch error:', e);
  }
  countdown = 2;
}

fetchStats();
setInterval(fetchStats, 2000);
</script>
</body>
</html>`);
});

// ============================================================
// Start
// ============================================================
initDB().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log("🚀 Mega Automation Lab running on port", PORT);
    console.log("📊 Dashboard: http://localhost:" + PORT);
    console.log("🏥 Health:    http://localhost:" + PORT + "/health");
    console.log("📡 Stats API: http://localhost:" + PORT + "/api/stats");
  });
});
