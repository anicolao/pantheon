# shared-endgame-screen-v1

Exploratory screening, not confirmation. 19968 games; 32 common seeds per ordered cell. All 16 available CPUs used inside Nix. No powers or Worship. Both parents and Thin settings, both seats, fixed historical and old-overlay opponents, plus each candidate’s own 4×4 matrix. No pooling.

Candidates: engine, turn-1, turn-2, turn-3, redraw-25, redraw-50, redraw-75. Source: 211544b4e61ffa3280e503f45f6900b0ddd76dea. See [shared study interpretation](../shared-endgame-v1/README.md), [paired comparisons](report.md), and raw cells/shards.

Regenerate inside Nix: bun scripts/balance-endgame-report.ts balance-results/shared-endgame-screen-v1. Verify traces: bun balance-results/shared-endgame-screen-v1/verify-replays.ts balance-results/shared-endgame-screen-v1. Exact simulation arguments and seeds are in the manifest.
