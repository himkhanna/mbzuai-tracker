import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { authenticate } from '../middleware/auth';
import { sendEmail, renderTemplate } from '../config/email';
import prisma from '../config/prisma';

const router = Router();

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 8 * 60 * 60 * 1000, // 8 hours
};

function signToken(payload: { id: string; email: string; role: string; name: string }): string {
  const secret = process.env.JWT_SECRET!;
  const expiresIn = process.env.JWT_EXPIRES_IN || '8h';
  return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
}

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const payload = { id: user.id, email: user.email, role: user.role, name: user.name };
    const token = signToken(payload);

    res.cookie('token', token, COOKIE_OPTS);
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        isActive: user.isActive,
      },
    });
  } catch (err) {
    console.error('[Auth] Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/logout
router.post('/logout', (_req: Request, res: Response): void => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

// POST /api/auth/refresh
router.post('/refresh', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user || !user.isActive) {
      res.status(401).json({ error: 'User not found or inactive' });
      return;
    }

    const payload = { id: user.id, email: user.email, role: user.role, name: user.name };
    const token = signToken(payload);

    res.cookie('token', token, COOKIE_OPTS);
    res.json({ token, user: payload });
  } catch (err) {
    console.error('[Auth] Refresh error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/change-password
router.post('/change-password', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body as {
      currentPassword?: string;
      newPassword?: string;
    };

    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'currentPassword and newPassword are required' });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({ error: 'New password must be at least 8 characters' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      res.status(401).json({ error: 'Current password is incorrect' });
      return;
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('[Auth] Change password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body as { email?: string };
    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    // Always respond 200 to prevent user enumeration
    if (!user || !user.isActive) {
      res.json({ message: 'If that email exists, a reset link has been sent.' });
      return;
    }

    // Generate a temporary password
    const tempPassword = crypto.randomBytes(8).toString('hex');
    const hashed = await bcrypt.hash(tempPassword, 12);

    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });

    const html = renderTemplate('reset-password', {
      name: user.name,
      tempPassword,
      loginUrl: `${process.env.CLIENT_URL || 'http://localhost:5173'}/login`,
    });
    await sendEmail(user.email, 'MBZUAI Tracker — Password Reset', html);

    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    console.error('[Auth] Forgot password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/reset-password
// Accepts a temp token or admin-generated token; simplified: just accepts email + tempPassword + newPassword
router.post('/reset-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, tempPassword, newPassword } = req.body as {
      email?: string;
      tempPassword?: string;
      newPassword?: string;
    };

    if (!email || !tempPassword || !newPassword) {
      res.status(400).json({ error: 'email, tempPassword, and newPassword are required' });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({ error: 'New password must be at least 8 characters' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const valid = await bcrypt.compare(tempPassword, user.password);
    if (!valid) {
      res.status(401).json({ error: 'Invalid or expired temporary password' });
      return;
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });

    res.json({ message: 'Password reset successfully. Please log in.' });
  } catch (err) {
    console.error('[Auth] Reset password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
