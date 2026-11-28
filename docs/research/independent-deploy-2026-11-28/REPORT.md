# Independent Deploy grants: fixed-policy comparison

Deploy grants now form a FIFO queue. Each Action play consumes one grant, resolving that physical card N times for free. Later grants remain for later Actions; grants produced during repetitions append to the queue. Cleanup expires the queue and undo restores it. Card costs, printed effects, leader trigger amounts, and bot weights are unchanged.

## Experiment

The frozen field is the accepted weakest-first field at the end of the previous campaign, not necessarily the deployed PR field. Achilles's checkpoint remains attempt 26. There were 7,000 heads-up games per ruleset: 1,000 against each other leader, balanced across first/second seats using 500 paired seeds per opponent. Both runs used identical game seeds and actor hashes. Every game completed and replayed identically under its own ruleset; none were excluded. The old-rules run completed before the engine edit.

Win share includes split credit for ties. The paired approximate 95% confidence interval uses independent seed blocks, averaging both starting seats before computing the standard error.

| Opponent | Old rule | Independent grants | Change |
|---|---:|---:|---:|
| Echo | 35.70% | 35.70% | 0.00 pp |
| Thaleia | 32.50% | 32.50% | 0.00 pp |
| Nereon | 15.30% | 15.30% | 0.00 pp |
| Melia | 6.10% | 6.10% | 0.00 pp |
| Doreios | 26.05% | 26.05% | 0.00 pp |
| Theseus | 38.70% | 38.70% | 0.00 pp |
| Perseus | 53.90% | 55.05% | +1.15 pp |
| **Overall** | **29.75%** | **29.91%** | **+0.16 pp** |

Overall paired delta: +0.164 percentage points, approximate 95% CI [+0.007, +0.322]. Against Perseus: +1.15 pp, CI [+0.049, +2.251]. Only 59 game outcomes changed, all against Perseus; 190 full event histories changed, also exclusively in that matchup. Zero observed differences in other matchups are a property of this sample and these fixed policies, not evidence that the rule can never affect them.

## Why the immediate gain is small

The frozen Achilles policy played none of Rallying Cry, Myrmidon Vanguard, or Phalanx Advance, and never worshipped March of Victory, across all 7,000 baseline games. It therefore did not exercise the newly useful combination of its leader trigger with a Nike market Action. Perseus's policy did use Nike market Actions (4,208 plays in its matchup), and those games account for every changed outcome. This is not evidence that Achilles has learned the new mechanic.

No retraining was performed for this comparison. The existing observation retains its next-Action repeat count (now the head of the queue); it does not expose queue depth or later grant counts. The result measures immediate fixed-policy behavior, not the strength attainable after training with a queue-aware observation.

## Validation and recovery

32 expansion, playable-bot, and RL tests passed; 71 action, undo, public-table, and equal-turn regressions passed. Svelte/type checking passed with zero errors and warnings. New checks cover two separate free plays, repeated grant sources, FIFO ordering, nested Echo consumption, cleanup, and undo. The lab prepares favored Deploy 3 using legal plays that consume the earlier grant first.

Raw results and all 14,000 compressed replays are at `balance-diagnostics/independent-deploy-20261128/{before,after}`. `scripts/rl/expansion/deploy_comparison.ts` runs either side under the selected engine revision. Protocol files record engine/schema/field hashes; the old engine and observation source are preserved beside the raw artifacts. Analysis and usage-audit scripts are included here. All experiment and test dependencies came from the repository flake.

The previous training campaign is stopped at its attempt limit. Its checkpoints and experiments remain intact; do not resume that old-rules campaign against the modified engine. A new-rules training campaign must use a new artifact directory and protocol. Nothing has been deployed by this change.
