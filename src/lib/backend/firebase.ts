import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInAnonymously } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

async function connect() {
  const env = import.meta.env;
  if (!env.VITE_FIREBASE_API_KEY || !env.VITE_FIREBASE_PROJECT_ID || !env.VITE_FIREBASE_APP_ID) {
    throw new Error('Online play is not configured on this preview. The card gallery and rules are still available.');
  }
  const app = initializeApp({ apiKey: env.VITE_FIREBASE_API_KEY, authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID, appId: env.VITE_FIREBASE_APP_ID });
  const auth = getAuth(app);
  const db = getFirestore(app);
  if (env.VITE_USE_FIREBASE_EMULATORS === 'true') {
    connectAuthEmulator(auth, 'http://127.0.0.1:9293', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8193);
  }
  await auth.authStateReady();
  if (!auth.currentUser) await signInAnonymously(auth);
  return { auth, db, uid: auth.currentUser!.uid };
}
let connection: ReturnType<typeof connect> | undefined;
export function connectFirebase() { return connection ??= connect(); }
