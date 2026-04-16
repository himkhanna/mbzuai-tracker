import type { ItemStatus, OrderStatus } from '../types/enums';

export interface ItemForStatus {
  goodType?: string | null;
  handoverDate?: Date | null;
  itConfigDate?: Date | null;
  requiresITConfig: boolean;
  assetTaggingDate?: Date | null;
  requiresAssetTagging: boolean;
  storedDate?: Date | null;
  receivedDate?: Date | null;
  quantityReceived?: number | null;
  quantity: number;
  expectedDeliveryDate?: Date | null;
}

/**
 * Calculates the item status server-side based on lifecycle dates, flags, and good type.
 * SERVICES items are excluded from the delivery lifecycle.
 * Partial delivery is tracked via quantityReceived vs quantity.
 */
export function calculateItemStatus(item: ItemForStatus): string {
  // Services items are excluded from the delivery lifecycle
  if (item.goodType === 'SERVICES') {
    return 'SERVICES_ONLY';
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // 1. Fully handed over
  if (item.handoverDate) {
    return 'HANDED_OVER';
  }

  // 2. IT configuration complete
  if (item.itConfigDate) {
    return 'IT_CONFIGURED';
  }

  // 3. Pending IT configuration (stored + asset tagging done or not required)
  if (
    item.requiresITConfig &&
    item.storedDate &&
    (item.assetTaggingDate != null || !item.requiresAssetTagging) &&
    !item.itConfigDate
  ) {
    return 'PENDING_IT_CONFIG';
  }

  // 4. Asset tagging complete
  if (item.assetTaggingDate) {
    return 'ASSET_TAGGED';
  }

  // 5. Pending asset tagging
  if (item.requiresAssetTagging && item.storedDate && !item.assetTaggingDate) {
    return 'PENDING_ASSET_TAGGING';
  }

  // 6. Stored (received and stored — storedDate auto-set with receivedDate)
  if (item.storedDate) {
    if (item.requiresITConfig && !item.requiresAssetTagging && !item.itConfigDate) {
      return 'PENDING_IT_CONFIG';
    }
    return 'STORED';
  }

  // 7. Partial delivery — some quantity received but not all
  const qtyReceived = item.quantityReceived ?? 0;
  if (qtyReceived > 0 && qtyReceived < item.quantity) {
    return 'PARTIALLY_DELIVERED';
  }

  // 8. Fully delivered (all quantity received, storedDate not yet set — edge case)
  if (item.receivedDate) {
    return 'DELIVERED';
  }

  // 9. Delayed — past expected date and not yet received
  if (item.expectedDeliveryDate) {
    const expected = new Date(item.expectedDeliveryDate);
    expected.setHours(0, 0, 0, 0);
    if (expected < now) {
      return 'DELAYED';
    }
  }

  // 10. Default
  return 'PENDING_DELIVERY';
}

/**
 * Calculates the aggregate order status based on its items' statuses.
 * SERVICES_ONLY items are treated as complete (they have no delivery lifecycle).
 */
export function calculateOrderStatus(items: Array<{ status: string }>): OrderStatus {
  if (items.length === 0) {
    return 'PENDING';
  }

  // Filter out services items from lifecycle calculations
  const trackableItems = items.filter((i) => i.status !== 'SERVICES_ONLY');

  // If all items are services, mark order as completed
  if (trackableItems.length === 0) {
    return 'COMPLETED';
  }

  const statuses = trackableItems.map((i) => i.status);

  const allHandedOver = statuses.every((s) => s === 'HANDED_OVER');
  if (allHandedOver) {
    return 'COMPLETED';
  }

  const deliveredStatuses = new Set([
    'DELIVERED',
    'STORED',
    'PENDING_ASSET_TAGGING',
    'ASSET_TAGGED',
    'PENDING_IT_CONFIG',
    'IT_CONFIGURED',
    'HANDED_OVER',
    'PARTIALLY_DELIVERED',
  ]);

  const allDelivered = statuses.every((s) => deliveredStatuses.has(s));
  if (allDelivered) {
    return 'FULLY_DELIVERED';
  }

  const hasDelayed = statuses.some((s) => s === 'DELAYED');
  if (hasDelayed) {
    return 'DELAYED';
  }

  const someDelivered = statuses.some((s) => deliveredStatuses.has(s));
  if (someDelivered) {
    return 'PARTIALLY_DELIVERED';
  }

  const hasInProgress = statuses.some((s) => s !== 'PENDING_DELIVERY');
  if (hasInProgress) {
    return 'IN_PROGRESS';
  }

  return 'PENDING';
}
