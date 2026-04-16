import { useState } from 'react';
import { RefreshCw, Package, Truck, CheckCircle, Clock, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '../../api/client';

interface SyncEvent {
  date: string;
  description: string;
  location: string;
}

interface SyncData {
  status: string;
  statusCode: string;
  trackingNumber: string;
  carrier: string;
  estimatedDelivery: string;
  lastEvent: string;
  lastEventDate: string;
  events: SyncEvent[];
  syncedAt?: string;
}

interface Props {
  orderId: string;
  platform: string;
  vendorOrderId: string;
  lastSynced?: string | null;
  initialData?: SyncData | null;
}

const PLATFORM_META: Record<string, { label: string; color: string; bg: string }> = {
  amazon: { label: 'Amazon',  color: '#FF9900', bg: '#FFF8EC' },
  noon:   { label: 'Noon',    color: '#F5A623', bg: '#FFFBF0' },
};

const STATUS_ICON: Record<string, JSX.Element> = {
  DELIVERED:        <CheckCircle size={14} className="text-green-500" />,
  OUT_FOR_DELIVERY: <Truck size={14} className="text-blue-500" />,
  SHIPPED:          <Package size={14} className="text-blue-400" />,
};

function formatSyncTime(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleString('en-AE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function VendorSyncPanel({ orderId, platform, vendorOrderId, lastSynced, initialData }: Props) {
  const [syncing, setSyncing] = useState(false);
  const [data, setData] = useState<SyncData | null>(initialData ?? null);
  const [syncedAt, setSyncedAt] = useState<string | null>(lastSynced ?? null);
  const [expanded, setExpanded] = useState(false);

  const meta = PLATFORM_META[platform] ?? { label: platform, color: '#666', bg: '#f9f9f9' };

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await apiClient.post(`/vendor-sync/${orderId}`, {});
      setData(res.data);
      setSyncedAt(res.data.syncedAt);
      toast.success(`${meta.label} order synced`);
    } catch {
      toast.error('Sync failed');
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4" style={{ backgroundColor: meta.bg }}>
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0"
            style={{ backgroundColor: meta.color }}
          >
            {meta.label[0]}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">{meta.label} Order Tracking</p>
            <p className="text-xs text-gray-500">Order ID: <span className="font-mono">{vendorOrderId}</span></p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {syncedAt && (
            <span className="text-xs text-gray-400 hidden sm:block">
              Last synced: {formatSyncTime(syncedAt)}
            </span>
          )}
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg text-white transition-colors disabled:opacity-60"
            style={{ backgroundColor: meta.color }}
          >
            <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing…' : 'Sync Now'}
          </button>
        </div>
      </div>

      {/* Status summary */}
      {data ? (
        <div className="px-5 py-4 bg-white space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Status</p>
              <div className="flex items-center gap-1.5 font-medium text-gray-800">
                {STATUS_ICON[data.statusCode] ?? <Clock size={14} className="text-gray-400" />}
                {data.status}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Carrier</p>
              <p className="font-medium text-gray-800">{data.carrier}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Tracking #</p>
              <p className="font-mono text-xs text-blue-600">{data.trackingNumber}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Est. Delivery</p>
              <p className="font-medium text-gray-800">{data.estimatedDelivery}</p>
            </div>
          </div>

          {/* Timeline toggle */}
          <button
            onClick={() => setExpanded((p) => !p)}
            className="text-xs text-blue-600 hover:underline"
          >
            {expanded ? 'Hide' : 'Show'} shipment timeline ({data.events.length} events)
          </button>

          {expanded && (
            <div className="space-y-3 pt-1">
              {data.events.map((ev, i) => (
                <div key={i} className="flex gap-3 text-sm">
                  <div className="flex flex-col items-center">
                    <div className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${i === 0 ? 'bg-blue-500' : 'bg-gray-300'}`} />
                    {i < data.events.length - 1 && <div className="w-px flex-1 bg-gray-200 mt-1" />}
                  </div>
                  <div className="pb-3">
                    <p className={`font-medium ${i === 0 ? 'text-gray-900' : 'text-gray-500'}`}>{ev.description}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                      <span>{ev.date}</span>
                      <span>·</span>
                      <MapPin size={10} />
                      <span>{ev.location}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="px-5 py-6 bg-white text-center text-sm text-gray-400">
          Click <strong>Sync Now</strong> to fetch the latest delivery status from {meta.label}.
        </div>
      )}
    </div>
  );
}
