# Balance decision studies

The study runner adds training, stronger strategies, mixed-policy opposition, paired interventions, and held-out confirmation to the [original baseline simulator](BALANCE_SIMULATION.md). Production game rules remain unchanged. The original `simulate:balance` command and archived results retain their original meaning.

## Run an experiment

Run every command in the pinned development environment: start `nix develop`, or prefix individual commands with `nix develop --no-write-lock-file --command`. The flake provides Bun, Node.js, Java (for Firebase emulator regression tests), Git, GitHub CLI, Python and ripgrep. The balance runner itself does not require Java.

Start from a clean commit and use new output directories:

```sh
bun run balance:study train --blocks 2 --seed balance-v2 --players 2,3,4 --out balance-runs/training-v2
bun run balance:study run --config balance-studies/discovery.json --profiles balance-runs/training-v2/profiles.json --out balance-runs/discovery-v2
bun run balance:study run --config balance-studies/confirmation.json --profiles balance-runs/training-v2/profiles.json --discovery balance-runs/discovery-v2/manifest.json --out balance-runs/confirmation-v2
```

The checked-in study plans predeclare three two-player contrasts: Doreios's trigger, Athena Worship, and Sacred Academy acquisition, each restricted for the focal player only. The comparison population includes Treasure, Engine and Worship families in every ordered pairing, every leader lineup, and every focal turn position. Discovery has 20 seed blocks; confirmation has a fixed 200. These numbers are budgets, not guaranteed statistical power. Expand the *planned* confirmation budget before running if discovery intervals suggest it will be inadequate; do not repeatedly add blocks until a preferred result appears.

The full framework supports `[2,3,4]` player counts and `treasure`, `engine`, `thin`, `worship`, `race` families. All selected families are crossed as focal versus opponent; in multiplayer, opponents share a family. This covers homogeneous tables and asymmetric opposition but does not exhaust every multi-family multiplayer table. Every ordered leader lineup and focal position is included independently of policy. Leader selection is assigned through legal reverse-order drafting, not strategic drafting.

Output manifests record the full configuration before play, exact seeds, frozen profiles and their SHA-256 digest, source commit, planned game count, weighting, exclusions, guards and inference settings. Confirmation refuses dirty source trees, source/profile changes since discovery, failed discovery runs, reused declared seeds, and fewer than 200 blocks. Training, discovery and confirmation use separate seed namespaces. These checks prevent accidental contamination among the supplied artifacts; they cannot detect other experiments or manual tuning that a researcher fails to disclose.

## Policies and training

Treasure preserves the original benchmark. Engine buys draw and Action support; Thin emphasizes Seed Keeper and Forge; Worship builds Devotion and considers all available gods, including off-god use; Race prioritizes scoring and Sacred Grove. All four new families use leader-aware purchase utilities and the same general decision machinery. They are related heuristics, not four independent proofs of strategic strength.

Training searches the same three parameter presets for every non-benchmark family, leader and player count. Presets vary scoring transition, desired draw copies, minimum retained income and Worship opportunity margin. Each candidate plays all relevant leader/seat assignments against fixed Treasure and Engine references on the same training seeds. Selection uses focal victory share; ties prefer the first preset. The artifact records every candidate's score and game count. Two training blocks are a deliberately small initial budget: use larger budgets and additional opponent populations before relying on subtle differences. Preset search does not optimize arbitrary purchase priorities or discover new strategies.

The bots compare Worship's heuristic value with displaced purchases; they may Worship during Actions, between individual Treasure plays, or after purchases. They evaluate legal single- and two-card offerings, optional trash/gain choices, and mandatory discards. Card acquisition bans apply to purchases and gains. Rules, shuffle semantics, effects, cleanup, VP and tiebreaks come from the production reducer. Leader-trigger restrictions set the used flag before commands in the simulation wrapper. The separate Thaleia experiment below uses an explicit reducer variant to add one card to her trigger.

Bots receive their hand, own unordered inventory, public play cards/events/supply, resources and leader state. Opposing score estimates come from a ledger initialized from known starting inventories and updated only by public gains and trashes. No opponent hand, deck order, seed or private draw history enters policy observations. Public scores allow intentional winning pile-ending purchases. These bots do not perform hidden-state search or reason about every possible multi-step ending.

## What the interventions establish

Each study restriction has a `kind`, `id` and `scope` (`focal` or `table`):

- `leader-trigger`: suppress the named leader's trigger while retaining its Temple and shared event. This is a nonstandard attribution experiment. It is not a legal leader substitution.
- `event`: prevent the named Worship command while other rules stay fixed. It measures access/reliance, not intrinsic event power.
- `card`: prevent acquiring one supply Action through purchase or gain, while retaining its supply pile and all empty-pile rules. Temples, Treasures and Territories are rejected as targets because their evaluation needs different interventions.

Only lineups where the specified leader/event exists are compared. Each baseline/restricted pair shares setup seed, joining seats, leader lineup and policies. Future draws need not remain identical once acquisition and shuffle timing differ. Positive effects are **baseline victory share minus restricted victory share**, including equal shares for tied final winners. Outcomes are causal for the declared restriction and policy schedule, not for arbitrary changes to card cost or effect.

Frozen-policy studies reveal reliance. To test adaptation with equal budgets, train a separate artifact for each restriction:

```sh
# restriction.json contains one of the restriction objects from the study config.
bun run balance:study train --blocks 2 --seed balance-v2 --players 2,3,4 --restriction restriction.json --out balance-runs/restricted-training
```

Pass `--treatments treatment-profiles.json` to both discovery and confirmation. That JSON maps every target key, for example `"event:counsel-of-olympus:focal"`, to its restricted `profiles.json` path. The runner requires every target, matching restriction identity and equal candidate/game budgets. Only affected players switch to the retuned profiles; other players retain the baseline profiles. All profiles and hashes are archived in the manifest. Reusing training seeds across treatment arms is intentional pairing; evaluation seeds remain disjoint. Frozen and retuned studies must be separate experiments and reports.

## Evidence and decisions

The primary family is the predeclared player-count × restriction grid. Reports average paired victory-share differences within complete seed blocks, then bootstrap the independent blocks 20,000 times. They show both marginal 95% intervals and Bonferroni-adjusted intervals across that entire family. These are approximate bootstrap intervals, not exact finite-sample guarantees. Leader/focal-policy/opponent-policy league summaries and policy robustness rows are descriptive diagnostics, not additional significance tests.

The practical threshold is an absolute **5 percentage points** of victory share. A confirmation report labels a benefit/harm supported only when the entire adjusted interval exceeds that threshold in one direction, at least 200 blocks completed, baseline exposure is at least 10%, and no block was excluded for failures. Smaller or uncertain effects remain inconclusive or signals with unresolved magnitude. Low usage and a narrow zero interval do not establish equivalence. Failures retain null shares and exclude the entire affected count/target/block; they never become losses or draws.

A supported effect is explicitly **policy-dependent**. Before a rule decision:

1. Check policy matchup performance and actual event/card exposure. A leader whose bot consistently loses to basic Treasure is not fairly evaluated by that bot.
2. Review replays to explain the effect and compare leader, seat, opponent and strategy contexts. Broad aggregates can conceal narrow effects.
3. Retune both treatment arms equally; challenge the strongest suspected strategy with fresh counterplay and untouched seeds. Preserve the baseline opponents.
4. Test a concrete rule change separately, watching game endings, duration, failed games and lost strategic alternatives. General cost, effect and Devotion-threshold variants beyond the explicit Thaleia proposal are not yet implemented.
5. Validate that the strategy and proposed change make sense in human play.

The framework now provides measured intervention evidence and reproducible diagnostics for this process. It does not automatically prescribe buffs/nerfs. Full strategic draft search, hidden-information decision rollouts, broader policy search, interaction experiments, arbitrary parameter variants and human validation remain necessary extensions for claims beyond the tested population.

## Artifacts and verification

`games.jsonl` contains each baseline/treatment result with full profiles, seed, leader/seat mapping, VP/turns/share, end condition, acquisitions, trashes, standard/Favored/off-god Worship usage and Coins paid, leader-trigger counts, unused resources, first scoring turn and final deck size. `pairs.jsonl` joins arms with exposure counts; `estimates.json` and `report.md` contain primary inference. `league.md` summarizes the mixed-policy baseline.

Replay samples cover the first game of each player-count/focal-family/opponent-family/arm and all failures. Files contain events plus replay options. Use `replayExperiment(events, options)` for every study trace; ordinary `replaySetup` cannot reconstruct the nonstandard leader-trigger intervention. A match can also be rerun with `runExperiment` from the result's seed, block, lineup, profiles, focal position and restriction. The same guards as the original runner apply: 200 turns/player and 10,000 commands/turn.

`bun run test:simulation` validates all player-count/family matchups, production replay equivalence, intervention enforcement/replay, information isolation, public inventory accounting, retained offerings, evidence exclusions/correction and confirmation provenance. `bun run check` checks library/test types; the study CLI can also be checked with:

```sh
bunx tsc --noEmit --target es2022 --module esnext --moduleResolution bundler --types bun --skipLibCheck --strict scripts/balance-study.ts scripts/balance/*.ts
```

The [first paired decision study](balance-results/decision-study-v1/README.md) contains the 118,800-game held-out confirmation results, full compressed data, and a replay example. It also documents the observed strategy weaknesses that limit rule recommendations.

## Thaleia: one-change experiment

`bun run balance:thaleia --out balance-runs/thaleia-confirmation` tests the proposed trigger **+1 Action, +1 Card** against the current **+1 Action**, with the previous trained profiles frozen. The explicit `thaleia-draw` reducer option adds one draw after the existing Action bonus, after the first matching Action resolves; the once-per-turn condition is preserved. Standard play and ordinary setup replay default to the current rule. Variant traces must use `replayExperiment` with their recorded `variant`.

The default experiment predeclares 200 fresh seed blocks and 37,200 games. It tests homogeneous Treasure, Engine and Worship tables separately at 2, 3 and 4 players, plus every mixed pairing of those families at 2 players. Thaleia is the focal player. Within each block, every available opposing-leader subset is included; the opposing leaders' order is sampled independently of game randomness, and every cyclic seat rotation is played. This balances Thaleia's turn positions exactly, while sampling multiplayer opponent order across independent blocks instead of exhaustively duplicating every order inside each block. The actual per-block schedules are saved in the manifest.

The nine player-count × homogeneous-policy cells are the primary comparison family, with seed-block bootstrap intervals adjusted across all nine. Mixed two-player policy cells are descriptive diagnostics. The report shows both current/proposed victory shares and their paired difference, oriented so positive means the new trigger helps Thaleia. Frozen strategies can react to their new hands, but purchase utilities, parameters, opponents, other rules and scoring are held fixed; there is no retraining. A short execution pilot can use `--blocks 5 --seed a-distinct-pilot-seed` and does not enter the confirmation sample. Runs with at least 200 blocks require a clean committed source.

The [completed Thaleia study](balance-results/thaleia-draw-v1/README.md) archives all 37,200 games, adjusted intervals and replay samples. The extra card brings Treasure tables near symmetric victory shares but produces very high Thaleia shares in Engine and Worship tables.

## Leader-specific heads-up counters

Run `bun run balance:counter --out balance-runs/thaleia-counter-v1` inside `nix develop`. For both current and proposed Thaleia rules, each of her five previously trained profiles faces every other leader using 13 candidate counter configurations: one Treasure benchmark plus three presets each of Engine, Thin, Worship and Race. This searches the existing bot space; it does not invent new strategies.

The predeclared training budget is 40 fresh seed blocks, both turn orders, or 31,200 games. For each rival/rule/Thaleia profile, select the counter minimizing her training victory share. Then select her profile with the highest minimum share. Ties retain declared candidate order. Both sides may select different strategies against different leaders and under different rules. This pure-strategy maximin selection does not solve a mixed-strategy equilibrium.

All selections are frozen before 200 independent evaluation blocks (12,000 games). Every Thaleia profile is evaluated against its trained counter, but only her training-selected profile per rival/rule is primary. Never replace it with whichever row looks best on evaluation. The primary family consists of six selected victory shares and three proposed-minus-current differences, with seed-block bootstrap intervals adjusted across all nine. Differences include adaptation by both players and are not a fixed-policy estimate of the card alone. All 30 profile/counter rows are also reported as descriptive diagnostics. The counter is the best found during training; evaluation does not prove it is the true best response.

The manifest records candidates, profiles, seeds, source and selection hash. Compressed training rows retain both turn-order shares for every candidate; full evaluation results and first-block replay samples are archived. Source must be clean for confirmation. Failed training aborts selection; evaluation failures are recorded and exclude their affected blocks. Short pilots can use `--training-blocks 1 --blocks 2 --seed counter-pilot`, with a distinct output directory.

The [completed heads-up counter study](balance-results/thaleia-counter-v1/README.md) reports each leader separately, with the training-selected strategies and held-out intervals.
