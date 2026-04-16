import React, { useEffect, useRef, useState } from 'react';
import { Bell, X, CheckCheck } from 'lucide-react';
import { useNotificationStore } from '../../store/notificationStore';
import { formatRelativeTime } from '../../utils/dateHelpers';
import apiClient from '../../api/client';

const NotificationBell: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, setNotifications, markRead, markAllRead } =
    useNotificationStore();
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await apiClient.get('/notifications');
      setNotifications(res.data.notifications || res.data);
    } catch {
      // silent fail — backend may not be running
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await apiClient.put(`/notifications/${id}/read`, {});
      markRead(id);
    } catch {
      markRead(id); // optimistic
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiClient.put('/notifications/read-all', {});
      markAllRead();
    } catch {
      markAllRead(); // optimistic
    }
  };

  const typeColors: Record<string, string> = {
    DELIVERY_DUE: 'bg-blue-100 text-blue-700',
    DELIVERY_OVERDUE: 'bg-red-100 text-red-700',
    ITEM_RECEIVED: 'bg-green-100 text-green-700',
    ASSET_TAGGING_REQUIRED: 'bg-orange-100 text-orange-700',
    IT_CONFIG_REQUIRED: 'bg-purple-100 text-purple-700',
    HANDOVER_READY: 'bg-teal-100 text-teal-700',
    ORDER_CREATED: 'bg-blue-100 text-blue-700',
    STATUS_CHANGED: 'bg-yellow-100 text-yellow-700',
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((p) => !p)}
        className="relative p-2 rounded-md transition-colors"
        style={{ color: '#0C2945' }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(12,41,69,0.12)')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" style={{ color: '#0C2945' }} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[480px] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-800">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded hover:bg-gray-100"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Notifications list */}
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => !n.isRead && handleMarkRead(n.id)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    !n.isRead ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                            typeColors[n.type] || 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {n.type.replace(/_/g, ' ')}
                        </span>
                        {!n.isRead && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-sm font-medium text-gray-800 truncate">{n.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {formatRelativeTime(n.createdAt)}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
