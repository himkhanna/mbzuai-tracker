import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { logAudit, logAuditDiff } from '../services/auditService';
import { triggerNotification } from '../services/notificationService';
import { calculateItemStatus, calculateOrderStatus } from '../utils/statusCalculator';
import prisma from '../config/prisma';

const router = Router();

// ---------------------------------------------------------------------------
// Helper: recalculate item status, persist it, then sync order status
// ---------------------------------------------------------------------------
async function recalcAndPersist(itemId: string, orderId: string): Promise<void> {
  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item) return;

  const newStatus = calculateItemStatus(item);
  await prisma.item.update({ where: { id: itemId }, data: { status: newStatus } });

  const items = await prisma.item.findMany({ where: { orderId }, select: { status: true } });
  const orderStatus = calculateOrderStatus(items);
  await prisma.order.update({ where: { id: orderId }, data: { status: orderStatus } });
}

// ---------------------------------------------------------------------------
// GET /api/items/:id
// ---------------------------------------------------------------------------
router.get('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params['id']);
    const item = await prisma.item.findUnique({
      where: { id },
      include: {
        order: true,
        auditLogs: {
          include: { user: { select: { id: true, name: true, email: true, role: true } } },
          orderBy: { timestamp: 'desc' },
          take: 50,
        },
      },
    });

    if (!item) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }

    res.json(item);
  } catch (err) {
    console.error('[Items] GET /:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/items/:id/receive  — MUST be before PUT /:id
// ---------------------------------------------------------------------------
router.put(
  '/:id/receive',
  authenticate,
  requireRole('ADMIN', 'VENDOR_MANAGEMENT', 'PROCUREMENT', 'STORE'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = String(req.params['id']);
      const item = await prisma.item.findUnique({
        where: { id },
        include: { order: true },
      });
      if (!item) {
        res.status(404).json({ error: 'Item not found' });
        return;
      }
      const quantityReceived = req.body.quantityReceived != null
        ? parseInt(String(req.body.quantityReceived), 10)
        : item.quantity;

      if (isNaN(quantityReceived) || quantityReceived <= 0) {
        res.status(400).json({ error: 'quantityReceived must be a positive number' });
        return;
      }
      if (quantityReceived > item.quantity) {
        res.status(400).json({ error: `quantityReceived (${quantityReceived}) cannot exceed ordered quantity (${item.quantity})` });
        return;
      }
      if (item.receivedDate && (item.quantityReceived ?? 0) >= item.quantity) {
        res.status(409).json({ error: 'Item has already been fully received' });
        return;
      }

      const now = req.body.receivedDate ? new Date(req.body.receivedDate as string) : new Date();
      const isFullyReceived = quantityReceived >= item.quantity;

      await prisma.item.update({
        where: { id: item.id },
        data: {
          quantityReceived,
          receivedDate: isFullyReceived ? now : null,
          storedDate: isFullyReceived ? now : null,
        },
      });

      await recalcAndPersist(item.id, item.orderId);
      const refreshed = await prisma.item.findUnique({ where: { id: item.id } });

      await logAudit(prisma, {
        entityType: 'item',
        entityId: item.id,
        userId: req.user!.id,
        action: 'RECEIVE',
        fieldName: 'receivedDate',
        oldValue: null,
        newValue: now.toISOString(),
        itemId: item.id,
        orderId: item.orderId,
      });

      const dateStr = now.toLocaleDateString('en-AE');
      await triggerNotification(
        'ITEM_RECEIVED',
        {
          reference: item.order.reference,
          description: item.description,
          quantity: item.quantity,
          receivedDate: dateStr,
          requiresAssetTagging: item.requiresAssetTagging,
          requiresITConfig: item.requiresITConfig,
          orderId: item.orderId,
          itemId: item.id,
          relatedId: item.id,
          vendor: item.order.vendor,
        },
        prisma,
      );

      if (item.requiresAssetTagging) {
        await triggerNotification(
          'ASSET_TAGGING_REQUIRED',
          {
            reference: item.order.reference,
            description: item.description,
            quantity: item.quantity,
            receivedDate: dateStr,
            orderId: item.orderId,
            itemId: item.id,
            relatedId: item.id,
          },
          prisma,
        );
      }
      if (item.requiresITConfig && !item.requiresAssetTagging) {
        await triggerNotification(
          'IT_CONFIG_REQUIRED',
          {
            reference: item.order.reference,
            description: item.description,
            quantity: item.quantity,
            endUser: item.order.endUser,
            orderId: item.orderId,
            itemId: item.id,
            relatedId: item.id,
          },
          prisma,
        );
      }

      res.json(refreshed);
    } catch (err) {
      console.error('[Items] PUT /:id/receive error:', err);
      res.status(500).json({ error: 'Internal server error', detail: String(err) });
    }
  },
);

// ---------------------------------------------------------------------------
// PUT /api/items/:id/asset-tag  — MUST be before PUT /:id
// ---------------------------------------------------------------------------
router.put(
  '/:id/asset-tag',
  authenticate,
  requireRole('ADMIN', 'VENDOR_MANAGEMENT', 'PROCUREMENT', 'ASSET'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = String(req.params['id']);
      const item = await prisma.item.findUnique({
        where: { id },
        include: { order: true },
      });
      if (!item) {
        res.status(404).json({ error: 'Item not found' });
        return;
      }
      if (!item.storedDate) {
        res.status(409).json({ error: 'Item must be received and stored before asset tagging' });
        return;
      }
      if (item.assetTaggingDate) {
        res.status(409).json({ error: 'Item has already been asset tagged' });
        return;
      }

      const now = req.body.assetTaggingDate ? new Date(req.body.assetTaggingDate as string) : new Date();

      await prisma.item.update({ where: { id: item.id }, data: { assetTaggingDate: now } });

      await recalcAndPersist(item.id, item.orderId);
      const refreshed = await prisma.item.findUnique({ where: { id: item.id } });

      await logAudit(prisma, {
        entityType: 'item',
        entityId: item.id,
        userId: req.user!.id,
        action: 'ASSET_TAG',
        fieldName: 'assetTaggingDate',
        oldValue: null,
        newValue: now.toISOString(),
        itemId: item.id,
        orderId: item.orderId,
      });

      const dateStr = now.toLocaleDateString('en-AE');
      await triggerNotification(
        'ASSET_TAGGING_DONE',
        {
          reference: item.order.reference,
          description: item.description,
          assetTaggingDate: dateStr,
          requiresITConfig: item.requiresITConfig,
          orderId: item.orderId,
          itemId: item.id,
          relatedId: item.id,
        },
        prisma,
      );

      if (item.requiresITConfig) {
        await triggerNotification(
          'IT_CONFIG_REQUIRED',
          {
            reference: item.order.reference,
            description: item.description,
            quantity: item.quantity,
            endUser: item.order.endUser,
            orderId: item.orderId,
            itemId: item.id,
            relatedId: item.id,
          },
          prisma,
        );
      }

      res.json(refreshed);
    } catch (err) {
      console.error('[Items] PUT /:id/asset-tag error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ---------------------------------------------------------------------------
// PUT /api/items/:id/it-config  — MUST be before PUT /:id
// ---------------------------------------------------------------------------
router.put(
  '/:id/it-config',
  authenticate,
  requireRole('ADMIN', 'VENDOR_MANAGEMENT', 'PROCUREMENT', 'IT'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = String(req.params['id']);
      const item = await prisma.item.findUnique({
        where: { id },
        include: { order: true },
      });
      if (!item) {
        res.status(404).json({ error: 'Item not found' });
        return;
      }
      if (!item.storedDate) {
        res.status(409).json({ error: 'Item must be stored before IT configuration' });
        return;
      }
      if (item.requiresAssetTagging && !item.assetTaggingDate) {
        res.status(409).json({ error: 'Asset tagging must be completed before IT configuration' });
        return;
      }
      if (item.itConfigDate) {
        res.status(409).json({ error: 'Item has already been IT configured' });
        return;
      }

      const now = req.body.itConfigDate ? new Date(req.body.itConfigDate as string) : new Date();

      await prisma.item.update({ where: { id: item.id }, data: { itConfigDate: now } });

      await recalcAndPersist(item.id, item.orderId);
      const refreshed = await prisma.item.findUnique({ where: { id: item.id } });

      await logAudit(prisma, {
        entityType: 'item',
        entityId: item.id,
        userId: req.user!.id,
        action: 'IT_CONFIG',
        fieldName: 'itConfigDate',
        oldValue: null,
        newValue: now.toISOString(),
        itemId: item.id,
        orderId: item.orderId,
      });

      await triggerNotification(
        'IT_CONFIG_DONE',
        {
          reference: item.order.reference,
          description: item.description,
          itConfigDate: now.toLocaleDateString('en-AE'),
          endUser: item.order.endUser,
          orderId: item.orderId,
          itemId: item.id,
          relatedId: item.id,
        },
        prisma,
      );

      res.json(refreshed);
    } catch (err) {
      console.error('[Items] PUT /:id/it-config error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ---------------------------------------------------------------------------
// PUT /api/items/:id/handover  — MUST be before PUT /:id
// ---------------------------------------------------------------------------
router.put(
  '/:id/handover',
  authenticate,
  requireRole('ADMIN', 'VENDOR_MANAGEMENT', 'PROCUREMENT', 'STORE'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = String(req.params['id']);
      const item = await prisma.item.findUnique({
        where: { id },
        include: { order: true },
      });
      if (!item) {
        res.status(404).json({ error: 'Item not found' });
        return;
      }
      if (!item.storedDate) {
        res.status(409).json({ error: 'Item must be stored before handover' });
        return;
      }
      if (item.requiresAssetTagging && !item.assetTaggingDate) {
        res.status(409).json({ error: 'Asset tagging must be completed before handover' });
        return;
      }
      if (item.requiresITConfig && !item.itConfigDate) {
        res.status(409).json({ error: 'IT configuration must be completed before handover' });
        return;
      }
      if (item.handoverDate) {
        res.status(409).json({ error: 'Item has already been handed over' });
        return;
      }

      const now = req.body.handoverDate ? new Date(req.body.handoverDate as string) : new Date();

      await prisma.item.update({ where: { id: item.id }, data: { handoverDate: now } });

      await recalcAndPersist(item.id, item.orderId);
      const refreshed = await prisma.item.findUnique({ where: { id: item.id } });

      await logAudit(prisma, {
        entityType: 'item',
        entityId: item.id,
        userId: req.user!.id,
        action: 'HANDOVER',
        fieldName: 'handoverDate',
        oldValue: null,
        newValue: now.toISOString(),
        itemId: item.id,
        orderId: item.orderId,
      });

      await triggerNotification(
        'HANDOVER_COMPLETE',
        {
          reference: item.order.reference,
          description: item.description,
          quantity: item.quantity,
          endUser: item.order.endUser,
          handoverDate: now.toLocaleDateString('en-AE'),
          orderId: item.orderId,
          itemId: item.id,
          relatedId: item.id,
        },
        prisma,
      );

      res.json(refreshed);
    } catch (err) {
      console.error('[Items] PUT /:id/handover error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ---------------------------------------------------------------------------
// PUT /api/items/:id  — general update (MUST be LAST among PUT routes)
// ---------------------------------------------------------------------------
router.put('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params['id']);
    const item = await prisma.item.findUnique({ where: { id } });
    if (!item) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }

    const userRole = req.user!.role;
    const isPrivileged = userRole === 'ADMIN' || userRole === 'PROCUREMENT' || userRole === 'VENDOR_MANAGEMENT';

    const allowedFields = [
      'description',
      'quantity',
      'quantityReceived',
      'itemCategory',
      'unitPrice',
      'totalPrice',
      'purchaseLink',
      'expectedDeliveryDate',
      'financeRemarks',
      'finalRemarks',
      'requiresAssetTagging',
      'requiresITConfig',
      'requisitionNumber',
      'lineNumber',
    ];

    // Admin / Procurement / Vendor Mgmt can set or clear any lifecycle date
    if (isPrivileged) {
      allowedFields.push(
        'receivedDate',
        'storedDate',
        'assetTaggingDate',
        'itConfigDate',
        'handoverDate',
      );
    }

    // customClearanceDate: Finance, Admin, Vendor Mgmt only
    if (req.body['customClearanceDate'] !== undefined) {
      if (!isPrivileged && userRole !== 'FINANCE') {
        res.status(403).json({ error: 'Only Finance, Admin or Vendor Management can update Custom Clearance date' });
        return;
      }
      allowedFields.push('customClearanceDate');
    }

    const allDateFields = new Set([
      'expectedDeliveryDate', 'receivedDate', 'storedDate',
      'assetTaggingDate', 'itConfigDate', 'handoverDate', 'customClearanceDate',
    ]);

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        const val = req.body[field];
        if (allDateFields.has(field)) {
          // Empty string or null = clear the date
          updateData[field] = val === '' || val === null ? null : new Date(val as string);
        } else {
          updateData[field] = val as unknown;
        }
      }
    }

    // If receivedDate is being cleared, also clear storedDate and quantityReceived
    if (updateData['receivedDate'] === null) {
      updateData['storedDate'] = null;
      updateData['quantityReceived'] = null;
    }

    // When quantityReceived is updated, also set receivedDate + storedDate if fully received
    if (updateData['quantityReceived'] !== undefined) {
      const qtyReceived = Number(updateData['quantityReceived']);
      const currentItem = await prisma.item.findUnique({ where: { id: item.id } });
      if (currentItem) {
        const totalQty = (updateData['quantity'] as number | undefined) ?? currentItem.quantity;
        if (qtyReceived >= totalQty && !currentItem.receivedDate) {
          const now = new Date();
          updateData['receivedDate'] = now;
          updateData['storedDate'] = now;
        }
      }
    }

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({ error: 'No valid fields provided for update' });
      return;
    }

    await prisma.item.update({ where: { id: item.id }, data: updateData });

    // Recalculate status
    await recalcAndPersist(item.id, item.orderId);
    const refreshed = await prisma.item.findUnique({ where: { id: item.id } });

    // Audit diffs
    await logAuditDiff(
      prisma,
      {
        entityType: 'item',
        entityId: item.id,
        userId: req.user!.id,
        action: 'UPDATE',
        itemId: item.id,
        orderId: item.orderId,
      },
      item as unknown as Record<string, unknown>,
      updateData,
    );

    res.json(refreshed);
  } catch (err) {
    console.error('[Items] PUT /:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
