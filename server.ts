import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import Database from 'better-sqlite3';
import cors from 'cors';

const app = express();
const PORT = 3000;
const PROJECT_ROOT = process.cwd();
const DB_PATH = path.join(PROJECT_ROOT, 'recovery_state.db');
const LOG_PATH = path.join(PROJECT_ROOT, 'fix-wifi.log');

app.use(cors());
app.use(express.json());

// ── REQUEST COMPLIANCE: READONLY DB ACCESS ──────────────────────────────────
const getDb = () => {
  if (!fs.existsSync(DB_PATH)) return null;
  return new Database(DB_PATH, { readonly: true });
};

// ── API ROUTES ──────────────────────────────────────────────────────────────

app.get('/api/status', (req, res) => {
  const db = getDb();
  if (!db) return res.json({ status: 'initializing' });

  try {
    const lastHealth = db.prepare('SELECT * FROM stats ORDER BY id DESC LIMIT 1').get();
    const lastMilestone = db.prepare('SELECT * FROM milestones ORDER BY id DESC LIMIT 1').get();
    const auditFindings = db.prepare('SELECT * FROM nm_audit ORDER BY id DESC LIMIT 10').all();
    const ifaceHealth = db.prepare('SELECT * FROM iface_health ORDER BY id DESC LIMIT 5').all();
    
    res.json({
      lastHealth,
      lastMilestone,
      auditFindings,
      ifaceHealth,
      dbPath: DB_PATH,
      logPath: LOG_PATH
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  } finally {
    db.close();
  }
});

app.get('/api/lint', (req, res) => {
  const child = spawn('sudo', ['./fix-wifi.sh', PROJECT_ROOT, '--lint'], {
    cwd: PROJECT_ROOT,
    env: { ...process.env, PROJECT_ROOT }
  });

  let output = '';
  child.stdout.on('data', (data) => output += data);
  child.stderr.on('data', (data) => output += data);

  child.on('close', (code) => {
    res.json({ code, output });
  });
});

app.get('/api/forensics', (req, res) => {
  const db = getDb();
  if (!db) return res.json([]);
  try {
    const forensics = db.prepare('SELECT * FROM forensics ORDER BY id DESC LIMIT 50').all();
    res.json(forensics);
  } finally {
    db.close();
  }
});

app.post('/api/recover', (req, res) => {
  // ── REQUEST COMPLIANCE: SYSTEM BINARY CALL WITH CWD AS ARGUMENT ───────────
  const child = spawn('sudo', ['./fix-wifi.sh', PROJECT_ROOT, '--force'], {
    cwd: PROJECT_ROOT,
    env: { ...process.env, PROJECT_ROOT }
  });

  child.stdout.on('data', (data) => console.log(`[fix-wifi] ${data}`));
  child.stderr.on('data', (data) => console.error(`[fix-wifi] ERR: ${data}`));

  res.json({ message: 'Recovery triggered' });
});

// ── SSE FOR LOG STREAMING ───────────────────────────────────────────────────

app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendEvent = (data: any) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Initial tail
  if (fs.existsSync(LOG_PATH)) {
    const content = fs.readFileSync(LOG_PATH, 'utf8');
    sendEvent({ type: 'log', lines: content.split('\n').slice(-100) });
  }

  // ── REQUEST COMPLIANCE: ROBUST LOG WATCHING ────────────────────────────────
  if (!fs.existsSync(LOG_PATH)) {
    fs.writeFileSync(LOG_PATH, '', { mode: 0o600 });
  }

  const watcher = fs.watch(LOG_PATH, (event) => {
    if (event === 'change') {
      try {
        const content = fs.readFileSync(LOG_PATH, 'utf8');
        sendEvent({ type: 'log', lines: content.split('\n').slice(-20) });
      } catch (e) {
        console.error(`[server] Watch error: ${e}`);
      }
    }
  });

  req.on('close', () => {
    watcher.close();
  });
});

// ── VITE MIDDLEWARE ─────────────────────────────────────────────────────────

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(PROJECT_ROOT, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(PROJECT_ROOT, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`PROJECT_ROOT: ${PROJECT_ROOT}`);
  });
}

startServer();
