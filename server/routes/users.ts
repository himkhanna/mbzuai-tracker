import { Router, Request, Response } from 'express';
import type { Role } from '../types/enums';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { sendEmail, renderTemplate } from '../config/email';
import { logAudit } from '../services/auditService';
import prisma from '../config/prisma';

const router = Router();

const ADMIN_ONLY = requireRole('ADMIN');

// ---------------------------------------------------------------------------
// GET /api/users  — list all users (Admin only)
// ---------------------------------------------------------------------------
router.get('/', authenticate, ADMIN_ONLY, async (_req: Request, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (err) {
    console.error('[Users] GET / error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/users  — create user (Admin only)
// ---------------------------------------------------------------------------
router.post('/', authenticate, ADMIN_ONLY, async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, role, department } = req.body as {
      name?: string;
      email?: string;
      role?: string;
      department?: string;
    };

    if (!name || !email || !role) {
      res.status(400).json({ error: 'name, email, and role are required' });
      return;
    }

    const validRoles: Role[] = ['ADMIN', 'VENDOR_MANAGEMENT', 'PROCUREMENT', 'STORE', 'FINANCE', 'IT', 'ASSET'];
    if (!validRoles.includes(role as Role)) {
      res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      res.status(409).json({ error: 'A user with this email already exists' });
      return;
    }

    // Generate temporary password
    const tempPassword = crypto.randomBytes(6).toString('hex') + 'A1!';
    const hashed = await bcrypt.hash(tempPassword, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashed,
        role: role as Role,
        department: department ?? null,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        isActive: true,
        createdAt: true,
      },
    });

    await logAudit(prisma, {
      entityType: 'user',
      entityId: user.id,
      userId: req.user!.id,
      action: 'CREATE',
    });

    // Send welcome email
    try {
      const html = renderTemplate('welcome', {
        name: user.name,
        email: user.email,
        role: user.role,
        tempPassword,
        loginUrl: `${process.env.CLIENT_URL || 'http://localhost:5173'}/login`,
      });
      await sendEmail(user.email, `Welcome to MBZUAI Delivery Tracker`, html);
    } catch (emailErr) {
      console.error('[Users] Welcome email failed:', emailErr);
    }

    res.status(201).json({ user, tempPassword });
  } catch (err) {
    console.error('[Users] POST / error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/users/:id  — update user (Admin only)
// ---------------------------------------------------------------------------
router.put('/:id', authenticate, ADMIN_ONLY, async (req: Request, res: Response): Promise<void> => {
  try {
    const existing = await prisma.user.findUnique({ where: { id: String(req.params['id']) } });
    if (!existing) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const { name, role, department, isActive } = req.body as Partial<{
      name: string;
      role: string;
      department: string;
      isActive: boolean;
    }>;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData['name'] = name;
    if (department !== undefined) updateData['department'] = department;
    if (isActive !== undefined) updateData['isActive'] = Boolean(isActive);
    if (role !== undefined) {
      const validRoles: Role[] = ['ADMIN', 'VENDOR_MANAGEMENT', 'PROCUREMENT', 'STORE', 'FINANCE', 'IT', 'ASSET'];
      if (!validRoles.includes(role as Role)) {
        res.status(400).json({ error: `Invalid role` });
        return;
      }
      updateData['role'] = role as Role;
    }

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({ error: 'No valid fields provided' });
      return;
    }

    const updated = await prisma.user.update({
      where: { id: String(req.params['id']) },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        isActive: true,
        updatedAt: true,
      },
    });

    await logAudit(prisma, {
      entityType: 'user',
      entityId: existing.id,
      userId: req.user!.id,
      action: 'UPDATE',
    });

    res.json(updated);
  } catch (err) {
    console.error('[Users] PUT /:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/users/:id/deactivate  — deactivate user (Admin only)
// ---------------------------------------------------------------------------
router.put('/:id/deactivate', authenticate, ADMIN_ONLY, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({ where: { id: String(req.params['id']) } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (user.id === req.user!.id) {
      res.status(400).json({ error: 'You cannot deactivate your own account' });
      return;
    }

    await prisma.user.update({ where: { id: user.id }, data: { isActive: false } });

    await logAudit(prisma, {
      entityType: 'user',
      entityId: user.id,
      userId: req.user!.id,
      action: 'DEACTIVATE',
      fieldName: 'isActive',
      oldValue: 'true',
      newValue: 'false',
    });

    res.json({ message: 'User deactivated successfully' });
  } catch (err) {
    console.error('[Users] PUT /:id/deactivate error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/users/:id/reset-password  — Admin reset (Admin only)
// ---------------------------------------------------------------------------
router.put('/:id/reset-password', authenticate, ADMIN_ONLY, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({ where: { id: String(req.params['id']) } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const tempPassword = crypto.randomBytes(6).toString('hex') + 'B2@';
    const hashed = await bcrypt.hash(tempPassword, 12);

    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });

    await logAudit(prisma, {
      entityType: 'user',
      entityId: user.id,
      userId: req.user!.id,
      action: 'RESET_PASSWORD',
    });

    try {
      const html = renderTemplate('reset-password', {
        name: user.name,
        tempPassword,
        loginUrl: `${process.env.CLIENT_URL || 'http://localhost:5173'}/login`,
      });
      await sendEmail(user.email, 'MBZUAI Tracker — Password Reset', html);
    } catch (emailErr) {
      console.error('[Users] Reset password email failed:', emailErr);
    }

    res.json({ message: 'Password reset successfully. Temporary password sent to user.' });
  } catch (err) {
    console.error('[Users] PUT /:id/reset-password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
