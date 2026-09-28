# Thaleia extra-card experiment

Adding **+1 Card** to Thaleia’s existing **+1 Action** trigger removes her weakness in Treasure tables, but appears to overshoot in Engine and Worship tables. This is evidence about frozen bot populations, not proof of optimal-play dominance. The proposal remains an opt-in simulation variant; ordinary play retains the current trigger.

## Results

Victory share splits tied wins equally. Each cell shows current → proposed share for Thaleia against opponents using the same policy family.

| Policy | 2 players | 3 players | 4 players |
| --- | ---: | ---: | ---: |
| Treasure | 24.6% → 52.7% | 10.6% → 34.4% | 6.8% → 24.5% |
| Engine | 61.3% → 85.5% | 62.8% → 92.7% | 61.2% → 93.4% |
| Worship | 77.3% → 97.1% | 69.1% → 98.5% | 63.2% → 95.8% |
| Symmetric reference | 50% | 33.3% | 25% |

All nine primary effects exceed the predeclared +5 percentage-point practical threshold throughout their family-adjusted intervals. Gains range from +17.7 to +32.5 points. Mean Thaleia turns fall in every cell, by 0.4–1.1 turns. Exact paired intervals and mixed-policy diagnostics are in [report.md](report.md).

Thaleia was already strong in homogeneous Engine/Worship tables under the current rule: her apparent weakness depends on the policy population. The extra draw can supply another Action to use with her bonus Action, a plausible explanation for the larger engine potential; this study does not separately identify that mechanism.

The gain is not confined to homogeneous tables. In descriptive two-player comparisons against Treasure opponents, Engine Thaleia improves from 32.2% to 60.4%, and Worship Thaleia from 20.9% to 53.6%. However, related heuristic bots and limited preset training do not establish best play or adequate counterplay. These results argue against treating the unconditional card as a settled balance fix. A narrower bonus and stronger counterplay would need separate experiments.

## Design and provenance

- 37,200 completed games, 18,600 matched pairs, 200 predeclared independent seed blocks; zero incomplete pairs.
- Only the trigger changes: the first matching Action each turn resolves, then Thaleia receives +1 Action and, in the proposed arm, +1 Card. All other rules, profiles, opponents and scoring are fixed. No retuning.
- Both arms share initial seeds, seats and leader lineups. Later draws may diverge as play and shuffle timing change.
- Every opposing-leader subset and Thaleia seat is included per block. Multiplayer opposing order is sampled independently, then cyclically rotated. The manifest records every schedule.
- Nine homogeneous policy × player-count cells form the primary family. Intervals bootstrap whole seed blocks 20,000 times with Bonferroni adjustment across nine comparisons. Games within a block are not treated as independent observations. Mixed two-player cells are descriptive.
- Frozen profiles: [training-v2/profiles.json](../decision-study-v1/training-v2/profiles.json). Full profile data and hash are recorded in the manifest. Evaluation seeds are disjoint from prior training and studies.
- Source: `52479a00107f709f896694a324f93e7a13063705`, clean at execution. Run entirely in the pinned Nix development shell with Bun 1.3.13, taking about 7 minutes 44 seconds.
- An execution pilot and an interrupted earlier run are excluded; only the completed Nix run is archived here.

Reproduce from the recorded source commit with a fresh output directory:

```sh
nix develop --no-write-lock-file --command bun run balance:thaleia --out balance-runs/thaleia-confirmation-nix
```

The flake supplies Bun, Node.js, Java, Git, GitHub CLI, Python and ripgrep. Java is used by Firestore emulator regression tests, not by this simulation.

## Artifacts and validation

[manifest.json](manifest.json) records provenance, profiles and schedules; [estimates.json](estimates.json) contains numeric inference; [pairs.jsonl.gz](pairs.jsonl.gz) contains every paired result; `replays/` contains 30 compressed replay samples covering each player-count/policy matchup and both arms. Replays require `replayExperiment` with the saved options, including `variant`.

All 18,600 pairs were checked for matching seeds, focal seats, leader lineups and profiles, with only the proposed variant differing. The report was regenerated exactly from compressed data. All 30 archived samples replayed to identical scores and turn counts.

Validation under Nix: 22 simulation tests, 34 policy tests and 41 backend emulator tests passed; application checks reported no errors or warnings; strict TypeScript checks passed. Tests cover once-per-turn behavior, reset, draw ordering and reshuffling, unchanged standard play, replay, trigger telemetry, schedule coverage and evidence handling. Browser tests were not run; this experiment changes no UI.
