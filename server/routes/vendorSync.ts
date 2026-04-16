import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import prisma from '../config/prisma';
import { syncVendorOrder } from '../services/vendorSync';

const router = Router();
const CAN_SYNC = requireRole('ADMIN', 'VENDOR_MANAGEMENT', 'PROCUREMENT');

// ---------------------------------------------------------------------------
// POST /api/vendor-sync/:orderId  — trigger sync for one order
// ---------------------------------------------------------------------------
router.post(
  '/:orderId',
  authenticate,
  CAN_SYNC,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const order = await prisma.order.findUnique({ where: { id: String(req.params['orderId']) } });

      if (!order) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }
      if (!order.vendorPlatform || !order.vendorOrderId) {
        res.status(400).json({ error: 'No vendor platform / order ID configured on this order' });
        return;
      }

      const result = syncVendorOrder(order.vendorPlatform, order.vendorOrderId);

      await prisma.order.update({
        where: { id: order.id },
        data: {
          vendorSyncData: JSON.stringify(result),
          vendorLastSynced: new Date(),
        },
      });

      res.json({ ...result, syncedAt: new Date().toISOString() });
    } catch (err) {
      console.error('[VendorSync] POST error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ---------------------------------------------------------------------------
// GET /api/vendor-sync/:orderId  — get last sync result
// ---------------------------------------------------------------------------
router.get(
  '/:orderId',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const order = await prisma.order.findUnique({
        where: { id: String(req.params['orderId']) },
        select: {
          vendorPlatform: true,
          vendorOrderId: true,
          vendorSyncData: true,
          vendorLastSynced: true,
        },
      });

      if (!order) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }

      res.json({
        vendorPlatform: order.vendorPlatform,
        vendorOrderId: order.vendorOrderId,
        lastSynced: order.vendorLastSynced,
        data: order.vendorSyncData ? JSON.parse(order.vendorSyncData) : null,
      });
    } catch (err) {
      console.error('[VendorSync] GET error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

export default router;
