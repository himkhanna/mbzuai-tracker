import type { PrismaClient } from '@prisma/client';

export interface AuditLogInput {
  entityType: 'order' | 'item' | 'user';
  entityId: string;
  userId: string;
  action: string;
  fieldName?: string;
  oldValue?: string | null;
  newValue?: string | null;
  /** Optional: direct order FK for AuditLog.order relation */
  orderId?: string;
  /** Optional: direct item FK for AuditLog.item relation */
  itemId?: string;
}

/**
 * Writes a single audit log entry to the database.
 * Never throws — errors are caught and logged to console.
 */
export async function logAudit(
  prisma: PrismaClient,
  input: AuditLogInput,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        entityType: input.entityType,
        entityId: input.entityId,
        userId: input.userId,
        action: input.action,
        fieldName: input.fieldName ?? null,
        oldValue: input.oldValue != null ? String(input.oldValue) : null,
        newValue: input.newValue != null ? String(input.newValue) : null,
        orderId: input.orderId ?? null,
        itemId: input.itemId ?? null,
      },
    });
  } catch (err) {
    console.error('[AuditService] Failed to write audit log:', err);
  }
}

/**
 * Diffs two objects and writes one audit entry per changed field.
 */
export async function logAuditDiff(
  prisma: PrismaClient,
  base: AuditLogInput,
  oldData: Record<string, unknown>,
  newData: Record<string, unknown>,
): Promise<void> {
  const keys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

  for (const key of keys) {
    const oldVal = oldData[key];
    const newVal = newData[key];

    const oldStr = oldVal == null ? null : String(oldVal);
    const newStr = newVal == null ? null : String(newVal);

    if (oldStr !== newStr) {
      await logAudit(prisma, {
        ...base,
        action: base.action || 'UPDATE',
        fieldName: key,
        oldValue: oldStr,
        newValue: newStr,
      });
    }
  }
}
