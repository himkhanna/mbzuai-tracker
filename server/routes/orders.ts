import { Router, Request, Response } from 'express';
import type { OrderType, ItemStatus } from '../types/enums';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { logAudit, logAuditDiff } from '../services/auditService';
import { triggerNotification } from '../services/notificationService';
import { calculateItemStatus, calculateOrderStatus } from '../utils/statusCalculator';
import prisma from '../config/prisma';

const router = Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const CAN_WRITE = ['ADMIN', 'VENDOR_MANAGEMENT', 'PROCUREMENT'];

// ---------------------------------------------------------------------------
// GET /api/orders
// ---------------------------------------------------------------------------
router.get('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, status, vendor, search, dateFrom, dateTo, page, limit } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page || '1', 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit || '50', 10)));
    const skip = (pageNum - 1) * limitNum;

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
        { supplier: { contains: search } },
      ];
    }
    if (dateFrom || dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (dateFrom) dateFilter['gte'] = new Date(dateFrom);
      if (dateTo) dateFilter['lte'] = new Date(dateTo);
      where['orderDate'] = dateFilter;
    }

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        include: {
          items: {
            select: {
              id: true,
              status: true,
              expectedDeliveryDate: true,
              receivedDate: true,
              description: true,
              quantity: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
    ]);

    res.json({
      data: orders,
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    console.error('[Orders] GET / error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/orders
// ---------------------------------------------------------------------------
router.post(
  '/',
  authenticate,
  requireRole(...CAN_WRITE),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        type,
        reference,
        vendor,
        supplier,
        deliveryAddress,
        endUser,
        department,
        orderDate,
        totalValue,
        currency,
        notes,
        vendorPlatform,
        vendorOrderId,
        items: itemsInput,
      } = req.body as {
        type: string;
        reference: string;
        vendor: string;
        supplier?: string;
        deliveryAddress?: string;
        endUser: string;
        department?: string;
        orderDate: string;
        totalValue?: number;
        currency?: string;
        notes?: string;
        vendorPlatform?: string;
        vendorOrderId?: string;
        items?: Array<{
          description: string;
          quantity: number;
          itemCategory?: string;
          unitPrice?: number;
          totalPrice?: number;
          purchaseLink?: string;
          expectedDeliveryDate?: string;
          requiresAssetTagging?: boolean;
          requiresITConfig?: boolean;
          financeRemarks?: string;
          finalRemarks?: string;
        }>;
      };

      if (!type || !reference || !vendor || !endUser || !orderDate) {
        res.status(400).json({ error: 'type, reference, vendor, endUser, and orderDate are required' });
        return;
      }

      const order = await prisma.$transaction(async (tx: any) => {
        const created = await tx.order.create({
          data: {
            type: type as OrderType,
            reference,
            vendor,
            supplier: supplier ?? null,
            deliveryAddress: deliveryAddress ?? null,
            endUser,
            department: department ?? null,
            orderDate: new Date(orderDate),
            totalValue: totalValue ?? null,
            currency: currency || 'AED',
            notes: notes ?? null,
            vendorPlatform: vendorPlatform ?? null,
            vendorOrderId: vendorOrderId ?? null,
            items: itemsInput && itemsInput.length > 0
              ? {
                  create: itemsInput.map((item) => ({
                    description: item.description,
                    quantity: item.quantity,
                    itemCategory: item.itemCategory ?? null,
                    unitPrice: item.unitPrice ?? null,
                    totalPrice: item.totalPrice ?? null,
                    purchaseLink: item.purchaseLink ?? null,
                    expectedDeliveryDate: item.expectedDeliveryDate
                      ? new Date(item.expectedDeliveryDate)
                      : null,
                    requiresAssetTagging: item.requiresAssetTagging ?? false,
                    requiresITConfig: item.requiresITConfig ?? false,
                    financeRemarks: item.financeRemarks ?? null,
                    finalRemarks: item.finalRemarks ?? null,
                    status: 'PENDING_DELIVERY',
                  })),
                }
              : undefined,
          },
          include: { items: true },
        });
        return created;
      });

      // Audit
      await logAudit(prisma, {
        entityType: 'order',
        entityId: order.id,
        userId: req.user!.id,
        action: 'CREATE',
        orderId: order.id,
      });

      // Notification
      await triggerNotification(
        'ORDER_CREATED',
        {
          reference: order.reference,
          orderType: order.type,
          vendor: order.vendor,
          endUser: order.endUser,
          department: order.department ?? undefined,
          itemCount: order.items.length,
          totalValue: order.totalValue ?? undefined,
          currency: order.currency,
          orderDate: order.orderDate.toLocaleDateString('en-AE'),
          orderId: order.id,
          relatedId: order.id,
        },
        prisma,
      );

      res.status(201).json(order);
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        'code' in err &&
        (err as { code: string }).code === 'P2002'
      ) {
        res.status(409).json({ error: 'Order reference already exists' });
        return;
      }
      console.error('[Orders] POST / error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ---------------------------------------------------------------------------
// GET /api/orders/:id
// ---------------------------------------------------------------------------
router.get('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: String(req.params['id']), isDeleted: false },
      include: {
        items: true,
        auditLogs: {
          include: { user: { select: { id: true, name: true, email: true, role: true } } },
          orderBy: { timestamp: 'desc' },
          take: 100,
        },
      },
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    res.json(order);
  } catch (err) {
    console.error('[Orders] GET /:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/orders/:id
// ---------------------------------------------------------------------------
router.put(
  '/:id',
  authenticate,
  requireRole(...CAN_WRITE),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const existing = await prisma.order.findFirst({
        where: { id: String(req.params['id']), isDeleted: false },
      });
      if (!existing) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }

      const {
        vendor,
        supplier,
        deliveryAddress,
        endUser,
        department,
        orderDate,
        totalValue,
        currency,
        notes,
      } = req.body as Partial<{
        vendor: string;
        supplier: string;
        deliveryAddress: string;
        endUser: string;
        department: string;
        orderDate: string;
        totalValue: number;
        currency: string;
        notes: string;
      }>;

      const updateData: Record<string, unknown> = {};
      if (vendor !== undefined) updateData['vendor'] = vendor;
      if (supplier !== undefined) updateData['supplier'] = supplier;
      if (deliveryAddress !== undefined) updateData['deliveryAddress'] = deliveryAddress;
      if (endUser !== undefined) updateData['endUser'] = endUser;
      if (department !== undefined) updateData['department'] = department;
      if (orderDate !== undefined) updateData['orderDate'] = new Date(orderDate);
      if (totalValue !== undefined) updateData['totalValue'] = totalValue;
      if (currency !== undefined) updateData['currency'] = currency;
      if (notes !== undefined) updateData['notes'] = notes;

      const updated = await prisma.order.update({
        where: { id: String(req.params['id']) },
        data: updateData,
        include: { items: true },
      });

      // Audit diffs
      await logAuditDiff(
        prisma,
        { entityType: 'order', entityId: existing.id, userId: req.user!.id, action: 'UPDATE', orderId: existing.id },
        existing as unknown as Record<string, unknown>,
        updateData,
      );

      res.json(updated);
    } catch (err) {
      console.error('[Orders] PUT /:id error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ---------------------------------------------------------------------------
// DELETE /api/orders/:id  (soft delete)
// ---------------------------------------------------------------------------
router.delete(
  '/:id',
  authenticate,
  requireRole('ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const existing = await prisma.order.findFirst({
        where: { id: String(req.params['id']), isDeleted: false },
      });
      if (!existing) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }

      await prisma.order.update({ where: { id: String(req.params['id']) }, data: { isDeleted: true } });

      await logAudit(prisma, {
        entityType: 'order',
        entityId: existing.id,
        userId: req.user!.id,
        action: 'DELETE',
        orderId: existing.id,
      });

      res.json({ message: 'Order deleted successfully' });
    } catch (err) {
      console.error('[Orders] DELETE /:id error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ---------------------------------------------------------------------------
// GET /api/orders/template  — download blank Excel import template
// ---------------------------------------------------------------------------
router.get(
  '/template',
  authenticate,
  requireRole(...CAN_WRITE),
  (_req: Request, res: Response): void => {
    const headers = [
      'PO/DP Reference',
      'Type',
      'Vendor',
      'End User',
      'Department',
      'Order Date',
      'Currency',
      'Total Value',
      'Notes',
      'Item Description',
      'Category',
      'Quantity',
      'Unit Price',
      'Expected Delivery',
      'Purchase Link',
      'Asset Tagging',
      'IT Config',
    ];

    const exampleRow = [
      'PO-2024-001', 'PO', 'Amazon', 'Prof. John Doe', 'Computer Science',
      '2024-01-15', 'AED', '5000', 'Sample order notes',
      'Dell XPS 15 Laptop', 'Electronics', '2', '2500',
      '2024-02-01', 'https://amazon.com/example', 'Yes', 'Yes',
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow]);

    // Column widths
    ws['!cols'] = headers.map((h) => ({ wch: Math.max(h.length + 4, 16) }));

    // Header row style (bold)
    headers.forEach((_, i) => {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: i });
      if (!ws[cellRef]) return;
      ws[cellRef].s = { font: { bold: true }, fill: { fgColor: { rgb: 'DBEAFE' } } };
    });

    XLSX.utils.book_append_sheet(wb, ws, 'Import Template');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="mbzuai-import-template.xlsx"');
    res.send(buffer);
  },
);

// ---------------------------------------------------------------------------
// POST /api/orders/import  (Excel bulk import)
// ---------------------------------------------------------------------------
router.post(
  '/import',
  authenticate,
  requireRole(...CAN_WRITE),
  upload.single('file'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        res.status(400).json({ error: 'Excel file has no sheets' });
        return;
      }

      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });

      if (rows.length === 0) {
        res.status(400).json({ error: 'Excel file is empty' });
        return;
      }

      const results: { success: number; errors: string[] } = { success: 0, errors: [] };

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2; // accounting for header row

        try {
          const reference = String(row['PO/DP Reference'] || row['Reference'] || '').trim();
          const typeRaw = String(row['Type'] || '').trim().toUpperCase();
          const vendor = String(row['Vendor'] || '').trim();
          const endUser = String(row['End User'] || '').trim();
          const orderDateRaw = row['Order Date'];
          const description = String(row['Item Description'] || row['Description'] || '').trim();
          const quantity = parseInt(String(row['Quantity'] || row['Qty'] || '1'), 10);

          if (!reference || !vendor || !endUser || !description) {
            results.errors.push(`Row ${rowNum}: Missing required fields (Reference, Vendor, End User, Description)`);
            continue;
          }

          const orderType: OrderType = typeRaw === 'DP' ? 'DP' : 'PO';
          const orderDate = orderDateRaw
            ? orderDateRaw instanceof Date
              ? orderDateRaw
              : new Date(String(orderDateRaw))
            : new Date();

          const expectedDeliveryRaw = row['Expected Delivery'] || row['Planned Delivery'];
          const expectedDeliveryDate = expectedDeliveryRaw
            ? expectedDeliveryRaw instanceof Date
              ? expectedDeliveryRaw
              : new Date(String(expectedDeliveryRaw))
            : null;

          // Upsert order + add item in transaction
          await prisma.$transaction(async (tx: any) => {
            let order = await tx.order.findFirst({ where: { reference, isDeleted: false } });

            if (!order) {
              order = await tx.order.create({
                data: {
                  type: orderType,
                  reference,
                  vendor,
                  endUser,
                  department: String(row['Department'] || '').trim() || null,
                  orderDate,
                  currency: String(row['Currency'] || 'AED').trim(),
                  totalValue: row['Total Value'] ? parseFloat(String(row['Total Value'])) : null,
                  notes: String(row['Notes'] || '').trim() || null,
                },
              });
            }

            await tx.item.create({
              data: {
                orderId: order.id,
                description,
                quantity: isNaN(quantity) ? 1 : quantity,
                itemCategory: String(row['Category'] || '').trim() || null,
                unitPrice: row['Unit Price'] ? parseFloat(String(row['Unit Price'])) : null,
                totalPrice: row['Total Price'] ? parseFloat(String(row['Total Price'])) : null,
                purchaseLink: String(row['Purchase Link'] || '').trim() || null,
                expectedDeliveryDate,
                requiresAssetTagging: String(row['Asset Tagging'] || '').toLowerCase() === 'yes',
                requiresITConfig: String(row['IT Config'] || '').toLowerCase() === 'yes',
                status: 'PENDING_DELIVERY',
              },
            });
          });

          results.success++;
        } catch (rowErr) {
          results.errors.push(`Row ${rowNum}: ${rowErr instanceof Error ? rowErr.message : String(rowErr)}`);
        }
      }

      res.json({
        message: `Import complete. ${results.success} item(s) imported.`,
        ...results,
      });
    } catch (err) {
      console.error('[Orders] POST /import error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ---------------------------------------------------------------------------
// Helper: recalculate and persist order status from its items
// ---------------------------------------------------------------------------
export async function syncOrderStatus(orderId: string): Promise<void> {
  const items = await prisma.item.findMany({
    where: { orderId },
    select: { status: true },
  });
  const newOrderStatus = calculateOrderStatus(items);
  await prisma.order.update({ where: { id: orderId }, data: { status: newOrderStatus } });
}

export default router;
