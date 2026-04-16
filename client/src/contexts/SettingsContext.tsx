import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';

interface SettingsContextValue {
  logoBase64: string | null;
  refreshLogo: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue>({
  logoBase64: null,
  refreshLogo: async () => {},
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [logoBase64, setLogoBase64] = useState<string | null>(null);

  const refreshLogo = useCallback(async () => {
    try {
      const res = await apiClient.get('/settings');
      setLogoBase64(res.data.logoBase64 || null);
    } catch {
      // Settings not critical — silently ignore
    }
  }, []);

  useEffect(() => {
    refreshLogo();
  }, [refreshLogo]);

  return (
    <SettingsContext.Provider value={{ logoBase64, refreshLogo }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
