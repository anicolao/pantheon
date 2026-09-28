# Basic balance simulator

For trained policies, Worship, mixed opposition and paired confirmation studies, see [BALANCE_STUDIES.md](BALANCE_STUDIES.md). This page documents the preserved original baseline.

Run the production setup replay and play-command reducer directly, without Firebase or a browser:

```sh
bun run test:simulation
bun run simulate:balance --blocks 200 --seed balance-initial-v1 --out balance-runs/initial
```

The default is 200 blocks, both policies, and all 2-, 3-, and 4-player lineups: **24,000 games**. For a quick run, use `--blocks 10`; restrict player counts with `--players 2` or `--players 3,4`. Output directories must not already exist. Run from the repository root. No game rules or production UI are changed.

## What is implemented

Each seed block plays every ordered assignment of distinct leaders to turn positions: 12 two-player, 24 three-player, and 24 four-player lineups, each under two homogeneous policies. Setup uses legal reverse-order drafting to obtain the assigned lineup. Every player at a table uses the same policy; the experiment does not compare policies head to head or implement strategic drafting.

Both policies play their Temple, buy Acropolis whenever affordable, prioritize Polis once three Acropolises remain, and otherwise invest in income. Treasure prioritizes Talent then Drachma. Draw prioritizes Talent, up to four Sacred Academies, one Harbor Pilot, one Council of Sages, then Drachma; engine purchases stop once three Acropolises remain. Affordable lower-priority choices are considered if higher-priority ones cannot be bought. Hamlet is a late fallback. Action sequencing prioritizes a first Council with Thaleia's unused trigger, then Actions that grant Actions and draw. Doreios trashes Hamlet before the late game and Obol only with at least eight Coins of total owned Treasure value. These are fixed, untuned heuristics, not optimized players.

The bot receives its hand, its unordered inventory counts (equivalent to remembering its initial cards and own gains/trashes), supply counts, resources, phase, choice, and leader trigger state. It receives neither seed nor draw order nor opposing hands nor the private movement history. Observations are copied so policies cannot mutate game state.

**Neither policy Worships.** Both play all Treasures together and do not reason about retained offerings, opponent acquisitions, pile-race endings, or counterplay. These limitations especially restrict evaluation of Thaleia's extra Actions and all shared events. This is the first executable baseline for [the broader experiment plan](BALANCING_OPTIONS.md), not completion of that plan. A weak leader result can reflect policy weakness.

## Outputs and reproducibility

- `manifest.json`: source commit, dirty-worktree flag, runtime, exact seeds, lineup schedule, policy version, guards, exclusions, tuning budget (zero), elapsed time and total games.
- `games.jsonl`: one row per attempted match, including seed, block, policy, leaders, joining-seat and turn-position mappings, status, command count, end condition, VP, turns and victory shares. Shares split equally among final winners after the production fewer-turn tiebreak.
- `report.md`: leader outcomes separated by player count and policy, plus endings and first-turn shares.
- `replays/`: full production setup/play events for the first lineup of block zero in each count/policy cell and every failed match. Load an event array with `replaySetup(events)` to reproduce a sampled game's final state. An illegal-command failure includes the attempted event that causes replay to throw. Any other match can be regenerated with `runMatch({seed, block, lineup, policy})` from its result row at the recorded source commit.

The same setup seed is reused across lineups and policies within a block. Joining-seat shuffle semantics are preserved; changed deck composition can still change later draws. Policies are deterministic and consume no randomness. Bootstrap randomness is independent of game randomness. Runs made with uncommitted changes are marked dirty; use a clean committed source for published results.

Guards stop at 200 completed turns per player or 10,000 commands in one turn. Guard hits and errors are explicit statuses with **null** victory shares, never losses or draws. The command exits unsuccessfully if any match fails. Leader summaries exclude an entire count/policy/block if any of its games fails. Reports bootstrap whole seed-block averages with 2,000 deterministic resamples, preserving correlations among rotations. Marginal 95% intervals are exploratory and not corrected for multiple testing; a single block has no interval. These aggregate shares are not paired causal treatment estimates, and no balance threshold is automatically declared satisfied.

`test:simulation` runs in CI and in `verify`. Tests cover all 120 count/policy/lineup combinations, event-replay equivalence, deterministic outcomes, information isolation, legal choices, explicit failure statuses, schedule coverage, and block exclusion. Runtime and backend behavior are delegated to the production engine rather than reimplemented.

The [initial 24,000-game results](balance-results/initial/README.md) include the run manifest, complete compressed game-level data, and six compressed replay samples.
