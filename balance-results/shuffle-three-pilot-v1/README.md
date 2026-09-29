# Three-turn sampler: pilot

448 games, 16 common seeds per ordered cell, zero failures. Source: ba5f716ad9106dba9ac773896b0257f0e6628f2d. All 16 CPUs used inside Nix. See [results](report.md) and [policy interpretation](../shuffle-three-v1/README.md).

This stage is a runtime pilot excluded from the final evaluation. Every ending inventory and seed schedule was audited, and all 28 saved traces replayed exactly. Rates stay separate by parent, Thin, opponent and seat.

Reproduce games inside Nix from a clean checkout of the recorded simulation source. Regenerate reports with the current reporting script for the documented boundary intervals:

```sh
bun scripts/balance-sampled-study.ts balance-runs/shuffle-three-pilot-v1 16 pilot
bun scripts/balance-sampled-report.ts balance-results/shuffle-three-pilot-v1
bun balance-results/shuffle-three-pilot-v1/verify-replays.ts balance-results/shuffle-three-pilot-v1
```

The reporting revision adds nondegenerate exact boundary bounds for unanimous results; it does not change simulated policy behavior. Manifests, compressed game shards, replays and per-cell diagnostics retain all evidence.
