# Shared endgame policy trial: validation-2

Analysis uses 100000 resamples and a further family multiplier of 2. A multiplier of two reserves half the error budget for this stage.

122880 games, 4096 common seeds per ordered cell, 16 workers. No pooling. Primary comparator: Money with the old two-turn overlay; Engine with historical scoring. Other controls are supplementary. Each policy has 17 separate primary comparisons. Paired bootstrap intervals adjust within each policy for exploratory screens, and across all selected policies for validation stages. Positive changes favor the candidate.

| Candidate | Baseline | Fixed opponent | Seat | Change pp | Adjusted interval pp |
| --- | --- | --- | ---: | ---: | --- |
| engine@turn-2 | engine@historical | treasure@overlay | 1 | 4.92 | 2.43 to 7.41 |
| engine@turn-2 | engine@historical | treasure@turn-2 | 1 | 4.86 | 2.40 to 7.35 |
| engine@turn-2 | engine@historical | treasure-thin@turn-2 | 1 | 6.82 | 4.43 to 9.27 |
| engine@turn-2 | engine@historical | engine@historical | 1 | 5.09 | 2.70 to 7.48 |
| engine@turn-2 | engine@historical | engine@historical | 2 | 2.08 | -0.40 to 4.50 |
| engine@turn-2 | engine@historical | engine@overlay | 1 | -1.55 | -3.88 to 0.78 |
| engine@turn-2 | engine@historical | engine@overlay | 2 | -0.89 | -3.30 to 1.54 |
| engine@turn-2 | engine@historical | engine@turn-2 | 1 | 2.81 | 0.46 to 5.20 |
| engine@turn-2 | engine@historical | engine-thin@historical | 1 | 4.06 | 1.66 to 6.47 |
| engine@turn-2 | engine@historical | engine-thin@overlay | 1 | -0.31 | -2.59 to 2.03 |
| engine@turn-2 | engine@historical | engine-thin@turn-2 | 1 | 3.30 | 0.92 to 5.74 |
| engine-thin@turn-2 | engine-thin@historical | treasure@overlay | 1 | 4.82 | 2.37 to 7.23 |
| engine-thin@turn-2 | engine-thin@historical | treasure@turn-2 | 1 | 4.65 | 2.22 to 7.07 |
| engine-thin@turn-2 | engine-thin@historical | treasure-thin@turn-2 | 1 | 4.11 | 1.75 to 6.38 |
| engine-thin@turn-2 | engine-thin@historical | engine@overlay | 2 | 0.85 | -1.40 to 3.10 |
| engine-thin@turn-2 | engine-thin@historical | engine@turn-2 | 2 | 3.67 | 1.34 to 5.97 |
| engine-thin@turn-2 | engine-thin@historical | engine-thin@overlay | 1 | 1.97 | -0.33 to 4.20 |
