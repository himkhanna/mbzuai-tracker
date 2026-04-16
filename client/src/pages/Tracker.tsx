import { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { RefreshCw, PlusCircle, Upload, Download, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import FilterBar from '../components/tracker/FilterBar';
import type { FilterValues, OrderStatus } from '../types';
import OrderTable from '../components/tracker/OrderTable';
import apiClient from '../api/client';
import { useAuthStore } from '../store/authStore';
import type { Order } from '../types';

export default function Tracker() {
  const user = useAuthStore(s => s.user);
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Initialise filters from URL query params (e.g. ?status=DELAYED from Dashboard)
  const initFilters = (): FilterValues => {
    const statusParam = searchParams.get('status');
    const typeParam = searchParams.get('type');
    return {
      search: '',
      type: (typeParam as 'PO' | 'DP' | '') || '',
      statuses: statusParam ? (statusParam.split(',') as OrderStatus[]) : [],
      dateFrom: '',
      dateTo: '',
    };
  };

  const [filters, setFilters] = useState<FilterValues>(initFilters);

  const fetchOrders = useCallback(async (f: FilterValues) => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (f.search) params.search = f.search;
      if (f.type) params.type = f.type;
      if (f.statuses.length) params.status = f.statuses.join(',');
      if (f.dateFrom) params.dateFrom = f.dateFrom;
      if (f.dateTo) params.dateTo = f.dateTo;
      const res = await apiClient.get('/orders', { params });
      const data = res.data.data ?? res.data;
      setOrders(Array.isArray(data) ? data : []);
      setTotal(res.data.meta?.total ?? (Array.isArray(data) ? data.length : 0));
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(filters); }, [fetchOrders]);

  function handleFilter(f: FilterValues) {
    setFilters(f);
    fetchOrders(f);
  }

  const { t } = useLanguage();
  const canCreate = user && ['ADMIN', 'VENDOR_MANAGEMENT', 'PROCUREMENT'].includes(user.role);
  const canImport = user && ['ADMIN', 'VENDOR_MANAGEMENT', 'PROCUREMENT'].includes(user.role);

  const poFileRef = useRef<HTMLInputElement>(null);
  const dpFileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState<'po' | 'dp' | 'email' | null>(null);

  async function handleImport(type: 'po' | 'dp', file: File) {
    setImporting(type);
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await apiClient.post(`/import/${type}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const { ordersCreated, itemsCreated, duplicatesSkipped, errors } = res.data;
      toast.success(`${type.toUpperCase()} import: ${ordersCreated} order(s), ${itemsCreated} item(s) created`);
      if (duplicatesSkipped > 0) toast(`${duplicatesSkipped} duplicate(s) skipped`, { icon: 'ℹ️' });
      if (errors?.length) toast.error(`${errors.length} error(s) — check console`, { duration: 5000 });
      fetchOrders(filters);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || `${type.toUpperCase()} import failed`);
    } finally {
      setImporting(null);
    }
  }

  async function handleEmailTrigger() {
    setImporting('email');
    try {
      const res = await apiClient.post('/import/email-trigger');
      toast.success(res.data.message || 'Email ingestion complete');
      fetchOrders(filters);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Email ingestion failed');
    } finally {
      setImporting(null);
    }
  }

  function downloadTemplate(type: 'po' | 'dp') {
    window.open(`${apiClient.defaults.baseURL}/import/template/${type}`, '_blank');
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-gray-500">{total} {t('orders')}</p>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => fetchOrders(filters)}
            className="flex items-center gap-1.5 text-sm border border-gray-300 bg-white rounded-lg px-3 py-2 hover:bg-gray-50"
          >
            <RefreshCw size={14} /> {t('refresh')}
          </button>

          {canImport && (
            <>
              {/* Hidden file inputs */}
              <input ref={poFileRef} type="file" accept=".xlsx" className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) { handleImport('po', e.target.files[0]); e.target.value = ''; } }} />
              <input ref={dpFileRef} type="file" accept=".xlsx" className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) { handleImport('dp', e.target.files[0]); e.target.value = ''; } }} />

              {/* PO import */}
              <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                <button onClick={() => poFileRef.current?.click()} disabled={!!importing}
                  className="flex items-center gap-1.5 text-sm bg-white px-3 py-2 hover:bg-gray-50 disabled:opacity-60">
                  <Upload size={13} /> {importing === 'po' ? 'Importing…' : 'Import PO'}
                </button>
                <button onClick={() => downloadTemplate('po')}
                  className="flex items-center gap-1 text-xs border-l border-gray-300 px-2 py-2 hover:bg-gray-50 text-gray-400"
                  title="Download PO template">
                  <Download size={12} />
                </button>
              </div>

              {/* DP import */}
              <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                <button onClick={() => dpFileRef.current?.click()} disabled={!!importing}
                  className="flex items-center gap-1.5 text-sm bg-white px-3 py-2 hover:bg-gray-50 disabled:opacity-60">
                  <Upload size={13} /> {importing === 'dp' ? 'Importing…' : 'Import DP'}
                </button>
                <button onClick={() => downloadTemplate('dp')}
                  className="flex items-center gap-1 text-xs border-l border-gray-300 px-2 py-2 hover:bg-gray-50 text-gray-400"
                  title="Download DP template">
                  <Download size={12} />
                </button>
              </div>

              {/* Email trigger (manual fallback) */}
              <button onClick={handleEmailTrigger} disabled={!!importing}
                className="flex items-center gap-1.5 text-sm border border-gray-300 bg-white rounded-lg px-3 py-2 hover:bg-gray-50 disabled:opacity-60"
                title="Manually trigger Oracle email ingestion">
                <Mail size={14} /> {importing === 'email' ? 'Checking…' : 'Check Email'}
              </button>
            </>
          )}

          {canCreate && (
            <Link to="/orders/new" className="flex items-center gap-1.5 text-sm bg-blue-600 text-white rounded-lg px-3 py-2 hover:bg-blue-700">
              <PlusCircle size={14} /> {t('newOrder')}
            </Link>
          )}
        </div>
      </div>

      <FilterBar onFilter={handleFilter} initialFilters={filters} />

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 flex items-center justify-center h-48 text-sm text-gray-400">
          {t('loading')}
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 flex items-center justify-center h-48 text-sm text-gray-400">
          {t('noOrdersFound')}
        </div>
      ) : (
        <OrderTable orders={orders} onRefresh={() => fetchOrders(filters)} userRole={user?.role ?? 'STORE'} />
      )}
    </div>
  );
}
