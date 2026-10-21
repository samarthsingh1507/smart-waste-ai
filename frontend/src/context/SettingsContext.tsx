import React, { createContext, useContext, useState, useEffect } from 'react';
import { Settings } from '../types';
import { api } from '../services/api';

interface SettingsContextType {
  settings: Settings;
  loading: boolean;
  refreshSettings: () => Promise<void>;
  updateSettings: (data: Partial<Settings>) => Promise<void>;
  formatCost: (amount: number) => string;
  formatWeight: (kg: number) => string;
}

const defaultSettings: Settings = {
  outlet_name: 'Green Olive Bistro & Banquet',
  currency: '₹',
  weight_unit: 'kg',
  safety_buffer_percent: 5.0,
  gemini_model: 'gemini-2.0-flash',
  gemini_configured: false,
  is_demo_mode: true,
};

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  loading: true,
  refreshSettings: async () => {},
  updateSettings: async () => {},
  formatCost: (amt) => `₹${amt.toFixed(2)}`,
  formatWeight: (kg) => `${kg.toFixed(2)} kg`,
});

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  const refreshSettings = async () => {
    try {
      const data = await api.getSettings();
      setSettings(data);
    } catch (err) {
      console.warn('Could not load settings from server, using defaults.', err);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (data: Partial<Settings>) => {
    try {
      const updated = await api.updateSettings(data);
      setSettings(updated);
    } catch (err) {
      console.error('Failed to update settings:', err);
      throw err;
    }
  };

  useEffect(() => {
    refreshSettings();
  }, []);

  const formatCost = (amount: number): string => {
    const symbol = settings.currency || '₹';
    return `${symbol}${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  const formatWeight = (kg: number): string => {
    if (settings.weight_unit === 'g') {
      return `${Math.round(kg * 1000)} g`;
    }
    return `${kg.toFixed(2)} kg`;
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        loading,
        refreshSettings,
        updateSettings,
        formatCost,
        formatWeight,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
