import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database path handling for Render persistent disk
const dbDir = process.env.DB_DIR || ".";
if (dbDir !== "." && !fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
const dbPath = path.join(dbDir, "queue.db");
const db = new Database(dbPath);

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    status TEXT DEFAULT 'waiting',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  app.use(express.json());

  // Admin Login
  app.post("/api/admin/login", (req, res) => {
    const { username, password } = req.body;
    const adminUser = process.env.ADMIN_USERNAME || "admin";
    const adminPass = process.env.ADMIN_PASSWORD || "password123";

    if (username === adminUser && password === adminPass) {
      res.json({ success: true, token: "admin-secret-token" });
    } else {
      res.status(401).json({ error: "帳號或密碼錯誤" });
    }
  });

  // Middleware to check admin token
  const adminAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const token = req.headers["x-admin-token"];
    if (token === "admin-secret-token") {
      next();
    } else {
      res.status(403).json({ error: "未授權" });
    }
  };

  // API Routes
  app.get("/api/queue", (req, res) => {
    const rows = db.prepare("SELECT * FROM queue WHERE status != 'cancelled' ORDER BY created_at ASC").all();
    res.json(rows);
  });

  app.post("/api/queue/join", (req, res) => {
    const { name, phone } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });
    
    const info = db.prepare("INSERT INTO queue (name, phone) VALUES (?, ?)").run(name, phone);
    const newItem = db.prepare("SELECT * FROM queue WHERE id = ?").get(info.lastInsertRowid);
    
    io.emit("queue_updated");
    res.json(newItem);
  });

  app.post("/api/queue/call", adminAuth, (req, res) => {
    const { id } = req.body;
    db.prepare("UPDATE queue SET status = 'called' WHERE id = ?").run(id);
    io.emit("queue_updated");
    res.json({ success: true });
  });

  app.post("/api/queue/cancel", adminAuth, (req, res) => {
    const { id } = req.body;
    db.prepare("UPDATE queue SET status = 'cancelled' WHERE id = ?").run(id);
    io.emit("queue_updated");
    res.json({ success: true });
  });

  app.post("/api/queue/clear", adminAuth, (req, res) => {
    db.prepare("DELETE FROM queue").run();
    io.emit("queue_updated");
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = 3000;
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
