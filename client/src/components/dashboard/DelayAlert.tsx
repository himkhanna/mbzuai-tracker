import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ExternalLink } from 'lucide-react';
import { formatDate } from '../../utils/dateHelpers';

interface OverdueItem {
  id: string;
  reference: string;
  vendor: string;
  description: string;
  expectedDeliveryDate: string;
  daysOverdue: number;
  orderId: string;
}

interface DelayAlertProps {
  items: OverdueItem[];
}

const DelayAlert: React.FC<DelayAlertProps> = ({ items }) => {
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500" />
          Overdue Deliveries
        </h3>
        <p className="text-sm text-gray-500 text-center py-4">No overdue items — all on track!</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-red-500" />
        Overdue Deliveries
        <span className="ml-auto bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 rounded-full">
          {items.length}
        </span>
      </h3>
      <div className="divide-y divide-gray-100">
        {items.map((item) => (
          <div key={item.id} className="py-3 flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                  {item.reference}
                </span>
                <span className="text-xs text-gray-500 truncate">{item.vendor}</span>
              </div>
              <p className="text-sm text-gray-800 mt-1 truncate">{item.description}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Expected: {formatDate(item.expectedDeliveryDate)}
              </p>
            </div>
            <div className="flex-shrink-0 flex flex-col items-end gap-1">
              <span className="text-xs font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                {item.daysOverdue}d overdue
              </span>
              <Link
                to={`/orders/${item.orderId}`}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                View <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DelayAlert;
