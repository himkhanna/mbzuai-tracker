import { useState } from 'react';
import apiClient from '../api/client';
import toast from 'react-hot-toast';
import {
  FileText, Image, Mail, CheckCircle, AlertCircle,
  Download, Package, RefreshCw, Plus, Trash2,
} from 'lucide-react';

const NAVY = '#0C2945';

interface EmailResult {
  emailsProcessed: number;
  ordersCreated: number;
  itemsCreated: number;
  duplicatesSkipped: number;
  servicesSkipped: number;
  amazonUpdates: number;
  errors: number;
  errorMessages: string[];
  amazonUpdateDetails: string[];
}

interface ShipItem { description: string; quantity: number; }
interface Shipment  { deliveryDate: string; items: ShipItem[]; }

interface MultiAmazonForm {
  orderId: string;
  shipments: Shipment[];
}

interface TestOrderForm {
  reference: string;
  vendor: string;
  endUser: string;
  department: string;
  vendorOrderId: string;
  itemDescription: string;
  quantity: string;
  expectedDeliveryDate: string;
}

// Matches DP-SAMPLE-001 items — 3 shipments with different dates per item type
const DEFAULT_SHIPMENTS: Shipment[] = [
  {
    deliveryDate: 'May 20, 2026',
    items: [
      { description: 'Dell Latitude 5540 Laptop 16GB 512GB', quantity: 3 },
    ],
  },
  {
    deliveryDate: 'May 22, 2026',
    items: [
      { description: 'Logitech MX Master 3S Mouse', quantity: 3 },
      { description: 'Logitech MX Keys S Keyboard', quantity: 3 },
    ],
  },
  {
    deliveryDate: 'May 25, 2026',
    items: [
      { description: 'Dell UltraSharp 27 4K USB-C Monitor', quantity: 3 },
      { description: 'Logitech C920 Pro HD Webcam', quantity: 3 },
    ],
  },
];

const PDF_VARIANTS = {
  po: [
    'PO-SAMPLE-001 — Amazon · GOODS · 4 goods + 2 services items (MacBook, Keyboard, Mouse, USB-C Hub + AppleCare)',
    'PO-SAMPLE-002 — Dell Technologies · GOODS · 5 goods + 2 services items (Server, Storage, Switch, UPS, Cables + Support)',
    'PO-SAMPLE-003 — B&H Photo · GOODS · 5 goods + 1 services items (Cinema Camera, Lenses, Tripod, Cards + Training)',
  ],
  dp: [
    'DP-SAMPLE-001 — Amazon · GOODS · 5 goods + 1 services · Amazon Order ID 114-3751791-7314618 · 3 shipment dates',
    'DP-SAMPLE-002 — Microsoft · SERVICES (email ingestion will skip — pure software/licensing order)',
    'DP-SAMPLE-003 — Cisco Systems · GOODS · 3 goods + 4 services items (Switches, Firewall, WiFi APs + contracts)',
  ],
};

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100" style={{ backgroundColor: '#f8fafc' }}>
        <span style={{ color: NAVY }}>{icon}</span>
        <h2 className="font-semibold text-gray-800">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function Btn({
  onClick, loading, disabled, variant = 'primary', icon, children, className = '',
}: {
  onClick: () => void; loading?: boolean; disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  icon?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  const styles: Record<string, string> = {
    primary:   'text-white',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    success:   'bg-green-600 text-white hover:bg-green-700',
    danger:    'bg-red-600 text-white hover:bg-red-700',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant]} ${className}`}
      style={variant === 'primary' ? { backgroundColor: NAVY, color: '#fff' } : {}}
    >
      {loading ? <RefreshCw size={14} className="animate-spin" /> : icon}
      {children}
    </button>
  );
}

function downloadBlob(data: Blob, filename: string) {
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function TestTools() {
  const [emailResult, setEmailResult]       = useState<EmailResult | null>(null);
  const [checkingEmail, setCheckingEmail]   = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [creatingOrder, setCreatingOrder]   = useState(false);

  const [amazonForm, setAmazonForm] = useState<MultiAmazonForm>({
    orderId: '114-3751791-7314618',  // matches DP-SAMPLE-001
    shipments: DEFAULT_SHIPMENTS,
  });

  const [orderForm, setOrderForm] = useState<TestOrderForm>({
    reference: 'DP-SAMPLE-001',     // use same reference as the downloaded DP PDF
    vendor: 'Amazon',
    endUser: 'Prof. Chaoyang',
    department: 'Machine Learning',
    vendorOrderId: '114-3751791-7314618',
    itemDescription: 'Dell Latitude 5540 Laptop 16GB 512GB',
    quantity: '3',
    expectedDeliveryDate: '2026-05-20',
  });

  // ── Download PDF variant ────────────────────────────────────────────────

  async function downloadPdf(type: 'po' | 'dp', n: number) {
    const key = `${type}-${n}`;
    setDownloadingPdf(key);
    try {
      const res = await apiClient.get(`/admin/samples/${type}-pdf/${n}`, { responseType: 'blob' });
      downloadBlob(res.data, `sample-${type.toUpperCase()}-00${n}.pdf`);
      toast.success(`sample-${type.toUpperCase()}-00${n}.pdf downloaded`);
    } catch {
      toast.error('Download failed');
    } finally {
      setDownloadingPdf(null);
    }
  }

  // ── Shipment / item editing ─────────────────────────────────────────────

  function addShipment() {
    setAmazonForm(f => ({
      ...f,
      shipments: [...f.shipments, { deliveryDate: '', items: [{ description: '', quantity: 1 }] }],
    }));
  }

  function removeShipment(si: number) {
    setAmazonForm(f => ({ ...f, shipments: f.shipments.filter((_, i) => i !== si) }));
  }

  function setShipmentDate(si: number, date: string) {
    setAmazonForm(f => {
      const shipments = f.shipments.map((s, i) => i === si ? { ...s, deliveryDate: date } : s);
      return { ...f, shipments };
    });
  }

  function addItem(si: number) {
    setAmazonForm(f => {
      const shipments = f.shipments.map((s, i) =>
        i === si ? { ...s, items: [...s.items, { description: '', quantity: 1 }] } : s
      );
      return { ...f, shipments };
    });
  }

  function removeItem(si: number, ii: number) {
    setAmazonForm(f => {
      const shipments = f.shipments.map((s, i) =>
        i === si ? { ...s, items: s.items.filter((_, j) => j !== ii) } : s
      );
      return { ...f, shipments };
    });
  }

  function setItemField(si: number, ii: number, field: keyof ShipItem, value: string | number) {
    setAmazonForm(f => {
      const shipments = f.shipments.map((s, i) =>
        i === si
          ? { ...s, items: s.items.map((it, j) => j === ii ? { ...it, [field]: value } : it) }
          : s
      );
      return { ...f, shipments };
    });
  }

  // ── Generate Amazon screenshot ───────────────────────────────────────────

  async function generateImage() {
    if (!amazonForm.orderId.trim()) { toast.error('Amazon Order ID is required'); return; }
    if (amazonForm.shipments.length === 0) { toast.error('Add at least one shipment'); return; }
    for (const s of amazonForm.shipments) {
      if (!s.deliveryDate.trim()) { toast.error('All shipments need a delivery date'); return; }
      if (s.items.length === 0)   { toast.error('Each shipment needs at least one item'); return; }
    }
    setGeneratingImage(true);
    try {
      const body = {
        orderId: amazonForm.orderId,
        shipments: amazonForm.shipments.map(s => ({
          deliveryDate: s.deliveryDate,
          items: s.items.map(it => ({ description: it.description || 'Item', quantity: it.quantity })),
        })),
      };
      const res = await apiClient.post('/admin/samples/amazon-image', body, { responseType: 'blob' });
      downloadBlob(res.data, `amazon-${amazonForm.orderId.replace(/-/g, '')}.png`);
      toast.success('Amazon screenshot downloaded');
    } catch {
      toast.error('Image generation failed');
    } finally {
      setGeneratingImage(false);
    }
  }

  // ── Create test order ────────────────────────────────────────────────────

  async function createTestOrder() {
    if (!orderForm.reference || !orderForm.vendorOrderId) {
      toast.error('Reference and Amazon Order ID are required');
      return;
    }
    setCreatingOrder(true);
    try {
      await apiClient.post('/orders', {
        type: 'PO',
        reference: orderForm.reference,
        vendor: orderForm.vendor,
        endUser: orderForm.endUser,
        department: orderForm.department,
        orderDate: new Date().toISOString().split('T')[0],
        vendorPlatform: 'AMAZON',
        vendorOrderId: orderForm.vendorOrderId,
        currency: 'AED',
        items: [{
          description: orderForm.itemDescription,
          quantity: parseInt(orderForm.quantity) || 1,
          goodType: 'GOODS',
          expectedDeliveryDate: orderForm.expectedDeliveryDate || undefined,
        }],
      });
      toast.success(`Order ${orderForm.reference} created — Amazon ID: ${orderForm.vendorOrderId}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create order');
    } finally {
      setCreatingOrder(false);
    }
  }

  // ── Check email ──────────────────────────────────────────────────────────

  async function checkEmail() {
    setCheckingEmail(true);
    setEmailResult(null);
    try {
      const res = await apiClient.post<EmailResult>('/admin/samples/check-email');
      setEmailResult(res.data);
      if (res.data.errors > 0) {
        toast.error(`Completed with ${res.data.errors} error(s)`);
      } else {
        toast.success(`Done — ${res.data.emailsProcessed} email(s) processed`);
      }
    } catch {
      toast.error('Email check failed');
    } finally {
      setCheckingEmail(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: NAVY }}>Test Tools</h1>
          <p className="text-sm text-gray-500 mt-0.5">Admin-only tools for testing email ingestion and PDF / Amazon flows</p>
        </div>
        <span className="px-3 py-1 text-xs font-semibold rounded-full" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>
          Admin Only
        </span>
      </div>

      {/* ── Section 1: Sample PDFs ──────────────────────────────────────── */}
      <Card title="Sample PO / DP PDFs" icon={<FileText size={18} />}>
        <p className="text-sm text-gray-500 mb-5">
          Download sample PDFs in the exact format the system expects. Send one as an email attachment
          to <strong>himanshu@idctechnologies.com</strong> to trigger auto order creation.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {(['po', 'dp'] as const).map(type => (
            <div key={type}>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                {type === 'po' ? 'Purchase Orders (PO)' : 'Direct Payments (DP)'}
              </p>
              <div className="space-y-2">
                {[1, 2, 3].map(n => {
                  const isServices = type === 'dp' && n === 2;
                  return (
                    <div key={n} className={`flex items-start gap-3 p-3 rounded-lg border ${isServices ? 'border-purple-200 bg-purple-50' : 'border-gray-100 bg-gray-50'}`}>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs leading-snug ${isServices ? 'text-purple-700' : 'text-gray-600'}`}>
                          {PDF_VARIANTS[type][n - 1]}
                        </p>
                        {isServices && (
                          <p className="text-xs text-purple-500 mt-0.5">
                            Email ingestion will skip this order (Order Category = SERVICES)
                          </p>
                        )}
                      </div>
                      <Btn
                        onClick={() => downloadPdf(type, n)}
                        loading={downloadingPdf === `${type}-${n}`}
                        icon={<Download size={13} />}
                        variant={type === 'po' ? 'primary' : 'secondary'}
                        className="shrink-0 !py-1.5 !px-3 !text-xs"
                      >
                        PDF {n}
                      </Btn>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Section 2: Amazon Screenshots ──────────────────────────────── */}
      <Card title="Amazon Delivery Screenshots" icon={<Image size={18} />}>
        <p className="text-sm text-gray-500 mb-4">
          Generate a realistic Amazon delivery confirmation PNG with multiple shipments, each having its
          own delivery date and items. Send as an email attachment — the system will OCR and update matching orders.
        </p>

        {/* Order ID */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-600 mb-1">Amazon Order ID</label>
          <input
            className="w-64 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono"
            placeholder="114-3751791-7314618"
            value={amazonForm.orderId}
            onChange={e => setAmazonForm(f => ({ ...f, orderId: e.target.value }))}
          />
        </div>

        {/* Shipments */}
        <div className="space-y-4 mb-4">
          {amazonForm.shipments.map((ship, si) => (
            <div key={si} className="border border-gray-200 rounded-xl p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-gray-700">Shipment {si + 1}</p>
                {amazonForm.shipments.length > 1 && (
                  <button
                    onClick={() => removeShipment(si)}
                    className="text-red-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Delivery Date (text in image, e.g. "May 20, 2026")
                </label>
                <input
                  className="w-56 border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white"
                  placeholder="May 20, 2026"
                  value={ship.deliveryDate}
                  onChange={e => setShipmentDate(si, e.target.value)}
                />
              </div>

              {/* Items in this shipment */}
              <div className="space-y-2">
                {ship.items.map((item, ii) => (
                  <div key={ii} className="flex items-center gap-2">
                    <input
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white"
                      placeholder="Item description"
                      value={item.description}
                      onChange={e => setItemField(si, ii, 'description', e.target.value)}
                    />
                    <input
                      type="number"
                      min={1}
                      className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white text-center"
                      value={item.quantity}
                      onChange={e => setItemField(si, ii, 'quantity', parseInt(e.target.value) || 1)}
                    />
                    <span className="text-xs text-gray-400">qty</span>
                    {ship.items.length > 1 && (
                      <button
                        onClick={() => removeItem(si, ii)}
                        className="text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={() => addItem(si)}
                className="mt-2 text-xs text-blue-600 hover:underline flex items-center gap-1"
              >
                <Plus size={11} /> Add Item
              </button>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <Btn onClick={addShipment} variant="secondary" icon={<Plus size={13} />}>
            Add Shipment
          </Btn>
          <Btn onClick={generateImage} loading={generatingImage} icon={<Download size={14} />} variant="success">
            Generate & Download PNG
          </Btn>
        </div>

        <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-100 text-xs text-amber-700">
          <strong>Note:</strong> The Amazon Order ID above must match the <strong>Amazon Order ID</strong> field
          on an existing order in the tracker for the delivery dates to be updated automatically.
        </div>
      </Card>

      {/* ── Section 3: Create Test Amazon Order ────────────────────────── */}
      <Card title="Create Test Amazon Order" icon={<Package size={18} />}>
        <p className="text-sm text-gray-500 mb-4">
          Creates a PO in the tracker with an Amazon Order ID so screenshot matching works end-to-end.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          {[
            { label: 'PO Reference', field: 'reference', placeholder: 'PO-AMAZON-TEST-01' },
            { label: 'Vendor', field: 'vendor', placeholder: 'Amazon' },
            { label: 'End User', field: 'endUser', placeholder: 'Prof. John Doe' },
            { label: 'Department', field: 'department', placeholder: 'IT' },
            { label: 'Amazon Order ID', field: 'vendorOrderId', placeholder: '114-3751791-7314618' },
            { label: 'Item Description', field: 'itemDescription', placeholder: 'MacBook Pro 16-inch' },
            { label: 'Quantity', field: 'quantity', placeholder: '2' },
            { label: 'Expected Delivery (YYYY-MM-DD)', field: 'expectedDeliveryDate', placeholder: '2026-05-20' },
          ].map(({ label, field, placeholder }) => (
            <div key={field}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                placeholder={placeholder}
                value={orderForm[field as keyof TestOrderForm]}
                onChange={e => setOrderForm(f => ({ ...f, [field]: e.target.value }))}
              />
            </div>
          ))}
        </div>

        <div className="flex gap-3 flex-wrap items-center">
          <Btn onClick={createTestOrder} loading={creatingOrder} icon={<Plus size={14} />}>
            Create Test Order
          </Btn>
          <button
            onClick={() => setOrderForm(f => ({ ...f, vendorOrderId: amazonForm.orderId }))}
            className="text-xs text-blue-600 hover:underline"
          >
            Sync Order ID from screenshot above
          </button>
        </div>
      </Card>

      {/* ── Section 4: Check Email ──────────────────────────────────────── */}
      <Card title="Check Mailbox Now" icon={<Mail size={18} />}>
        <p className="text-sm text-gray-500 mb-4">
          Manually triggers email ingestion — same as the scheduler that runs automatically every 10 min.
          After sending a test email, click here to process it immediately.
        </p>

        <Btn onClick={checkEmail} loading={checkingEmail} icon={<RefreshCw size={14} />}>
          Check Mailbox Now
        </Btn>

        {emailResult && (
          <div className="mt-5 space-y-3">
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
              {[
                { label: 'Emails',   value: emailResult.emailsProcessed,   color: '#1e40af' },
                { label: 'Orders',   value: emailResult.ordersCreated,      color: '#15803d' },
                { label: 'Items',    value: emailResult.itemsCreated,       color: '#15803d' },
                { label: 'Dupes',    value: emailResult.duplicatesSkipped,  color: '#92400e' },
                { label: 'Services', value: emailResult.servicesSkipped,    color: '#7e22ce' },
                { label: 'Amazon',  value: emailResult.amazonUpdates,       color: '#6d28d9' },
                { label: 'Errors',  value: emailResult.errors, color: emailResult.errors > 0 ? '#dc2626' : '#6b7280' },
              ].map(({ label, value, color }) => (
                <div key={label} className="text-center p-3 rounded-lg bg-gray-50 border border-gray-100">
                  <p className="text-xl font-bold" style={{ color }}>{value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {emailResult.amazonUpdateDetails.length > 0 && (
              <div className="p-3 rounded-lg bg-purple-50 border border-purple-100">
                <p className="text-xs font-semibold text-purple-700 mb-1 flex items-center gap-1">
                  <CheckCircle size={12} /> Amazon Delivery Date Updates
                </p>
                {emailResult.amazonUpdateDetails.map((d, i) => (
                  <p key={i} className="text-xs text-purple-700">{d}</p>
                ))}
              </div>
            )}

            {emailResult.errorMessages.length > 0 && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-100">
                <p className="text-xs font-semibold text-red-700 mb-1 flex items-center gap-1">
                  <AlertCircle size={12} /> Errors
                </p>
                {emailResult.errorMessages.map((e, i) => (
                  <p key={i} className="text-xs text-red-700">{e}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
