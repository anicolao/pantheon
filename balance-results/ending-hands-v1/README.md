# Independent ending-deck income audit

Treasure's richer final decks are real: both average spendable Coins and the chance of reaching $8 increased substantially after the EV buying change. The distinction between maximizing a mean and maximizing a threshold probability does not explain the observed win-rate regression in this comparison.

See [results and calibration](report.md) for every leader/strategy, and the [game-outcome comparison](../all-leaders-v5/README.md) for win shares, scoring timing and final VP. Treasure starts buying points about 0.6–2.1 turns later and finishes with roughly 5–6 fewer VP. Stronger ending income is consistent with spending too long building an economy, but these observations do not isolate a causal policy defect. Fewer acquired point cards also leave an economically stronger final deck.

## Method and validation

Source: `a598e012cf8a4de970431d9351abcb339891aa05`. Both players from all 60,000 evaluation games in each of v4 and v5: 240,000 decks, each independently dealt 100 times, totaling 24,000,000 hands. All 16 available CPUs were used; the audit completed in 38.44 seconds with zero failures. Standard leader rules, including Thaleia +1 Action, apply.

Inventories are reconstructed from starting cards, acquisitions and trashes. Every inventory agrees with recorded final deck size and VP; all 1,200 saved replay endings also agree exactly in inventory and supply. Each sampled hand uses an independent Fisher–Yates shuffle, with matched before/after sampling seeds in the separate `ending-hands-v1` namespace. Actions resolve through the production reducer, with the same v5 cash Action/discard choices for both versions. No purchases or Worship occur; optional trash/upgrades are declined and mandatory gains use the income estimator's immediate payload heuristic. This measures fresh-hand income under that execution rule, not historical play, optimal action selection or the literal next turn.

The v5 income estimator was evaluated on all 48,000 Treasure decks. On the new ending decks, its aggregate optimism ranges from 0.005 to 0.190 Coins by leader, much smaller than the observed improvement. Each individual deck's 100-hand estimate remains noisy. Games share 200 seed blocks; millions of deals are not millions of independent game outcomes.

Four focused audit tests pass (18 assertions), including exact homogeneous money, production draw execution, matched-version sampling and replay reconstruction. Strict TypeScript checks pass. The aggregator checks unique deck identities, all histogram totals and means, 120,000 before/after pairs, and 6,000 decks per leader/family/version. No bot policy changed for this audit.

## Reproduction and files

At the source commit, inside `nix develop`, run:

```sh
bun run balance:audit-hands balance-runs/ending-hands-v1
python balance-results/ending-hands-v1/summarize.py balance-runs/ending-hands-v1
```

The aggregation script is archived here after the source commit. To regenerate just the archived tables, run `python balance-results/ending-hands-v1/summarize.py balance-results/ending-hands-v1` inside Nix.

`manifest.json` identifies both source matrices, seeds, workers, execution assumptions and completion counts. The 16 compressed `decks-*.jsonl.gz` shards contain every owned inventory, final score/size, sampled income histogram, opening-hand treasure histogram and Treasure predicted mean. Temporary worker inputs are omitted because the CLI reconstructs them from the archived matrices. `summary.json` contains grouped distributions and calibration; `block-summaries.json` preserves seed-block aggregates; `paired-decks.json` counts paired changes. `examples.json` contains the first 16 encountered Treasure pairs, without outcome-based selection. `SHA256SUMS` covers copied outputs and the aggregation script; every copied output was byte-checked against the original.
