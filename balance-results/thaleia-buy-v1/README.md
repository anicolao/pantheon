# Thaleia +1 Action/+1 Buy, with other buffs removed

The extra Buy produces little change in the tested heads-up matchups. Thaleia remains below an even victory share against every rival's selected counter. All earlier buffs are absent from this comparison: Thaleia draws no extra card, Nereon has his original +1 Coin trigger, and Melia her original +1 Card trigger.

## Same-seed results

These are **Thaleia's** victory shares. Each primary rule/leader configuration has 400 evaluation games, balancing both turn orders over 200 seed blocks. Tied wins split shares equally.

| Rival | Original +1 Action | Proposed +1 Action/+1 Buy | Selected rival counter |
| --- | ---: | ---: | --- |
| Nereon | 38.5% | 38.4% | Treasure |
| Melia | 37.8% | 38.3% | Engine preset 1 |
| Doreios | 28.7% | 29.3% | Treasure |

Training selects the same profiles in both arms: Engine for Thaleia in every matchup, and the counters above. Although the procedure permits adaptation, these primary results therefore compare identical policies with only the extra Buy changing.

| Rival | Proposed victory share, adjusted interval | Paired change, adjusted interval |
| --- | --- | --- |
| Nereon | 32.0–45.0% | −0.1 pp (−1.1 to +0.5) |
| Melia | 32.0–44.5% | +0.5 pp (−0.8 to +2.0) |
| Doreios | 23.4–35.3% | +0.5 pp (+0.0 to +1.5) |

Shares and differences are rounded independently. None of these paired intervals approaches the framework's +5-point practical-benefit threshold. The proposed-share intervals remain below 50%. This variant does not address Thaleia's weakness within these bots. This is exploratory evidence on reused seeds, not a global equivalence claim, proof of optimal play, or independent confirmation.

The descriptive profile rows also show small changes. All trained counters remain the same for all five Thaleia families against all three leaders; full results are in [report.md](report.md). The largest positive point change among those diagnostic rows is about +2.1 points for Treasure Thaleia against Nereon.

## Why the Buy has little observed effect

The existing bots already make additional purchases when they have Buys, money, and a purchase they value. In the primary Engine matchups, most of the added Buy capacity appears as additional unused Buys at turn end:

| Rival | Mean trigger activations, proposed | Mean unused Buys per game, original → proposed |
| --- | ---: | ---: |
| Nereon | 12.14 | 18.53 → 30.60 |
| Melia | 11.85 | 16.98 → 28.74 |
| Doreios | 11.76 | 15.45 → 27.19 |

Unused Buys are summed over the whole game, not a per-turn figure. The increase is approximately the number of new Buys supplied. These descriptive telemetry totals are consistent with Buy availability rarely being the limiting factor for these policies; they do not identify individual Buy tokens or establish that a different strategy could not exploit the ability.

## Rules and experimental design

The explicit `thaleia-buy` variant adds +1 Buy after Thaleia's existing +1 Action, on the first matching Action each turn, after that Action resolves. It does not activate the earlier draw or rival buffs. All other rules, trigger conditions and scoring remain standard. Historical variants remain available for archived replay, but are not active in this study. Ordinary production play retains standard rules.

This repeats the previous counter-search framework with the exact same 40 training and 200 evaluation seed blocks, five frozen Thaleia profiles, 13 rival configurations, both turn orders and selection method. For each rival and rule, training selects the counter minimizing each Thaleia profile's share, then her profile maximizing those minima. Ties retain candidate order. All selections freeze before evaluation; evaluation never reselects profiles.

The run contains 31,200 training and 12,000 evaluation games. Thaleia keeps one previously trained preset per family, while rivals search all three presets for each non-Treasure family, as in the preceding comparisons. This is a finite pure-strategy stress test, not an exhaustive or mixed-strategy solution.

The nine primary quantities are six selected shares and three paired differences. Intervals use 20,000 whole-seed-block bootstrap resamples with Bonferroni adjustment across all nine. The same evaluation seeds were intentionally reused after earlier rule results were observed, so the intervals describe seed variation conditional on selected policies; they do not account for the broader rule search. Training and evaluation remain disjoint from one another.

## Reproduction and validation

From the recorded source commit, use a fresh output directory:

```sh
nix develop --no-write-lock-file --command bun run balance:counter --comparison thaleia-buy --out balance-runs/thaleia-buy-v1
```

Full runs enforce exact equality with the original counter study's seeds and frozen profiles. The pinned Nix shell supplies the complete toolchain. A distinct 900-game execution pilot is excluded from these results.

Artifacts: [manifest.json](manifest.json), [training.jsonl.gz](training.jsonl.gz), [training-scores.json](training-scores.json), [selections.json](selections.json), [games.jsonl.gz](games.jsonl.gz), [estimates.json](estimates.json), [report.md](report.md), and 60 compressed first-block traces in `replays/`.

Validation:

- All 43,200 games completed without failures.
- All 15,600 standard-arm training games and 6,000 standard-arm evaluation games reproduce the original unbuffed archive exactly, including baseline strategy selections.
- Training scores, profile hashes, selections, seed pairing and seat coverage verified; reports and estimates regenerated exactly; all 60 samples replayed to identical scores and turns.
- 31 simulation tests and 41 backend emulator tests passed under Nix. Strict TypeScript checks passed; application checks reported zero errors or warnings. Tests cover exactly one extra Buy, no extra draw, turn reset, unchanged other leaders, arm selection and replay. Browser tests were not run; UI is unchanged.

Source commit: `e0af3db889f47270e9315411047e337416e7b64d`, clean at execution. Bun 1.3.13; elapsed 408.8 seconds. The unchanged pinned flake/lock supplied the Nix shell.
