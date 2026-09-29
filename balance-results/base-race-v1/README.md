# Base game: orthogonal Race, thinning and parent strategy

[Full 8×8 matrix and per-cell intervals](report.md) · [Diagnostics and ending decks](cells.json) · [Observed responses](responses.json) · [Manifest](manifest.json)

Race is an independent on/off option for Big Money or Engine, with thinning independently off/on. It prioritizes middle/top-tier VP purchases and ordinary gains, and caps investment time at three turns. The parent keeps its own economic objective; thinning uses that objective with the shortened horizon. [Exact policy design](../../BOT_STRATEGIES.md#orthogonal-race-v10).

**This fixed Race policy performs poorly.** Its early scoring sacrifices the economy needed to compete with the non-Race bots. This is evidence about this implementation, not proof that every racing policy is weak.

## Trial and selected response

1,000 fresh seeds in each of 64 ordered cells: **64,000 games**, with no leader powers or Worship and identical starting decks containing inert Temples. Player 1 acts first. The same seeds are reused across cells, without pooling strategies, modifiers or turn orders. Parameters and policy were frozen before evaluation; no outcome-driven tuning followed.

The strongest observed response pairing is **P1 Engine / P2 Big Money + Thin: 53.60% / 46.40%**. P1's 64-cell-adjusted interval is **48.40%–58.70%**, compatible with 50/50 but not proof of equivalence. Best-response rankings describe the implemented fixed policies, not optimal human play. Every row's response is listed in the full report.

## Mechanism: scoring earlier does not mean winning sooner

These are separate cells against the **same second-player Big Money**; figures are P1's within-cell means:

| P1 strategy | P1 victory share | First points turn | Talents acquired | Acropolises acquired | Turns taken |
| --- | ---: | ---: | ---: | ---: | ---: |
| Big Money | 44.55% | 8.93 | 4.20 | 2.90 | 15.77 |
| Big Money + Race | 16.15% | 4.07 | 0.87 | 0.83 | 21.12 |
| Big Money + Thin + Race | 16.15% | 4.07 | 0.87 | 0.83 | 21.12 |

Race starts scoring roughly five turns earlier, but buys substantially fewer Talents and Acropolises. Its opponent acquires 5.15 Acropolises per game in the Race cell, versus 3.10 in the no-Race mirror. The diagnostics suggest premature scoring is starving the Race bot's economy while allowing its opponent time to accumulate larger points. This trial changes early scoring and investment horizon together; it does not separately identify their causal contributions.

Against second-player Big Money + Thin, first-player Engine + Race scores **13.65%** and Engine + Thin + Race **8.80%**, compared with Engine's **53.60%**. Engine + Thin + Race removes 8.90 cards per game in that cell, yet acquires only 0.46 Talents and 0.70 Acropolises. Removing more cards is not enough to compensate.

The two Money + Race rows have identical victory shares across all eight opponents. Thinning changes almost nothing for that parent with this short investment horizon; for example, neither version trashes anything against plain Big Money. These remain distinct profile settings, not evidence of two independently successful approaches.

All comparisons above are descriptive, within explicitly named ordered cells. No strategy-average headline is used.

## Validation and reproduction

Source: `0c0bf0c522d7593d5a4f180ee986fc7b56b3ddb9`. All 16 available CPUs ran inside Nix; elapsed simulation time was approximately 30 minutes. Every game completed, with zero failures. All **128,000 ending inventories** match final size and VP; there are no leader/Worship effects, and thinning-off profiles never trash. All **640 saved traces** reproduce exact scores, turn counts, victory shares and ending-card inventories. Raw shards and replay traces were byte-verified against the run; all three report artifacts regenerate identically.

The full simulation suite passed 109 tests with 9,366 assertions. After the final supply-preservation check, all ten Race tests passed with 731 assertions, including all 64 combinations and exact saved-game reproduction for all sixteen previous thinning matchups with Race off. Strict TypeScript and application checks passed with zero application errors/warnings. The earlier standalone Race family remains for archival compatibility.

From a clean tree at the source commit, inside `nix develop`:

```sh
bun scripts/balance-base.ts balance-runs/base-race-v1 1000 race
bun scripts/balance-base-report.ts balance-runs/base-race-v1
```

Regenerate and verify the archive inside Nix:

```sh
bun scripts/balance-base-report.ts balance-results/base-race-v1
bun balance-results/base-race-v1/verify-replays.ts balance-results/base-race-v1
```
