import {test, expect, mock} from 'bun:test';

test('transport is chosen before emulator wiring; auth failure can retry cached services', async () => {
  const calls: string[] = [];
  const app = {}, db = {};
  let release!: () => void;
  let ready = new Promise<void>(resolve => { release = resolve; });
  const auth = {currentUser: null as null | {uid: string}, authStateReady: mock(() => {
    calls.push('auth-ready'); return ready;
  })};
  const initialize = mock((receivedApp: unknown, settings: unknown) => {
    expect(receivedApp).toBe(app);
    expect(settings).toEqual({useFetchStreams: process.env.TEST_BROWSER !== 'safari'});
    calls.push('firestore'); return db;
  });
  let failSignIn = true;
  const signIn = mock(async () => {
    calls.push('sign-in');
    if (failSignIn) throw new Error('temporary auth failure');
    auth.currentUser = {uid: 'anonymous-player'};
  });
  mock.module('firebase/app', () => ({initializeApp: mock(() => {calls.push('app'); return app;})}));
  mock.module('firebase/auth', () => ({
    getAuth: () => {calls.push('auth'); return auth;}, signInAnonymously: signIn,
    connectAuthEmulator: (received: unknown, url: string, options: unknown) => {
      expect(received).toBe(auth); expect(url).toBe('http://127.0.0.1:9293');
      expect(options).toEqual({disableWarnings: true}); calls.push('auth-emulator');
    }
  }));
  mock.module('firebase/firestore', () => ({
    initializeFirestore: initialize,
    connectFirestoreEmulator: (received: unknown, host: string, port: number) => {
      expect(received).toBe(db); expect([host, port]).toEqual(['127.0.0.1', 8193]);
      calls.push('firestore-emulator');
    }
  }));
  if (process.env.TEST_BROWSER === 'absent') Reflect.deleteProperty(globalThis, 'navigator');
  else Object.defineProperty(globalThis, 'navigator', {configurable: true, value: {
    platform: 'MacIntel', maxTouchPoints: 0,
    userAgent: process.env.TEST_BROWSER === 'safari'
      ? 'Mozilla/5.0 (Macintosh) Version/26.5 Safari/605.1.15'
      : 'Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/140.0 Safari/537.36'
  }});
  // Bun exposes process.env through import.meta.env, as Vite does for app builds.
  for (const key of ['VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_APP_ID']) process.env[key] = 'test';
  const {connectFirebase} = await import('../../src/lib/backend/firebase');
  const first = connectFirebase();
  expect(connectFirebase()).toBe(first);
  expect(signIn).not.toHaveBeenCalled();
  expect(calls).toEqual(['app', 'auth', 'firestore',
    ...(process.env.VITE_USE_FIREBASE_EMULATORS === 'true' ? ['auth-emulator', 'firestore-emulator'] : []), 'auth-ready']);
  const failure = first.catch(error => error);
  release(); expect((await failure).message).toBe('temporary auth failure');
  failSignIn = false; ready = Promise.resolve();
  const retry = connectFirebase();
  expect(retry).not.toBe(first); expect(connectFirebase()).toBe(retry);
  expect<unknown>(await retry).toEqual({auth, db, uid: 'anonymous-player'});
  expect(connectFirebase()).toBe(retry);
  expect(initialize).toHaveBeenCalledTimes(1);
  expect(signIn).toHaveBeenCalledTimes(2);
  expect(auth.authStateReady).toHaveBeenCalledTimes(2);
});
