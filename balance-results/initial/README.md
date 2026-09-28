# Initial balance baseline

All **24,000 games** completed in **43.9 seconds**, with zero errors, turn-limit hits or command-limit hits. This run used 200 fresh seed blocks per player-count/policy cell, all ordered distinct-leader assignments, and the two fixed policies described in [BALANCE_SIMULATION.md](../../BALANCE_SIMULATION.md). A separate 10-block pilot tested throughput; it is not pooled into these results and no policy tuning was performed between pilot and main run.

Four-player victory shares (equal tied-winner shares after the fewer-turn tiebreak):

| Leader | Treasure | Draw |
| --- | ---: | ---: |
| Thaleia | 5.6% | 3.3% |
| Nereon | 22.3% | 29.9% |
| Melia | 30.0% | 19.0% |
| Doreios | 42.1% | 47.8% |

Doreios also leads three-player tables at 50.3% (Treasure) and 54.5% (Draw). Two-player leadership depends on the policy: Melia has 60.8% under Treasure, while Nereon has 64.1% under Draw. Those two-player percentages average each leader's three opposing leaders and both turn positions; they are not one four-way contest. Symmetric reference shares are 50%, 33.3%, and 25% for two, three, and four players respectively.

The first turn receives 54.9–56.0% of victory share in two-player games, 37.6–38.3% in three-player games, and 29.1–30.4% in four-player games. This schedule assigns leaders rather than letting bots choose them, so it does not establish whether strategic reverse-order drafting compensates for seating advantage. Only three games end through three empty piles; the remaining 23,997 end through Acropolis depletion.

These are **exploratory signals about these policies**, not confirmed balance concerns. Both bots omit Worship, use the same purchase priorities for every leader, and do not adapt to opponents. Thaleia's low shares particularly warrant testing a stronger terminal-action engine and Worship access before considering a buff. Doreios's results motivate testing the value of early thinning against tuned opponents; the experiment does not isolate the causal value of his trigger. Melia and Nereon changing rank with policy demonstrates why a single bot cannot establish a leader tier list. No rule changes are recommended from this baseline.

See [the generated report](report.md) for every player-count/policy/leader result, mean VP and turns, and marginal 95% intervals clustered by seed block. Intervals are not adjusted for multiple testing or evidence from adaptive strategy search.

## Reproduce or inspect

The [manifest](manifest.json) identifies clean source commit `1a5f4b561715c2fb6c8184bf885e1e0ce95262fc`, exact seeds, schedule, guards and runtime. At that commit, from the repository root:

```sh
bun run simulate:balance --blocks 200 --seed balance-initial-v1 --out balance-runs/reproduce-initial
```

Timing will vary; game results and the generated report are deterministic. [games.jsonl.gz](games.jsonl.gz) contains all 24,000 game records, including seat mappings and the identifiers needed to rerun individual games. `gzip -dc balance-results/initial/games.jsonl.gz` reads it without modifying the archive. The `replays/` directory contains six compressed full event streams, one for each player-count/policy combination. Decompress and pass the event array to the production `replaySetup` function to inspect them.
