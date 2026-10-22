export const botKinds = ['money', 'engine', 'classic-engine', 'mm', 'owl'] as const;
export type BotKind = typeof botKinds[number];
export const botLabels: Record<BotKind, string> = { owl: 'Owl (Thaleia)', mm: 'MM (Minh / Melia)', money: 'Money', engine: 'Engine (current)', 'classic-engine': 'Engine (historical v4)' };
export const isBotKind = (value: unknown): value is BotKind => botKinds.includes(value as BotKind);
