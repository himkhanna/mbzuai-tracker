import type { ItemStatus, OrderStatus } from '../types';

export function getItemStatusColor(status: ItemStatus): string {
  switch (status) {
    case 'HANDED_OVER':
    case 'IT_CONFIGURED':
      return 'bg-green-100 text-green-800';
    case 'DELIVERED':
    case 'STORED':
    case 'ASSET_TAGGED':
    case 'PENDING_ASSET_TAGGING':
    case 'PENDING_IT_CONFIG':
      return 'bg-yellow-100 text-yellow-800';
    case 'PARTIALLY_DELIVERED':
      return 'bg-amber-100 text-amber-800';
    case 'DELAYED':
      return 'bg-red-100 text-red-800';
    case 'SERVICES_ONLY':
      return 'bg-slate-100 text-slate-500';
    case 'PENDING_DELIVERY':
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

export function getOrderStatusColor(status: OrderStatus | string): string {
  switch (status) {
    case 'COMPLETED':
    case 'FULLY_DELIVERED':
      return 'bg-green-100 text-green-800';
    case 'IN_PROGRESS':
    case 'PARTIALLY_DELIVERED':
      return 'bg-yellow-100 text-yellow-800';
    case 'DELAYED':
      return 'bg-red-100 text-red-800';
    case 'PENDING':
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

export function getItemStatusRowColor(status: ItemStatus): string {
  switch (status) {
    case 'DELAYED':
      return 'bg-red-50';
    case 'HANDED_OVER':
    case 'IT_CONFIGURED':
      return 'bg-green-50';
    case 'PARTIALLY_DELIVERED':
      return 'bg-amber-50';
    case 'DELIVERED':
    case 'STORED':
    case 'ASSET_TAGGED':
    case 'PENDING_ASSET_TAGGING':
    case 'PENDING_IT_CONFIG':
      return 'bg-yellow-50';
    case 'SERVICES_ONLY':
      return 'bg-slate-50';
    default:
      return '';
  }
}

export function getOrderStatusRowColor(status: OrderStatus | string): string {
  switch (status) {
    case 'DELAYED':
      return 'bg-red-50';
    case 'COMPLETED':
    case 'FULLY_DELIVERED':
      return 'bg-green-50';
    case 'IN_PROGRESS':
    case 'PARTIALLY_DELIVERED':
      return 'bg-yellow-50';
    default:
      return '';
  }
}

export function formatItemStatus(status: ItemStatus | string): string {
  return status
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

export function formatOrderStatus(status: OrderStatus | string): string {
  return status
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}
