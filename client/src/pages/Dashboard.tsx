import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import {
  ShoppingCart, Package, AlertTriangle, Tag, Settings,
  CheckCircle, ArrowRight, TrendingUp,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts';
import apiClient from '../api/client';
import { formatDate } from '../utils/dateHelpers';

interface Summary {
  totalOrders: number;
  pendingDelivery: number;
  overdueItems: number;
  pendingAssetTagging: number;
  pendingITConfig: number;
  completed: number;
  byStatus: Array<{ status: string; count: number }>;
  overdueList: Array<{
    itemId: string; orderId: string; reference: string;
    vendor: string; description: string;
    expectedDeliveryDate: string; daysOverdue: number;
  }>;
  poCount: number;
  dpCount: number;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#94a3b8',
  IN_PROGRESS: '#f59e0b',
  PARTIALLY_DELIVERED: '#fb923c',
  FULLY_DELIVERED: '#34d399',
  COMPLETED: '#10b981',
  DELAYED: '#ef4444',
};

function formatStatus(s: string) {
  return s.split('_').map(w => w[0] + w.slice(1).toLowerCase()).join(' ');
}

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  valueColor: string;
  href: string;
}

function StatCard({ label, value, icon, iconBg, iconColor, valueColor, href }: StatCardProps) {
  const { t, isRTL } = useLanguage();
  return (
    <Link to={href} className="block h-full">
      <div className="h-full bg-white border border-gray-200 rounded-2xl p-5 flex flex-col justify-between hover:border-gray-300 hover:shadow-md transition-all group">
        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
          <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center`}>
            <span className={iconColor}>{icon}</span>
          </div>
        </div>
        <div className="mt-3">
          <p className={`text-4xl font-black ${valueColor} leading-none`}>{value}</p>
        </div>
        <div className={`mt-3 flex items-center gap-1 text-xs text-gray-400 group-hover:text-gray-600 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}>
          <span>{t('viewInTracker')}</span>
          <ArrowRight size={11} />
        </div>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/reports/summary')
      .then(r => {
        const d = r.data;
        const today = new Date();
        setSummary({
          totalOrders: d.totalOrders ?? 0,
          pendingDelivery: d.pendingDelivery ?? 0,
          overdueItems: d.overdueItems ?? 0,
          pendingAssetTagging: d.pendingAssetTagging ?? 0,
          pendingITConfig: d.pendingITConfig ?? 0,
          completed: d.handedOver ?? 0,
          poCount: d.totalPO ?? 0,
          dpCount: d.totalDP ?? 0,
          byStatus: Object.entries(d.ordersByStatus || {}).map(([status, count]) => ({
            status,
            count: count as number,
          })),
          overdueList: (d.overdueDetails || []).map((item: {
            itemId: string; orderId: string; orderRef: string;
            vendor: string; description: string; expectedDeliveryDate: string;
          }) => ({
            itemId: item.itemId,
            orderId: item.orderId,
            reference: item.orderRef,
            vendor: item.vendor,
            description: item.description,
            expectedDeliveryDate: item.expectedDeliveryDate,
            daysOverdue: item.expectedDeliveryDate
              ? Math.floor((today.getTime() - new Date(item.expectedDeliveryDate).getTime()) / (1000 * 60 * 60 * 24))
              : 0,
          })),
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Loading…</p>
      </div>
    </div>
  );
  if (!summary) return null;

  const pieData = [
    { name: 'Purchase Orders', value: summary.poCount },
    { name: 'Direct Payments', value: summary.dpCount },
  ];

  const stats: StatCardProps[] = [
    { label: t('totalOrders'),      value: summary.totalOrders,         icon: <ShoppingCart size={17}/>, iconBg: 'bg-blue-50',   iconColor: 'text-blue-500',   valueColor: 'text-blue-600',   href: '/tracker' },
    { label: t('pendingItems'),     value: summary.pendingDelivery,     icon: <Package size={17}/>,      iconBg: 'bg-amber-50',  iconColor: 'text-amber-500',  valueColor: 'text-amber-600',  href: '/tracker?status=PENDING,IN_PROGRESS' },
    { label: t('overdue'),          value: summary.overdueItems,        icon: <AlertTriangle size={17}/>,iconBg: 'bg-red-50',    iconColor: 'text-red-500',    valueColor: 'text-red-600',    href: '/tracker?status=DELAYED' },
    { label: t('pendingAssetTag'),  value: summary.pendingAssetTagging, icon: <Tag size={17}/>,          iconBg: 'bg-orange-50', iconColor: 'text-orange-500', valueColor: 'text-orange-600', href: '/tracker?status=IN_PROGRESS,PARTIALLY_DELIVERED' },
    { label: t('pendingITConfig'),  value: summary.pendingITConfig,     icon: <Settings size={17}/>,     iconBg: 'bg-purple-50', iconColor: 'text-purple-500', valueColor: 'text-purple-600', href: '/tracker?status=IN_PROGRESS,PARTIALLY_DELIVERED' },
    { label: t('completed'),        value: summary.completed,           icon: <CheckCircle size={17}/>,  iconBg: 'bg-green-50',  iconColor: 'text-green-500',  valueColor: 'text-green-600',  href: '/tracker?status=COMPLETED' },
  ];

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t('dashboard')}</h1>
          <p className="text-sm text-gray-400">{t('procurementOverview')}</p>
        </div>
        <Link to="/tracker" className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium">
          {t('allOrders')} <ArrowRight size={13} />
        </Link>
      </div>

      {/* Stat cards — all same height via grid rows */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 auto-rows-fr">
        {stats.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Bar chart — spans 2 cols */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={14} className="text-blue-500" />
            <p className="text-sm font-semibold text-gray-800">{t('ordersByStatus')}</p>
          </div>
          <p className="text-xs text-gray-400 mb-4">{t('clickBarToFilter')}</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={summary.byStatus.map(d => ({ ...d, name: formatStatus(d.status) }))}
              margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                cursor={{ fill: '#f8fafc' }}
              />
              <Bar
                dataKey="count"
                name="Orders"
                radius={[5, 5, 0, 0]}
                maxBarSize={40}
                style={{ cursor: 'pointer' }}
                onClick={(data: { status: string }) => navigate(`/tracker?status=${data.status}`)}
              >
                {summary.byStatus.map((e, i) => <Cell key={i} fill={STATUS_COLORS[e.status] || '#94a3b8'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Donut chart */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-md transition-shadow flex flex-col">
          <p className="text-sm font-semibold text-gray-800 mb-0.5">{t('orderTypeSplit')}</p>
          <p className="text-xs text-gray-400 mb-3">{t('clickSliceToFilter')}</p>

          <div className="flex-1">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%" cy="50%"
                  innerRadius={48} outerRadius={68}
                  dataKey="value" paddingAngle={4} strokeWidth={0}
                  style={{ cursor: 'pointer' }}
                  onClick={(data: { name: string }) => {
                    const type = data.name === 'Purchase Orders' ? 'PO' : 'DP';
                    navigate(`/tracker?type=${type}`);
                  }}
                >
                  <Cell fill="#3b82f6" />
                  <Cell fill="#8b5cf6" />
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#64748b' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="bg-blue-50 rounded-xl py-2.5 text-center">
              <p className="text-2xl font-black text-blue-600 leading-none">{summary.poCount}</p>
              <p className="text-[10px] text-blue-400 font-semibold mt-1 uppercase tracking-wide">PO</p>
            </div>
            <div className="bg-purple-50 rounded-xl py-2.5 text-center">
              <p className="text-2xl font-black text-purple-600 leading-none">{summary.dpCount}</p>
              <p className="text-[10px] text-purple-400 font-semibold mt-1 uppercase tracking-wide">DP</p>
            </div>
          </div>
        </div>
      </div>

      {/* Overdue list */}
      {summary.overdueList.length > 0 && (
        <div className="bg-white border border-red-100 rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 bg-red-50 border-b border-red-100 flex items-center gap-2.5">
            <AlertTriangle size={14} className="text-red-500" />
            <p className="text-sm font-bold text-red-700">{t('overdueDeliveries')}</p>
            <span className="ml-auto bg-red-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center">
              {summary.overdueList.length}
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {summary.overdueList.map(item => (
              <Link key={item.itemId} to={`/orders/${item.orderId}`}
                className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors">
                <div className="w-11 h-11 bg-red-50 rounded-xl flex flex-col items-center justify-center flex-shrink-0">
                  <span className="text-base font-black text-red-600 leading-none">{item.daysOverdue}</span>
                  <span className="text-[9px] text-red-400 font-semibold uppercase">days</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{item.reference}</span>
                    <span className="text-xs text-gray-400 truncate">{item.vendor}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-700 truncate">{item.description}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-gray-400">Expected</p>
                  <p className="text-xs font-medium text-gray-600">{formatDate(item.expectedDeliveryDate)}</p>
                </div>
                <ArrowRight size={13} className="text-gray-300 flex-shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
