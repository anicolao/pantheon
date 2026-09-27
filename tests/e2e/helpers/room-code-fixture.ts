import { createHash } from 'node:crypto';
import type { Page, TestInfo } from '@playwright/test';

/** Fix only the room-code entropy, retaining real anonymous auth and transactions.
 * Remove this story's previous emulator table so reruns exercise creation too.
 */
export async function roomCodeFixture(page: Page, info: TestInfo, seed?: string) {
  const uuid = createHash('sha256').update(`${info.project.name}/${info.title}`).digest('hex').slice(0, 32);
  let entropy = BigInt(`0x${uuid}`);
  let code = '';
  for (let i = 0; i < 5; i++) { code += String.fromCharCode(65 + Number(entropy % 26n)); entropy /= 26n; }
  const root = `http://127.0.0.1:8193/v1/projects/demo-pantheon/databases/(default)/documents/games/${code}`;
  const headers = { Authorization: 'Bearer owner' };
  let pageToken = '';
  const documents: { name: string }[] = [];
  do {
    const response = await fetch(`${root}/events?pageSize=1000${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`, { headers, signal: AbortSignal.timeout(2000) });
    if (!response.ok) throw new Error(`Cannot reset story events: ${response.status}`);
    const data = await response.json() as { documents?: { name: string }[]; nextPageToken?: string };
    documents.push(...(data.documents ?? [])); pageToken = data.nextPageToken ?? '';
  } while (pageToken);
  for (let i = 0; i < documents.length; i += 200) {
    const deleted = await fetch('http://127.0.0.1:8193/v1/projects/demo-pantheon/databases/(default)/documents:commit', {
      signal: AbortSignal.timeout(2000), method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ writes: documents.slice(i, i + 200).map(document => ({ delete: document.name })) })
    });
    if (!deleted.ok) throw new Error('Cannot remove prior story events.');
  }
  const deleted = await fetch(root, { method: 'DELETE', headers, signal: AbortSignal.timeout(2000) });
  if (!deleted.ok) throw new Error('Cannot reset story table.');
  await page.addInitScript(({uuid,seed}) => { let calls=0; Object.defineProperty(crypto, 'randomUUID', { value: () => calls++ < 2 ? uuid : seed ?? uuid }); }, {uuid,seed});
  return code;
}
