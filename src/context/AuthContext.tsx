import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from '../services/firebase';
import { useSettings } from './SettingsContext';

type AuthContextValue = {
  /** Whether Firebase is set up. When false, the app runs in guest mode. */
  configured: boolean;
  initializing: boolean;
  user: User | null;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  logOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setProfileName } = useSettings();
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState<boolean>(isFirebaseConfigured);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setInitializing(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u?.displayName) setProfileName(u.displayName);
      setInitializing(false);
    });
    return unsub;
  }, [setProfileName]);

  const signUp = async (email: string, password: string, name: string) => {
    if (!auth) throw new Error('Firebase not configured');
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    if (name.trim()) {
      await updateProfile(cred.user, { displayName: name.trim() });
      setProfileName(name.trim());
    }
    // Seed a leaderboard profile document.
    if (db) {
      await setDoc(
        doc(db, 'users', cred.user.uid),
        { name: name.trim() || 'Citizen', xp: 0, createdAt: serverTimestamp() },
        { merge: true },
      ).catch(() => {});
    }
  };

  const signIn = async (email: string, password: string) => {
    if (!auth) throw new Error('Firebase not configured');
    await signInWithEmailAndPassword(auth, email.trim(), password);
  };

  const logOut = async () => {
    if (!auth) return;
    await signOut(auth);
  };

  const value = useMemo<AuthContextValue>(
    () => ({ configured: isFirebaseConfigured, initializing, user, signUp, signIn, logOut }),
    [initializing, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
