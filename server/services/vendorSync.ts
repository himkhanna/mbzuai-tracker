// ---------------------------------------------------------------------------
// Vendor Sync Service — mock implementation for demo
// Replace syncWithAmazon / syncWithNoon with real API calls when credentials
// are available.
// ---------------------------------------------------------------------------

export interface VendorSyncEvent {
  date: string;
  description: string;
  location: string;
}

export interface VendorSyncResult {
  platform: string;
  vendorOrderId: string;
  status: string;
  statusCode: string;
  trackingNumber: string;
  carrier: string;
  estimatedDelivery: string;
  lastEvent: string;
  lastEventDate: string;
  events: VendorSyncEvent[];
}

// ---------------------------------------------------------------------------
// Deterministic mock helpers
// ---------------------------------------------------------------------------

function seededInt(seed: string, min: number, max: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return min + (Math.abs(hash) % (max - min + 1));
}

function addDays(base: Date, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('en-AE', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ---------------------------------------------------------------------------
// Amazon mock
// ---------------------------------------------------------------------------
const AMAZON_STATUSES: { code: string; label: string }[] = [
  { code: 'ORDER_CONFIRMED',    label: 'Order Confirmed' },
  { code: 'PROCESSING',        label: 'Processing' },
  { code: 'SHIPPED',           label: 'Shipped' },
  { code: 'OUT_FOR_DELIVERY',  label: 'Out for Delivery' },
  { code: 'DELIVERED',         label: 'Delivered' },
];

const AMAZON_CARRIERS = ['Aramex', 'DHL Express', 'FedEx', 'Amazon Logistics'];

function syncWithAmazon(orderId: string): VendorSyncResult {
  const idx = seededInt(orderId, 1, AMAZON_STATUSES.length - 1);
  const statusObj = AMAZON_STATUSES[idx];
  const carrier = AMAZON_CARRIERS[seededInt(orderId + 'c', 0, AMAZON_CARRIERS.length - 1)];
  const trackingNum = `TBA${seededInt(orderId + 't', 100000000, 999999999)}AE`;
  const now = new Date();
  const estDelivery = addDays(now, seededInt(orderId + 'd', 1, 5));

  const events: VendorSyncEvent[] = AMAZON_STATUSES.slice(0, idx + 1).map((s, i) => ({
    date: addDays(now, -(idx - i) * 1),
    description: s.label,
    location: i === 0 ? 'Amazon Fulfillment Center, Dubai' :
              i === idx ? 'Dubai, UAE' : 'Dubai Hub',
  }));

  return {
    platform: 'amazon',
    vendorOrderId: orderId,
    status: statusObj.label,
    statusCode: statusObj.code,
    trackingNumber: trackingNum,
    carrier,
    estimatedDelivery: estDelivery,
    lastEvent: statusObj.label,
    lastEventDate: addDays(now, 0),
    events: events.reverse(),
  };
}

// ---------------------------------------------------------------------------
// Noon mock
// ---------------------------------------------------------------------------
const NOON_STATUSES: { code: string; label: string }[] = [
  { code: 'ORDER_PLACED',      label: 'Order Placed' },
  { code: 'CONFIRMED',         label: 'Confirmed by Seller' },
  { code: 'PACKED',            label: 'Packed & Ready' },
  { code: 'SHIPPED',           label: 'Shipped' },
  { code: 'OUT_FOR_DELIVERY',  label: 'Out for Delivery' },
  { code: 'DELIVERED',         label: 'Delivered' },
];

const NOON_CARRIERS = ['Noon Express', 'Aramex', 'Fetchr', 'Quill'];

function syncWithNoon(orderId: string): VendorSyncResult {
  const idx = seededInt(orderId, 1, NOON_STATUSES.length - 1);
  const statusObj = NOON_STATUSES[idx];
  const carrier = NOON_CARRIERS[seededInt(orderId + 'c', 0, NOON_CARRIERS.length - 1)];
  const trackingNum = `N${seededInt(orderId + 't', 10000000, 99999999)}`;
  const now = new Date();
  const estDelivery = addDays(now, seededInt(orderId + 'd', 1, 4));

  const events: VendorSyncEvent[] = NOON_STATUSES.slice(0, idx + 1).map((s, i) => ({
    date: addDays(now, -(idx - i) * 1),
    description: s.label,
    location: i === 0 ? 'Noon Warehouse, Dubai' :
              i === idx ? 'Customer Location, Abu Dhabi' : 'Noon Logistics Hub',
  }));

  return {
    platform: 'noon',
    vendorOrderId: orderId,
    status: statusObj.label,
    statusCode: statusObj.code,
    trackingNumber: trackingNum,
    carrier,
    estimatedDelivery: estDelivery,
    lastEvent: statusObj.label,
    lastEventDate: addDays(now, 0),
    events: events.reverse(),
  };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------
export function syncVendorOrder(platform: string, orderId: string): VendorSyncResult {
  if (platform === 'noon') return syncWithNoon(orderId);
  return syncWithAmazon(orderId); // default / amazon
}
