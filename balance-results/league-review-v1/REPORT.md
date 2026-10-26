# League weights: fresh-seed review matrix

18,600 completed, replay-verified games: 186 legal pairings × 100 fresh seeds, with 50 starts per side. No excluded games.
The same seeds and leader-specific physical seats are used across old/new comparisons. No matrix seeds were used to train or select these checkpoints.

**Cells are score share: a win counts 1, a tie ½, a loss 0.** “—” means the same leader, which the game draft does not permit. Mirror RL cells refer to the same games.
Full W/T/L counts and per-cell 95% intervals are in [matrix.csv](matrix.csv). [paired-changes.csv](paired-changes.csv) gives matched old/new changes and intervals for each opponent; [results.json](results.json) includes all summaries.

## Paired change against the complete heuristic roster

| Leader | Old share | New share | Change | Paired 95% CI |
|---|---:|---:|---:|---:|
| Melia | 92.0% | 92.0% | +0.00 pp | +0.00 to +0.00 pp |
| Nereon | 71.3% | 83.2% | +11.95 pp | +9.75 to +14.14 pp |
| Thaleia | 72.0% | 79.8% | +7.83 pp | +5.47 to +10.20 pp |
| Doreios | 71.6% | 82.3% | +10.70 pp | +8.50 to +12.90 pp |

Intervals use 100 shared-seed clusters. Opponent pools differ by leader, so compare old/new within each row rather than ranking leaders from these aggregates.

## Old/new RL matrix

| Row ↓ / opponent → | old-melia | old-nereon | old-thaleia | old-doreios | new-melia | new-nereon | new-thaleia | new-doreios |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| old-melia | — | 54.5% | 60.0% | 73.5% | — | 50.0% | 59.5% | 69.0% |
| old-nereon | 45.5% | — | 31.0% | 44.5% | 45.5% | — | 21.0% | 39.0% |
| old-thaleia | 40.0% | 69.0% | — | 71.0% | 40.0% | 22.0% | — | 38.5% |
| old-doreios | 26.5% | 55.5% | 29.0% | — | 26.5% | 49.5% | 16.5% | — |
| new-melia | — | 54.5% | 60.0% | 73.5% | — | 50.0% | 59.5% | 69.0% |
| new-nereon | 50.0% | — | 78.0% | 50.5% | 50.0% | — | 64.0% | 45.5% |
| new-thaleia | 40.5% | 79.0% | — | 83.5% | 40.5% | 36.0% | — | 42.0% |
| new-doreios | 31.0% | 61.0% | 61.5% | — | 31.0% | 54.5% | 58.0% | — |

## Against Melia heuristics

| RL model | mm | money | engine | classic-engine | owl | mn |
|---|---:|---:|---:|---:|---:|---:|
| old-nereon | 66.0% | 82.5% | 92.0% | 84.0% | 65.0% | 81.0% |
| old-thaleia | 60.0% | 74.0% | 82.0% | 83.5% | 49.5% | 75.5% |
| old-doreios | 66.5% | 71.0% | 87.5% | 78.5% | 56.0% | 68.0% |
| new-nereon | 64.0% | 83.0% | 92.5% | 87.5% | 63.5% | 83.5% |
| new-thaleia | 63.5% | 77.5% | 84.0% | 84.5% | 48.0% | 81.5% |
| new-doreios | 72.5% | 70.5% | 84.0% | 77.0% | 57.0% | 74.5% |

## Against Nereon heuristics

| RL model | mm | money | engine | classic-engine | owl | mn | fleet-v1 | fleet-v6 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| old-melia | 98.0% | 91.0% | 96.0% | 95.5% | 80.5% | 97.0% | 81.0% | 82.0% |
| old-thaleia | 100.0% | 42.0% | 50.5% | 69.0% | 68.5% | 100.0% | 92.0% | 76.0% |
| old-doreios | 98.5% | 61.5% | 84.5% | 79.5% | 90.5% | 98.5% | 98.0% | 94.0% |
| new-melia | 98.0% | 91.0% | 96.0% | 95.5% | 80.5% | 97.0% | 81.0% | 82.0% |
| new-thaleia | 100.0% | 50.5% | 72.0% | 80.5% | 80.0% | 100.0% | 95.5% | 88.0% |
| new-doreios | 99.0% | 64.0% | 85.0% | 81.0% | 94.5% | 99.0% | 95.5% | 93.5% |

## Against Thaleia heuristics

| RL model | mm | money | engine | classic-engine | owl | mn |
|---|---:|---:|---:|---:|---:|---:|
| old-melia | 100.0% | 87.0% | 90.5% | 76.0% | 81.5% | 100.0% |
| old-nereon | 96.5% | 32.5% | 34.5% | 30.5% | 42.5% | 96.5% |
| old-doreios | 95.0% | 22.5% | 30.0% | 23.5% | 33.0% | 95.0% |
| new-melia | 100.0% | 87.0% | 90.5% | 76.0% | 81.5% | 100.0% |
| new-nereon | 100.0% | 73.0% | 72.0% | 70.5% | 78.0% | 100.0% |
| new-doreios | 100.0% | 69.0% | 76.5% | 73.5% | 79.5% | 100.0% |

## Against Doreios heuristics

| RL model | mm | money | engine | classic-engine | owl | mn | grove |
|---|---:|---:|---:|---:|---:|---:|---:|
| old-melia | 98.0% | 98.5% | 98.5% | 92.5% | 94.0% | 98.0% | 97.0% |
| old-nereon | 89.5% | 74.0% | 77.5% | 64.0% | 76.5% | 89.5% | 80.0% |
| old-thaleia | 91.0% | 66.5% | 63.5% | 53.0% | 53.0% | 91.0% | 71.5% |
| new-melia | 98.0% | 98.5% | 98.5% | 92.5% | 94.0% | 98.0% | 97.0% |
| new-nereon | 95.5% | 90.0% | 85.5% | 76.5% | 86.0% | 95.5% | 85.0% |
| new-thaleia | 94.5% | 81.0% | 78.0% | 69.5% | 68.0% | 94.5% | 85.5% |

## Scope and interpretation

- Heads-up only; same-leader and heuristic/heuristic matches are not run.
- All comparisons use the same 100 fresh seeds. Aggregate intervals cluster by seed; do not treat every game as independent.
- Per-cell win intervals are Wilson; share and paired aggregate intervals are approximate 95% intervals.
- No correction for multiple comparisons. 100 games per cell support a review screen, not precise rankings.
- MM, Owl, and MN are evaluated outside their intended leaders to match the prior tournament roster.
- Melia is unchanged; Nereon is included for review despite its earlier conservative MM regression-screen miss.

The new weights are the frozen two-round league champions, including the Nereon review candidate; Melia is byte-for-byte unchanged. Both generations are retained under `actors/`, with checkpoint and file hashes in the evaluation protocol.

## Reproduce

Run within the project Nix environment:

```sh
python scripts/rl/archive_review_replays.py unpack
bun balance-results/league-review-v1/runner.js balance-results/league-review-v1/evaluation.json
python scripts/rl/report_review_matrix.py
```

The archive preserves all 18,600 per-game gzip files byte-for-byte, verified by a full round trip. The immutable bundled runner resumes those completed records. To rerun every game, use a copy of the config with a fresh output directory. Each saved record contains all commands, initial configuration, and final outcome.
