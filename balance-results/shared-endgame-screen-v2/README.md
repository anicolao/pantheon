# shared-endgame-screen-v2

Exploratory screening, not confirmation. 38912 games; 128 common seeds per ordered cell. All 16 available CPUs used inside Nix. No powers or Worship. Both parents and Thin settings, both seats, fixed historical and old-overlay opponents, plus each candidate’s own 4×4 matrix. No pooling.

Candidates: turn-2, redraw-25, redraw-value. Source: b4269465ec2e49c1f0f5f0271769d9754aa6340a. See [shared study interpretation](../shared-endgame-v1/README.md), [paired comparisons](report.md), and raw cells/shards.

Regenerate inside Nix: bun scripts/balance-endgame-report.ts balance-results/shared-endgame-screen-v2. Verify traces: bun balance-results/shared-endgame-screen-v2/verify-replays.ts balance-results/shared-endgame-screen-v2. Exact simulation arguments and seeds are in the manifest.
