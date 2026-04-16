import React from 'react';
import type { ItemStatus, OrderStatus } from '../../types';
import { getItemStatusColor, getOrderStatusColor, formatItemStatus, formatOrderStatus } from '../../utils/statusColors';

interface StatusBadgeProps {
  status: string;
  type: 'item' | 'order';
  size?: 'sm' | 'md';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type, size = 'md' }) => {
  const colorClass =
    type === 'item'
      ? getItemStatusColor(status as ItemStatus)
      : getOrderStatusColor(status as OrderStatus);

  const label =
    type === 'item'
      ? formatItemStatus(status as ItemStatus)
      : formatOrderStatus(status as OrderStatus);

  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center font-medium rounded-full ${colorClass} ${sizeClass}`}>
      {label}
    </span>
  );
};

export default StatusBadge;
