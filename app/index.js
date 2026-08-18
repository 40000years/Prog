// ============================================================
// Mega Automation Lab - Web Application
// ============================================================
// แอปพลิเคชัน Node.js + Express แบบง่าย
// Deploy บน EC2 ผ่าน Ansible → Nginx reverse proxy → port 3000

const express = require("express");
const os = require("os");

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// Routes
// ============================================================

// Health check endpoint (ใช้สำหรับ Smoke Test ใน CI/CD)
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    hostname: os.hostname(),
    uptime: process.uptime(),
  });
});

// Main page
app.get("/", (req, res) => {
  const html = `
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mega Automation Lab</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
            color: #fff;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            text-align: center;
            padding: 2rem;
            max-width: 600px;
        }
        .logo { font-size: 4rem; margin-bottom: 1rem; }
        h1 {
            font-size: 2.5rem;
            background: linear-gradient(90deg, #f093fb, #f5576c);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 0.5rem;
        }
        .subtitle { color: #a0a0c0; font-size: 1.1rem; margin-bottom: 2rem; }
        .info-card {
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 12px;
            padding: 1.5rem;
            backdrop-filter: blur(10px);
        }
        .info-item {
            display: flex;
            justify-content: space-between;
            padding: 0.5rem 0;
            border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .info-item:last-child { border-bottom: none; }
        .label { color: #a0a0c0; }
        .value { color: #f093fb; font-weight: bold; }
        .badge {
            display: inline-block;
            margin-top: 1.5rem;
            padding: 0.5rem 1.5rem;
            background: linear-gradient(90deg, #11998e, #38ef7d);
            border-radius: 50px;
            font-weight: bold;
            color: #0f0c29;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">🚀</div>
        <h1>Mega Automation Lab</h1>
        <p class="subtitle">CI/CD Pipeline • Terraform • Ansible • AWS</p>
        <div class="info-card">
            <div class="info-item">
                <span class="label">Hostname</span>
                <span class="value">${os.hostname()}</span>
            </div>
            <div class="info-item">
                <span class="label">Platform</span>
                <span class="value">${os.platform()} ${os.arch()}</span>
            </div>
            <div class="info-item">
                <span class="label">Node.js</span>
                <span class="value">${process.version}</span>
            </div>
            <div class="info-item">
                <span class="label">Uptime</span>
                <span class="value">${Math.floor(process.uptime())}s</span>
            </div>
            <div class="info-item">
                <span class="label">Environment</span>
                <span class="value">${process.env.NODE_ENV || "development"}</span>
            </div>
        </div>
        <div class="badge">✅ Deployed via Automation Pipeline</div>
    </div>
</body>
</html>`;
  res.send(html);
});

// ============================================================
// Start Server
// ============================================================
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Mega Automation Lab is running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
});
