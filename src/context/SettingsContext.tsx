import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_LANGUAGE_CODE, getLanguage, Language } from '../data/languages';

const LANG_KEY = 'empire.settings.lang';
const VOICE_KEY = 'empire.settings.authenticVoice';
const NAME_KEY = 'empire.profile.name';
const PHOTO_KEY = 'empire.profile.photo';
const AIKEY_KEY = 'empire.settings.aiKey';

type SettingsContextValue = {
  language: Language;
  setLanguageCode: (code: string) => void;
  /** When true, pronunciation uses the online "Authentic" voice (with a distinct fallback). */
  authenticVoice: boolean;
  setAuthenticVoice: (on: boolean) => void;
  /** The learner's display name (shown in My Empire and the leaderboard). */
  profileName: string;
  setProfileName: (name: string) => void;
  /** Local URI of the learner's profile photo, if set. */
  profilePhoto: string | null;
  setProfilePhoto: (uri: string | null) => void;
  /** OpenAI API key — stored ONLY on the device, never in the repo. Powers AI features. */
  aiKey: string;
  setAiKey: (key: string) => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [code, setCode] = useState<string>(DEFAULT_LANGUAGE_CODE);
  const [authenticVoice, setAuthentic] = useState<boolean>(false);
  const [profileName, setName] = useState<string>('');
  const [profilePhoto, setPhoto] = useState<string | null>(null);
  const [aiKey, setAiKeyState] = useState<string>('');

  useEffect(() => {
    AsyncStorage.getItem(LANG_KEY).then((saved) => {
      if (saved) setCode(saved);
    });
    AsyncStorage.getItem(VOICE_KEY).then((saved) => {
      if (saved != null) setAuthentic(saved === '1');
    });
    AsyncStorage.getItem(NAME_KEY).then((saved) => {
      if (saved) setName(saved);
    });
    AsyncStorage.getItem(PHOTO_KEY).then((saved) => {
      if (saved) setPhoto(saved);
    });
    AsyncStorage.getItem(AIKEY_KEY).then((saved) => {
      if (saved) setAiKeyState(saved);
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

  const setProfileName = (name: string) => {
    setName(name);
    AsyncStorage.setItem(NAME_KEY, name).catch(() => {});
  };

  const setProfilePhoto = (uri: string | null) => {
    setPhoto(uri);
    if (uri) AsyncStorage.setItem(PHOTO_KEY, uri).catch(() => {});
    else AsyncStorage.removeItem(PHOTO_KEY).catch(() => {});
  };

  const setAiKey = (key: string) => {
    setAiKeyState(key);
    if (key.trim()) AsyncStorage.setItem(AIKEY_KEY, key.trim()).catch(() => {});
    else AsyncStorage.removeItem(AIKEY_KEY).catch(() => {});
  };

  const value = useMemo<SettingsContextValue>(
    () => ({
      language: getLanguage(code),
      setLanguageCode,
      authenticVoice,
      setAuthenticVoice,
      profileName,
      setProfileName,
      profilePhoto,
      setProfilePhoto,
      aiKey,
      setAiKey,
    }),
    [code, authenticVoice, profileName, profilePhoto, aiKey],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider');
  return ctx;
}
