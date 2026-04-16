import { Router, Request, Response } from 'express';
import type { ItemStatus, OrderType } from '../types/enums';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { exportToExcel, exportToPDF, TrackerRow } from '../services/exportService';
import prisma from '../config/prisma';

const router = Router();

const CAN_EXPORT = requireRole('ADMIN', 'VENDOR_MANAGEMENT', 'PROCUREMENT');

// ---------------------------------------------------------------------------
// Shared filter builder
// ---------------------------------------------------------------------------
function buildOrderWhere(query: Record<string, string>) {
  const { type, status, vendor, search, dateFrom, dateTo } = query;
  const where: Record<string, unknown> = { isDeleted: false };

  if (type && (type === 'PO' || type === 'DP')) {
    where['type'] = type as OrderType;
  }
  if (status) {
    const statuses = status.split(',').map((s) => s.trim());
    where['status'] = { in: statuses };
  }
  if (vendor) {
    where['vendor'] = { contains: vendor };
  }
  if (search) {
    where['OR'] = [
      { reference: { contains: search } },
      { vendor: { contains: search } },
      { endUser: { contains: search } },
    ];
  }
  if (dateFrom || dateTo) {
    const dateFilter: Record<string, Date> = {};
    if (dateFrom) dateFilter['gte'] = new Date(dateFrom);
    if (dateTo) dateFilter['lte'] = new Date(dateTo);
    where['orderDate'] = dateFilter;
  }

  return where;
}

// ---------------------------------------------------------------------------
// Build flat tracker rows from orders+items
// ---------------------------------------------------------------------------
function buildTrackerRows(
  orders: Array<{
    reference: string;
    type: string;
    vendor: string;
    endUser: string;
    department?: string | null;
    items: Array<{
      description: string;
      quantity: number;
      expectedDeliveryDate?: Date | null;
      receivedDate?: Date | null;
      status: string;
    }>;
  }>,
): TrackerRow[] {
  const rows: TrackerRow[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const order of orders) {
    for (const item of order.items) {
      const planned = item.expectedDeliveryDate
        ? item.expectedDeliveryDate.toLocaleDateString('en-AE')
        : null;
      const actual = item.receivedDate
        ? item.receivedDate.toLocaleDateString('en-AE')
        : null;

      let daysDelayed: number | undefined;
      if (item.status === 'DELAYED' && item.expectedDeliveryDate) {
        const expected = new Date(item.expectedDeliveryDate);
        expected.setHours(0, 0, 0, 0);
        daysDelayed = Math.max(0, Math.floor((today.getTime() - expected.getTime()) / 86400000));
      }

      rows.push({
        reference: order.reference,
        type: order.type,
        vendor: order.vendor,
        description: item.description,
        quantity: item.quantity,
        endUser: order.endUser,
        department: order.department ?? undefined,
        plannedDelivery: planned,
        actualDelivery: actual,
        currentStatus: item.status,
        daysDelayed,
      });
    }
  }

  return rows;
}

// ---------------------------------------------------------------------------
// GET /api/reports/summary  — KPI counts (all roles)
// ---------------------------------------------------------------------------
router.get('/summary', authenticate, async (_req: Request, res: Response): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalOrders,
      pendingDelivery,
      overdueItems,
      pendingAssetTagging,
      pendingITConfig,
      completed,
      allOrders,
      overdueItemsList,
    ] = await Promise.all([
      prisma.order.count({ where: { isDeleted: false } }),
      prisma.item.count({ where: { status: 'PENDING_DELIVERY' } }),
      prisma.item.count({ where: { status: 'DELAYED' } }),
      prisma.item.count({ where: { status: 'PENDING_ASSET_TAGGING' } }),
      prisma.item.count({ where: { status: 'PENDING_IT_CONFIG' } }),
      prisma.order.count({ where: { isDeleted: false, status: 'COMPLETED' } }),
      prisma.order.findMany({
        where: { isDeleted: false },
        select: { status: true, type: true },
      }),
      prisma.item.findMany({
        where: { status: 'DELAYED' },
        include: { order: { select: { reference: true, vendor: true } } },
        take: 20,
      }),
    ]);

    // Build byStatus counts for chart
    const statusCounts: Record<string, number> = {};
    for (const o of allOrders) {
      statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
    }
    const byStatus = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));

    // PO vs DP split
    const poCount = allOrders.filter((o) => o.type === 'PO').length;
    const dpCount = allOrders.filter((o) => o.type === 'DP').length;

    // Overdue list
    const overdueList = overdueItemsList.map((item) => {
      const expected = new Date(item.expectedDeliveryDate!);
      expected.setHours(0, 0, 0, 0);
      const daysOverdue = Math.max(0, Math.floor((today.getTime() - expected.getTime()) / 86400000));
      return {
        itemId: item.id,
        orderId: item.orderId,
        reference: item.order.reference,
        vendor: item.order.vendor,
        description: item.description,
        expectedDeliveryDate: item.expectedDeliveryDate!.toISOString(),
        daysOverdue,
      };
    });

    res.json({
      totalOrders,
      pendingDelivery,
      overdueItems,
      pendingAssetTagging,
      pendingITConfig,
      completed,
      byStatus,
      poCount,
      dpCount,
      overdueList,
    });
  } catch (err) {
    console.error('[Reports] GET /summary error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/reports/tracker  — full tracker data (filterable)
// ---------------------------------------------------------------------------
router.get('/tracker', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const where = buildOrderWhere(req.query as Record<string, string>);

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: {
          select: {
            id: true,
            description: true,
            quantity: true,
            expectedDeliveryDate: true,
            receivedDate: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const rows = buildTrackerRows(orders);
    res.json(rows);
  } catch (err) {
    console.error('[Reports] GET /tracker error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/reports/export/excel
// ---------------------------------------------------------------------------
router.get('/export/excel', authenticate, CAN_EXPORT, async (req: Request, res: Response): Promise<void> => {
  try {
    const where = buildOrderWhere(req.query as Record<string, string>);

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: {
          select: {
            description: true,
            quantity: true,
            expectedDeliveryDate: true,
            receivedDate: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const rows = buildTrackerRows(orders);
    const buffer = exportToExcel(rows);

    const filename = `mbzuai-tracker-${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    console.error('[Reports] GET /export/excel error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/reports/export/pdf
// ---------------------------------------------------------------------------
router.get('/export/pdf', authenticate, CAN_EXPORT, async (req: Request, res: Response): Promise<void> => {
  try {
    const where = buildOrderWhere(req.query as Record<string, string>);

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: {
          select: {
            description: true,
            quantity: true,
            expectedDeliveryDate: true,
            receivedDate: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const rows = buildTrackerRows(orders);
    const buffer = await exportToPDF(rows);

    const filename = `mbzuai-tracker-${new Date().toISOString().slice(0, 10)}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    console.error('[Reports] GET /export/pdf error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
