import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
// getReactNativePersistence lives in the React Native build of firebase/auth.
// The default type entry doesn't always declare it, so we import loosely.
import {
  initializeAuth,
  getAuth,
  // @ts-ignore - present in firebase/auth React Native entry
  getReactNativePersistence,
  type Auth,
} from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { firebaseConfig } from '../config/firebaseConfig';

/** True only when real Firebase values have been pasted into firebaseConfig. */
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId,
);

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

if (isFirebaseConfigured) {
  appInstance = getApps().length ? getApp() : initializeApp(firebaseConfig);
  try {
    authInstance = initializeAuth(appInstance, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    // Already initialized (e.g. fast refresh) — reuse it.
    authInstance = getAuth(appInstance);
  }
  dbInstance = getFirestore(appInstance);
}

export const auth = authInstance;
export const db = dbInstance;
