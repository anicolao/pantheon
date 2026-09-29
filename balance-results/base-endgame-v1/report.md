# Base game: Big Money × Thin × End Game screening

No leader powers or Worship; identical starting decks of six Obols, three Hamlets and one inert Temple. Standard supply, ordinary Action effects and ending/tiebreak rules remain. All profiles use the same frozen default parameters, without retuning. Big Money retains the $0.035 near-tie preference and corrected scoring.

Thinning is an independent boolean on the parent strategy. Big Money + Thin evaluates expected income per initial draw (with legal Action play); Engine + Thin evaluates executable whole-deck coverage, stranded draw and opening reliability. Both account for remaining time, lost VP/current-turn income, tool capacity and known endings. Engine preserves existing cycle payload up to $8. Tool purchases include their deck/Action cost and a delayed, diminishing estimate of useful removals. These are public-information heuristics, not optimal multi-turn search.

End Game replaces aggressive Race: when the uncapped public horizon is at most two turns, prioritize affordable positive VP, including Polis and Hamlet. Before that, retain normal parent behavior (including immediate affordable Acropolis). No artificial horizon cap. Safe endings and ordinary gains share the rule; thinning upgrades keep joint parent-objective evaluation and charge lost current scoring opportunities. This is a screening trial, not confirmation.

The explicit off profiles decline optional trashing and receive no thinning investment bonus. This is a new controlled comparison: the earlier 2×2 Engine profile already included legacy thinning heuristics. Omitted thinning settings still reproduce historical profiles.

Player 1 acts first. Each cell contains 200 fresh seeded games, with the same seeds reused across all cells. Entries are P1 victory shares, splitting ties. No strategies, presets or turn orders are pooled.

| P1 strategy ↓ / P2 strategy → | Big Money | Big Money + End Game | Big Money + Thin | Big Money + Thin + End Game |
| --- | ---: | ---: | ---: | ---: |
| Big Money | 46.50% | 28.50% | 46.75% | 26.00% |
| Big Money + End Game | 78.00% | 53.75% | 71.25% | 52.25% |
| Big Money + Thin | 51.75% | 37.75% | 50.00% | 37.00% |
| Big Money + Thin + End Game | 81.50% | 57.25% | 71.75% | 56.50% |

## Observed responses

- Given P1 Big Money, P2’s strongest observed response is Big Money + Thin + End Game: P1 26.00%, P2 74.00%.
- Given P1 Big Money + End Game, P2’s strongest observed response is Big Money + Thin + End Game: P1 52.25%, P2 47.75%.
- Given P1 Big Money + Thin, P2’s strongest observed response is Big Money + Thin + End Game: P1 37.00%, P2 63.00%.
- Given P1 Big Money + Thin + End Game, P2’s strongest observed response is Big Money + Thin + End Game: P1 56.50%, P2 43.50%.

P1’s strongest observed initial choice is Big Money + Thin + End Game; P2 responds with Big Money + Thin + End Game. The selected P1 share is 56.50% (family-adjusted interval 46.25%–66.50%). This is a concrete selected cell, not a strategy average. Best-response rankings are descriptive; no optimal-human-play or equivalence claim follows.

## Counts and uncertainty

| P1 / P2 | P1 wins | Split ties | P2 wins | Family-adjusted interval for P1 |
| --- | ---: | ---: | ---: | --- |
| Big Money / Big Money | 63 | 60 | 77 | 38.00%–55.25% |
| Big Money / Big Money + End Game | 55 | 4 | 141 | 19.75%–38.00% |
| Big Money / Big Money + Thin | 79 | 29 | 92 | 37.25%–56.50% |
| Big Money / Big Money + Thin + End Game | 50 | 4 | 146 | 17.50%–35.50% |
| Big Money + End Game / Big Money | 154 | 4 | 42 | 69.00%–86.00% |
| Big Money + End Game / Big Money + End Game | 99 | 17 | 84 | 43.75%–63.50% |
| Big Money + End Game / Big Money + Thin | 141 | 3 | 56 | 61.75%–80.00% |
| Big Money + End Game / Big Money + Thin + End Game | 99 | 11 | 90 | 42.25%–62.50% |
| Big Money + Thin / Big Money | 92 | 23 | 85 | 41.75%–61.50% |
| Big Money + Thin / Big Money + End Game | 73 | 5 | 122 | 28.00%–48.00% |
| Big Money + Thin / Big Money + Thin | 88 | 24 | 88 | 40.00%–59.75% |
| Big Money + Thin / Big Money + Thin + End Game | 71 | 6 | 123 | 27.50%–47.00% |
| Big Money + Thin + End Game / Big Money | 160 | 6 | 34 | 73.50%–88.75% |
| Big Money + Thin + End Game / Big Money + End Game | 108 | 13 | 79 | 47.25%–67.25% |
| Big Money + Thin + End Game / Big Money + Thin | 140 | 7 | 53 | 62.00%–80.25% |
| Big Money + Thin + End Game / Big Money + Thin + End Game | 108 | 10 | 82 | 46.25%–66.50% |

Intervals bootstrap seed blocks within each cell with 20,000 resamples and Bonferroni adjustment over all 16 cells (approximate 95% family coverage). Equal VP need not be a split tie because the standard fewer-turns tiebreak applies. No failures are scored as losses.

## Per-cell mechanism diagnostics

Each pair below is P1 / P2; these are within-cell means only. First points turn excludes games with no point acquisition; those counts are in cells.json. Full-deck draws count Action phases ending with no unseen cards. Exact card acquisitions, trashes and ending compositions are in cells.json.

| P1 / P2 | Final VP | Turns | First points turn | Final deck size | Cards trashed | Full-deck draws |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Big Money / Big Money | 21.13 / 21.55 | 15.87 / 15.55 | 9.01 / 9.01 | 25.73 / 25.39 | 0.00 / 0.00 | 0.00 / 0.00 |
| Big Money / Big Money + End Game | 22.37 / 31.15 | 18.77 / 18.49 | 9.01 / 8.98 | 28.71 / 28.68 | 0.00 / 0.00 | 0.00 / 0.00 |
| Big Money / Big Money + Thin | 21.04 / 21.18 | 15.74 / 15.35 | 9.01 / 9.11 | 25.61 / 24.55 | 0.00 / 1.17 | 0.00 / 0.00 |
| Big Money / Big Money + Thin + End Game | 21.45 / 30.23 | 18.14 / 17.89 | 9.01 / 9.09 | 28.05 / 27.23 | 0.00 / 1.13 | 0.00 / 0.00 |
| Big Money + End Game / Big Money | 32.59 / 20.64 | 18.91 / 18.14 | 9.00 / 9.01 | 29.00 / 28.01 | 0.00 / 0.00 | 0.00 / 0.00 |
| Big Money + End Game / Big Money + End Game | 29.86 / 28.64 | 18.22 / 17.73 | 9.00 / 8.98 | 28.21 / 27.77 | 0.00 / 0.00 | 0.00 / 0.00 |
| Big Money + End Game / Big Money + Thin | 31.29 / 20.88 | 18.22 / 17.52 | 9.00 / 9.11 | 28.27 / 26.71 | 0.00 / 1.19 | 0.00 / 0.00 |
| Big Money + End Game / Big Money + Thin + End Game | 29.36 / 28.04 | 18.07 / 17.57 | 9.00 / 9.09 | 28.09 / 26.84 | 0.00 / 1.14 | 0.00 / 0.00 |
| Big Money + Thin / Big Money | 21.72 / 19.95 | 15.48 / 15.03 | 8.96 / 9.01 | 24.49 / 24.89 | 1.43 / 0.00 | 0.00 / 0.00 |
| Big Money + Thin / Big Money + End Game | 22.69 / 28.98 | 17.95 / 17.58 | 8.96 / 8.98 | 27.01 / 27.75 | 1.43 / 0.00 | 0.00 / 0.00 |
| Big Money + Thin / Big Money + Thin | 20.88 / 20.03 | 15.19 / 14.74 | 9.04 / 9.09 | 24.20 / 23.92 | 1.46 / 1.20 | 0.00 / 0.00 |
| Big Money + Thin / Big Money + Thin + End Game | 21.82 / 27.98 | 17.43 / 17.07 | 9.04 / 9.05 | 26.48 / 26.39 | 1.47 / 1.16 | 0.00 / 0.00 |
| Big Money + Thin + End Game / Big Money | 30.80 / 19.54 | 17.96 / 17.16 | 8.94 / 9.01 | 27.16 / 27.05 | 1.43 / 0.00 | 0.00 / 0.00 |
| Big Money + Thin + End Game / Big Money + End Game | 29.20 / 27.57 | 17.98 / 17.43 | 8.94 / 8.98 | 27.07 / 27.48 | 1.41 / 0.00 | 0.00 / 0.00 |
| Big Money + Thin + End Game / Big Money + Thin | 29.41 / 19.99 | 17.41 / 16.71 | 9.03 / 9.09 | 26.62 / 25.88 | 1.43 / 1.21 | 0.00 / 0.00 |
| Big Money + Thin + End Game / Big Money + Thin + End Game | 28.30 / 26.71 | 17.45 / 16.91 | 9.03 / 9.05 | 26.58 / 26.18 | 1.44 / 1.17 | 0.00 / 0.00 |

## Reproduction and validation

3200 completed games, zero failures; every ending inventory checked against final size and VP. No leader/Worship effects and no optional trashing by off profiles. Workers replayed 160 saved traces. 16 CPUs used inside nix develop. Source commit: 621bb90fa7592085c3024ad52f3d87abe0c451b5.

Run from a clean committed tree inside nix develop: `bun scripts/balance-base.ts balance-runs/base-endgame-v1 200 endgame`. Regenerate this report with `bun scripts/balance-base-report.ts balance-results/base-endgame-v1`. The manifest records full profiles, seed namespace and worker count. The archived shards and replays preserve every result; task dispatch files are reconstructible.
