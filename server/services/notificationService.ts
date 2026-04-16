import type { PrismaClient } from '@prisma/client';
import type { NotifType, Role } from '../types/enums';
import { sendEmail, renderTemplate } from '../config/email';

export type NotificationEvent =
  | 'ORDER_CREATED'
  | 'DELIVERY_DUE'
  | 'DELIVERY_OVERDUE'
  | 'ITEM_RECEIVED'
  | 'ASSET_TAGGING_REQUIRED'
  | 'ASSET_TAGGING_DONE'
  | 'IT_CONFIG_REQUIRED'
  | 'IT_CONFIG_DONE'
  | 'HANDOVER_COMPLETE';

export interface NotificationData {
  reference?: string;
  orderType?: string;
  vendor?: string;
  endUser?: string;
  department?: string;
  itemCount?: number;
  totalValue?: number;
  currency?: string;
  orderDate?: string;
  description?: string;
  quantity?: number;
  expectedDate?: string;
  daysOverdue?: number;
  receivedDate?: string;
  assetTaggingDate?: string;
  itConfigDate?: string;
  handoverDate?: string;
  requiresAssetTagging?: boolean;
  requiresITConfig?: boolean;
  orderId?: string;
  itemId?: string;
  relatedId?: string;
}

interface EventConfig {
  notifType: NotifType;
  recipientRoles: Role[];
  emailTemplate: string;
  emailSubjectFn: (data: NotificationData) => string;
  titleFn: (data: NotificationData) => string;
  messageFn: (data: NotificationData) => string;
}

const clientUrl = () => process.env.CLIENT_URL || 'http://localhost:5173';

const EVENT_CONFIG: Record<NotificationEvent, EventConfig> = {
  ORDER_CREATED: {
    notifType: 'ORDER_CREATED',
    recipientRoles: ['VENDOR_MANAGEMENT', 'PROCUREMENT'],
    emailTemplate: 'order-created',
    emailSubjectFn: (d) => `New ${d.orderType} Created — ${d.reference}`,
    titleFn: (d) => `New ${d.orderType} Created`,
    messageFn: (d) => `Order ${d.reference} for ${d.vendor} has been created with ${d.itemCount} item(s).`,
  },
  DELIVERY_DUE: {
    notifType: 'DELIVERY_DUE',
    recipientRoles: ['STORE', 'VENDOR_MANAGEMENT'],
    emailTemplate: 'delivery-due-today',
    emailSubjectFn: (d) => `Delivery Due Today — ${d.reference}`,
    titleFn: (d) => `Delivery Due Today`,
    messageFn: (d) => `Item "${d.description}" from ${d.vendor} is expected for delivery today.`,
  },
  DELIVERY_OVERDUE: {
    notifType: 'DELIVERY_OVERDUE',
    recipientRoles: ['VENDOR_MANAGEMENT', 'ADMIN'],
    emailTemplate: 'delivery-overdue',
    emailSubjectFn: (d) => `OVERDUE — ${d.reference} | ${d.daysOverdue} days late`,
    titleFn: (d) => `Delivery Overdue`,
    messageFn: (d) => `Item "${d.description}" is ${d.daysOverdue} day(s) overdue. Immediate follow-up required.`,
  },
  ITEM_RECEIVED: {
    notifType: 'ITEM_RECEIVED',
    recipientRoles: ['STORE', 'PROCUREMENT'],
    emailTemplate: 'item-received',
    emailSubjectFn: (d) => `Item Received — ${d.reference}`,
    titleFn: (d) => `Item Received`,
    messageFn: (d) => `"${d.description}" has been received and stored on ${d.receivedDate}.`,
  },
  ASSET_TAGGING_REQUIRED: {
    notifType: 'ASSET_TAGGING_REQUIRED',
    recipientRoles: ['ASSET', 'PROCUREMENT'],
    emailTemplate: 'asset-tagging-required',
    emailSubjectFn: (d) => `Asset Tagging Required — ${d.reference}`,
    titleFn: (d) => `Asset Tagging Required`,
    messageFn: (d) => `Item "${d.description}" requires asset tagging.`,
  },
  ASSET_TAGGING_DONE: {
    notifType: 'STATUS_CHANGED',
    recipientRoles: ['VENDOR_MANAGEMENT', 'PROCUREMENT'],
    emailTemplate: 'asset-tagging-done',
    emailSubjectFn: (d) => `Asset Tagging Completed — ${d.reference}`,
    titleFn: (d) => `Asset Tagging Completed`,
    messageFn: (d) => `Asset tagging for "${d.description}" has been completed.`,
  },
  IT_CONFIG_REQUIRED: {
    notifType: 'IT_CONFIG_REQUIRED',
    recipientRoles: ['IT', 'PROCUREMENT'],
    emailTemplate: 'it-config-required',
    emailSubjectFn: (d) => `IT Configuration Required — ${d.reference}`,
    titleFn: (d) => `IT Configuration Required`,
    messageFn: (d) => `Item "${d.description}" requires IT configuration.`,
  },
  IT_CONFIG_DONE: {
    notifType: 'STATUS_CHANGED',
    recipientRoles: ['VENDOR_MANAGEMENT', 'PROCUREMENT'],
    emailTemplate: 'it-config-done',
    emailSubjectFn: (d) => `IT Configuration Completed — ${d.reference}`,
    titleFn: (d) => `IT Configuration Completed`,
    messageFn: (d) => `IT configuration for "${d.description}" has been completed. Item is ready for handover.`,
  },
  HANDOVER_COMPLETE: {
    notifType: 'HANDOVER_READY',
    recipientRoles: ['VENDOR_MANAGEMENT'],
    emailTemplate: 'handover-complete',
    emailSubjectFn: (d) => `Item Handed Over — ${d.reference}`,
    titleFn: (d) => `Item Handed Over`,
    messageFn: (d) => `"${d.description}" has been successfully handed over to ${d.endUser} on ${d.handoverDate}.`,
  },
};

/**
 * Triggers an in-app notification (stored in DB) and sends an email
 * for all relevant users based on the event type.
 */
export async function triggerNotification(
  event: NotificationEvent,
  data: NotificationData,
  prisma: PrismaClient,
): Promise<void> {
  try {
    const config = EVENT_CONFIG[event];
    if (!config) {
      console.warn(`[NotificationService] Unknown event: ${event}`);
      return;
    }

    const relatedId = data.relatedId ?? data.orderId ?? data.itemId ?? undefined;
    const title = config.titleFn(data);
    const message = config.messageFn(data);
    const subject = config.emailSubjectFn(data);

    // Determine recipient roles
    // For ITEM_RECEIVED, Procurement handles asset tagging and IT config — always notify them
    const roles = [...config.recipientRoles];

    // Fetch users matching recipient roles
    const users = await prisma.user.findMany({
      where: {
        role: { in: roles },
        isActive: true,
      },
      select: { id: true, email: true },
    });

    if (users.length === 0) return;

    // Create in-app notifications in bulk
    await prisma.notification.createMany({
      data: users.map((u) => ({
        userId: u.id,
        title,
        message,
        type: config.notifType,
        isRead: false,
        relatedId: relatedId ?? null,
      })),
    });

    // Build template data
    const trackingUrl = data.orderId
      ? `${clientUrl()}/orders/${data.orderId}`
      : `${clientUrl()}/tracker`;

    const templateData = {
      ...data,
      trackingUrl,
    };

    // Send emails
    const emailAddresses = users.map((u) => u.email);
    try {
      const html = renderTemplate(config.emailTemplate, templateData as Record<string, unknown>);
      await sendEmail(emailAddresses, subject, html);
    } catch (templateErr) {
      console.error('[NotificationService] Template render or email error:', templateErr);
    }
  } catch (err) {
    console.error('[NotificationService] triggerNotification error:', err);
  }
}
