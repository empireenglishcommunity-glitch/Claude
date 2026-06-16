/**
 * Firebase Web config.
 *
 * Paste the values from:
 *   Firebase Console → Project settings → "Your apps" → Web app → SDK setup → Config
 *
 * These values are NOT secret — they identify your project to Firebase and are
 * safe to ship inside a client app. Security is enforced by Firebase Auth + your
 * Firestore Security Rules, not by hiding these keys.
 *
 * Until real values are filled in, the app runs in "guest mode" (no login wall),
 * so it keeps working normally.
 */
export const firebaseConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
};
