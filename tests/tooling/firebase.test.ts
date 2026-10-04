import {test, expect} from 'bun:test';
import {shouldUseFetchStreams} from '../../src/lib/backend/firebase';

const browsers = [
  ['desktop Safari', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/26.5 Safari/605.1.15', 'MacIntel', 0, false],
  ['iPhone Safari', 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_5 like Mac OS X) AppleWebKit/605.1.15 Version/26.5 Mobile/15E148 Safari/604.1', 'iPhone', 5, false],
  ['iPad Safari', 'Mozilla/5.0 (iPad; CPU OS 26_5 like Mac OS X) AppleWebKit/605.1.15 Version/26.5 Mobile/15E148 Safari/604.1', 'iPad', 5, false],
  ['iPadOS desktop mode', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15', 'MacIntel', 5, false],
  ['iOS Chrome', 'Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 CriOS/140.0 Mobile/15E148 Safari/604.1', 'iPhone', 5, false],
  ['iOS Firefox', 'Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 FxiOS/140.0 Mobile/15E148 Safari/605.1.15', 'iPhone', 5, false],
  ['desktop Chrome', 'Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36', 'MacIntel', 0, true],
  ['desktop Edge', 'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36 Edg/140.0', 'Win32', 0, true],
  ['Android Chrome', 'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/140.0 Mobile Safari/537.36', 'Linux armv8l', 5, true],
  ['desktop Firefox', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15) Gecko/20100101 Firefox/140.0', 'MacIntel', 0, true]
] as const;

for (const [name, userAgent, platform, maxTouchPoints, expected] of browsers) {
  test(`${name} selects ${expected ? 'Fetch Streams' : 'XHR'}`, () => {
    expect(shouldUseFetchStreams({userAgent, platform, maxTouchPoints})).toBe(expected);
  });
}
test('non-browser imports and missing navigator retain Fetch Streams', () => {
  expect(shouldUseFetchStreams(undefined)).toBe(true);
});

// SDK module mocks must not leak into the backend or other tooling tests.
for (const browser of ['safari', 'chrome', 'absent']) {
  for (const emulators of ['true', 'false']) {
    test(`initialization, caching and retry: ${browser}, emulators=${emulators}`, async () => {
      const child = Bun.spawn([process.execPath, 'test', './tests/fixtures/firebase-initialization.ts'], {
        cwd: new URL('../..', import.meta.url).pathname,
        env: {...process.env, TEST_BROWSER: browser, VITE_USE_FIREBASE_EMULATORS: emulators},
        stdout: 'pipe', stderr: 'pipe'
      });
      const [stdout, stderr, code] = await Promise.all([
        new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited
      ]);
      expect({code, errors: code ? stdout + stderr : ''}).toEqual({code: 0, errors: ''});
    });
  }
}
