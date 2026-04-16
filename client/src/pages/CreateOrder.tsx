import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, Trash2, Upload, FileDown } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '../api/client';

interface LineItem {
  itemCategory: string;
  description: string;
  quantity: number;
  unitPrice: string;
  purchaseLink: string;
  expectedDeliveryDate: string;
  requiresAssetTagging: boolean;
  requiresITConfig: boolean;
}

const emptyItem = (): LineItem => ({
  itemCategory: '',
  description: '',
  quantity: 1,
  unitPrice: '',
  purchaseLink: '',
  expectedDeliveryDate: '',
  requiresAssetTagging: false,
  requiresITConfig: false,
});

export default function CreateOrder() {
  const navigate = useNavigate();
  const [orderType, setOrderType] = useState<'PO' | 'DP'>('PO');
  const [submitting, setSubmitting] = useState(false);

  // Order header fields
  const [reference, setReference] = useState('');
  const [vendor, setVendor] = useState('');
  const [supplier, setSupplier] = useState('');
  const [endUser, setEndUser] = useState('');
  const [department, setDepartment] = useState('');
  const [orderDate, setOrderDate] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [currency, setCurrency] = useState('AED');
  const [totalValue, setTotalValue] = useState('');

  const [vendorPlatform, setVendorPlatform] = useState('');
  const [vendorOrderId, setVendorOrderId] = useState('');

  const [items, setItems] = useState<LineItem[]>([emptyItem()]);
  const [importFile, setImportFile] = useState<File | null>(null);

  function updateItem(idx: number, field: keyof LineItem, value: any) {
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  }

  function addItem() { setItems((prev) => [...prev, emptyItem()]); }
  function removeItem(idx: number) { setItems((prev) => prev.filter((_, i) => i !== idx)); }

  async function downloadTemplate() {
    try {
      const res = await apiClient.get('/orders/template', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mbzuai-import-template.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download template');
    }
  }

  async function handleImport() {
    if (!importFile) return;
    const form = new FormData();
    form.append('file', importFile);
    try {
      setSubmitting(true);
      await apiClient.post('/orders/import', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Orders imported successfully');
      navigate('/tracker');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Import failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        type: orderType,
        reference,
        vendor,
        supplier: supplier || undefined,
        endUser,
        department: department || undefined,
        orderDate,
        deliveryAddress: deliveryAddress || undefined,
        notes: notes || undefined,
        currency,
        totalValue: totalValue ? parseFloat(totalValue) : undefined,
        vendorPlatform: vendorPlatform || undefined,
        vendorOrderId: vendorOrderId || undefined,
        items: items.map((it) => ({
          ...it,
          quantity: Number(it.quantity),
          unitPrice: it.unitPrice ? parseFloat(it.unitPrice) : undefined,
          expectedDeliveryDate: it.expectedDeliveryDate || undefined,
        })),
      };
      const res = await apiClient.post('/orders', payload);
      toast.success(`Order ${reference} created!`);
      navigate(`/orders/${res.data.id}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h2 className="text-lg font-semibold text-gray-800">Create New Order</h2>

      {/* Type Toggle */}
      <div className="flex gap-2">
        {(['PO', 'DP'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setOrderType(t)}
            className={`px-5 py-2 rounded-lg text-sm font-medium border transition-colors ${orderType === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
          >
            {t === 'PO' ? 'Purchase Order (PO)' : 'Direct Payment (DP)'}
          </button>
        ))}
      </div>

      {/* Excel Import */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <Upload size={18} className="text-blue-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-700">Bulk Import via Excel</p>
            <p className="text-xs text-blue-500">Upload a .xlsx file to create multiple orders at once</p>
          </div>
          <button
            type="button"
            onClick={downloadTemplate}
            className="flex items-center gap-1.5 text-xs text-blue-700 border border-blue-300 bg-white rounded-lg px-3 py-1.5 hover:bg-blue-50 transition-colors"
          >
            <FileDown size={13} /> Download Template
          </button>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => setImportFile(e.target.files?.[0] || null)}
            className="flex-1 text-xs text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-white file:text-blue-700 file:border file:border-blue-300 hover:file:bg-blue-50"
          />
          {importFile && (
            <button
              type="button"
              onClick={handleImport}
              disabled={submitting}
              className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-60 whitespace-nowrap"
            >
              {submitting ? 'Importing…' : 'Import'}
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Order Header */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-medium text-gray-800 mb-4">Order Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {orderType} Reference *
              </label>
              <input required value={reference} onChange={(e) => setReference(e.target.value)}
                placeholder={orderType === 'PO' ? 'PO-2024-001' : 'DP-2024-001'}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vendor *</label>
              <input required value={vendor} onChange={(e) => setVendor(e.target.value)}
                placeholder="Amazon, Dell, etc."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End User *</label>
              <input required value={endUser} onChange={(e) => setEndUser(e.target.value)}
                placeholder="Prof. John Doe"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <input value={department} onChange={(e) => setDepartment(e.target.value)}
                placeholder="Computer Science"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Order Date *</label>
              <input required type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
              <input value={supplier} onChange={(e) => setSupplier(e.target.value)}
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
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>

        {/* Vendor Tracking */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-medium text-gray-800 mb-1">Vendor Order Tracking <span className="text-xs font-normal text-gray-400">(optional)</span></h3>
          <p className="text-xs text-gray-400 mb-4">Link an Amazon or Noon order to sync delivery status automatically.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Platform</label>
              <select value={vendorPlatform} onChange={(e) => setVendorPlatform(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">None</option>
                <option value="amazon">Amazon</option>
                <option value="noon">Noon</option>
              </select>
            </div>
            {vendorPlatform && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {vendorPlatform === 'amazon' ? 'Amazon Order ID' : 'Noon Order ID'}
                </label>
                <input
                  value={vendorOrderId}
                  onChange={(e) => setVendorOrderId(e.target.value)}
                  placeholder={vendorPlatform === 'amazon' ? '114-1234567-8901234' : 'NNN-123456789'}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>
        </div>

        {/* Line Items */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-800">Line Items</h3>
            <button type="button" onClick={addItem}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800">
              <PlusCircle size={15} /> Add Item
            </button>
          </div>

          <div className="space-y-4">
            {items.map((item, idx) => (
              <div key={idx} className="border border-gray-200 rounded-lg p-4 relative">
                <div className="absolute top-3 right-3">
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Description *</label>
                    <input required value={item.description} onChange={(e) => updateItem(idx, 'description', e.target.value)}
                      placeholder="Item description"
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                    <input value={item.itemCategory} onChange={(e) => updateItem(idx, 'itemCategory', e.target.value)}
                      placeholder="Electronics, etc."
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Quantity *</label>
                    <input required type="number" min="1" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Unit Price</label>
                    <input type="number" step="0.01" value={item.unitPrice} onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Expected Delivery</label>
                    <input type="date" value={item.expectedDeliveryDate} onChange={(e) => updateItem(idx, 'expectedDeliveryDate', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Purchase Link</label>
                    <input type="url" value={item.purchaseLink} onChange={(e) => updateItem(idx, 'purchaseLink', e.target.value)}
                      placeholder="https://"
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="md:col-span-3 flex gap-6">
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input type="checkbox" checked={item.requiresAssetTagging} onChange={(e) => updateItem(idx, 'requiresAssetTagging', e.target.checked)}
                        className="rounded border-gray-300 text-blue-600" />
                      Requires Asset Tagging
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input type="checkbox" checked={item.requiresITConfig} onChange={(e) => updateItem(idx, 'requiresITConfig', e.target.checked)}
                        className="rounded border-gray-300 text-blue-600" />
                      Requires IT Configuration
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => navigate('/tracker')}
            className="border border-gray-300 text-gray-700 rounded-lg px-5 py-2.5 text-sm hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" disabled={submitting}
            className="bg-blue-600 text-white rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
            {submitting ? 'Creating…' : `Create ${orderType}`}
          </button>
        </div>
      </form>
    </div>
  );
}
