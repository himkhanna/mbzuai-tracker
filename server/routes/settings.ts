import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import fs from 'fs';
import path from 'path';

const router = Router();
const SETTINGS_DIR = path.join(__dirname, '../data');
const SETTINGS_FILE = path.join(SETTINGS_DIR, 'settings.json');

interface Settings {
  logoBase64: string | null;
}

function readSettings(): Settings {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8')) as Settings;
    }
  } catch {
    // ignore
  }
  return { logoBase64: null };
}

function writeSettings(data: Settings): void {
  if (!fs.existsSync(SETTINGS_DIR)) {
    fs.mkdirSync(SETTINGS_DIR, { recursive: true });
  }
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// GET /api/settings — public (no auth needed for logo display)
router.get('/', (_req: Request, res: Response): void => {
  res.json(readSettings());
});

// PUT /api/settings/logo — ADMIN only
router.put(
  '/logo',
  authenticate,
  requireRole('ADMIN'),
  (req: Request, res: Response): void => {
    try {
      const { logoBase64 } = req.body as { logoBase64?: string | null };
      const settings = readSettings();
      settings.logoBase64 = logoBase64 ?? null;
      writeSettings(settings);
      res.json({ success: true });
    } catch (err) {
      console.error('[Settings] PUT /logo error:', err);
      res.status(500).json({ error: 'Failed to save settings' });
    }
  },
);

export default router;
