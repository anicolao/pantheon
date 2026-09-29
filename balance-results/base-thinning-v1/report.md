# Base game: orthogonal thinning matrix

No leader powers or Worship; identical starting decks of six Obols, three Hamlets and one inert Temple. Standard supply, ordinary Action effects and ending/tiebreak rules remain. All profiles use the same frozen default parameters, without retuning. Big Money retains the $0.035 near-tie preference and corrected scoring.

Thinning is an independent boolean on the parent strategy. Big Money + Thin evaluates expected income per initial draw (with legal Action play); Engine + Thin evaluates executable whole-deck coverage, stranded draw and opening reliability. Both account for remaining time, lost VP/current-turn income, tool capacity and known endings. Engine preserves existing cycle payload up to $8. Tool purchases include their deck/Action cost and a delayed, diminishing estimate of useful removals. These are public-information heuristics, not optimal multi-turn search.

The explicit off profiles decline optional trashing and receive no thinning investment bonus. This is a new controlled comparison: the earlier 2×2 Engine profile already included legacy thinning heuristics. Omitted thinning settings still reproduce historical profiles.

Player 1 acts first. Each cell contains 1000 fresh seeded games, with the same seeds reused across all cells. Entries are P1 victory shares, splitting ties. No strategies, presets or turn orders are pooled.

| P1 strategy ↓ / P2 strategy → | Big Money | Big Money + Thin | Engine | Engine + Thin |
| --- | ---: | ---: | ---: | ---: |
| Big Money | 44.35% | 51.90% | 55.20% | 56.00% |
| Big Money + Thin | 47.20% | 52.75% | 59.20% | 60.40% |
| Engine | 54.55% | 51.80% | 51.35% | 58.40% |
| Engine + Thin | 52.65% | 49.65% | 51.75% | 55.70% |

## Observed responses

- Given P1 Big Money, P2’s strongest observed response is Big Money: P1 44.35%, P2 55.65%.
- Given P1 Big Money + Thin, P2’s strongest observed response is Big Money: P1 47.20%, P2 52.80%.
- Given P1 Engine, P2’s strongest observed response is Engine: P1 51.35%, P2 48.65%.
- Given P1 Engine + Thin, P2’s strongest observed response is Big Money + Thin: P1 49.65%, P2 50.35%.

P1’s strongest observed initial choice is Engine; P2 responds with Engine. The selected P1 share is 51.35% (family-adjusted interval 46.85%–55.75%). This is a concrete selected cell, not a strategy average. Best-response rankings are descriptive; no optimal-human-play or equivalence claim follows.

## Counts and uncertainty

| P1 / P2 | P1 wins | Split ties | P2 wins | Family-adjusted interval for P1 |
| --- | ---: | ---: | ---: | --- |
| Big Money / Big Money | 299 | 289 | 412 | 40.40%–48.25% |
| Big Money / Big Money + Thin | 435 | 168 | 397 | 47.60%–56.25% |
| Big Money / Engine | 542 | 20 | 438 | 50.60%–59.80% |
| Big Money / Engine + Thin | 551 | 18 | 431 | 51.35%–60.40% |
| Big Money + Thin / Big Money | 381 | 182 | 437 | 42.95%–51.30% |
| Big Money + Thin / Big Money + Thin | 466 | 123 | 411 | 48.40%–57.20% |
| Big Money + Thin / Engine | 584 | 16 | 400 | 54.60%–63.65% |
| Big Money + Thin / Engine + Thin | 596 | 16 | 388 | 55.85%–64.75% |
| Engine / Big Money | 503 | 85 | 412 | 50.05%–58.95% |
| Engine / Big Money + Thin | 488 | 60 | 452 | 47.40%–56.35% |
| Engine / Engine | 469 | 89 | 442 | 46.85%–55.75% |
| Engine / Engine + Thin | 568 | 32 | 400 | 53.95%–62.85% |
| Engine + Thin / Big Money | 493 | 67 | 440 | 48.10%–57.15% |
| Engine + Thin / Big Money + Thin | 466 | 61 | 473 | 45.10%–54.20% |
| Engine + Thin / Engine | 498 | 39 | 463 | 47.25%–56.25% |
| Engine + Thin / Engine + Thin | 534 | 46 | 420 | 51.00%–60.25% |

Intervals bootstrap seed blocks within each cell with 20,000 resamples and Bonferroni adjustment over all 16 cells (approximate 95% family coverage). Equal VP need not be a split tie because the standard fewer-turns tiebreak applies. No failures are scored as losses.

## Per-cell mechanism diagnostics

Each pair below is P1 / P2; these are within-cell means only. Full-deck draws count Action phases ending with no unseen cards. Exact card acquisitions, trashes and ending compositions are in cells.json.

| P1 / P2 | Final VP | Turns | Final deck size | Cards trashed | Full-deck draws |
| --- | ---: | ---: | ---: | ---: | ---: |
| Big Money / Big Money | 20.74 / 21.92 | 15.72 / 15.42 | 25.62 / 25.32 | 0.00 / 0.00 | 0.00 / 0.00 |
| Big Money / Big Money + Thin | 21.20 / 20.97 | 15.64 / 15.21 | 25.54 / 24.43 | 0.00 / 1.15 | 0.00 / 0.00 |
| Big Money / Engine | 27.10 / 28.96 | 19.26 / 18.72 | 29.18 / 28.38 | 0.00 / 0.00 | 0.00 / 0.00 |
| Big Money / Engine + Thin | 26.15 / 27.11 | 18.54 / 17.98 | 28.48 / 23.63 | 0.00 / 4.00 | 0.00 / 0.06 |
| Big Money + Thin / Big Money | 21.11 / 20.82 | 15.48 / 15.10 | 24.63 / 25.00 | 1.23 / 0.00 | 0.00 / 0.00 |
| Big Money + Thin / Big Money + Thin | 21.32 / 20.10 | 15.35 / 14.88 | 24.49 / 24.13 | 1.28 / 1.13 | 0.00 / 0.00 |
| Big Money + Thin / Engine | 27.02 / 27.76 | 18.66 / 18.07 | 27.78 / 27.77 | 1.48 / 0.00 | 0.00 / 0.00 |
| Big Money + Thin / Engine + Thin | 25.92 / 25.92 | 17.97 / 17.38 | 27.12 / 23.10 | 1.46 / 3.95 | 0.00 / 0.06 |
| Engine / Big Money | 30.33 / 25.78 | 19.36 / 18.86 | 29.04 / 28.77 | 0.00 / 0.00 | 0.01 / 0.00 |
| Engine / Big Money + Thin | 29.50 / 25.54 | 18.93 / 18.45 | 28.64 / 27.61 | 0.00 / 1.27 | 0.01 / 0.00 |
| Engine / Engine | 30.19 / 29.50 | 20.39 / 19.92 | 30.14 / 29.64 | 0.00 / 0.00 | 0.01 / 0.00 |
| Engine / Engine + Thin | 29.65 / 27.18 | 19.63 / 19.06 | 29.38 / 24.05 | 0.00 / 4.68 | 0.01 / 0.09 |
| Engine + Thin / Big Money | 28.33 / 24.70 | 18.44 / 17.95 | 23.96 / 27.86 | 4.11 / 0.00 | 0.06 / 0.00 |
| Engine + Thin / Big Money + Thin | 27.80 / 24.56 | 18.24 / 17.78 | 23.75 / 26.95 | 4.13 / 1.29 | 0.06 / 0.00 |
| Engine + Thin / Engine | 28.53 / 28.45 | 19.58 / 19.08 | 24.26 / 28.84 | 4.97 / 0.00 | 0.08 / 0.00 |
| Engine + Thin / Engine + Thin | 27.94 / 26.31 | 18.98 / 18.45 | 23.78 / 23.51 | 4.87 / 4.62 | 0.08 / 0.09 |

## Reproduction and validation

16000 completed games, zero failures; every ending inventory checked against final size and VP. No leader/Worship effects and no optional trashing by off profiles. Workers replayed 160 saved traces. 16 CPUs used inside nix develop. Source commit: 2f8ba68ec18d8de994307cb6ff4c92582b8c5053.

Run from a clean committed tree inside nix develop: `bun scripts/balance-base.ts balance-runs/base-thinning-v1 1000 thinning`. Regenerate this report with `bun scripts/balance-base-report.ts balance-results/base-thinning-v1`. The manifest records full profiles, seed namespace and worker count. The archived shards and replays preserve every result; task dispatch files are reconstructible.
