# Exploratory construction diagnostics

128 tiny games in eight diagnostic branches. These were development probes, not balance evidence or held-out comparisons. No confidence claim is made from their win counts. None of these samplers is the production default.

The first six branches examined funded coverage, synthetic whole-cycle income, last-turn payoff and larger draw weighting. The six-turn branch extended the uncalibrated late objective; it exposed expensive point trashing. The funded-six branch combined calibrated costs with last-turn maximum income and coverage. It also failed to establish a useful whole-deck build.

| Probe | Source | Games |
| --- | --- | ---: |
| funded | 11923f4 | 8 |
| cycle | 11923f4 | 8 |
| cycle-thin | 11923f4 | 8 |
| last | 11923f4 | 8 |
| last-balanced | 11923f4 | 16 |
| coverage | 11923f4 | 16 |
| six-turn | 4cda19a | 32 |
| funded-six | 637f737 | 32 |

For reproduction, use the recorded source commit in a separate checkout, copy the corresponding sampler/probe/worker files into its ignored balance-runs directory, removing the archival .txt suffix, and run the probe through Bun inside nix develop. The first two probes print JSONL to stdout; the parallel probe launchers write their JSONL into balance-runs. The local module mocks apply only to those isolated Bun processes. Compressed data here is the retained output, not a shipping-policy benchmark.

The first six branches predate the shared continuation fix and utility calibration; the six-turn branch predates calibration. Do not mix their results with final v18 confirmation.
