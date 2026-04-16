import React, { useState, useRef, useEffect } from 'react';
import { Search, Filter, ChevronDown, X } from 'lucide-react';
import type { FilterValues } from '../../types';

interface FilterBarProps {
  onFilter: (filters: FilterValues) => void;
  initialFilters?: FilterValues;
}

const ALL_STATUSES: { value: OrderStatus; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'PARTIALLY_DELIVERED', label: 'Partially Delivered' },
  { value: 'FULLY_DELIVERED', label: 'Fully Delivered' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'DELAYED', label: 'Delayed' },
];

const defaultFilters: FilterValues = {
  search: '',
  type: '',
  statuses: [],
  dateFrom: '',
  dateTo: '',
};

const FilterBar: React.FC<FilterBarProps> = ({ onFilter, initialFilters }) => {
  const [filters, setFilters] = useState<FilterValues>(initialFilters ?? defaultFilters);
  const [statusOpen, setStatusOpen] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setStatusOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const update = (partial: Partial<FilterValues>) => {
    const next = { ...filters, ...partial };
    setFilters(next);
    onFilter(next);
  };

  const toggleStatus = (status: OrderStatus) => {
    const statuses = filters.statuses.includes(status)
      ? filters.statuses.filter((s) => s !== status)
      : [...filters.statuses, status];
    update({ statuses });
  };

  const clearAll = () => {
    setFilters(defaultFilters);
    onFilter(defaultFilters);
  };

  const hasActiveFilters =
    filters.search ||
    filters.type ||
    filters.statuses.length > 0 ||
    filters.dateFrom ||
    filters.dateTo;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex flex-wrap gap-3 items-end">
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-gray-600 mb-1">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Reference, vendor, end user..."
              value={filters.search}
              onChange={(e) => update({ search: e.target.value })}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Type */}
        <div className="w-36">
          <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
          <select
            value={filters.type}
            onChange={(e) => update({ type: e.target.value as OrderType | '' })}
            className="w-full py-2 px-3 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">All Types</option>
            <option value="PO">PO</option>
            <option value="DP">DP</option>
          </select>
        </div>

        {/* Status multi-select */}
        <div className="w-48 relative" ref={statusRef}>
          <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
          <button
            onClick={() => setStatusOpen((p) => !p)}
            className="w-full flex items-center justify-between py-2 px-3 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-left"
          >
            <span className="text-gray-700">
              {filters.statuses.length === 0
                ? 'All Statuses'
                : `${filters.statuses.length} selected`}
            </span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>
          {statusOpen && (
            <div className="absolute top-full left-0 mt-1 w-52 bg-white border border-gray-200 rounded-md shadow-lg z-20">
              {ALL_STATUSES.map((s) => (
                <label
                  key={s.value}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm text-gray-700"
                >
                  <input
                    type="checkbox"
                    checked={filters.statuses.includes(s.value)}
                    onChange={() => toggleStatus(s.value)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  {s.label}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Date From */}
        <div className="w-38">
          <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => update({ dateFrom: e.target.value })}
            className="w-full py-2 px-3 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Date To */}
        <div className="w-38">
          <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => update({ dateTo: e.target.value })}
            className="w-full py-2 px-3 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Clear */}
        {hasActiveFilters && (
          <div className="flex items-end">
            <button
              onClick={clearAll}
              className="flex items-center gap-1.5 py-2 px-3 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          </div>
        )}

        <div className="flex items-end ml-auto">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Filter className="w-3.5 h-3.5" />
            Filters
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterBar;
