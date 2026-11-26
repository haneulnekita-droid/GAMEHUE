import 'dotenv/config';
import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const DATA_DIR = path.resolve(__dirname, '.data');
const AUTH_FILE = path.resolve(DATA_DIR, 'facilitator-auth.json');
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

const SESSION_SIGNING_KEY =
  process.env.SESSION_SECRET && process.env.SESSION_SECRET.trim().length >= 16
    ? process.env.SESSION_SECRET.trim()
    : crypto.randomBytes(32).toString('hex');

interface StoredFacilitatorAuth {
  salt: string;
  hash: string;
  claimedAt: string;
}

function getEnvPasscode(): string {
  return (process.env.FACILITATOR_PASSWORD ?? '').trim();
}

function readStoredAuth(): StoredFacilitatorAuth | null {
  try {
    if (!fs.existsSync(AUTH_FILE)) {
      return null;
    }
    const raw = fs.readFileSync(AUTH_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<StoredFacilitatorAuth>;
    if (
      typeof parsed.salt === 'string' &&
      typeof parsed.hash === 'string' &&
      parsed.salt.length > 0 &&
      parsed.hash.length > 0
    ) {
      return {
        salt: parsed.salt,
        hash: parsed.hash,
        claimedAt: typeof parsed.claimedAt === 'string' ? parsed.claimedAt : new Date().toISOString(),
      };
    }
    return null;
  } catch {
    return null;
  }
}

function hashPasscode(passcode: string, salt: string): string {
  return crypto.scryptSync(passcode, salt, 64).toString('hex');
}

function safeCompareStrings(a: string, b: string): boolean {
  const hashA = crypto.createHash('sha256').update(a).digest();
  const hashB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

function issueToken(): string {
  const exp = Date.now() + TOKEN_TTL_MS;
  const nonce = crypto.randomBytes(16).toString('hex');
  const payload = Buffer.from(JSON.stringify({ role: 'facilitator', exp, nonce })).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SESSION_SIGNING_KEY)
    .update(payload)
    .digest('base64url');
  return `${payload}.${signature}`;
}

function verifyToken(token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, signature] = parts;
  if (!payload || !signature) return false;

  const expectedSig = crypto
    .createHmac('sha256', SESSION_SIGNING_KEY)
    .update(payload)
    .digest('base64url');

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return false;
  }

  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      role?: string;
      exp?: number;
    };
    return decoded.role === 'facilitator' && typeof decoded.exp === 'number' && decoded.exp > Date.now();
  } catch {
    return false;
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '64kb' }));

  app.get('/api/facilitator/status', (_req, res) => {
    const envPass = getEnvPasscode();
    if (envPass.length > 0) {
      res.json({ configured: true, source: 'env' });
      return;
    }
    const stored = readStoredAuth();
    res.json({
      configured: stored !== null,
      source: stored !== null ? 'claimed' : 'needs-setup',
    });
  });

  app.post('/api/facilitator/setup', (req, res) => {
    if (getEnvPasscode().length > 0) {
      res.status(409).json({ error: 'La contraseña ya está configurada en el servidor.' });
      return;
    }
    if (readStoredAuth() !== null) {
      res.status(409).json({ error: 'La contraseña inicial ya fue configurada anteriormente.' });
      return;
    }

    const passcode = typeof req.body?.passcode === 'string' ? req.body.passcode.trim() : '';
    if (passcode.length < 6 || passcode.length > 128) {
      res.status(400).json({ error: 'La contraseña debe tener entre 6 y 128 caracteres.' });
      return;
    }

    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = hashPasscode(passcode, salt);
      const record: StoredFacilitatorAuth = {
        salt,
        hash,
        claimedAt: new Date().toISOString(),
      };
      fs.writeFileSync(AUTH_FILE, JSON.stringify(record, null, 2), { flag: 'wx', mode: 0o600 });
      const token = issueToken();
      res.json({ ok: true, token });
    } catch {
      res.status(409).json({ error: 'No se pudo guardar la contraseña inicial.' });
    }
  });

  app.post('/api/facilitator/login', (req, res) => {
    const passcode = typeof req.body?.passcode === 'string' ? req.body.passcode.trim() : '';
    if (!passcode) {
      res.status(400).json({ error: 'Ingresa la contraseña del facilitador.' });
      return;
    }

    const envPass = getEnvPasscode();
    if (envPass.length > 0) {
      if (!safeCompareStrings(passcode, envPass)) {
        res.status(401).json({ error: 'Contraseña incorrecta.' });
        return;
      }
      res.json({ ok: true, token: issueToken() });
      return;
    }

    const stored = readStoredAuth();
    if (!stored) {
      res.status(412).json({ error: 'Configura la contraseña inicial primero.' });
      return;
    }

    const candidateHash = hashPasscode(passcode, stored.salt);
    const bufA = Buffer.from(candidateHash, 'hex');
    const bufB = Buffer.from(stored.hash, 'hex');
    if (bufA.length !== bufB.length || !crypto.timingSafeEqual(bufA, bufB)) {
      res.status(401).json({ error: 'Contraseña incorrecta.' });
      return;
    }

    res.json({ ok: true, token: issueToken() });
  });

  app.get('/api/facilitator/verify', (req, res) => {
    const authHeader = req.headers.authorization ?? '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!token || !verifyToken(token)) {
      res.status(401).json({ valid: false });
      return;
    }
    res.json({ valid: true });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
