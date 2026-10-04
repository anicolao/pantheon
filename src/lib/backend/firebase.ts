import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInAnonymously, type Auth } from 'firebase/auth';
import { initializeFirestore, connectFirestoreEmulator, type Firestore, type FirestoreSettings } from 'firebase/firestore';

let services: { auth: Auth; db: Firestore } | undefined;

type BrowserIdentity = { maxTouchPoints: number; platform: string; userAgent: string };

export function shouldUseFetchStreams(browser: BrowserIdentity | undefined): boolean {
  if (!browser) return true;
  const isIOS = /iPad|iPhone|iPod/.test(browser.userAgent) ||
    (browser.platform === 'MacIntel' && browser.maxTouchPoints > 1);
  const isMacSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(browser.userAgent);
  return !(isIOS || isMacSafari);
}

function firestoreSettings(): FirestoreSettings & { useFetchStreams: boolean } {
  // Safari/WebKit can buffer the final Fetch Streams frame until a keep-alive.
  // Select XHR there: https://github.com/firebase/firebase-js-sdk/issues/9789
  return {
    useFetchStreams: shouldUseFetchStreams(
      typeof navigator === 'undefined' ? undefined : navigator
    )
  };
}

async function connect() {
  const env = import.meta.env;
  if (!env.VITE_FIREBASE_API_KEY || !env.VITE_FIREBASE_PROJECT_ID || !env.VITE_FIREBASE_APP_ID) {
    throw new Error('Online play is not configured on this preview. The card gallery and rules are still available.');
  }
  if (!services) {
    const app = initializeApp({ apiKey: env.VITE_FIREBASE_API_KEY, authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: env.VITE_FIREBASE_PROJECT_ID, appId: env.VITE_FIREBASE_APP_ID });
    const auth = getAuth(app);
    const db = initializeFirestore(app, firestoreSettings());
    if (env.VITE_USE_FIREBASE_EMULATORS === 'true') {
      connectAuthEmulator(auth, 'http://127.0.0.1:9293', { disableWarnings: true });
      connectFirestoreEmulator(db, '127.0.0.1', 8193);
    }
    services = { auth, db };
  }
  const { auth, db } = services;
  await auth.authStateReady();
  if (!auth.currentUser) await signInAnonymously(auth);
  return { auth, db, uid: auth.currentUser!.uid };
}
let connection: ReturnType<typeof connect> | undefined;
export function connectFirebase() {
  return connection ??= connect().catch(error => { connection = undefined; throw error; });
}
