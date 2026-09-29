# Shared sampler repairs (v18)

Money recovers to roughly the observed strength of the pre-sampler Money controller. Engine improves clearly against the pre-sampler Engine, but it remains an income-and-draw hybrid: **whole-deck engine construction is not solved**. Thin is unused in the selected new 4×4. Do not interpret this as evidence that good thinning or fully developed engines are weak.

The selected implementation preserves one acquisition evaluator for all cards and both parents. The final independent confirmation contains **9,216 games: 256 fresh common seed blocks per ordered cell**, using all 16 available CPUs inside Nix. No leaders or Worship; identical six-Obol, three-Hamlet, inert-Temple starts; shared turn-2 endgame handling. Every game completed.

## Final comparison with the stronger historical controls

“Old” here means frozen v14, before the failed shared-sampler experiment. These are direct new-versus-old win shares, with ties split, not averages over strategies or seats.

| New strategy | New as P1 | New as P2 |
| --- | ---: | ---: |
| Money | 50.78% | 46.48% |
| Money + Thin | 53.12% | 50.39% |
| Engine | 72.46% | 61.33% |
| Engine + Thin | 70.70% | 60.55% |

Paired changes against the same frozen old opponent, subtracting the old mirror control on the same seeds:

| Strategy | Seat | Change pp | Multiplicity-adjusted interval pp |
| --- | ---: | ---: | --- |
| Money | 1 | -0.98 | -9.18 to +6.84 |
| Money | 2 | -1.76 | -9.38 to +5.66 |
| Money + Thin | 1 | -3.52 | -12.30 to +5.08 |
| Money + Thin | 2 | +7.03 | -1.95 to +15.82 |
| Engine | 1 | +18.16 | +8.01 to +28.12 |
| Engine | 2 | +15.62 | +5.86 to +25.39 |
| Engine + Thin | 1 | +10.74 | +0.98 to +20.31 |
| Engine + Thin | 2 | +20.51 | +9.18 to +31.45 |

All four Engine paired intervals are above zero. Money changes remain inconclusive; this is not a noninferiority proof or a demonstrated Money improvement. Direct P1 shares alone must not be interpreted as skill gains because seat effects exist.

## New 4×4

Entries are P1 win shares. Rows are P1 choices; columns are P2 choices. Thin remains an independent option.

| P1 / P2 | Money | Money + Thin | Engine | Engine + Thin |
| --- | ---: | ---: | ---: | ---: |
| Money | 50.59% | 50.59% | 54.49% | 54.49% |
| Money + Thin | 50.59% | 50.59% | 54.49% | 54.49% |
| Engine | 46.48% | 46.48% | 50.39% | 50.39% |
| Engine + Thin | 46.48% | 46.48% | 50.39% | 50.39% |

The observed strongest P2 response is Money / Money + Thin in every row; P1’s observed strongest response-aware choice is also Money / Money + Thin, giving the concrete 50.59% / 49.41% cell. These are point-estimate rankings within the tested bots, not proven optimal choices. The [per-cell adjusted intervals](../effective-validation-v3/matrix.json) preserve uncertainty.

Engine versus old Money is 48.24% as P1 and 44.73% as P2; Engine + Thin is identical. These are separate descriptive matchups, not a pooled headline.

## What the decks actually do

Representative construction cells below keep opponent and seat fixed: each new strategy as P1 against new Money. Quantities are acquisitions per game, not a strategy-pooled deck.

| Strategy | Whole-deck turns | Drachma | Talent | Council | Academy | Harbor Pilot | Trashes/game |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Money | 0 / 4609 | 4.38 | 2.99 | 1.82 | 0.25 | 0.00 | 0.00 |
| Money + Thin | 0 / 4609 | 4.38 | 2.99 | 1.82 | 0.25 | 0.00 | 0.00 |
| Engine | 0 / 4702 | 3.41 | 2.32 | 1.52 | 1.59 | 0.04 | 0.00 |
| Engine + Thin | 0 / 4702 | 3.41 | 2.32 | 1.52 | 1.59 | 0.04 | 0.00 |

Neither parent selected thinning in any new 4×4 cell. Engine acquired more Academy and Harvest Feast, and less money, than Money, but did not realize whole-deck draws in these cells. Its improved win rate should not be presented as a successful pure whole-deck Engine.

The remaining structural limitation is that projected turns make no future purchases. A card’s value as support for a later complementary purchase is therefore absent from the evaluator. The continuation controller is also bounded. Adding stronger draw weights, synthetic full-cycle funding, maximum-income funding or longer projections did not establish a better construction policy; those diagnostics were not promoted.

## Selected policy and fixes

Every candidate deck receives eight shuffled orders, each played at every cyclic rotation, for three consecutive production-rule turns. This samples every card type while giving every card equal opening exposure. Effects, cleanup, gains and reshuffles are real; no hidden order, future buys or Worship are supplied.

Money maximizes mean total Coins across all three turns. Engine adds 8 times the sum of income-backed unique-card coverage: fraction of start-of-turn cards actually seen, multiplied by min(1, turn Coins / top point-card cost). Repeated draws do not inflate coverage. This is an explicitly funded-draw hybrid objective, not raw draw volume.

The shared cash-aware controller preserves chains, values productive thinning when enabled and skips uncompensated empty-deck draw/discard plays in the neutral game. Optional projected thinning preserves valuable points. Actual removal/upgrade utility is calibrated to VP using a fully funded, fully drawn scoring turn; current Coins use the top point-card exchange rate. Known losing endings, winning continuations and missed current scoring remain protected. This calibration is a heuristic, not a learned utility or win-probability model.

A common effect-based dominance rule eliminates an equal-cost, equal-VP pure resource card when another option has at least as many Coins, net Actions and Buys, and strictly more of one. Thus Drachma dominates Bronze Recruit in the neutral game without a named-card opening or Treasure epsilon. Leader games disable this shortcut.

See [full design](../../BOT_STRATEGIES.md) and [defect ledger](../../BOT_DEFECTS.md). v14 controls and the exact v15 sampler are preserved. Standard leader balance has not been re-evaluated.

## Development and rejected alternatives

All formal stages are archived, including unhelpful results. Earlier confirmation data became development evidence once further changes were considered; final raw-policy confirmation uses a fresh namespace and was frozen before execution. The [recorded protocol](PROTOCOL.md) preserves those decisions.

| Stage | Source | Policies | Seeds/cell | Games | Report |
| --- | --- | --- | ---: | ---: | --- |
| screen | 6cb086f | income, balanced, reliable | 16 | 1,472 | [report](../effective-screen-v1/report.md) |
| screen-2 | b7b853e | balanced, reliable | 32 | 2,048 | [report](../effective-screen-v2/report.md) |
| validation | 11923f4 | balanced | 256 | 9,216 | [report](../effective-validation-v1/report.md) |
| screen-v3 | 6176d41 | balanced, late, coverage | 16 | 1,472 | [report](../effective-screen-v3/report.md) |
| validation-v2 | 4cda19a | late | 256 | 11,264 | [report](../effective-validation-v2/report.md) |
| screen-v4 | 637f737 | balanced, raw | 32 | 2,048 | [report](../effective-screen-v4/report.md) |
| validation-v3 | fc91bca | raw | 256 | 9,216 | [report](../effective-validation-v3/report.md) |

36,736 formal games, 428 saved traces, zero failed games. The [128 tiny diagnostic games](diagnostics/README.md) are separate exploratory construction checks and contribute no confidence intervals or balance claims.

The intermediate late-policy confirmation directly tested v15, the failed raw-coins/raw-draw sampler: Engine shares were 99.80%/99.61% and Engine + Thin 100.00%/99.61% by seat. That is an intermediate-policy result, **not a direct raw-v18 versus v15 comparison**. The final policy is assessed against stronger v14 controls above.

## Verification and reproduction

141 simulation tests passed (10,360 assertions), plus 34 tooling/policy tests. Strict TypeScript and Svelte checks passed with zero errors/warnings. Exact historical fixtures remain reproducible. Every formal game’s ending inventory, score, winner share and seed schedule is audited; all 428 saved traces replay through the production rules. Each archive includes compressed game data, manifest, per-cell diagnostics, comparisons, replays, replay audit and compressed-artifact SHA-256 checksums.

At the source commit recorded in each manifest, run inside nix develop from a clean tree. For the final confirmation:

```sh
bun scripts/balance-effective-study.ts balance-runs/reproduce-raw 256 validation-v3 raw
bun scripts/balance-effective-report.ts balance-runs/reproduce-raw
bun scripts/balance-audit-replays.ts balance-runs/reproduce-raw
```

Use a new stage namespace for new evidence. Reusing validation-v3 reproduces the same games and does not create independent confirmation. Reports use 20,000 seed bootstrap resamples, with multiplicity correction within each declared comparison family; unanimous 0/1 outcomes use exact binomial boundary bounds.
