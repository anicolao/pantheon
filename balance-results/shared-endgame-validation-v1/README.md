# Shared endgame validation 1

114,688 games; 512 fresh common seeds per ordered cell. Two candidates, all four parent/Thin profiles, both seats and fixed controls. See [study interpretation](../shared-endgame-v1/README.md), [paired effects](report.md), matrices.json and raw shards.

The conservative analysis uses 100,000 paired bootstrap resamples and a further family multiplier of two, reserving half the error budget for focused follow-up. Run inside Nix: bun scripts/balance-endgame-report.ts balance-results/shared-endgame-validation-v1 2. All ending inventories checked and all 224 saved traces replayed exactly.
