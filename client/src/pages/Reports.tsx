import { useState, useCallback, useEffect } from 'react';
import { Download } from 'lucide-react';
import toast from 'react-hot-toast';
import FilterBar from '../components/tracker/FilterBar';
import apiClient from '../api/client';
import StatusBadge from '../components/shared/StatusBadge';
import type { FilterValues } from '../types';

interface ReportRow {
  reference: string;
  type: string;
  vendor: string;
  description: string;
  quantity: number;
  endUser: string;
  department?: string;
  plannedDelivery?: string | null;
  actualDelivery?: string | null;
  currentStatus: string;
  daysDelayed?: number;
}

const defaultFilters: FilterValues = { search: '', type: '', statuses: [], dateFrom: '', dateTo: '' };

export default function Reports() {
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<FilterValues>(defaultFilters);

  const buildParams = (f: FilterValues) => {
    const p: Record<string, string> = {};
    if (f.search) p.search = f.search;
    if (f.type) p.type = f.type;
    if (f.statuses.length) p.status = f.statuses.join(',');
    if (f.dateFrom) p.dateFrom = f.dateFrom;
    if (f.dateTo) p.dateTo = f.dateTo;
    return p;
  };

  const handleFilter = useCallback(async (f: FilterValues) => {
    setFilters(f);
    setLoading(true);
    try {
      const res = await apiClient.get('/reports/tracker', { params: buildParams(f) });
      setRows(res.data);
    } catch {
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-load all data on mount
  useEffect(() => { handleFilter(defaultFilters); }, [handleFilter]);

  async function exportExcel() {
    try {
      const res = await apiClient.get('/reports/export/excel', {
        params: buildParams(filters),
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mbzuai-tracker-report.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Export failed');
    }
  }

  async function exportPDF() {
    try {
      const res = await apiClient.get('/reports/export/pdf', {
        params: buildParams(filters),
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mbzuai-tracker-report.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Export failed');
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Reports</h2>
          <p className="text-sm text-gray-500">Filter and export tracker data</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportExcel} className="flex items-center gap-1.5 text-sm border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-50">
            <Download size={14} /> Excel
          </button>
          <button onClick={exportPDF} className="flex items-center gap-1.5 text-sm bg-red-600 text-white rounded-lg px-3 py-2 hover:bg-red-700">
            <Download size={14} /> PDF
          </button>
        </div>
      </div>

      <FilterBar onFilter={handleFilter} />

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-gray-500">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-gray-400">
            Apply filters to preview report data
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Reference</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Vendor</th>
                  <th className="px-4 py-3 text-left">Item</th>
                  <th className="px-4 py-3 text-left">Qty</th>
                  <th className="px-4 py-3 text-left">End User</th>
                  <th className="px-4 py-3 text-left">Planned Delivery</th>
                  <th className="px-4 py-3 text-left">Actual Delivery</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Days Overdue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-blue-600">{row.reference}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${row.type === 'PO' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{row.type}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{row.vendor}</td>
                    <td className="px-4 py-3 text-gray-700 max-w-xs truncate">{row.description}</td>
                    <td className="px-4 py-3">{row.quantity}</td>
                    <td className="px-4 py-3">{row.endUser}</td>
                    <td className="px-4 py-3 text-gray-500">{row.plannedDelivery ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{row.actualDelivery ?? '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={row.currentStatus} type="item" /></td>
                    <td className="px-4 py-3">
                      {row.daysDelayed ? <span className="text-red-600 font-medium">{row.daysDelayed}d</span> : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
