export const botKinds = ['bot', 'mm', 'money', 'engine', 'classic-engine'] as const;
export type BotKind = typeof botKinds[number];
export const botLabels: Record<BotKind, string> = { bot: 'Bot', mm: 'MM (Minh / Melia)', money: 'Money', engine: 'Engine (current)', 'classic-engine': 'Engine (historical v4)' };
export const isBotKind = (value: unknown): value is BotKind => botKinds.includes(value as BotKind);

export function resolveBotKind(kind: BotKind, leader: string): Exclude<BotKind, 'bot'> | 'rl' {
  if (kind !== 'bot') return kind;
  switch (leader) {
    case 'melia':
    case 'nereon': return 'rl';
    case 'thaleia':
    case 'doreios': return 'rl';
    default: throw new Error(`Unknown bot leader: ${leader}`);
  }
}
