import { Router, Request, Response } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { logAudit } from '../services/auditService';
import { triggerNotification } from '../services/notificationService';
import { calculateItemStatus, calculateOrderStatus } from '../utils/statusCalculator';
import { runEmailIngestion } from '../services/emailIngestionService';
import prisma from '../config/prisma';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
const CAN_IMPORT = ['ADMIN', 'VENDOR_MANAGEMENT', 'PROCUREMENT'];

// ---------------------------------------------------------------------------
// Helper: parse a cell value to Date or null
// ---------------------------------------------------------------------------
function toDate(val: unknown): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  const d = new Date(String(val));
  return isNaN(d.getTime()) ? null : d;
}

function toFloat(val: unknown): number | null {
  if (val == null || val === '') return null;
  // Strip thousand separators (e.g. "4,800.00" → "4800.00")
  const n = parseFloat(String(val).replace(/,/g, ''));
  return isNaN(n) ? null : n;
}

function toInt(val: unknown, fallback = 1): number {
  if (val == null || val === '') return fallback;
  const n = parseInt(String(val), 10);
  return isNaN(n) ? fallback : n;
}

function toString(val: unknown): string {
  return val == null ? '' : String(val).trim();
}

// ---------------------------------------------------------------------------
// GET /api/import/template/po  — download PO template matching Tracker.xlsx
// ---------------------------------------------------------------------------
router.get(
  '/template/po',
  authenticate,
  requireRole(...CAN_IMPORT),
  (_req: Request, res: Response): void => {
    const headers = [
      'PO',           // A
      'Supplier',     // B
      'Line',         // C
      'Item',         // D
      'Quantity',     // E
      'Unit Price',   // F
      'Amount',       // G
      'Currency',     // H
      'Good',         // I  (Goods / Services)
      'Requisition',  // J
      'Promissed date', // K
    ];

    const example = ['0001', 'Supplier Name', 'Line 1', 'Item Description', '2', '1500', '3000', 'AED', 'Goods', 'PR0001', '2026-05-15'];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, example]);
    ws['!cols'] = headers.map(() => ({ wch: 20 }));
    XLSX.utils.book_append_sheet(wb, ws, 'PO');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="PO-import-template.xlsx"');
    res.send(buf);
  },
);

// ---------------------------------------------------------------------------
// GET /api/import/template/dp  — download DP template matching Tracker.xlsx
// ---------------------------------------------------------------------------
router.get(
  '/template/dp',
  authenticate,
  requireRole(...CAN_IMPORT),
  (_req: Request, res: Response): void => {
    const headers = [
      ' DP ',           // A
      'OWNER',          // B
      'Delivery Adress',// C
      'Supplier',       // D
      'Item Specification', // E
      'Quantity',       // F
      'Currency',       // G
      'Unit Price',     // H
      'Total Price',    // I
      'Order Date',     // J
      'Promissed Date', // K
    ];

    const example = [1001, 'End User Name', 'Building A', 'Amazon', 'Item Description', '4', 'AED', '500', '2000', '2026-04-13', '2026-05-15'];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, example]);
    ws['!cols'] = headers.map(() => ({ wch: 20 }));
    XLSX.utils.book_append_sheet(wb, ws, 'DP');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="DP-import-template.xlsx"');
    res.send(buf);
  },
);

// ---------------------------------------------------------------------------
// POST /api/import/po  — upload PO Excel (columns A-K auto-populated)
// ---------------------------------------------------------------------------
router.post(
  '/po',
  authenticate,
  requireRole(...CAN_IMPORT),
  upload.single('file'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      const wb = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });

      // Accept sheet named "PO" or first sheet
      const sheetName = wb.SheetNames.find((n) => n.toUpperCase() === 'PO') ?? wb.SheetNames[0];
      if (!sheetName) {
        res.status(400).json({ error: 'No sheets found in uploaded file' });
        return;
      }

      const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName]!, {
        header: 1,
        defval: null,
        raw: false,
      }) as unknown[][];

      if (rows.length < 2) {
        res.status(400).json({ error: 'File has no data rows' });
        return;
      }

      // Skip header row (row 0)
      const dataRows = rows.slice(1).filter((r) => r.some((c) => c != null && c !== ''));

      const results = { ordersCreated: 0, itemsCreated: 0, duplicatesSkipped: 0, errors: [] as string[] };

      // Group rows by PO number (col A)
      const groups = new Map<string, unknown[][]>();
      for (const row of dataRows) {
        const poRef = toString(row[0]);
        if (!poRef) continue;
        if (!groups.has(poRef)) groups.set(poRef, []);
        groups.get(poRef)!.push(row);
      }

      for (const [poRef, poRows] of groups) {
        try {
          // Check for duplicate
          const existing = await prisma.order.findFirst({ where: { reference: poRef, isDeleted: false } });
          if (existing) {
            results.duplicatesSkipped++;
            results.errors.push(`PO ${poRef}: already exists — skipped`);
            continue;
          }

          const firstRow = poRows[0]!;
          // Col B: Supplier, Col H: Currency
          const vendor = toString(firstRow[1]) || 'Unknown Supplier';
          const currency = toString(firstRow[7]) || 'AED';

          await prisma.$transaction(async (tx: any) => {
            const order = await tx.order.create({
              data: {
                type: 'PO',
                reference: poRef,
                vendor,
                endUser: '',       // Procurement fills manually post-import
                currency,
                orderDate: new Date(),
                status: 'PENDING',
              },
            });

            for (const row of poRows) {
              const goodType = toString(row[8]).toUpperCase() === 'SERVICES' ? 'SERVICES' : 'GOODS';
              const expectedDelivery = toDate(row[10]);

              // Re-parse amounts since raw:false may give strings
              const quantity = toInt(row[4]);
              const unitPrice = toFloat(row[5]);
              const totalPrice = toFloat(row[6]) ?? (unitPrice != null ? unitPrice * quantity : null);

              const status = goodType === 'SERVICES' ? 'SERVICES_ONLY' : 'PENDING_DELIVERY';

              await tx.item.create({
                data: {
                  orderId: order.id,
                  lineNumber: toString(row[2]) || null,
                  description: toString(row[3]) || 'No description',
                  quantity,
                  unitPrice,
                  totalPrice,
                  goodType,
                  requisitionNumber: toString(row[9]) || null,
                  expectedDeliveryDate: expectedDelivery,
                  requiresAssetTagging: false,
                  requiresITConfig: false,
                  status,
                },
              });
            }

            await logAudit(prisma, {
              entityType: 'order',
              entityId: order.id,
              userId: req.user!.id,
              action: 'IMPORT',
              orderId: order.id,
            });

            await triggerNotification('ORDER_CREATED', {
              reference: order.reference,
              orderType: 'PO',
              vendor: order.vendor,
              endUser: order.endUser,
              itemCount: poRows.length,
              currency: order.currency,
              orderDate: order.orderDate.toLocaleDateString('en-AE'),
              orderId: order.id,
              relatedId: order.id,
            }, prisma);

            results.ordersCreated++;
            results.itemsCreated += poRows.length;
          });
        } catch (err) {
          results.errors.push(`PO ${poRef}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      res.json({
        message: `PO import complete. ${results.ordersCreated} order(s), ${results.itemsCreated} item(s) imported.`,
        ...results,
      });
    } catch (err) {
      console.error('[Import] POST /po error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ---------------------------------------------------------------------------
// POST /api/import/dp  — upload DP Excel (columns A-K)
// ---------------------------------------------------------------------------
router.post(
  '/dp',
  authenticate,
  requireRole(...CAN_IMPORT),
  upload.single('file'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      const wb = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });

      const sheetName = wb.SheetNames.find((n) => n.toUpperCase() === 'DP') ?? wb.SheetNames[0];
      if (!sheetName) {
        res.status(400).json({ error: 'No sheets found in uploaded file' });
        return;
      }

      const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName]!, {
        header: 1,
        defval: null,
        raw: false,
      }) as unknown[][];

      if (rows.length < 2) {
        res.status(400).json({ error: 'File has no data rows' });
        return;
      }

      const dataRows = rows.slice(1).filter((r) => r.some((c) => c != null && c !== ''));
      const results = { ordersCreated: 0, itemsCreated: 0, duplicatesSkipped: 0, errors: [] as string[] };

      // Group by DP number (col A)
      const groups = new Map<string, unknown[][]>();
      for (const row of dataRows) {
        const dpRef = toString(row[0]);
        if (!dpRef) continue;
        if (!groups.has(dpRef)) groups.set(dpRef, []);
        groups.get(dpRef)!.push(row);
      }

      for (const [dpRef, dpRows] of groups) {
        try {
          const existing = await prisma.order.findFirst({ where: { reference: dpRef, isDeleted: false } });
          if (existing) {
            results.duplicatesSkipped++;
            results.errors.push(`DP ${dpRef}: already exists — skipped`);
            continue;
          }

          const firstRow = dpRows[0]!;
          // A: DP ref, B: Owner/endUser, C: delivery address, D: supplier, G: currency, J: order date
          const endUser = toString(firstRow[1]) || '';
          const deliveryAddress = toString(firstRow[2]) || null;
          const vendor = toString(firstRow[3]) || 'Unknown Supplier';
          const currency = toString(firstRow[6]) || 'AED';
          const orderDate = toDate(firstRow[9]) ?? new Date();

          await prisma.$transaction(async (tx: any) => {
            const order = await tx.order.create({
              data: {
                type: 'DP',
                reference: dpRef,
                vendor,
                endUser,
                deliveryAddress,
                currency,
                orderDate,
                status: 'PENDING',
              },
            });

            for (const row of dpRows) {
              // E: description, F: quantity, H: unit price, I: total price, K: promised date
              const quantity = toInt(row[5]);
              const unitPrice = toFloat(row[7]);
              const totalPrice = toFloat(row[8]) ?? (unitPrice != null ? unitPrice * quantity : null);
              const expectedDelivery = toDate(row[10]);

              await tx.item.create({
                data: {
                  orderId: order.id,
                  description: toString(row[4]) || 'No description',
                  quantity,
                  unitPrice,
                  totalPrice,
                  goodType: 'GOODS',
                  expectedDeliveryDate: expectedDelivery,
                  requiresAssetTagging: false,
                  requiresITConfig: false,
                  status: 'PENDING_DELIVERY',
                },
              });
            }

            // Sync order status after items created
            const items = await tx.item.findMany({ where: { orderId: order.id }, select: { status: true } });
            const orderStatus = calculateOrderStatus(items);
            await tx.order.update({ where: { id: order.id }, data: { status: orderStatus } });

            await logAudit(prisma, {
              entityType: 'order',
              entityId: order.id,
              userId: req.user!.id,
              action: 'IMPORT',
              orderId: order.id,
            });

            await triggerNotification('ORDER_CREATED', {
              reference: order.reference,
              orderType: 'DP',
              vendor: order.vendor,
              endUser: order.endUser,
              itemCount: dpRows.length,
              currency: order.currency,
              orderDate: order.orderDate.toLocaleDateString('en-AE'),
              orderId: order.id,
              relatedId: order.id,
            }, prisma);

            results.ordersCreated++;
            results.itemsCreated += dpRows.length;
          });
        } catch (err) {
          results.errors.push(`DP ${dpRef}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      res.json({
        message: `DP import complete. ${results.ordersCreated} order(s), ${results.itemsCreated} item(s) imported.`,
        ...results,
      });
    } catch (err) {
      console.error('[Import] POST /dp error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ---------------------------------------------------------------------------
// POST /api/import/email-trigger  — manual trigger for Oracle email ingestion
// Fallback for when the cron is not running or needs immediate execution
// ---------------------------------------------------------------------------
router.post(
  '/email-trigger',
  authenticate,
  requireRole('ADMIN', 'VENDOR_MANAGEMENT', 'PROCUREMENT'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await runEmailIngestion(req.user!.id);
      res.json({
        message: `Email ingestion complete. ${result.ordersCreated} PO(s) created from ${result.emailsProcessed} email(s).`,
        ...result,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[Import] email-trigger error:', msg);
      res.status(500).json({ error: msg });
    }
  },
);

export default router;
