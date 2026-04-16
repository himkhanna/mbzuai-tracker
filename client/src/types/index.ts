export type Role = 'ADMIN' | 'VENDOR_MANAGEMENT' | 'PROCUREMENT' | 'STORE' | 'FINANCE' | 'IT' | 'ASSET';
export type GoodType = 'GOODS' | 'SERVICES';

export interface FilterValues {
  search: string;
  type: OrderType | '';
  statuses: OrderStatus[];
  dateFrom: string;
  dateTo: string;
}
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

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  department?: string;
  isActive: boolean;
}

export interface Item {
  id: string;
  orderId: string;
  itemCategory?: string;
  description: string;
  quantity: number;
  quantityReceived?: number;
  unitPrice?: number;
  totalPrice?: number;
  purchaseLink?: string;
  lineNumber?: string;
  goodType?: GoodType;
  requisitionNumber?: string;
  expectedDeliveryDate?: string;
  receivedDate?: string;
  storedDate?: string;
  assetTaggingDate?: string;
  itConfigDate?: string;
  handoverDate?: string;
  customClearanceDate?: string;
  requiresAssetTagging: boolean;
  requiresITConfig: boolean;
  status: ItemStatus;
  financeRemarks?: string;
  finalRemarks?: string;
}

export interface Order {
  id: string;
  type: OrderType;
  reference: string;
  vendor: string;
  supplier?: string;
  deliveryAddress?: string;
  endUser: string;
  department?: string;
  orderDate: string;
  totalValue?: number;
  currency: string;
  status: OrderStatus;
  notes?: string;
  vendorPlatform?: string;
  vendorOrderId?: string;
  vendorSyncData?: string;
  vendorLastSynced?: string;
  items: Item[];
  _count?: { items: number };
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  relatedId?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  timestamp: string;
  user: { name: string; email: string; role: string };
}

export interface DashboardSummary {
  totalOrders: number;
  pendingDelivery: number;
  overdueItems: number;
  pendingAssetTagging: number;
  pendingITConfig: number;
  completed: number;
  ordersByStatus: { status: string; count: number }[];
  overdueItemsList: {
    id: string;
    reference: string;
    vendor: string;
    description: string;
    expectedDeliveryDate: string;
    daysOverdue: number;
    orderId: string;
  }[];
  poCount: number;
  dpCount: number;
}
