# Base game: Engine × Thin × End Game screening

No leader powers or Worship; identical starting decks of six Obols, three Hamlets and one inert Temple. Standard supply, ordinary Action effects and ending/tiebreak rules remain. All profiles use the same frozen default parameters, without retuning. Big Money retains the $0.035 near-tie preference and corrected scoring.

Thinning is an independent boolean on the parent strategy. Big Money + Thin evaluates expected income per initial draw (with legal Action play); Engine + Thin evaluates executable whole-deck coverage, stranded draw and opening reliability. Both account for remaining time, lost VP/current-turn income, tool capacity and known endings. Engine preserves existing cycle payload up to $8. Tool purchases include their deck/Action cost and a delayed, diminishing estimate of useful removals. These are public-information heuristics, not optimal multi-turn search.

End Game replaces aggressive Race: when the uncapped public horizon is at most two turns, prioritize affordable positive VP, including Polis and Hamlet. Before that, retain normal parent behavior (including immediate affordable Acropolis). No artificial horizon cap. Safe endings and ordinary gains share the rule; thinning upgrades keep joint parent-objective evaluation and charge lost current scoring opportunities. This is a screening trial, not confirmation.

The explicit off profiles decline optional trashing and receive no thinning investment bonus. This is a new controlled comparison: the earlier 2×2 Engine profile already included legacy thinning heuristics. Omitted thinning settings still reproduce historical profiles.

Player 1 acts first. Each cell contains 200 seeded games, with the same seeds reused across all cells. Entries are P1 victory shares, splitting ties. No strategies, presets or turn orders are pooled.

| P1 strategy ↓ / P2 strategy → | Engine | Engine + End Game | Engine + Thin | Engine + Thin + End Game |
| --- | ---: | ---: | ---: | ---: |
| Engine | 52.50% | 59.25% | 53.50% | 62.25% |
| Engine + End Game | 58.75% | 56.00% | 53.50% | 55.25% |
| Engine + Thin | 55.25% | 58.50% | 59.75% | 66.50% |
| Engine + Thin + End Game | 53.50% | 57.25% | 55.00% | 62.00% |

## Observed responses

- Given P1 Engine, P2’s strongest observed response is Engine: P1 52.50%, P2 47.50%.
- Given P1 Engine + End Game, P2’s strongest observed response is Engine + Thin: P1 53.50%, P2 46.50%.
- Given P1 Engine + Thin, P2’s strongest observed response is Engine: P1 55.25%, P2 44.75%.
- Given P1 Engine + Thin + End Game, P2’s strongest observed response is Engine: P1 53.50%, P2 46.50%.

P1’s strongest observed initial choice is Engine + Thin; P2 responds with Engine. The selected P1 share is 55.25% (family-adjusted interval 45.25%–65.75%). This is a concrete selected cell, not a strategy average. Best-response rankings are descriptive; no optimal-human-play or equivalence claim follows.

## Counts and uncertainty

| P1 / P2 | P1 wins | Split ties | P2 wins | Family-adjusted interval for P1 |
| --- | ---: | ---: | ---: | --- |
| Engine / Engine | 95 | 20 | 85 | 42.50%–62.25% |
| Engine / Engine + End Game | 115 | 7 | 78 | 49.50%–69.00% |
| Engine / Engine + Thin | 103 | 8 | 89 | 43.25%–64.00% |
| Engine / Engine + Thin + End Game | 122 | 5 | 73 | 52.00%–72.25% |
| Engine + End Game / Engine | 112 | 11 | 77 | 48.75%–68.75% |
| Engine + End Game / Engine + End Game | 102 | 20 | 78 | 46.00%–65.75% |
| Engine + End Game / Engine + Thin | 102 | 10 | 88 | 43.00%–63.75% |
| Engine + End Game / Engine + Thin + End Game | 107 | 7 | 86 | 44.75%–65.75% |
| Engine + Thin / Engine | 107 | 7 | 86 | 45.25%–65.75% |
| Engine + Thin / Engine + End Game | 115 | 4 | 81 | 48.25%–68.75% |
| Engine + Thin / Engine + Thin | 115 | 9 | 76 | 50.00%–69.75% |
| Engine + Thin / Engine + Thin + End Game | 130 | 6 | 64 | 56.75%–76.25% |
| Engine + Thin + End Game / Engine | 104 | 6 | 90 | 43.50%–63.75% |
| Engine + Thin + End Game / Engine + End Game | 109 | 11 | 80 | 47.25%–67.25% |
| Engine + Thin + End Game / Engine + Thin | 106 | 8 | 86 | 44.75%–65.00% |
| Engine + Thin + End Game / Engine + Thin + End Game | 120 | 8 | 72 | 52.25%–71.50% |

Intervals bootstrap seed blocks within each cell with 20,000 resamples and Bonferroni adjustment over all 16 cells (approximate 95% family coverage). Equal VP need not be a split tie because the standard fewer-turns tiebreak applies. No failures are scored as losses.

## Per-cell mechanism diagnostics

Each pair below is P1 / P2; these are within-cell means only. First points turn excludes games with no point acquisition; those counts are in cells.json. Full-deck draws count Action phases ending with no unseen cards. Exact card acquisitions, trashes and ending compositions are in cells.json.

| P1 / P2 | Final VP | Turns | First points turn | Final deck size | Cards trashed | Full-deck draws |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Engine / Engine | 30.88 / 29.27 | 20.86 / 20.39 | 9.37 / 9.39 | 30.67 / 30.14 | 0.00 / 0.00 | 0.00 / 0.00 |
| Engine / Engine + End Game | 30.93 / 29.27 | 20.96 / 20.39 | 9.37 / 9.39 | 30.76 / 29.97 | 0.00 / 0.00 | 0.00 / 0.00 |
| Engine / Engine + Thin | 29.59 / 27.30 | 19.75 / 19.24 | 9.37 / 9.49 | 29.55 / 24.40 | 0.00 / 4.58 | 0.00 / 0.07 |
| Engine / Engine + Thin + End Game | 30.07 / 27.57 | 20.40 / 19.79 | 9.37 / 9.49 | 30.17 / 24.65 | 0.00 / 4.68 | 0.00 / 0.07 |
| Engine + End Game / Engine | 31.80 / 28.52 | 21.25 / 20.70 | 9.37 / 9.39 | 30.93 / 30.44 | 0.00 / 0.00 | 0.00 / 0.00 |
| Engine + End Game / Engine + End Game | 30.89 / 28.75 | 20.91 / 20.39 | 9.37 / 9.39 | 30.63 / 30.02 | 0.00 / 0.00 | 0.00 / 0.00 |
| Engine + End Game / Engine + Thin | 30.26 / 27.46 | 20.59 / 20.09 | 9.37 / 9.49 | 30.15 / 25.21 | 0.00 / 4.61 | 0.00 / 0.07 |
| Engine + End Game / Engine + Thin + End Game | 29.91 / 27.71 | 20.61 / 20.07 | 9.37 / 9.49 | 30.22 / 24.95 | 0.00 / 4.70 | 0.00 / 0.07 |
| Engine + Thin / Engine | 28.88 / 27.55 | 19.44 / 18.91 | 9.82 / 9.43 | 24.00 / 28.70 | 5.09 / 0.00 | 0.06 / 0.00 |
| Engine + Thin / Engine + End Game | 29.25 / 28.52 | 20.20 / 19.63 | 9.82 / 9.43 | 24.73 / 29.24 | 5.12 / 0.00 | 0.06 / 0.00 |
| Engine + Thin / Engine + Thin | 27.80 / 25.64 | 18.66 / 18.08 | 9.79 / 9.48 | 23.39 / 23.53 | 4.95 / 4.34 | 0.05 / 0.08 |
| Engine + Thin / Engine + Thin + End Game | 28.50 / 26.48 | 19.68 / 19.04 | 9.79 / 9.48 | 24.35 / 24.32 | 5.02 / 4.28 | 0.05 / 0.08 |
| Engine + Thin + End Game / Engine | 29.47 / 27.63 | 20.30 / 19.79 | 9.82 / 9.43 | 24.61 / 29.55 | 5.18 / 0.00 | 0.06 / 0.00 |
| Engine + Thin + End Game / Engine + End Game | 29.49 / 28.29 | 20.54 / 20.00 | 9.82 / 9.43 | 24.89 / 29.64 | 5.21 / 0.00 | 0.06 / 0.00 |
| Engine + Thin + End Game / Engine + Thin | 28.76 / 26.28 | 20.06 / 19.53 | 9.79 / 9.48 | 24.58 / 24.91 | 4.97 / 4.40 | 0.05 / 0.08 |
| Engine + Thin + End Game / Engine + Thin + End Game | 28.95 / 26.63 | 20.23 / 19.63 | 9.79 / 9.48 | 24.67 / 24.80 | 5.13 / 4.44 | 0.05 / 0.08 |

## Reproduction and validation

3200 completed games, zero failures; every ending inventory checked against final size and VP. No leader/Worship effects and no optional trashing by off profiles. Workers replayed 160 saved traces. 16 CPUs used inside nix develop. Source commit: c8b957230afca9ee5b7c2f7bd8d47b4bc2e1d63b.

Run from a clean committed tree inside nix develop: `bun scripts/balance-base.ts balance-runs/base-engine-endgame-v1 200 endgame-engine`. Regenerate this report with `bun scripts/balance-base-report.ts balance-results/base-engine-endgame-v1`. The manifest records full profiles, seed namespace and worker count. The archived shards and replays preserve every result; task dispatch files are reconstructible.
