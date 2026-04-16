import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '../api/client';
import { formatDate } from '../utils/dateHelpers';
import type { AuditLog as AuditLogType } from '../types';

export default function AuditLog() {
  const [logs, setLogs] = useState<AuditLogType[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ entityType: '', dateFrom: '', dateTo: '' });

  async function fetchLogs() {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filters.entityType) params.entityType = filters.entityType;
      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo) params.dateTo = filters.dateTo;
      const res = await apiClient.get('/audit', { params });
      setLogs(res.data.data || []);
    } catch {
      toast.error('Failed to load audit log');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchLogs(); }, []);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Audit Log</h2>
          <p className="text-sm text-gray-500">{logs.length} records</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3">
        <select
          value={filters.entityType}
          onChange={(e) => setFilters({ ...filters, entityType: e.target.value })}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Entity Types</option>
          <option value="order">Order</option>
          <option value="item">Item</option>
          <option value="user">User</option>
        </select>
        <input
          type="date"
          value={filters.dateFrom}
          onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
          placeholder="From date"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="date"
          value={filters.dateTo}
          onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
          placeholder="To date"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={fetchLogs}
          className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm hover:bg-blue-700"
        >
          Apply
        </button>
        <button
          onClick={() => setFilters({ entityType: '', dateFrom: '', dateTo: '' })}
          className="border border-gray-300 text-gray-700 rounded-lg px-4 py-2 text-sm hover:bg-gray-50"
        >
          Clear
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-gray-500">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Timestamp</th>
                  <th className="px-4 py-3 text-left">User</th>
                  <th className="px-4 py-3 text-left">Entity</th>
                  <th className="px-4 py-3 text-left">Action</th>
                  <th className="px-4 py-3 text-left">Field</th>
                  <th className="px-4 py-3 text-left">Old Value</th>
                  <th className="px-4 py-3 text-left">New Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(log.timestamp)}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{log.user?.name}</div>
                      <div className="text-xs text-gray-400">{log.user?.role}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">
                        {log.entityType}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">{log.action}</td>
                    <td className="px-4 py-3 text-gray-600">{log.fieldName || '—'}</td>
                    <td className="px-4 py-3">
                      {log.oldValue ? (
                        <span className="text-red-600 bg-red-50 px-1.5 py-0.5 rounded text-xs">{log.oldValue}</span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {log.newValue ? (
                        <span className="text-green-600 bg-green-50 px-1.5 py-0.5 rounded text-xs">{log.newValue}</span>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">No audit records found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
