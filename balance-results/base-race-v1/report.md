# Base game: orthogonal thinning and Race matrix

No leader powers or Worship; identical starting decks of six Obols, three Hamlets and one inert Temple. Standard supply, ordinary Action effects and ending/tiebreak rules remain. All profiles use the same frozen default parameters, without retuning. Big Money retains the $0.035 near-tie preference and corrected scoring.

Thinning is an independent boolean on the parent strategy. Big Money + Thin evaluates expected income per initial draw (with legal Action play); Engine + Thin evaluates executable whole-deck coverage, stranded draw and opening reliability. Both account for remaining time, lost VP/current-turn income, tool capacity and known endings. Engine preserves existing cycle payload up to $8. Tool purchases include their deck/Action cost and a delayed, diminishing estimate of useful removals. These are public-information heuristics, not optimal multi-turn search.

Race is a second independent boolean: buy affordable points worth at least half the top printed VP tier, admit cheaper points only at an imminent ending (H≤1), and cap investment time at three turns (or the preset scoring threshold, if smaller). Safe scoring baskets and ordinary gains share this policy; upgrades retain their parent-specific joint thinning objective with the shorter horizon. No-Race profiles retain v9 behavior. Race is a fixed heuristic, not a searched optimal stopping policy.

The explicit off profiles decline optional trashing and receive no thinning investment bonus. This is a new controlled comparison: the earlier 2×2 Engine profile already included legacy thinning heuristics. Omitted thinning settings still reproduce historical profiles.

Player 1 acts first. Each cell contains 1000 fresh seeded games, with the same seeds reused across all cells. Entries are P1 victory shares, splitting ties. No strategies, presets or turn orders are pooled.

| P1 strategy ↓ / P2 strategy → | Big Money | Big Money + Race | Big Money + Thin | Big Money + Thin + Race | Engine | Engine + Race | Engine + Thin | Engine + Thin + Race |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Big Money | 44.55% | 86.85% | 53.40% | 86.85% | 54.25% | 87.15% | 58.00% | 92.25% |
| Big Money + Race | 16.15% | 43.95% | 14.25% | 43.95% | 16.60% | 45.60% | 17.65% | 63.20% |
| Big Money + Thin | 45.55% | 88.65% | 51.70% | 88.65% | 57.90% | 87.65% | 62.20% | 91.95% |
| Big Money + Thin + Race | 16.15% | 43.95% | 14.25% | 43.95% | 16.60% | 45.60% | 17.65% | 63.20% |
| Engine | 55.50% | 85.15% | 53.60% | 85.15% | 55.20% | 85.90% | 61.65% | 90.95% |
| Engine + Race | 14.90% | 45.10% | 13.65% | 45.15% | 15.95% | 45.60% | 17.15% | 65.30% |
| Engine + Thin | 54.00% | 85.90% | 51.10% | 85.90% | 53.40% | 87.25% | 53.70% | 91.10% |
| Engine + Thin + Race | 10.40% | 37.25% | 8.80% | 37.25% | 10.00% | 37.60% | 10.30% | 45.35% |

## Observed responses

- Given P1 Big Money, P2’s strongest observed response is Big Money: P1 44.55%, P2 55.45%.
- Given P1 Big Money + Race, P2’s strongest observed response is Big Money + Thin: P1 14.25%, P2 85.75%.
- Given P1 Big Money + Thin, P2’s strongest observed response is Big Money: P1 45.55%, P2 54.45%.
- Given P1 Big Money + Thin + Race, P2’s strongest observed response is Big Money + Thin: P1 14.25%, P2 85.75%.
- Given P1 Engine, P2’s strongest observed response is Big Money + Thin: P1 53.60%, P2 46.40%.
- Given P1 Engine + Race, P2’s strongest observed response is Big Money + Thin: P1 13.65%, P2 86.35%.
- Given P1 Engine + Thin, P2’s strongest observed response is Big Money + Thin: P1 51.10%, P2 48.90%.
- Given P1 Engine + Thin + Race, P2’s strongest observed response is Big Money + Thin: P1 8.80%, P2 91.20%.

P1’s strongest observed initial choice is Engine; P2 responds with Big Money + Thin. The selected P1 share is 53.60% (family-adjusted interval 48.40%–58.70%). This is a concrete selected cell, not a strategy average. Best-response rankings are descriptive; no optimal-human-play or equivalence claim follows.

## Counts and uncertainty

| P1 / P2 | P1 wins | Split ties | P2 wins | Family-adjusted interval for P1 |
| --- | ---: | ---: | ---: | --- |
| Big Money / Big Money | 305 | 281 | 414 | 40.35%–48.90% |
| Big Money / Big Money + Race | 864 | 9 | 127 | 83.00%–90.25% |
| Big Money / Big Money + Thin | 458 | 152 | 390 | 48.50%–58.15% |
| Big Money / Big Money + Thin + Race | 864 | 9 | 127 | 83.00%–90.25% |
| Big Money / Engine | 530 | 25 | 445 | 49.00%–59.55% |
| Big Money / Engine + Race | 868 | 7 | 125 | 83.35%–90.45% |
| Big Money / Engine + Thin | 566 | 28 | 406 | 53.00%–63.05% |
| Big Money / Engine + Thin + Race | 919 | 7 | 74 | 89.25%–94.80% |
| Big Money + Race / Big Money | 154 | 15 | 831 | 12.30%–20.15% |
| Big Money + Race / Big Money + Race | 366 | 147 | 487 | 39.15%–48.80% |
| Big Money + Race / Big Money + Thin | 133 | 19 | 848 | 10.60%–18.20% |
| Big Money + Race / Big Money + Thin + Race | 366 | 147 | 487 | 39.15%–48.80% |
| Big Money + Race / Engine | 149 | 34 | 817 | 12.85%–20.55% |
| Big Money + Race / Engine + Race | 384 | 144 | 472 | 40.85%–50.60% |
| Big Money + Race / Engine + Thin | 168 | 17 | 815 | 13.70%–21.60% |
| Big Money + Race / Engine + Thin + Race | 617 | 30 | 353 | 57.90%–68.00% |
| Big Money + Thin / Big Money | 377 | 157 | 466 | 40.70%–50.20% |
| Big Money + Thin / Big Money + Race | 883 | 7 | 110 | 85.15%–91.80% |
| Big Money + Thin / Big Money + Thin | 470 | 94 | 436 | 46.30%–56.50% |
| Big Money + Thin / Big Money + Thin + Race | 883 | 7 | 110 | 85.15%–91.80% |
| Big Money + Thin / Engine | 570 | 18 | 412 | 52.75%–63.05% |
| Big Money + Thin / Engine + Race | 875 | 3 | 122 | 83.95%–90.95% |
| Big Money + Thin / Engine + Thin | 609 | 26 | 365 | 57.15%–67.15% |
| Big Money + Thin / Engine + Thin + Race | 918 | 3 | 79 | 88.90%–94.80% |
| Big Money + Thin + Race / Big Money | 154 | 15 | 831 | 12.30%–20.15% |
| Big Money + Thin + Race / Big Money + Race | 366 | 147 | 487 | 39.15%–48.80% |
| Big Money + Thin + Race / Big Money + Thin | 133 | 19 | 848 | 10.60%–18.20% |
| Big Money + Thin + Race / Big Money + Thin + Race | 366 | 147 | 487 | 39.15%–48.80% |
| Big Money + Thin + Race / Engine | 149 | 34 | 817 | 12.85%–20.55% |
| Big Money + Thin + Race / Engine + Race | 384 | 144 | 472 | 40.85%–50.60% |
| Big Money + Thin + Race / Engine + Thin | 168 | 17 | 815 | 13.70%–21.60% |
| Big Money + Thin + Race / Engine + Thin + Race | 617 | 30 | 353 | 57.90%–68.00% |
| Engine / Big Money | 511 | 88 | 401 | 50.70%–60.45% |
| Engine / Big Money + Race | 834 | 35 | 131 | 81.55%–88.50% |
| Engine / Big Money + Thin | 504 | 64 | 432 | 48.40%–58.70% |
| Engine / Big Money + Thin + Race | 834 | 35 | 131 | 81.55%–88.50% |
| Engine / Engine | 517 | 70 | 413 | 50.10%–60.10% |
| Engine / Engine + Race | 850 | 18 | 132 | 82.30%–89.55% |
| Engine / Engine + Thin | 599 | 35 | 366 | 56.55%–66.85% |
| Engine / Engine + Thin + Race | 904 | 11 | 85 | 87.75%–93.80% |
| Engine + Race / Big Money | 140 | 18 | 842 | 11.25%–18.65% |
| Engine + Race / Big Money + Race | 382 | 138 | 480 | 40.15%–50.10% |
| Engine + Race / Big Money + Thin | 129 | 15 | 856 | 10.05%–17.50% |
| Engine + Race / Big Money + Thin + Race | 382 | 139 | 479 | 40.15%–50.10% |
| Engine + Race / Engine | 151 | 17 | 832 | 12.00%–20.00% |
| Engine + Race / Engine + Race | 378 | 156 | 466 | 40.80%–50.45% |
| Engine + Race / Engine + Thin | 170 | 3 | 827 | 13.15%–21.35% |
| Engine + Race / Engine + Thin + Race | 636 | 34 | 330 | 59.85%–70.40% |
| Engine + Thin / Big Money | 511 | 58 | 431 | 48.95%–59.20% |
| Engine + Thin / Big Money + Race | 855 | 8 | 137 | 82.20%–89.55% |
| Engine + Thin / Big Money + Thin | 484 | 54 | 462 | 45.75%–56.40% |
| Engine + Thin / Big Money + Thin + Race | 855 | 8 | 137 | 82.20%–89.55% |
| Engine + Thin / Engine | 522 | 24 | 454 | 48.10%–58.55% |
| Engine + Thin / Engine + Race | 867 | 11 | 122 | 83.50%–90.75% |
| Engine + Thin / Engine + Thin | 513 | 48 | 439 | 48.20%–58.75% |
| Engine + Thin / Engine + Thin + Race | 901 | 20 | 79 | 88.00%–93.90% |
| Engine + Thin + Race / Big Money | 100 | 8 | 892 | 7.40%–13.80% |
| Engine + Thin + Race / Big Money + Race | 363 | 19 | 618 | 32.25%–42.05% |
| Engine + Thin + Race / Big Money + Thin | 84 | 8 | 908 | 6.00%–11.85% |
| Engine + Thin + Race / Big Money + Thin + Race | 363 | 19 | 618 | 32.25%–42.05% |
| Engine + Thin + Race / Engine | 96 | 8 | 896 | 6.85%–13.10% |
| Engine + Thin + Race / Engine + Race | 368 | 16 | 616 | 32.30%–42.60% |
| Engine + Thin + Race / Engine + Thin | 100 | 6 | 894 | 7.15%–13.75% |
| Engine + Thin + Race / Engine + Thin + Race | 429 | 49 | 522 | 40.05%–50.40% |

Intervals bootstrap seed blocks within each cell with 20,000 resamples and Bonferroni adjustment over all 64 cells (approximate 95% family coverage). Equal VP need not be a split tie because the standard fewer-turns tiebreak applies. No failures are scored as losses.

## Per-cell mechanism diagnostics

Each pair below is P1 / P2; these are within-cell means only. First points turn excludes games with no point acquisition; those counts are in cells.json. Full-deck draws count Action phases ending with no unseen cards. Exact card acquisitions, trashes and ending compositions are in cells.json.

| P1 / P2 | Final VP | Turns | First points turn | Final deck size | Cards trashed | Full-deck draws |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Big Money / Big Money | 20.76 / 21.84 | 15.77 / 15.47 | 8.93 / 8.98 | 25.65 / 25.39 | 0.00 / 0.00 | 0.00 / 0.00 |
| Big Money / Big Money + Race | 34.63 / 26.79 | 21.10 / 20.24 | 8.93 / 4.08 | 30.95 / 30.11 | 0.00 / 0.00 | 0.00 / 0.00 |
| Big Money / Big Money + Thin | 21.25 / 20.88 | 15.70 / 15.24 | 8.93 / 9.07 | 25.58 / 24.46 | 0.00 / 1.19 | 0.00 / 0.00 |
| Big Money / Big Money + Thin + Race | 34.63 / 26.79 | 21.10 / 20.24 | 8.93 / 4.08 | 30.95 / 30.11 | 0.00 / 0.00 | 0.00 / 0.00 |
| Big Money / Engine | 27.11 / 29.06 | 19.32 / 18.79 | 8.93 / 8.90 | 29.22 / 28.49 | 0.00 / 0.00 | 0.00 / 0.01 |
| Big Money / Engine + Race | 34.92 / 26.32 | 21.14 / 20.27 | 8.93 / 4.16 | 30.97 / 29.68 | 0.00 / 0.00 | 0.00 / 0.00 |
| Big Money / Engine + Thin | 26.24 / 26.62 | 18.35 / 17.78 | 8.93 / 9.14 | 28.25 / 23.59 | 0.00 / 3.89 | 0.00 / 0.05 |
| Big Money / Engine + Thin + Race | 35.19 / 22.01 | 20.73 / 19.81 | 8.93 / 5.39 | 30.55 / 21.04 | 0.00 / 8.56 | 0.00 / 0.00 |
| Big Money + Race / Big Money | 27.48 / 34.23 | 21.12 / 20.96 | 4.07 / 8.98 | 30.98 / 30.86 | 0.00 / 0.00 | 0.00 / 0.00 |
| Big Money + Race / Big Money + Race | 30.89 / 32.15 | 24.03 / 23.66 | 4.07 / 4.08 | 33.56 / 33.24 | 0.00 / 0.00 | 0.00 / 0.00 |
| Big Money + Race / Big Money + Thin | 26.93 / 33.77 | 20.68 / 20.55 | 4.07 / 9.07 | 30.55 / 29.63 | 0.00 / 1.35 | 0.00 / 0.00 |
| Big Money + Race / Big Money + Thin + Race | 30.90 / 32.15 | 24.04 / 23.68 | 4.07 / 4.08 | 33.57 / 33.25 | 0.00 / 0.00 | 0.00 / 0.00 |
| Big Money + Race / Engine | 27.43 / 35.51 | 22.37 / 22.22 | 4.07 / 9.39 | 32.14 / 32.03 | 0.00 / 0.00 | 0.00 / 0.01 |
| Big Money + Race / Engine + Race | 31.08 / 31.86 | 23.96 / 23.57 | 4.07 / 4.16 | 33.49 / 33.19 | 0.00 / 0.00 | 0.00 / 0.00 |
| Big Money + Race / Engine + Thin | 26.60 / 33.91 | 21.28 / 21.11 | 4.07 / 9.57 | 31.07 / 25.80 | 0.00 / 5.07 | 0.00 / 0.09 |
| Big Money + Race / Engine + Thin + Race | 31.85 / 26.15 | 23.98 / 23.36 | 4.07 / 5.39 | 33.50 / 21.59 | 0.00 / 11.97 | 0.00 / 0.03 |
| Big Money + Thin / Big Money | 20.99 / 21.03 | 15.60 / 15.23 | 8.98 / 8.98 | 24.80 / 25.15 | 1.23 / 0.00 | 0.00 / 0.00 |
| Big Money + Thin / Big Money + Race | 34.08 / 26.12 | 20.52 / 19.64 | 9.00 / 4.08 | 29.58 / 29.53 | 1.43 / 0.00 | 0.00 / 0.00 |
| Big Money + Thin / Big Money + Thin | 21.09 / 20.37 | 15.52 / 15.05 | 9.00 / 9.05 | 24.72 / 24.28 | 1.27 / 1.17 | 0.00 / 0.00 |
| Big Money + Thin / Big Money + Thin + Race | 34.08 / 26.12 | 20.52 / 19.64 | 9.00 / 4.08 | 29.58 / 29.53 | 1.43 / 0.00 | 0.00 / 0.00 |
| Big Money + Thin / Engine | 26.72 / 28.07 | 18.77 / 18.20 | 9.07 / 8.87 | 27.91 / 27.92 | 1.49 / 0.00 | 0.00 / 0.01 |
| Big Money + Thin / Engine + Race | 34.23 / 25.69 | 20.46 / 19.59 | 8.99 / 4.16 | 29.50 / 29.03 | 1.44 / 0.00 | 0.00 / 0.00 |
| Big Money + Thin / Engine + Thin | 26.05 / 25.79 | 18.05 / 17.45 | 9.07 / 9.09 | 27.18 / 23.29 | 1.49 / 3.85 | 0.00 / 0.05 |
| Big Money + Thin / Engine + Thin + Race | 34.42 / 21.55 | 20.11 / 19.19 | 9.03 / 5.39 | 29.15 / 20.61 | 1.50 / 8.41 | 0.00 / 0.00 |
| Big Money + Thin + Race / Big Money | 27.48 / 34.23 | 21.12 / 20.96 | 4.07 / 8.98 | 30.98 / 30.86 | 0.00 / 0.00 | 0.00 / 0.00 |
| Big Money + Thin + Race / Big Money + Race | 30.89 / 32.15 | 24.03 / 23.66 | 4.07 / 4.08 | 33.56 / 33.24 | 0.00 / 0.00 | 0.00 / 0.00 |
| Big Money + Thin + Race / Big Money + Thin | 26.93 / 33.77 | 20.68 / 20.55 | 4.07 / 9.07 | 30.55 / 29.63 | 0.00 / 1.35 | 0.00 / 0.00 |
| Big Money + Thin + Race / Big Money + Thin + Race | 30.90 / 32.15 | 24.04 / 23.68 | 4.07 / 4.08 | 33.57 / 33.25 | 0.00 / 0.00 | 0.00 / 0.00 |
| Big Money + Thin + Race / Engine | 27.43 / 35.51 | 22.37 / 22.22 | 4.07 / 9.39 | 32.14 / 32.03 | 0.00 / 0.00 | 0.00 / 0.01 |
| Big Money + Thin + Race / Engine + Race | 31.08 / 31.86 | 23.96 / 23.57 | 4.07 / 4.16 | 33.49 / 33.19 | 0.00 / 0.00 | 0.00 / 0.00 |
| Big Money + Thin + Race / Engine + Thin | 26.60 / 33.91 | 21.28 / 21.11 | 4.07 / 9.57 | 31.07 / 25.80 | 0.00 / 5.07 | 0.00 / 0.09 |
| Big Money + Thin + Race / Engine + Thin + Race | 31.85 / 26.15 | 23.98 / 23.36 | 4.07 / 5.39 | 33.50 / 21.59 | 0.00 / 11.97 | 0.00 / 0.03 |
| Engine / Big Money | 30.33 / 25.37 | 19.24 / 18.73 | 9.15 / 8.98 | 28.95 / 28.68 | 0.00 / 0.00 | 0.01 / 0.00 |
| Engine / Big Money + Race | 36.37 / 26.59 | 22.45 / 21.62 | 9.43 / 4.08 | 32.25 / 31.39 | 0.00 / 0.00 | 0.01 / 0.00 |
| Engine / Big Money + Thin | 29.72 / 25.03 | 18.88 / 18.38 | 9.13 / 9.11 | 28.62 / 27.56 | 0.00 / 1.34 | 0.01 / 0.00 |
| Engine / Big Money + Thin + Race | 36.37 / 26.59 | 22.45 / 21.62 | 9.43 / 4.08 | 32.25 / 31.39 | 0.00 / 0.00 | 0.01 / 0.00 |
| Engine / Engine | 30.60 / 29.05 | 20.29 / 19.77 | 9.37 / 9.25 | 30.10 / 29.54 | 0.00 / 0.00 | 0.01 / 0.00 |
| Engine / Engine + Race | 36.52 / 26.16 | 22.50 / 21.64 | 9.43 / 4.16 | 32.30 / 31.08 | 0.00 / 0.00 | 0.01 / 0.00 |
| Engine / Engine + Thin | 30.07 / 26.62 | 19.46 / 18.86 | 9.36 / 9.48 | 29.27 / 24.11 | 0.00 / 4.46 | 0.01 / 0.07 |
| Engine / Engine + Thin + Race | 36.88 / 21.78 | 22.50 / 21.59 | 9.42 / 5.39 | 32.29 / 21.52 | 0.00 / 9.78 | 0.01 / 0.00 |
| Engine + Race / Big Money | 27.13 / 34.30 | 21.11 / 20.97 | 4.14 / 8.98 | 30.50 / 30.87 | 0.00 / 0.00 | 0.00 / 0.00 |
| Engine + Race / Big Money + Race | 30.96 / 32.05 | 24.21 / 23.83 | 4.14 / 4.08 | 33.80 / 33.39 | 0.00 / 0.00 | 0.00 / 0.00 |
| Engine + Race / Big Money + Thin | 26.59 / 33.80 | 20.53 / 20.40 | 4.14 / 9.08 | 29.93 / 29.47 | 0.00 / 1.37 | 0.00 / 0.00 |
| Engine + Race / Big Money + Thin + Race | 30.96 / 32.04 | 24.21 / 23.83 | 4.14 / 4.08 | 33.80 / 33.39 | 0.00 / 0.00 | 0.00 / 0.00 |
| Engine + Race / Engine | 27.04 / 35.72 | 22.39 / 22.24 | 4.14 / 9.38 | 31.81 / 32.05 | 0.00 / 0.00 | 0.00 / 0.01 |
| Engine + Race / Engine + Race | 31.00 / 31.71 | 24.00 / 23.62 | 4.14 / 4.16 | 33.58 / 33.22 | 0.00 / 0.00 | 0.00 / 0.00 |
| Engine + Race / Engine + Thin | 26.31 / 34.10 | 21.53 / 21.36 | 4.14 / 9.56 | 30.96 / 25.97 | 0.00 / 5.15 | 0.00 / 0.10 |
| Engine + Race / Engine + Thin + Race | 31.73 / 25.96 | 23.94 / 23.30 | 4.14 / 5.39 | 33.50 / 21.40 | 0.00 / 12.06 | 0.00 / 0.04 |
| Engine + Thin / Big Money | 28.66 / 24.54 | 18.61 / 18.09 | 9.31 / 8.98 | 24.22 / 28.05 | 4.06 / 0.00 | 0.07 / 0.00 |
| Engine + Thin / Big Money + Race | 34.82 / 25.71 | 21.58 / 20.72 | 9.54 / 4.08 | 26.18 / 30.49 | 5.14 / 0.00 | 0.11 / 0.00 |
| Engine + Thin / Big Money + Thin | 27.82 / 24.37 | 18.22 / 17.74 | 9.29 / 9.10 | 23.95 / 26.93 | 3.97 / 1.33 | 0.06 / 0.00 |
| Engine + Thin / Big Money + Thin + Race | 34.82 / 25.71 | 21.58 / 20.72 | 9.54 / 4.08 | 26.18 / 30.49 | 5.14 / 0.00 | 0.11 / 0.00 |
| Engine + Thin / Engine | 28.65 / 28.23 | 19.71 / 19.18 | 9.54 / 9.23 | 24.55 / 28.97 | 4.86 / 0.00 | 0.09 / 0.01 |
| Engine + Thin / Engine + Race | 35.00 / 25.27 | 21.58 / 20.71 | 9.55 / 4.16 | 26.14 / 30.17 | 5.18 / 0.00 | 0.12 / 0.00 |
| Engine + Thin / Engine + Thin | 27.75 / 26.22 | 18.91 / 18.39 | 9.56 / 9.46 | 23.84 / 23.69 | 4.78 / 4.43 | 0.09 / 0.07 |
| Engine + Thin / Engine + Thin + Race | 35.13 / 21.02 | 21.53 / 20.63 | 9.55 / 5.39 | 25.88 / 20.89 | 5.36 / 9.49 | 0.12 / 0.00 |
| Engine + Thin + Race / Big Money | 22.55 / 34.60 | 20.74 / 20.64 | 5.36 / 8.98 | 21.34 / 30.53 | 9.03 / 0.00 | 0.00 / 0.00 |
| Engine + Thin + Race / Big Money + Race | 26.57 / 31.39 | 23.91 / 23.55 | 5.36 / 4.08 | 21.82 / 33.13 | 12.07 / 0.00 | 0.03 / 0.00 |
| Engine + Thin + Race / Big Money + Thin | 21.90 / 34.17 | 20.22 / 20.13 | 5.36 / 9.12 | 20.99 / 29.22 | 8.90 / 1.41 | 0.00 / 0.00 |
| Engine + Thin + Race / Big Money + Thin + Race | 26.57 / 31.39 | 23.91 / 23.55 | 5.36 / 4.08 | 21.82 / 33.13 | 12.07 / 0.00 | 0.03 / 0.00 |
| Engine + Thin + Race / Engine | 22.11 / 36.25 | 22.43 / 22.33 | 5.36 / 9.38 | 21.76 / 32.13 | 10.27 / 0.00 | 0.00 / 0.01 |
| Engine + Thin + Race / Engine + Race | 26.44 / 31.11 | 23.88 / 23.51 | 5.36 / 4.16 | 21.64 / 33.08 | 12.21 / 0.00 | 0.03 / 0.00 |
| Engine + Thin + Race / Engine + Thin | 21.38 / 34.45 | 21.29 / 21.19 | 5.36 / 9.54 | 20.95 / 25.70 | 9.98 / 5.20 | 0.00 / 0.10 |
| Engine + Thin + Race / Engine + Thin + Race | 25.56 / 26.52 | 23.79 / 23.36 | 5.36 / 5.39 | 21.38 / 21.51 | 12.29 / 11.90 | 0.03 / 0.03 |

## Reproduction and validation

64000 completed games, zero failures; every ending inventory checked against final size and VP. No leader/Worship effects and no optional trashing by off profiles. Workers replayed 640 saved traces. 16 CPUs used inside nix develop. Source commit: 0c0bf0c522d7593d5a4f180ee986fc7b56b3ddb9.

Run from a clean committed tree inside nix develop: `bun scripts/balance-base.ts balance-runs/base-race-v1 1000 race`. Regenerate this report with `bun scripts/balance-base-report.ts balance-results/base-race-v1`. The manifest records full profiles, seed namespace and worker count. The archived shards and replays preserve every result; task dispatch files are reconstructible.
