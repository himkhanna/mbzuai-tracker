import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import prisma from '../config/prisma';

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/audit  — list audit logs with filters
// RBAC: ADMIN, VENDOR_MANAGEMENT
// ---------------------------------------------------------------------------
router.get(
  '/',
  authenticate,
  requireRole('ADMIN', 'VENDOR_MANAGEMENT'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId, entityType, dateFrom, dateTo, page, limit } = req.query as Record<string, string>;

      const pageNum = Math.max(1, parseInt(page || '1', 10));
      const limitNum = Math.min(200, Math.max(1, parseInt(limit || '100', 10)));
      const skip = (pageNum - 1) * limitNum;

      // Only show change records (fieldName must be present).
      // Creation records (action=CREATE, no fieldName) are not meaningful in the change log.
      const where: Record<string, unknown> = {
        fieldName: { not: null },
      };

      if (userId) {
        where['userId'] = userId;
      }
      if (entityType) {
        where['entityType'] = entityType;
      }
      if (dateFrom || dateTo) {
        const dateFilter: Record<string, Date> = {};
        if (dateFrom) dateFilter['gte'] = new Date(dateFrom);
        if (dateTo) {
          const end = new Date(dateTo);
          end.setHours(23, 59, 59, 999);
          dateFilter['lte'] = end;
        }
        where['timestamp'] = dateFilter;
      }

      const [total, logs] = await Promise.all([
        prisma.auditLog.count({ where }),
        prisma.auditLog.findMany({
          where,
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
          },
          orderBy: { timestamp: 'desc' },
          skip,
          take: limitNum,
        }),
      ]);

      res.json({
        data: logs,
        meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
      });
    } catch (err) {
      console.error('[Audit] GET / error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

export default router;
