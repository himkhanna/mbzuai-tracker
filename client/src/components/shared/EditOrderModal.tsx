import { useState, FormEvent } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '../../api/client';
import type { Order } from '../../types';

interface Props {
  order: Order;
  onClose: () => void;
  onSaved: () => void;
}

export default function EditOrderModal({ order, onClose, onSaved }: Props) {
  const [saving, setSaving] = useState(false);

  const [vendor, setVendor]                   = useState(order.vendor ?? '');
  const [supplier, setSupplier]               = useState(order.supplier ?? '');
  const [endUser, setEndUser]                 = useState(order.endUser ?? '');
  const [department, setDepartment]           = useState(order.department ?? '');
  const [deliveryAddress, setDeliveryAddress] = useState(order.deliveryAddress ?? '');
  const [notes, setNotes]                     = useState(order.notes ?? '');
  const [totalValue, setTotalValue]           = useState(order.totalValue?.toString() ?? '');
  const [currency, setCurrency]               = useState(order.currency ?? 'AED');
  // orderDate stored as ISO string — convert to yyyy-mm-dd for input
  const toInputDate = (iso?: string) => iso ? iso.slice(0, 10) : '';
  const [orderDate, setOrderDate]             = useState(toInputDate(order.orderDate));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient.put(`/orders/${order.id}`, {
        vendor,
        supplier: supplier || undefined,
        endUser,
        department: department || undefined,
        deliveryAddress: deliveryAddress || undefined,
        notes: notes || undefined,
        currency,
        totalValue: totalValue ? parseFloat(totalValue) : undefined,
        orderDate,
      });
      toast.success('Order updated');
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to update order');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Edit Order</h2>
            <p className="text-xs text-gray-500 mt-0.5">{order.reference} — {order.type}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-4">

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vendor *</label>
              <input required value={vendor} onChange={(e) => setVendor(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
              <input value={supplier} onChange={(e) => setSupplier(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End User *</label>
              <input required value={endUser} onChange={(e) => setEndUser(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <input value={department} onChange={(e) => setDepartment(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Order Date *</label>
              <input required type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Value</label>
              <div className="flex gap-2">
                <select value={currency} onChange={(e) => setCurrency(e.target.value)}
                  className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>AED</option><option>USD</option><option>EUR</option>
                </select>
                <input type="number" step="0.01" value={totalValue} onChange={(e) => setTotalValue(e.target.value)}
                  placeholder="0.00"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Address</label>
              <input value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>

          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
