# Nereon +2 Coins and Melia +2 Cards against buffed Thaleia

Both buffs overshoot in the opposite direction within the tested bot population. Nereon now wins 66.1% and Melia 68.1% against Thaleia's training-selected response. Thaleia retains her +1 Action/+1 Card trigger throughout this comparison.

## Same-seed results

The table follows the previous report's convention: **Thaleia's** victory share. Each selected rule/leader matchup contains 400 evaluation games, balancing both turn orders over 200 seed blocks. Tied wins split shares equally.

| Rival | Before rival buff | After rival buff | Thaleia strategy before → after | Rival counter before → after |
| --- | ---: | ---: | --- | --- |
| Nereon | 64.8% | 33.9% | Engine → Race | Treasure → Engine preset 1 |
| Melia | 68.8% | 31.9% | Worship → Race | Engine preset 1 → Engine preset 0 |
| Doreios (unchanged control) | 66.5% | 66.5% | Race → Race | Treasure → Treasure |

| Rival | Thaleia share after buff, adjusted interval | Change in Thaleia share, adjusted interval |
| --- | --- | --- |
| Nereon | 27.5–40.5% | −30.9 pp (−39.6 to −22.0) |
| Melia | 26.1–38.0% | −36.9 pp (−44.8 to −29.1) |
| Doreios | 60.4–72.8% | 0.0 pp (exactly unchanged) |

The changes therefore do not bring these matchups close to an even split under the tested strategies. Both rivals become favored instead. The all-profile diagnostics tell the same directional story: no tested Thaleia profile exceeds 33.9% against its selected new Nereon counter, or 31.9% against its selected new Melia counter. These diagnostic maxima are not additional primary tests.

This is exploratory evidence on deliberately reused seeds, not independent confirmation or proof of optimal-play balance. Both sides reselect on training, so changes include strategy adaptation as well as the rules. The unchanged Doreios result is an implementation control, not a new statistical finding about that leader. Production play continues to use the standard triggers; these variants are opt-in simulation rules.

## Rules and design

The comparison arm is the previous `thaleia-draw` variant. The new `leader-buffs` arm keeps Thaleia's +1 Action/+1 Card and changes the total reward on the first matching Action each turn:

- Nereon: +1 Coin → +2 Coins.
- Melia: +1 Card → +2 Cards.
- Doreios: unchanged.

Effects still resolve after the triggering Action and its pending choices; the once-per-turn condition and turn reset are unchanged. In these heads-up matches the two rival buffs occur in separate matchups.

The study exactly reuses the previous 40 training and 200 evaluation seed blocks, five frozen Thaleia profiles, 13 rival configurations, both turn orders, and deterministic selection method. It runs 31,200 training games and 12,000 evaluation games. For each rival and rule, select the counter minimizing each Thaleia profile's training share, then her profile maximizing those minima. All selections are frozen before evaluation. No evaluation results select strategies. Thaleia retains one previously trained preset per family; rivals search all three presets for each non-Treasure family, as before.

The primary comparison family contains six selected victory shares and three adapted differences, with 20,000 whole-seed-block bootstrap resamples and Bonferroni adjustment across nine quantities. Intervals quantify seed variation conditional on selections. They do not account for choosing this rule proposal after seeing earlier evaluation results, or for searching additional strategies. Training and evaluation seeds remain disjoint from one another, but intentionally match the corresponding phases of the prior study.

Full candidate scores, all 30 profile/counter diagnostics, and numeric intervals are in [report.md](report.md), [training-scores.json](training-scores.json), [selections.json](selections.json), and [estimates.json](estimates.json). Preset indices are zero-based; exact parameters are stored in the manifest.

## Reproduction and verification

Run from the recorded source commit with a fresh output directory:

```sh
nix develop --no-write-lock-file --command bun run balance:counter --comparison leader-buffs --out balance-runs/leader-buffs-v1
```

The CLI enforces exact equality with the archived prior study's training seeds, evaluation seeds and frozen profiles for a full run. The pinned Nix shell supplies the complete toolchain. A distinct 900-game execution pilot is excluded.

Artifacts include [manifest.json](manifest.json), [training.jsonl.gz](training.jsonl.gz), [games.jsonl.gz](games.jsonl.gz), selections, reports, and 60 compressed samples in `replays/`.

Validation:

- Zero failed games across all 43,200 games.
- All 15,600 unchanged-arm training games and 6,000 unchanged-arm evaluation games reproduce the prior archive exactly.
- Every Doreios training and evaluation result is identical across arms after normalizing the variant label.
- All training scores, selections, profile hashes, seat coverage and seed pairing verified; reports and estimates regenerated exactly; all 60 saved traces replayed to identical scores and turns.
- 28 simulation tests and 41 backend emulator tests passed under Nix. Strict TypeScript checks passed; application checks reported no errors or warnings. Browser tests were not run; UI is unchanged.

Source commit: `a5b71e6b806e6d5a363b8b9c60b0244a93ffab45`, clean at execution. Bun 1.3.13; elapsed 429.7 seconds. The unchanged pinned flake/lock supplied the shell.
