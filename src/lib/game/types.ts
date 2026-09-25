export const gods = ['Athena', 'Poseidon', 'Demeter', 'Ares', 'Hestia'] as const;
export type God = typeof gods[number];
export const cardTypes = ['Action', 'Treasure', 'Territory', 'Leader', 'Event'] as const;
export type CardType = typeof cardTypes[number];

export interface CardDefinition {
  id: string;
  /** Stable catalog number; never derived from sorting or filtering. */
  number: number;
  supply: { 2: number; 3: number; 4: number };
  startingCopiesPerPlayer: number;
  name: string;
  type: CardType;
  god: God;
  cost: number | null;
  effect: string;
  favored?: string;
  vp?: number;
  art: string;
  artDescription: string;
}

export const godSymbols: Record<God, string> = {
  Athena: '◈', Poseidon: '≋', Demeter: '❧', Ares: '⚔', Hestia: '♨'
};
