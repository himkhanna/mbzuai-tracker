/**
 * Oracle PO Email Ingestion Service
 *
 * Connects to receiver@mbzuai.ac.ae via IMAP, polls for new emails
 * with Excel (.xlsx) attachments, parses the PO sheet (columns A–K),
 * and auto-creates Order + Items in the database.
 *
 * Polling interval is configurable via IMAP_POLL_INTERVAL (minutes).
 * A manual trigger is also available via POST /api/import/email-trigger.
 */

import * as XLSX from 'xlsx';
import prisma from '../config/prisma';
import { logAudit } from './auditService';
import { triggerNotification } from './notificationService';
import { calculateOrderStatus } from '../utils/statusCalculator';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface IngestResult {
  emailsProcessed: number;
  ordersCreated: number;
  itemsCreated: number;
  duplicatesSkipped: number;
  errors: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function toDate(val: unknown): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  const d = new Date(String(val));
  return isNaN(d.getTime()) ? null : d;
}

function toFloat(val: unknown): number | null {
  if (val == null || val === '') return null;
  const n = parseFloat(String(val));
  return isNaN(n) ? null : n;
}

function toInt(val: unknown, fallback = 1): number {
  if (val == null || val === '') return fallback;
  const n = parseInt(String(val), 10);
  return isNaN(n) ? fallback : n;
}

function toStr(val: unknown): string {
  return val == null ? '' : String(val).trim();
}

// ---------------------------------------------------------------------------
// Parse PO Excel buffer — columns A(0)–K(10)
// ---------------------------------------------------------------------------
function parsePOBuffer(buffer: Buffer): Map<string, unknown[][]> {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheetName = wb.SheetNames.find((n) => n.toUpperCase() === 'PO') ?? wb.SheetNames[0];
  if (!sheetName) throw new Error('No sheets found in attachment');

  const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName]!, {
    header: 1,
    defval: null,
    raw: false,
  }) as unknown[][];

  const dataRows = rows.slice(1).filter((r) => r.some((c) => c != null && c !== ''));

  const groups = new Map<string, unknown[][]>();
  for (const row of dataRows) {
    const poRef = toStr(row[0]);
    if (!poRef) continue;
    if (!groups.has(poRef)) groups.set(poRef, []);
    groups.get(poRef)!.push(row);
  }

  return groups;
}

// ---------------------------------------------------------------------------
// Ingest a parsed PO group map into the database
// ---------------------------------------------------------------------------
async function ingestPOGroups(
  groups: Map<string, unknown[][]>,
  triggeredByUserId: string | null,
  result: IngestResult,
): Promise<void> {
  for (const [poRef, poRows] of groups) {
    try {
      const existing = await prisma.order.findFirst({ where: { reference: poRef, isDeleted: false } });
      if (existing) {
        result.duplicatesSkipped++;
        result.errors.push(`PO ${poRef}: already exists — skipped`);
        continue;
      }

      const firstRow = poRows[0]!;
      const vendor = toStr(firstRow[1]) || 'Unknown Supplier';
      const currency = toStr(firstRow[7]) || 'AED';

      await prisma.$transaction(async (tx: any) => {
        const order = await tx.order.create({
          data: {
            type: 'PO',
            reference: poRef,
            vendor,
            endUser: '',        // Procurement fills manually after ingestion
            currency,
            orderDate: new Date(),
            status: 'PENDING',
          },
        });

        for (const row of poRows) {
          const goodType = toStr(row[8]).toUpperCase() === 'SERVICES' ? 'SERVICES' : 'GOODS';
          const quantity = toInt(row[4]);
          const unitPrice = toFloat(row[5]);
          const totalPrice = toFloat(row[6]) ?? (unitPrice != null ? unitPrice * quantity : null);
          const expectedDelivery = toDate(row[10]);
          const status = goodType === 'SERVICES' ? 'SERVICES_ONLY' : 'PENDING_DELIVERY';

          await tx.item.create({
            data: {
              orderId: order.id,
              lineNumber: toStr(row[2]) || null,
              description: toStr(row[3]) || 'No description',
              quantity,
              unitPrice,
              totalPrice,
              goodType,
              requisitionNumber: toStr(row[9]) || null,
              expectedDeliveryDate: expectedDelivery,
              requiresAssetTagging: false,
              requiresITConfig: false,
              status,
            },
          });
        }

        const items = await tx.item.findMany({ where: { orderId: order.id }, select: { status: true } });
        await tx.order.update({
          where: { id: order.id },
          data: { status: calculateOrderStatus(items) },
        });

        // Use system admin for audit when triggered by cron (no user session)
        const auditUserId = triggeredByUserId ?? await getSystemUserId();
        if (auditUserId) {
          await logAudit(prisma, {
            entityType: 'order',
            entityId: order.id,
            userId: auditUserId,
            action: 'EMAIL_IMPORT',
            orderId: order.id,
          });
        }

        await triggerNotification('ORDER_CREATED', {
          reference: order.reference,
          orderType: 'PO',
          vendor: order.vendor,
          endUser: 'Pending Assignment',
          itemCount: poRows.length,
          currency: order.currency,
          orderDate: order.orderDate.toLocaleDateString('en-AE'),
          orderId: order.id,
          relatedId: order.id,
        }, prisma);

        result.ordersCreated++;
        result.itemsCreated += poRows.length;
      });
    } catch (err) {
      result.errors.push(`PO ${poRef}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Get system admin user ID for audit logs (cron-triggered imports)
// ---------------------------------------------------------------------------
async function getSystemUserId(): Promise<string | null> {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', isActive: true } });
  return admin?.id ?? null;
}

// ---------------------------------------------------------------------------
// Main ingestion function — called by cron and manual trigger
// ---------------------------------------------------------------------------
export async function runEmailIngestion(triggeredByUserId: string | null = null): Promise<IngestResult> {
  const result: IngestResult = {
    emailsProcessed: 0,
    ordersCreated: 0,
    itemsCreated: 0,
    duplicatesSkipped: 0,
    errors: [],
  };

  const imapHost = process.env.IMAP_HOST;
  const imapUser = process.env.IMAP_USER;
  const imapPass = process.env.IMAP_PASS;
  const imapPort = parseInt(process.env.IMAP_PORT || '993', 10);
  const imapSecure = process.env.IMAP_SECURE !== 'false'; // default true

  if (!imapHost || !imapUser || !imapPass) {
    throw new Error('IMAP not configured. Set IMAP_HOST, IMAP_USER, IMAP_PASS in .env');
  }

  // Dynamically import imapflow to avoid startup errors if not installed
  let ImapFlow: any;
  try {
    ImapFlow = (await import('imapflow')).ImapFlow;
  } catch {
    throw new Error('imapflow package not installed. Run: npm install imapflow');
  }

  const client = new ImapFlow({
    host: imapHost,
    port: imapPort,
    secure: imapSecure,
    auth: { user: imapUser, pass: imapPass },
    logger: false,
  });

  await client.connect();

  try {
    const lock = await client.getMailboxLock('INBOX');
    try {
      // Search for unseen messages with attachments
      const messages = client.fetch('1:*', {
        uid: true,
        flags: true,
        envelope: true,
        bodyStructure: true,
        source: true,
      });

      for await (const msg of messages) {
        // Skip already-seen messages
        if (msg.flags?.has('\\Seen')) continue;

        try {
          // Look for .xlsx attachment in body structure
          const xlsxPart = findXlsxPart(msg.bodyStructure);
          if (!xlsxPart) continue;

          // Download the attachment part
          const partData = await client.download(String(msg.seq), xlsxPart.part);
          if (!partData?.content) continue;

          const chunks: Buffer[] = [];
          for await (const chunk of partData.content) {
            chunks.push(chunk);
          }
          const buffer = Buffer.concat(chunks);

          // Parse and ingest
          const groups = parsePOBuffer(buffer);
          await ingestPOGroups(groups, triggeredByUserId, result);

          // Mark email as read
          await client.messageFlagsAdd({ seq: msg.seq }, ['\\Seen']);
          result.emailsProcessed++;
        } catch (msgErr) {
          result.errors.push(`Email uid ${msg.uid}: ${msgErr instanceof Error ? msgErr.message : String(msgErr)}`);
        }
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }

  console.log(`[EmailIngestion] Done — emails: ${result.emailsProcessed}, orders: ${result.ordersCreated}, items: ${result.itemsCreated}`);
  return result;
}

// ---------------------------------------------------------------------------
// Recursively find first .xlsx part in IMAP body structure
// ---------------------------------------------------------------------------
function findXlsxPart(structure: any, partNum = '1'): { part: string } | null {
  if (!structure) return null;

  const dispositionType = structure.disposition?.type?.toLowerCase() ?? '';
  const mimeType = `${structure.type ?? ''}/${structure.subtype ?? ''}`.toLowerCase();
  const filename = (structure.disposition?.parameters?.filename ?? structure.parameters?.name ?? '').toLowerCase();

  const isXlsx =
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimeType === 'application/octet-stream' ||
    filename.endsWith('.xlsx');

  if (isXlsx && (dispositionType === 'attachment' || filename.endsWith('.xlsx'))) {
    return { part: partNum };
  }

  if (Array.isArray(structure.childNodes)) {
    for (let i = 0; i < structure.childNodes.length; i++) {
      const child = structure.childNodes[i];
      const childPart = structure.childNodes.length === 1 ? partNum : `${partNum}.${i + 1}`;
      const found = findXlsxPart(child, childPart);
      if (found) return found;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Setup cron polling for email ingestion
// ---------------------------------------------------------------------------
export function setupEmailIngestionCron(): void {
  if (process.env.ENABLE_EMAIL_INGESTION !== 'true') {
    console.log('[EmailIngestion] Disabled (ENABLE_EMAIL_INGESTION != true)');
    return;
  }

  const intervalMinutes = parseInt(process.env.IMAP_POLL_INTERVAL || '10', 10);
  const cronExpression = `*/${intervalMinutes} * * * *`;

  // Import cron dynamically to avoid circular deps
  import('node-cron').then(({ default: cron }) => {
    cron.schedule(cronExpression, async () => {
      console.log(`[EmailIngestion] Polling mailbox ${process.env.IMAP_USER}...`);
      try {
        const result = await runEmailIngestion(null);
        if (result.ordersCreated > 0) {
          console.log(`[EmailIngestion] Created ${result.ordersCreated} new PO(s) from email`);
        }
      } catch (err) {
        console.error('[EmailIngestion] Poll error:', err instanceof Error ? err.message : err);
      }
    });
    console.log(`[EmailIngestion] Cron polling every ${intervalMinutes} min`);
  });
}
