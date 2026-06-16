import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_LANGUAGE_CODE, getLanguage, Language } from '../data/languages';

const KEY = 'empire.settings.lang';

type SettingsContextValue = {
  language: Language;
  setLanguageCode: (code: string) => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [code, setCode] = useState<string>(DEFAULT_LANGUAGE_CODE);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((saved) => {
      if (saved) setCode(saved);
    });
  }, []);

  const setLanguageCode = (next: string) => {
    setCode(next);
    AsyncStorage.setItem(KEY, next).catch(() => {});
  };

  const value = useMemo<SettingsContextValue>(
    () => ({ language: getLanguage(code), setLanguageCode }),
    [code],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider');
  return ctx;
}
