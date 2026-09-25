import { createHash } from 'node:crypto';
import type { Page, TestInfo } from '@playwright/test';

/** Fix only the room-code entropy, retaining real anonymous auth and transactions.
 * Remove this story's previous emulator table so reruns exercise creation too.
 */
export async function roomCodeFixture(page: Page, info: TestInfo) {
  const uuid = createHash('sha256').update(`${info.project.name}/${info.title}`).digest('hex').slice(0, 32);
  let entropy = BigInt(`0x${uuid}`);
  let code = '';
  for (let i = 0; i < 5; i++) { code += String.fromCharCode(65 + Number(entropy % 26n)); entropy /= 26n; }
  const root = `http://127.0.0.1:8193/v1/projects/demo-pantheon/databases/(default)/documents/games/${code}`;
  const headers = { Authorization: 'Bearer owner' };
  const response = await fetch(`${root}/events`, { headers });
  if (!response.ok) throw new Error(`Cannot reset story events: ${response.status}`);
  const data = await response.json() as { documents?: { name: string }[] };
  for (const document of data.documents ?? []) {
    const deleted = await fetch(`http://127.0.0.1:8193/v1/${document.name}`, { method: 'DELETE', headers });
    if (!deleted.ok) throw new Error('Cannot remove prior story event.');
  }
  const deleted = await fetch(root, { method: 'DELETE', headers });
  if (!deleted.ok) throw new Error('Cannot reset story table.');
  await page.addInitScript(uuid => { Object.defineProperty(crypto, 'randomUUID', { value: () => uuid }); }, uuid);
  return code;
}
