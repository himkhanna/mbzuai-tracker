// String literal types replacing Prisma enums (SQLite doesn't support native enums)

export type Role = 'ADMIN' | 'VENDOR_MANAGEMENT' | 'PROCUREMENT' | 'STORE' | 'FINANCE' | 'IT' | 'ASSET';

export type OrderType = 'PO' | 'DP';

export type OrderStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'PARTIALLY_DELIVERED'
  | 'FULLY_DELIVERED'
  | 'COMPLETED'
  | 'DELAYED';

export type ItemStatus =
  | 'PENDING_DELIVERY'
  | 'PARTIALLY_DELIVERED'
  | 'DELIVERED'
  | 'STORED'
  | 'PENDING_ASSET_TAGGING'
  | 'ASSET_TAGGED'
  | 'PENDING_IT_CONFIG'
  | 'IT_CONFIGURED'
  | 'HANDED_OVER'
  | 'DELAYED'
  | 'SERVICES_ONLY';

export type GoodType = 'GOODS' | 'SERVICES';

export type NotifType =
  | 'DELIVERY_DUE'
  | 'DELIVERY_OVERDUE'
  | 'ITEM_RECEIVED'
  | 'ASSET_TAGGING_REQUIRED'
  | 'IT_CONFIG_REQUIRED'
  | 'HANDOVER_READY'
  | 'ORDER_CREATED'
  | 'STATUS_CHANGED';
