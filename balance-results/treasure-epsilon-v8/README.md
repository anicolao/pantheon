# Treasure v8: $0.035 expected-income tolerance

The $0.035 band has higher observed Treasure-versus-Engine shares than $0.10 for all four leaders, but **none of the eight adjusted paired comparisons excludes zero**. It is not a demonstrated improvement over either baseline, and lack of significance is not equivalence.

| Treasure leader | No epsilon (v6) | $0.10 (v7) | $0.035 (v8) |
| --- | ---: | ---: | ---: |
| Thaleia | 37.3% | 37.6% | 38.4% |
| Nereon | 40.3% | 38.8% | 40.2% |
| Melia | 49.2% | 43.0% | 45.3% |
| Doreios | 47.7% | 46.7% | 48.1% |

Each entry pools 1,200 games against the three fixed Engine opponents. See the [comparison with no epsilon](report-v6.md) and [comparison with $0.10](report-v7.md) for adjusted intervals and all 54 affected strategy cells. Melia recovers +2.33 pp relative to $0.10 (adjusted interval −2.04 to +6.67), but remains −3.88 pp relative to no epsilon (−8.92 to +1.13).

Bronze Recruit remains in **75 of Melia's 6,000 decks (1.25%)**, and in none of the other 18,000 Treasure decks. The smaller band retains more draw than $0.10: Melia's Harvest Feast rises 1.97 → 2.47 copies and Sacred Academy 0.16 → 0.31. These are descriptive composition changes, not proof of which cards cause the outcome differences. The requested $0.035 remains implemented; no additional policy tuning was performed after observing the results.

Only the near-tie tolerance changes from v7's $0.10 to $0.035. Economic candidates within that inclusive distance of the maximum prefer Treasures. Among qualifying Treasures, highest EV wins, then cost and card ID. The existing positive-improvement requirement remains for optional acquisitions. Scoring, EV estimation, Action play, trash choices, leader rules and opponent profiles remain unchanged. There is no named-card exception.

The smaller band covers Melia's approximately $0.03409 opening Bronze Recruit edge, but permits the approximately $0.045 Council of Sages advantage in the seven-Obol/three-Hamlet example. It is not required to eliminate Bronze Recruit in every later state.

## Design

Implementation source: `5781abc`. Only **21,600 games involving Treasure** are run: 54 strategy cells × two seats × 200 original seed blocks. No non-Treasure control games or new training games are run. All 16 CPUs are used. Standard leader rules, including Thaleia +1 Action, apply. Profiles are the same frozen profiles used in v6 and v7, originally trained at v5.

The two baselines are [v6, no epsilon](../treasure-scoring-v6/README.md), source `676e560`, and [v7, $0.10](../treasure-epsilon-v7/README.md), source `be29843`. Each primary comparison measures a leader's Treasure share against the three frozen Engine opponents, with 1,200 games per arm. Four leaders × two baselines form one family of eight comparisons. Intervals use 20,000 paired seed-block bootstrap resamples and Bonferroni adjustment over all eight. Other strategy cells, whole-population summaries and deck compositions are descriptive. Treasure mirrors change both players. Previously examined seeds make this exploratory; this is not an optimal-play or best-strategy leader balance matrix.

## Validation and artifacts

All 12 targeted Treasure tests pass (51 assertions), including the inclusive $0.035 boundary, candidate-order independence, all four opening Bronze Recruit cases, meaningful draw advantages, unchanged scoring and losing-ending protection. Strict TypeScript passes. Source is clean and fixed throughout play. All 108 saved affected block-0 games replay through production rules. The report checks every paired seed/profile/seat, unique game identity, cell budget and final inventory size/VP. No policies are changed after observing results.

`manifest.json` records source, budget, seeds and completion; `profiles.json` is unchanged and retains its v5 training provenance. The 16 `games-*.jsonl.gz` files hold every outcome, `checks-*.json` record worker counts, and `replays/` contains the 108 block-0 games. Temporary worker inputs are reconstructed by the runner and omitted. `report-v6.md`/`summary-v6.json` compare with no epsilon; `report-v7.md`/`summary-v7.json` compare with $0.10. Both include all affected strategy cells and ending Action/Treasure counts and presence frequencies. `SHA256SUMS` covers the archived files. Outputs are byte-checked after copying; reports must regenerate identically.

## Reproduction

All commands run inside `nix develop`. At the implementation source:

```sh
bun scripts/balance-epsilon.ts balance-runs/treasure-epsilon-v8
```

The generator was archived after the implementation. Regenerate both archived comparisons from the repository with:

```sh
bun balance-results/treasure-epsilon-v8/summarize.ts balance-results/treasure-epsilon-v8 balance-results/treasure-scoring-v6
bun balance-results/treasure-epsilon-v8/summarize.ts balance-results/treasure-epsilon-v8 balance-results/treasure-epsilon-v7
```
