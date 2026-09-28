# Thaleia +2 Actions only

Granting +2 Actions total on Thaleia's trigger does not bring her near an even heads-up victory share in the tested counter search. She receives no extra Card or Buy, and every other leader retains the original rules.

The subsequent [Council-opening audit](council-audit.md) found that the Engine bot is not aware of the trigger variant when buying cards and often buys Harbor Pilot ahead of a second Council. The results below therefore do not test a deliberately prioritized two-Council opening.

## Same-seed primary results

These are Thaleia's victory shares, splitting tied wins equally. Each primary rule/leader configuration has 400 evaluation games: 200 seed blocks with both turn orders balanced. Only strategies selected on training enter the primary comparison.

| Rival | Original +1 Action | Proposed +2 Actions | Thaleia strategy before → after | Selected counter |
| --- | ---: | ---: | --- | --- |
| Nereon | 38.5% | 39.8% | Engine → Engine | Treasure |
| Melia | 37.8% | 34.6% | Engine → Race | Engine preset 1 |
| Doreios | 28.7% | 28.7% | Engine → Race | Treasure |

| Rival | Proposed share, adjusted interval | Paired change, adjusted interval |
| --- | --- | --- |
| Nereon | 33.4–46.5% | +1.3 pp (−0.8 to +3.5) |
| Melia | 28.6–40.8% | −3.1 pp (−9.9 to +3.4) |
| Doreios | 22.6–35.3% | 0.0 pp (−6.5 to +6.9) |

Shares and differences are rounded independently. Every paired interval includes zero; none supports a practical improvement. All proposed-share intervals remain below 50% for these selected matchups. This is exploratory reused-seed evidence within the bot population, not independent confirmation, a general equivalence claim, or optimal-play balance.

The primary decline against Melia does not isolate the extra Action: training also switches Thaleia's strategy to Race. The same applies to the unchanged aggregate share against Doreios. Finite training can misrank profiles, and we do not replace the primary choice after seeing evaluation.

## Fixed-Engine diagnostics

Keeping Thaleia on Engine in both arms, with the same selected counter and parameters, gives:

| Rival | Original Engine share | +2 Actions Engine share |
| --- | ---: | ---: |
| Nereon | 38.5% | 39.8% |
| Melia | 37.8% | 37.3% |
| Doreios | 28.7% | 30.3% |

These descriptive rows show only small changes as well. They are not a second selection of the primary results or additional confirmatory hypotheses. All 30 profile/counter rows and their training scores appear in [report.md](report.md).

In the matched Engine rows, most additional Action capacity appears as unused Actions at turn end:

| Rival | Mean proposed trigger activations | Mean unused Actions per game, original → proposed |
| --- | ---: | ---: |
| Nereon | 12.11 | 16.74 → 28.76 |
| Melia | 11.81 | 16.38 → 28.13 |
| Doreios | 11.72 | 15.36 → 26.92 |

These are totals over whole games, not per-turn quantities. The rise in unused Actions is approximately the extra capacity granted. That is consistent with Actions rarely being the bottleneck for these Engine policies. It does not identify individual resource tokens or rule out strategies designed to exploit additional terminal Action cards. Our tests verify that the rule can enable an additional Council of Sages play when the standard trigger would leave no Actions remaining.

## Rules and design

The explicit `thaleia-actions` variant changes the existing first-matching-Action trigger from +1 Action to +2 Actions total. It preserves the timing after the triggering card resolves, including its pending choices, and the once-per-turn condition. There is no extra draw or Buy. Nereon, Melia and Doreios keep their original triggers. Historical variants remain explicit alternatives for replaying earlier studies; they are not active here. Ordinary production play retains the standard rules.

This repeats the original counter-study seeds, five frozen Thaleia profiles, 13 rival configurations, both turn orders, and deterministic selection procedure. There are 40 training blocks (31,200 games), followed by 200 evaluation blocks (12,000 games). For each rival and rule, training picks the counter minimizing each Thaleia profile's share, then her profile maximizing those minima. Ties retain candidate order. All choices freeze before evaluation; evaluation does not reselect them.

Thaleia retains one previously trained preset per family; rivals search all three presets for each non-Treasure family. No new card priorities, arbitrary strategy search, strategic drafting or mixed-strategy equilibrium is implemented. The nine primary quantities are six selected shares and three paired differences, with 20,000 whole-seed-block bootstrap resamples and Bonferroni adjustment. The evaluation seeds are intentionally reused after previous rule trials, so these intervals describe seed variation conditional on selections, not uncertainty from the broader rule search. Training and evaluation remain disjoint from one another.

## Reproduction and validation

From the recorded source commit, use a fresh output directory:

```sh
nix develop --no-write-lock-file --command bun run balance:counter --comparison thaleia-actions --out balance-runs/thaleia-actions-v1
```

Full runs enforce exact equality with the original counter study's training/evaluation seeds and frozen profiles. All commands run in the pinned Nix shell. A distinct 900-game execution pilot is excluded.

Artifacts: [manifest.json](manifest.json), [training.jsonl.gz](training.jsonl.gz), [training-scores.json](training-scores.json), [selections.json](selections.json), [games.jsonl.gz](games.jsonl.gz), [estimates.json](estimates.json), [report.md](report.md), and 60 compressed first-block traces in `replays/`.

Validation:

- All 43,200 games completed without failures.
- All 15,600 original-rule training games and 6,000 original-rule evaluation games reproduce the unbuffed archive exactly, including baseline strategy selections.
- Training scores, profiles, selections, seed pairing and seat coverage verified; reports and estimates regenerated exactly; all 60 traces replayed to identical scores and turns.
- 34 simulation tests and 41 backend emulator tests passed under Nix. Strict TypeScript checks passed; application checks reported zero errors or warnings. Tests cover the additional legal terminal Action, no Card/Buy bonus, once-per-turn reset, unchanged other leaders, correct comparison arms and replay. Browser tests were not run; UI is unchanged.

Source commit: `68ba96b2f490ad5293fa86595faa2640f46a4575`, clean at execution. Bun 1.3.13; elapsed 412.3 seconds. The unchanged pinned flake/lock supplied the Nix shell.
