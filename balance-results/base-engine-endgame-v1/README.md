# Engine × Thin × End Game screening

200 matching seeds per ordered cell; 3,200 games, no leader powers or Worship. E = Engine, T = Thin, G = the old two-turn End Game overlay. P1 victory shares split ties; P1 acts first. Bold is P2's strongest observed response.

| P1 / P2 | E | EG | ET | ETG |
| --- | ---: | ---: | ---: | ---: |
| E | **52.50%** | 59.25% | 53.50% | 62.25% |
| EG | 58.75% | 56.00% | **53.50%** | 55.25% |
| ET | **55.25%** | 58.50% | 59.75% | 66.50% |
| ETG | **53.50%** | 57.25% | 55.00% | 62.00% |

No consistent benefit: all eight separate adjusted paired intervals include zero. Engine already raises Polis/Hamlet value and reduces Action investment near the ending; this screen adds an override to that existing behavior. The strongest observed pairing is ET / E, 55.25% / 44.75%, with P1 adjusted interval 45.25%–65.75%.

All 3,200 games completed; all 6,400 ending inventories checked, 160 saved traces replayed exactly. Source and seed namespace are in the manifest. Run inside Nix: bun scripts/balance-base.ts balance-runs/base-engine-endgame-v1 200 endgame-engine. Reports: bun scripts/balance-base-report.ts balance-results/base-engine-endgame-v1 and bun scripts/balance-endgame-compare.ts balance-results/base-engine-endgame-v1.

[Full matrix and diagnostics](report.md) · [Separate paired effects](paired.md) · [Subsequent shared-policy study](../shared-endgame-v1/README.md).
