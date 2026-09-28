# Treasure v7: prefer Treasures within $0.10 of maximum EV

The tolerance eliminates Bronze Recruit from **all 24,000 Treasure ending decks**, but is not a demonstrated performance improvement. Against fixed Engine opponents, Thaleia changes **37.3% → 37.6%**, Nereon **40.3% → 38.8%**, Melia **49.2% → 43.0%**, and Doreios **47.7% → 46.7%**. Melia's adjusted paired interval is **−10.79 to −1.67 percentage points**; the other three intervals include zero. See the [full paired results and ending-card composition](report.md).

The rule affects more than Bronze Recruit: Melia's ending Harvest Feast count falls from 3.23 to 1.97, and Sacred Academy from 0.95 to 0.16, while Drachma rises from 1.80 to 3.65. These compositional shifts show the broader effect of the preference, but do not isolate which purchases cause the win-rate loss. The requested rule remains the current tested implementation; no additional policy changes or epsilon tuning were made after seeing the outcome.

This experiment changes only the economic acquisition tie tolerance. The v6 rule of taking affordable highest-value points remains intact. Otherwise, candidates are ranked by estimated whole-hand spendable Coins. A Treasure within $0.10 (inclusive) of the global maximum wins over Actions; among qualifying Treasures, higher EV still wins, then lower cost and card ID. The existing positive-improvement condition remains: an optional acquisition that does not improve income is declined. Mandatory gains may accept dilution. Estimation, Action play, leader rules, trash decisions and opponent policies do not change.

The band is anchored to the highest EV, not implemented as a pairwise comparator, which would be non-transitive. In the seven-Obol/three-Hamlet example, Council of Sages exceeds Drachma by only about $0.045, so v7 now chooses Drachma. An Action whose estimated advantage exceeds $0.10 still wins. There is no Bronze Recruit-specific exception and no change to how Doreios's trash benefit is modeled.

## Design and interpretation

Implementation source: `be29843`. Baseline: the v6 scoring experiment at `676e560`. All 200 evaluation seed blocks, lineups, seats and frozen profiles are identical. The profiles originated in v5 training and remain byte-for-byte unchanged; this run does not retrain opponents. Standard rules, including Thaleia +1 Action, apply.

All 54 cells involving Treasure are rerun, with both seats and 200 blocks: **21,600 games**. Four primary comparisons measure Treasure victory share against the three frozen Engine opponents, 1,200 games per leader per arm. Intervals use 20,000 paired seed-block bootstrap resamples and Bonferroni adjustment over those four comparisons. Other cells, all-family summaries and ending inventories are descriptive. Treasure mirrors change both players. Previously examined seeds make this exploratory; the test does not establish optimal play or a best-strategy leader balance matrix.

## Validation and files

All 86 simulation tests pass (8,390 assertions), as do strict TypeScript checks. Tests cover the inclusive $0.10 boundary, order-independent candidate choice, all four starting Bronze Recruit decisions, larger draw advantages, unchanged scoring and losing-ending protection.

The run uses all 16 available CPUs, with clean and fixed source. The 192 sampled non-Treasure controls are compared exactly with unchanged v5/v6 results; all 108 saved affected block-0 traces replay through production rules. The report validates all unique game identities, seeds, profiles, seats and per-cell budgets. Every reconstructed ending inventory matches recorded deck size and VP.

`manifest.json` records source, seeds, workers, budgets and completion. `profiles.json` retains policyVersion 5 because that records its training provenance. The 16 `games-*.jsonl.gz` files contain all new outcomes; `checks-*.json` contain worker validation counts; `replays/` contains all affected block-0 games. Baseline rows are in `../treasure-scoring-v6/`, and unchanged non-Treasure controls are in `../all-leaders-v5/`. Temporary worker inputs are reconstructed by the runner and omitted. `summary.json` and `report.md` contain paired results and before/after ending card counts and presence frequencies. `SHA256SUMS` records artifact hashes. Copies are byte-checked, and report regeneration is checked for identical output.

## Reproduction

Run commands inside `nix develop`. At the implementation source:

```sh
bun scripts/balance-epsilon.ts balance-runs/treasure-epsilon-v7
```

The report generator is archived after the implementation. From the repository, regenerate the archived report with:

```sh
bun balance-results/treasure-epsilon-v7/summarize.ts balance-results/treasure-epsilon-v7
```
