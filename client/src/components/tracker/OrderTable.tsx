import React, { useState, Fragment } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import { ChevronDown, ChevronRight, ChevronLeft, Trash2, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import type { Order, Role } from '../../types';
import StatusBadge from '../shared/StatusBadge';
import ItemLifecycleRow from './ItemLifecycleRow';
import { formatDate } from '../../utils/dateHelpers';
import { getOrderStatusRowColor } from '../../utils/statusColors';
import apiClient from '../../api/client';

const CAN_RECEIVE: Role[] = ['ADMIN', 'VENDOR_MANAGEMENT', 'PROCUREMENT', 'STORE'];

interface OrderTableProps {
  orders: Order[];
  onRefresh: () => void;
  userRole: Role;
}

const columnHelper = createColumnHelper<Order>();

const OrderTable: React.FC<OrderTableProps> = ({ orders, onRefresh, userRole }) => {
  const navigate = useNavigate();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [receivingOrderId, setReceivingOrderId] = useState<string | null>(null);

  async function markAllReceived(order: Order, e: React.MouseEvent) {
    e.stopPropagation();
    const pendingItems = order.items.filter(i =>
      i.goodType !== 'SERVICES' &&
      (i.status === 'PENDING_DELIVERY' || i.status === 'DELAYED' || i.status === 'PARTIALLY_DELIVERED')
    );
    if (!pendingItems.length) return;
    setReceivingOrderId(order.id);
    try {
      await Promise.all(pendingItems.map(i => apiClient.put(`/items/${i.id}/receive`, {})));
      toast.success(`All ${pendingItems.length} item(s) marked received`);
      onRefresh();
    } catch {
      toast.error('Failed to mark some items received');
      onRefresh();
    } finally {
      setReceivingOrderId(null);
    }
  }

  async function handleDelete(order: Order, e: React.MouseEvent) {
    e.stopPropagation();
    if (!window.confirm(`Delete order ${order.reference}? This cannot be undone.`)) return;
    setDeletingId(order.id);
    try {
      await apiClient.delete(`/orders/${order.id}`);
      toast.success(`Order ${order.reference} deleted`);
      onRefresh();
    } catch {
      toast.error('Failed to delete order');
    } finally {
      setDeletingId(null);
    }
  }

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const columns = [
    // Expand toggle
    columnHelper.display({
      id: 'expand',
      header: '',
      cell: ({ row }) => (
        <button
          onClick={() => toggleRow(row.original.id)}
          className="p-1 rounded hover:bg-gray-200 transition-colors"
        >
          {expandedRows.has(row.original.id)
            ? <ChevronDown className="w-4 h-4 text-gray-500" />
            : <ChevronRight className="w-4 h-4 text-gray-500" />}
        </button>
      ),
    }),

    // Reference
    columnHelper.accessor('reference', {
      header: 'Reference',
      cell: (info) => (
        <span className="font-semibold text-blue-600 text-sm">{info.getValue()}</span>
      ),
    }),

    // Type
    columnHelper.accessor('type', {
      header: 'Type',
      cell: (info) => (
        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-bold rounded ${
          info.getValue() === 'PO' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
        }`}>
          {info.getValue()}
        </span>
      ),
    }),

    // Order Date
    columnHelper.accessor('orderDate', {
      header: 'Order Date',
      cell: (info) => <span className="text-xs text-gray-500">{formatDate(info.getValue())}</span>,
    }),

    // Vendor + End User combined
    columnHelper.display({
      id: 'people',
      header: 'Vendor / End User',
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="text-sm text-gray-800 truncate font-medium">{row.original.vendor}</p>
          <p className="text-xs text-gray-400 truncate">{row.original.endUser}</p>
        </div>
      ),
    }),

    // Items progress
    columnHelper.accessor('items', {
      header: 'Items',
      cell: (info) => {
        const items = info.getValue();
        const done = items.filter(i => i.status === 'HANDED_OVER' || i.status === 'IT_CONFIGURED').length;
        return (
          <span className="text-sm text-gray-600 font-medium">{done}/{items.length}</span>
        );
      },
    }),

    // Expected delivery (earliest)
    columnHelper.display({
      id: 'delivery',
      header: 'Expected',
      cell: ({ row }) => {
        const dates = row.original.items
          .map(i => i.expectedDeliveryDate)
          .filter(Boolean) as string[];
        if (!dates.length) return <span className="text-gray-300 text-sm">—</span>;
        const earliest = dates.sort()[0];
        return <span className="text-sm text-gray-600">{formatDate(earliest)}</span>;
      },
    }),

    // Status
    columnHelper.accessor('status', {
      header: 'Status',
      cell: (info) => <StatusBadge status={info.getValue()} type="order" />,
    }),

    // Delete (ADMIN only)
    ...(userRole === 'ADMIN' ? [columnHelper.display({
      id: 'delete',
      header: '',
      cell: ({ row }) => (
        <button
          onClick={(e) => handleDelete(row.original, e)}
          disabled={deletingId === row.original.id}
          className="p-1.5 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
          title="Delete order"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      ),
    })] : []),
  ];

  const table = useReactTable({
    data: orders,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm table-fixed">
        <colgroup>
          <col style={{ width: '40px' }} />
          <col style={{ width: '120px' }} />
          <col style={{ width: '56px' }} />
          <col style={{ width: '96px' }} />
          <col /> {/* flex: takes remaining space */}
          <col style={{ width: '60px' }} />
          <col style={{ width: '96px' }} />
          <col style={{ width: '140px' }} />
          {userRole === 'ADMIN' && <col style={{ width: '40px' }} />}
        </colgroup>
        <thead className="bg-gray-50 border-b border-gray-200">
          {table.getHeaderGroups().map(hg => (
            <tr key={hg.id}>
              {hg.headers.map(h => (
                <th key={h.id} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {flexRender(h.column.columnDef.header, h.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-gray-100">
          {table.getRowModel().rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-gray-400">
                No orders found. Adjust your filters or create a new order.
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map(row => (
              <Fragment key={row.id}>
                <tr
                  className={`hover:bg-blue-50/40 cursor-pointer transition-colors ${getOrderStatusRowColor(row.original.status)}`}
                  onClick={() => navigate(`/orders/${row.original.id}`)}
                >
                  {row.getVisibleCells().map(cell => (
                    <td
                      key={cell.id}
                      className="px-3 py-3 overflow-hidden"
                      onClick={e => {
                        if ((e.target as HTMLElement).closest('button')) e.stopPropagation();
                      }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>

                {expandedRows.has(row.original.id) && (
                  <tr>
                    <td colSpan={columns.length} className="p-0 border-b border-gray-200">
                      {row.original.items.length === 0 ? (
                        <div className="px-6 py-4 text-sm text-gray-400 italic bg-gray-50">
                          No items in this order.
                        </div>
                      ) : (
                        <>
                          {/* PO bulk-receive bar */}
                          {row.original.type === 'PO' && CAN_RECEIVE.includes(userRole) && (() => {
                            const pending = row.original.items.filter(i =>
                              i.goodType !== 'SERVICES' &&
                              (i.status === 'PENDING_DELIVERY' || i.status === 'DELAYED' || i.status === 'PARTIALLY_DELIVERED')
                            );
                            if (!pending.length) return null;
                            return (
                              <div className="flex items-center justify-between px-4 py-2 bg-blue-50 border-b border-blue-100">
                                <span className="text-xs text-blue-700 font-medium">
                                  {pending.length} item{pending.length > 1 ? 's' : ''} pending delivery
                                </span>
                                <button
                                  onClick={(e) => markAllReceived(row.original, e)}
                                  disabled={receivingOrderId === row.original.id}
                                  className="flex items-center gap-1.5 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 disabled:opacity-60 transition-colors"
                                >
                                  <Package className="w-3.5 h-3.5" />
                                  {receivingOrderId === row.original.id ? 'Marking…' : 'Mark All Received'}
                                </button>
                              </div>
                            );
                          })()}
                          {row.original.items.map((item, idx) => (
                            <div key={item.id} className={idx > 0 ? 'border-t border-gray-200' : ''}>
                              <ItemLifecycleRow item={item} userRole={userRole} onUpdate={onRefresh} orderType={row.original.type} />
                            </div>
                          ))}
                        </>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))
          )}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
        <p className="text-xs text-gray-500">
          {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}–
          {Math.min(
            (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
            orders.length,
          )} of {orders.length} orders
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="p-1.5 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-gray-600 px-1">
            {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
          </span>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="p-1.5 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderTable;
