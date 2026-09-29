# Shared endgame validation 2

122,880 games, zero failures: 4,096 fresh common seeds in each of 30 distinct ordered cells. The 17 comparisons were frozen in [the follow-up plan](../shared-endgame-v1/followup-plan.json) before play; the turn-2 policy was unchanged. All 17 pass the five-percentage-point noninferiority guard. No parents, opponents, Thin settings or seats are pooled.

The paired bootstrap uses 100,000 resamples and Bonferroni adjustment across 17 comparisons with family multiplier two, reserving half the error budget. The initial validation used the other half. See [combined interpretation](../shared-endgame-v1/README.md), [effects](report.md) and [promotion evidence](../shared-endgame-v1/promotion.json). All ending inventories were checked; all 30 saved traces replay exactly.

Run inside Nix:
```sh
bun scripts/balance-endgame-study.ts balance-runs/shared-endgame-validation-v2 4096 validation-2 turn-2 balance-results/shared-endgame-v1/followup-plan.json
bun scripts/balance-endgame-report.ts balance-results/shared-endgame-validation-v2 2
bun balance-results/shared-endgame-validation-v2/verify-replays.ts balance-results/shared-endgame-validation-v2
```
The manifest pins the simulation source and seed namespace. The focused dataset is not pooled with the full 4×4 matrix.
