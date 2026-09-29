# Base game: explicit strategy responses

No leader powers or Worship; both players start with six Obols, three Hamlets and one identical inert Temple. Standard supply, ordinary Action effects and ending/tiebreak rules remain. Current Treasure v8 ($0.035 epsilon) and Engine use the same fixed default preset, without retuning.

Player 1 acts first. Each cell contains 1,000 fresh seeded games; seeds are reused across cells. Entries are Player 1 victory shares, splitting ties. No strategies, leaders, presets or turn orders are pooled.

| P1 strategy ↓ / P2 strategy → | Big Money | Engine |
| --- | ---: | ---: |
| Big Money | 45.85% | 61.75% |
| Engine | 49.85% | 54.30% |

| P1 / P2 | P1 wins | Split ties | P2 wins | Family-adjusted interval for P1 |
| --- | ---: | ---: | ---: | --- |
| Big Money / Big Money | 320 | 277 | 403 | 42.55%–49.20% |
| Big Money / Engine | 606 | 23 | 371 | 57.95%–65.55% |
| Engine / Big Money | 476 | 45 | 479 | 46.05%–53.70% |
| Engine / Engine | 519 | 48 | 433 | 50.50%–58.10% |

Intervals use 20,000 bootstrap resamples within each cell and Bonferroni adjustment over four cells (approximate 95% family coverage). Equal VP is not necessarily a split tie: the standard fewer-turns tiebreak applies. No equivalence claim is made.

## Responses

- Given P1 Big Money, P2’s observed strongest response is Big Money: P1 45.85%, P2 54.15%.
- Given P1 Engine, P2’s observed strongest response is Big Money: P1 49.85%, P2 50.15%.

P1’s strongest initial choice among these two frozen policies is Engine; P2 responds with Big Money. This identifies a concrete matchup, not an average or proof of optimal human play.

Big Money is competitive against this Engine bot: it scores 61.75% when starting and 50.15% when responding. Turn order matters: the Big Money mirror favors the second player, while the Engine mirror favors the first. The selected Engine / Big Money cell is compatible with 50/50 (adjusted P1 interval 46.1%–53.7%), but that is not proof of equivalence or optimal human play. Best-response labels are observed rankings, not separately tested claims.

## Validation and reproduction

4,000 completed games, zero game failures, 8,000 ending inventories checked against deck size and VP, and no leader triggers or Worship. Forty saved game traces were replayed by the workers. All 16 available CPUs were used inside nix develop. Source commit: 1217cc1fc0d398ce28045efa2efbb25c21462a9e.

The initial attempt completed simulation but failed to save one shard because the disk was full. After removing byte-identical archived duplicates from ignored run outputs, the entire trial was restarted with the same source and seeds; only the complete retry is reported.

Before execution: all 91 simulation tests passed (8,452 assertions), strict TypeScript checks passed, and the application check reported zero errors/warnings. Tests cover variant rules, exact starting inventories, inactive leader-label invariance, replay equivalence, and reproduction of four archived standard-rule games.

From the repository root, run the committed source with `bun scripts/balance-base.ts balance-runs/base-game-v1 1000` inside nix develop. Regenerate this report from the archive using `bun balance-results/base-game-v1/summarize.ts balance-results/base-game-v1`. The manifest records the exact profiles, seed format and worker count. Raw game shards and 40 replay traces are archived; task dispatch files are reconstructible.
