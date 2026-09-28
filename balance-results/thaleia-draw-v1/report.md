# Thaleia: +1 Action and +1 Card

37200 games (18600 matched pairs); 0 incomplete pairs. Frozen profiles in both arms; no retraining. Positive differences favor the proposed trigger.

Primary family: nine player-count × homogeneous-policy cells. Paired seed-block bootstrap with 20,000 resamples and Bonferroni correction across all nine cells. Every opponent subset and seat is balanced per block; opponent order is independently sampled per block before cyclic seat rotations. Blocks, not individual games, are the independent units. Any failed arm excludes its whole cell/block and prevents a supported classification.

| Players | Policy | Blocks | Current share | Proposed share | Change | Family-adjusted interval | Mean turns current → proposed | Assessment |
| --- | --- | ---: | ---: | ---: | ---: | --- | --- | --- |
| 2 | treasure | 200 | 24.6% | 52.7% | +28.1 pp | +22.6 pp to +33.5 pp | 15.9 → 14.9 | supported policy-dependent benefit |
| 2 | engine | 200 | 61.3% | 85.5% | +24.3 pp | +20.2 pp to +28.2 pp | 14.9 → 13.9 | supported policy-dependent benefit |
| 2 | worship | 200 | 77.3% | 97.1% | +19.8 pp | +16.1 pp to +23.7 pp | 15.4 → 14.3 | supported policy-dependent benefit |
| 3 | treasure | 200 | 10.6% | 34.4% | +23.7 pp | +19.7 pp to +27.6 pp | 14.9 → 14.4 | supported policy-dependent benefit |
| 3 | engine | 200 | 62.8% | 92.7% | +29.9 pp | +26.2 pp to +33.7 pp | 14.6 → 13.9 | supported policy-dependent benefit |
| 3 | worship | 200 | 69.1% | 98.5% | +29.4 pp | +26.0 pp to +32.9 pp | 16.0 → 15.0 | supported policy-dependent benefit |
| 4 | treasure | 200 | 6.8% | 24.5% | +17.7 pp | +13.5 pp to +21.9 pp | 14.7 → 14.3 | supported policy-dependent benefit |
| 4 | engine | 200 | 61.2% | 93.4% | +32.2 pp | +27.7 pp to +36.7 pp | 15.0 → 14.4 | supported policy-dependent benefit |
| 4 | worship | 200 | 63.2% | 95.8% | +32.5 pp | +27.9 pp to +37.1 pp | 16.3 → 15.5 | supported policy-dependent benefit |

## Two-player mixed opponents (descriptive)

These diagnostic cells are not additional confirmatory hypotheses. They test whether homogeneous-table gains also appear against other frozen policy families.

| Thaleia policy | Opponent policy | Complete pairs | Current share | Proposed share | Change |
| --- | --- | ---: | ---: | ---: | ---: |
| treasure | engine | 1200 | 48.5% | 78.6% | +30.1 pp |
| treasure | worship | 1200 | 65.7% | 90.6% | +24.9 pp |
| engine | treasure | 1200 | 32.2% | 60.4% | +28.2 pp |
| engine | worship | 1200 | 85.5% | 97.7% | +12.2 pp |
| worship | treasure | 1200 | 20.9% | 53.6% | +32.7 pp |
| worship | engine | 1200 | 50.2% | 82.9% | +32.7 pp |

These outcomes isolate one rule change under existing bots. Symmetric reference shares are 50%, 33.3%, and 25%; exceeding those values in a limited policy population does not establish optimal-play dominance. Other leaders, events, cards, bot parameters and scoring rules are unchanged. No strategic drafting or retuning is included.
