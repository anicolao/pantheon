export const botKinds = ['money', 'engine', 'classic-engine'] as const;
export type BotKind = typeof botKinds[number];
export const botLabels: Record<BotKind, string> = { money: 'Money', engine: 'Engine (current)', 'classic-engine': 'Engine (historical v4)' };
export const isBotKind = (value: unknown): value is BotKind => botKinds.includes(value as BotKind);
