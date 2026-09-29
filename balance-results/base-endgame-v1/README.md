# Big Money × Thin × End Game screening (v11)

End Game is an orthogonal modifier for **both Big Money and Engine**, independent of Thin. Only this screening trial restricts the parent to Big Money. It replaces aggressive Race for new experiments; historical Race remains reproducible.

When the uncapped public horizon is ≤2 turns, prioritize affordable positive VP, including Polis and Hamlet, with safe-ending and multi-buy safeguards. Before activation, use the normal parent strategy. There is no forced three-turn horizon cap. Ordinary gains follow the same rule; thinning upgrades retain their joint parent objective and account for current scoring opportunities. The horizon is a supply/opponent-income heuristic, not a calibrated two-turn forecast.

## Results

**Worth a larger test.** Every separate P1 End Game on-minus-off comparison improves against its fixed P2 opponent. The eight paired differences are +19.50 to +31.50 percentage points; all eight multiplicity-adjusted bootstrap intervals exclude zero. These are separate comparisons, not a pooled effect.

200 fresh common seeds per ordered cell; 3,200 games. No leader powers or Worship; identical six-Obol, three-Hamlet, inert-Temple starts. Fixed default parameters, no tuning. Entries are P1 victory shares (half ties); P1 acts first. M = Big Money, T = Thin, G = End Game. Bold is P2's strongest observed response per row.

| P1 / P2 | M | MG | MT | MTG |
| --- | ---: | ---: | ---: | ---: |
| M | 46.50% | 28.50% | 46.75% | **26.00%** |
| MG | 78.00% | 53.75% | 71.25% | **52.25%** |
| MT | 51.75% | 37.75% | 50.00% | **37.00%** |
| MTG | 81.50% | 57.25% | 71.75% | **56.50%** |

The strongest observed initial choice and response are both MTG: **56.50% / 43.50%**, with P1's 16-cell-adjusted interval **46.25%–66.50%**. This small screening trial does not establish the ranking between MG and MTG or a seat imbalance. A fuller trial should include Engine and fresh seeds.

Against P2 M, adding End Game to P1 M changes victory share from 46.50% to 78.00%: **+31.50 pp**, paired eight-comparison-adjusted interval **+23.50 to +39.75 pp**. With Thin already on, it changes 51.75% to 81.50%: **+29.75 pp**, adjusted interval **+21.00 to +38.75 pp**.

Mechanism against the same P2 M (acquisitions per game, not starting cards):

| P1 | First points turn | Polis acquired | Acropolis acquired | Hamlet acquired | Final VP |
| --- | ---: | ---: | ---: | ---: | ---: |
| M | 9.005 | 0.120 | 2.955 | 0.035 | 21.125 |
| MG | 9.000 | 2.715 | 3.235 | 2.035 | 32.590 |

The opening scoring time is essentially unchanged, while MG adds smaller points later without the old Race policy's collapse in Acropolis acquisition. Games in this matchup last longer (P1 18.915 versus 15.865 turns); the forecast must not be interpreted as a guaranteed ending within two turns. Historical aggressive Race's 16.15% against M used different seeds, so it is context, not a paired comparison.

[Full cells, counts, uncertainty and diagnostics](report.md) · [Eight paired modifier comparisons](paired.md). All rankings are exploratory; no strategy or turn order is pooled.

## Validation and reproduction

- 115 simulation tests, 9,891 assertions, zero failures; strict TypeScript and application checks pass.
- Both parents × Thin × End Game are tested across all 64 ordered combinations for legal completion and replay.
- End Game off exactly reproduces all sixteen saved prior parent/thinning matchups.
- 3,200 games completed, zero failures; all 6,400 ending inventories checked against final size and VP.
- No leader/Worship effects and no optional trashing with Thin off.
- All 160 saved traces reproduce exact scores, turns, shares and ending inventories.
- 16 CPUs inside Nix; simulation elapsed 79.32 seconds.
- Source: `621bb90fa7592085c3024ad52f3d87abe0c451b5`; full profiles and seed namespace are in `manifest.json`.

Inside `nix develop`, from the source commit:

```sh
bun scripts/balance-base.ts balance-runs/base-endgame-v1 200 endgame
```

Regenerate and verify this archive inside Nix:

```sh
bun scripts/balance-base-report.ts balance-results/base-endgame-v1
bun balance-results/base-endgame-v1/compare-endgame.ts balance-results/base-endgame-v1
bun balance-results/base-endgame-v1/verify-replays.ts balance-results/base-endgame-v1
```
