/** Version 1: FNV-1a string seed + xorshift32, matching the deterministic client model. */
export function createPrng(seed: string): () => number {
  let value = 2166136261;
  for (const character of seed) { value ^= character.codePointAt(0)!; value = Math.imul(value, 16777619); }
  let state = value >>> 0 || 0x9e3779b9;
  return () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) / 0x1_0000_0000; };
}
export function shuffle<T>(values: readonly T[], seed: string): T[] {
  const result = [...values], random = createPrng(seed);
  for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
}
