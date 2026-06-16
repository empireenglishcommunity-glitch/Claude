import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_LANGUAGE_CODE, getLanguage, Language } from '../data/languages';

const LANG_KEY = 'empire.settings.lang';
const VOICE_KEY = 'empire.settings.authenticVoice';

type SettingsContextValue = {
  language: Language;
  setLanguageCode: (code: string) => void;
  /** When true, pronunciation uses the online "Authentic" neural voice (needs internet). */
  authenticVoice: boolean;
  setAuthenticVoice: (on: boolean) => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [code, setCode] = useState<string>(DEFAULT_LANGUAGE_CODE);
  const [authenticVoice, setAuthentic] = useState<boolean>(false);

  useEffect(() => {
    AsyncStorage.getItem(LANG_KEY).then((saved) => {
      if (saved) setCode(saved);
    });
    AsyncStorage.getItem(VOICE_KEY).then((saved) => {
      if (saved != null) setAuthentic(saved === '1');
    });
  }, []);

  const setLanguageCode = (next: string) => {
    setCode(next);
    AsyncStorage.setItem(LANG_KEY, next).catch(() => {});
  };

  const setAuthenticVoice = (on: boolean) => {
    setAuthentic(on);
    AsyncStorage.setItem(VOICE_KEY, on ? '1' : '0').catch(() => {});
  };

  const value = useMemo<SettingsContextValue>(
    () => ({ language: getLanguage(code), setLanguageCode, authenticVoice, setAuthenticVoice }),
    [code, authenticVoice],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider');
  return ctx;
}
