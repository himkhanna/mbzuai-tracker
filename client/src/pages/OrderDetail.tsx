import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp, Edit2, Trash2, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '../api/client';
import StatusBadge from '../components/shared/StatusBadge';
import ItemLifecycleRow from '../components/tracker/ItemLifecycleRow';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import { useAuthStore } from '../store/authStore';
import { formatDate } from '../utils/dateHelpers';
import type { Order, AuditLog } from '../types';
import VendorSyncPanel from '../components/shared/VendorSyncPanel';
import EditOrderModal from '../components/shared/EditOrderModal';

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [order, setOrder] = useState<Order | null>(null);
  const [audit, setAudit] = useState<AuditLog[]>([]);
  const [auditOpen, setAuditOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  async function fetchOrder() {
    try {
      const res = await apiClient.get(`/orders/${id}`);
      setOrder(res.data);
    } catch {
      toast.error('Order not found');
      navigate('/tracker');
    } finally {
      setLoading(false);
    }
  }

  async function fetchAudit() {
    try {
      const res = await apiClient.get('/audit', { params: { entityId: id } });
      setAudit(res.data.data || []);
    } catch {
      // audit not critical
    }
  }

  useEffect(() => { fetchOrder(); }, [id]);

  async function handleDelete() {
    try {
      await apiClient.delete(`/orders/${id}`);
      toast.success('Order deleted');
      navigate('/tracker');
    } catch {
      toast.error('Failed to delete order');
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-500">Loading…</div>;
  if (!order) return null;

  const canEdit = user && ['ADMIN', 'VENDOR_MANAGEMENT', 'PROCUREMENT'].includes(user.role);
  const canDelete = user?.role === 'ADMIN';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/tracker')} className="text-gray-400 hover:text-gray-700">
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-900">{order.reference}</h2>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${order.type === 'PO' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                {order.type}
              </span>
              <StatusBadge status={order.status} type="order" />
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{order.vendor} — {order.endUser}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <button onClick={() => setEditOpen(true)} className="flex items-center gap-1 text-sm text-gray-700 border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50">
              <Pencil size={14} /> Edit Order
            </button>
          )}
          {canDelete && (
            <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-1 text-sm text-red-600 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50">
              <Trash2 size={14} /> Delete
            </button>
          )}
        </div>
      </div>

      {/* Order Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><span className="text-gray-500 block">Order Date</span><span className="font-medium">{formatDate(order.orderDate)}</span></div>
          <div><span className="text-gray-500 block">Department</span><span className="font-medium">{order.department || '—'}</span></div>
          <div><span className="text-gray-500 block">Total Value</span><span className="font-medium">{order.totalValue ? `${order.currency} ${order.totalValue.toLocaleString()}` : '—'}</span></div>
          <div><span className="text-gray-500 block">Items</span><span className="font-medium">{order.items.length}</span></div>
          {order.supplier && <div><span className="text-gray-500 block">Supplier</span><span className="font-medium">{order.supplier}</span></div>}
          {order.deliveryAddress && <div className="col-span-2"><span className="text-gray-500 block">Delivery Address</span><span className="font-medium">{order.deliveryAddress}</span></div>}
          {order.notes && <div className="col-span-4"><span className="text-gray-500 block">Notes</span><span className="font-medium">{order.notes}</span></div>}
        </div>
      </div>

      {/* Items */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Line Items ({order.items.length})</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {order.items.map((item) => (
            <ItemLifecycleRow
              key={item.id}
              item={item}
              userRole={user?.role || 'STORE'}
              orderType={order.type}
              onUpdate={fetchOrder}
            />
          ))}
        </div>
      </div>

      {/* Vendor Sync */}
      {order.vendorPlatform && order.vendorOrderId && (
        <VendorSyncPanel
          orderId={order.id}
          platform={order.vendorPlatform}
          vendorOrderId={order.vendorOrderId}
          lastSynced={order.vendorLastSynced}
          initialData={order.vendorSyncData ? JSON.parse(order.vendorSyncData) : null}
        />
      )}

      {/* Audit Trail */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <button
          className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-gray-50"
          onClick={() => { setAuditOpen(!auditOpen); if (!auditOpen) fetchAudit(); }}
        >
          <h3 className="font-semibold text-gray-800">Audit Trail</h3>
          {auditOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {auditOpen && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                <tr>
                  <th className="px-4 py-2 text-left">Time</th>
                  <th className="px-4 py-2 text-left">User</th>
                  <th className="px-4 py-2 text-left">Action</th>
                  <th className="px-4 py-2 text-left">Field</th>
                  <th className="px-4 py-2 text-left">Old</th>
                  <th className="px-4 py-2 text-left">New</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {audit.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-500">{formatDate(log.timestamp)}</td>
                    <td className="px-4 py-2 font-medium">{log.user?.name}</td>
                    <td className="px-4 py-2">{log.action}</td>
                    <td className="px-4 py-2 text-gray-600">{log.fieldName || '—'}</td>
                    <td className="px-4 py-2 text-red-600">{log.oldValue || '—'}</td>
                    <td className="px-4 py-2 text-green-600">{log.newValue || '—'}</td>
                  </tr>
                ))}
                {audit.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-4 text-center text-gray-400">No audit records found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title="Delete Order"
          message={`Are you sure you want to delete order ${order.reference}? This action cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}

      {editOpen && (
        <EditOrderModal
          order={order}
          onClose={() => setEditOpen(false)}
          onSaved={fetchOrder}
        />
      )}
    </div>
  );
}
