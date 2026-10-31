import {createPrng} from './random';
export const botKinds = ['bot', 'easy', 'standard', 'hard', 'expert', 'mm', 'money', 'engine', 'classic-engine'] as const;
export type BotKind = typeof botKinds[number];
export const botDifficulties = ['easy', 'standard', 'hard', 'expert'] as const;
export type BotDifficulty = typeof botDifficulties[number];
export const botLabels: Record<BotKind, string> = { bot: 'Standard', easy: 'Easy', standard: 'Standard', hard: 'Hard', expert: 'Expert', mm: 'MM (Minh / Melia)', money: 'Money', engine: 'Engine (current)', 'classic-engine': 'Engine (historical v4)' };
export const isBotKind = (value: unknown): value is BotKind => botKinds.includes(value as BotKind);
export const easyHeuristics = ['money', 'engine', 'classic-engine', 'mm'] as const;
/** Pick once per seat/game, independent of decisions and stable after reload. */
export function seatBotKind(kind:BotKind,seed:string,uid:string):Exclude<BotKind,'easy'> {
 return kind==='easy'?easyHeuristics[Math.floor(createPrng(`easy-v1:${seed}:${uid}`)()*easyHeuristics.length)]:kind;
}
export function resolveBotKind(kind: BotKind, leader: string): Exclude<BotKind, 'bot'|'standard'> | 'rl' {
 if (kind !== 'bot' && kind !== 'standard') return kind;
 if (!['melia','nereon','thaleia','doreios'].includes(leader)) throw Error(`Unknown bot leader: ${leader}`);
 return 'rl';
}
