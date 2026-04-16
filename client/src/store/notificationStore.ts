import { create } from 'zustand';
import type { Notification } from '../types';

interface NotifStore {
  notifications: Notification[];
  unreadCount: number;
  setNotifications: (n: Notification[]) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

export const useNotificationStore = create<NotifStore>((set) => ({
  notifications: [],
  unreadCount: 0,
  setNotifications: (notifications: Notification[]) => {
    const unreadCount = notifications.filter((n) => !n.isRead).length;
    set({ notifications, unreadCount });
  },
  markRead: (id: string) => {
    set((state) => {
      const notifications = state.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      );
      const unreadCount = notifications.filter((n) => !n.isRead).length;
      return { notifications, unreadCount };
    });
  },
  markAllRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    }));
  },
}));
