// Entries use only the current turn and observed coins; no future hand is read.
export type OpeningBook=Record<string,string|null>;
export const openingBooks:Record<string,OpeningBook>={};
