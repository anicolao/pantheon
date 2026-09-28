# Whole-deck Engine policy and Thaleia Action comparison

Engine v2 treats draw coverage of its owned deck as an acquisition goal. It reads printed effects and the actual public leader trigger, estimates playable draw under its Action budget, subtracts mandatory discards, and charges a new card for increasing deck size. Spare Actions with unseen cards increase draw demand; support becomes valuable when it unlocks stranded terminal draw. The policy has no named opening or draw-copy cap. Retention protects existing draw, and play ordering avoids stranding Actions when support is available.

The capacity estimate is optimistic and includes a small reliability margin. It does not solve shuffle risk or guarantee that every turn draws the entire deck. The new telemetry measures whether all cards owned at turn start have been seen during the Action phase, using observed draws and excluding new gains. It distinguishes spare Actions after completion from spare Actions with cards still unseen.

## Results

The revised bot overturns the earlier impression that Thaleia is weak. Under +1 Action she already wins a majority of these selected matchups; +2 Actions produces large advantages against Melia and Doreios and a smaller, uncertain improvement against Nereon.

| Rival | +1 Action share | +2 Actions share | Paired change (adjusted interval) | Selected counter in both arms |
| --- | ---: | ---: | --- | --- |
| Nereon | 65.1% | 70.9% | +5.8 pp (−2.0 to +13.6) | Treasure |
| Melia | 57.0% | 73.0% | +16.0 pp (+8.1 to +23.9) | Engine preset 0 |
| Doreios | 55.3% | 79.5% | +24.3 pp (+17.0 to +31.6) | Treasure |

Engine is Thaleia's training-selected family in all six matchups. Her preset changes from 1 under +1 Action to 0 under +2 Actions. Consequently these differences include parameter adaptation even though the family and opposing counter stay the same. Each share has 400 evaluation games. Shares and differences are rounded independently. The +2 Action share intervals are 64.6–77.1%, 67.0–78.8% and 74.0–84.7%, respectively: all above parity within this search. The Nereon change interval includes zero. Full estimates appear in [the report](comparison/report.md).

These results do not support giving Thaleia +2 Actions as a remedy for weakness in this bot population. They also demonstrate why the old Engine results should not drive that balance decision. Changes against the old archive combine the new policy and retraining; they are not a controlled policy-only effect.

### Does Engine pursue whole-deck draw?

| Rival | Games with at least one full-deck Action phase, +1A → +2A | Full-deck phases as share of all Action phases, +1A → +2A | Mean Council acquisitions, +1A → +2A |
| --- | ---: | ---: | ---: |
| Nereon | 44.3% → 93.5% | 5.6% → 19.5% | 2.00 → 3.00 |
| Melia | 44.5% → 91.8% | 6.1% → 20.5% | 2.00 → 3.00 |
| Doreios | 46.8% → 94.5% | 5.9% → 21.1% | 2.00 → 3.04 |

These are descriptive metrics for the selected Engine matchups, including opening turns and scoring turns. A full-deck phase means seeing every card owned at that turn's start; new gains are excluded until the next turn. More than half of +2A Action phases still end with spare Actions and unseen cards, so this heuristic has substantial room to improve despite achieving full-deck turns in most games. [Raw aggregates](engine-metrics.json) preserve the counts and mean unseen cards.

A deterministic rerun and replay of all 1,200 +2A Engine games verifies the purchase behavior. In 933/1,200 games (77.8%), the first two purchases made with at least $4 available are both Councils. Among games with two purchases of cards costing exactly $4, that is 933/1,020 (91.5%). The narrower historical metric—two purchases made with exactly $4 remaining—is 399/885 (45.1%); other draw cards or gains can have already filled demand before those decisions. These conditions are different and should not be conflated. There is no enforced two-Council opening. The [compressed audit](purchase-audit.json.gz) records every purchase and qualifying Worship decision.


## Design and interpretation

Both rules use Engine v2 for every Engine player. Other families keep their decision rules, but all profiles are retrained against the changed opponents. Eight disjoint profile-training seed blocks supply 4,608 games per arm (9,216 total). The counter study then repeats the original 40 training blocks (31,200 games) and 200 evaluation blocks (12,000 games), with both turn orders. Each of five Thaleia families faces a search over 13 rival configurations. Training selects her maximum-minimum response and the corresponding counter separately for each rival and rule; evaluation does not reselect.

The two arms are standard Thaleia +1 Action and `thaleia-actions` +2 Actions total on the first matching Action. Neither includes extra Cards, Buys or buffs to other leaders. Production defaults remain standard. Historical variants and results remain archived for reproducibility.

The nine primary quantities are six selected shares and three paired differences. Intervals use 20,000 whole-seed-block bootstrap resamples and Bonferroni adjustment. Victory shares split ties. Evaluation seeds intentionally match prior studies, so this is exploratory evidence within the bot population, not independent confirmation or optimal-play balance. Strategy and parameter adaptation means the main differences are not fixed-policy causal estimates. Old-policy results are not reused as either arm.

## Reproduction

At source commit `4b7648936b109f312bb3ce69abdc8930e5c2e871`, run inside `nix develop` with fresh output directories:

```sh
bun run balance:train-engine --out balance-runs/engine-cycle-training-v1
bun run balance:counter --comparison thaleia-actions --profiles balance-runs/engine-cycle-training-v1/standard.json --variant-profiles balance-runs/engine-cycle-training-v1/thaleia-actions.json --out balance-runs/engine-cycle-actions-v1
```

The unchanged pinned Nix flake supplies Bun 1.3.13 and all required tools. [Training artifacts](training/manifest.json) record both profile sets, candidate scores, hashes and seeds. [Comparison manifest](comparison/manifest.json), [report](comparison/report.md), compressed games, training records, selections and 60 replay samples preserve the final study.

## Validation

- All 52,416 planned games completed: 9,216 profile-training, 31,200 counter-training and 12,000 evaluation games; zero failures.
- Verified original counter seed equality, separation from all profile-training seeds, equal arm training budgets, policy/rule identity, profile hashes, frozen selections and complete paired seat coverage.
- Recomputed training scores and primary reports exactly; replayed all 60 saved traces to identical scores and turns. All 1,200 purchase-audit reruns reproduced full results exactly before replaying purchases.
- 43 simulation tests passed (7,339 assertions), including independent turn-start identity validation of public draw progress. The shared leader-effect refactor passed 41 backend emulator tests. Strict TypeScript checks passed; application checks reported zero errors and warnings.
- Source was clean and unchanged for both final runs; counter training/evaluation took 371.1 seconds. Browser tests were not run; UI is unchanged.

Run `bun balance-results/engine-cycle-v1/verify.ts` from the repository root inside Nix to verify the archived comparison, profile hashes and saved replays.

Three 900-game execution/behavior pilots and an interrupted run are excluded. The interrupted run was stopped to correct accounting for an Oracle returning an already-owned card to the deck; the final profile training and comparison both restarted from the corrected clean source. No evaluation result was used to revise the final policy.
