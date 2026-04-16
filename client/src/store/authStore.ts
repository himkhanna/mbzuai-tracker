import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Role } from '../types';

interface AuthStore {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  hasRole: (...roles: Role[]) => boolean;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      setAuth: (user: User, token: string) => {
        localStorage.setItem('token', token);
        set({ user, token });
      },
      clearAuth: () => {
        localStorage.removeItem('token');
        set({ user: null, token: null });
      },
      hasRole: (...roles: Role[]) => {
        const { user } = get();
        if (!user) return false;
        return roles.includes(user.role);
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
);
