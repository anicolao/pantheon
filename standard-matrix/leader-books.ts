export type OpeningSplit='5/1'|'4/2'|'3/3';
// High-budget / low-budget cards, except 3/3 which is first / second turn.
export type LeaderOpeningBook=Partial<Record<OpeningSplit,[string|null,string|null]>>;
// Selected on independent screening/refinement seeds; validation remains separate.
export const leaderBooks:Record<string,LeaderOpeningBook>={
  "thaleia": {
    "5/1": [
      "forge-of-heroes",
      null
    ],
    "4/2": [
      "council-of-sages",
      "seed-keeper"
    ],
    "3/3": [
      "drachma",
      "seed-keeper"
    ]
  }
};
