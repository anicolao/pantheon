# Shared three-turn acquisition sampling (v15)

Status: complete. The requested shared sampler is implemented and evaluated on 7,168 fresh-seed games, following a separate 448-game runtime pilot. All 7,616 games completed without failures.

Both Money and Engine now evaluate every economic acquisition using the same production-rule sampler. Mean total spendable coins over three consecutive turns is Money's objective; mean total cards actually drawn is Engine's. Opening draws count, and redraws count if they actually occur. This is raw draw volume, not probability of drawing the entire deck or a fraction of its size.

Each of 64 samples starts with a fresh shuffle of the public owned inventory plus the acquisition. Turns carry deck, discard, trash, gained cards and reshuffles forward. There are no additional purchases or Worship inside samples; card effects still apply. Candidate additions share initial insertion ranks, and existing copies share random ranks. Production reshuffles use paired seeds; different cleanup orders can still create sampling variance. No real game seed or hidden deck order is consulted.

The same bounded play controller is used for both objectives, including actual Action/discard play. It preserves Action chains and prioritizes useful draw/payload. Within rollouts, gain choices use a fixed resource/draw continuation score; optional Thin removes inert cards and weak money when cycle payload allows. These bounded continuation heuristics are shared, not recursively optimized. Actual optional removals and upgrades compare the sampled parent metric, charging lost VP/current cash and protecting known endings. Thin off never optionally trashes.

All card types use sampling; there are no analytic Treasure shortcuts, Engine capacity scores, named openings, separate Treasure utility or Treasure epsilon preference in economic acquisition. Exact ties use lower cost then card ID for both parents. Current shared endgame scoring, safe ending plans and the affordable top-point priority sit above economic selection. Thus points can still be bought despite dilution. The new controller applies the top-tier priority identically to both parents (old Engine compared its utility with investments).

This requested three-turn deck test does not plan a second complementary purchase. It measures the candidate's effect on the deck that would actually exist after this purchase, then plays that deck. Total draws can reward cycling without sufficient money; this is a property to measure, not silently correct by adding a different objective.

## Frozen experiment

Retain exact v14 profiles as old controls. New profiles differ by the shared sampled controller. No outcome-driven tuning of samples or metric is planned. A separate runtime pilot is excluded from reported evaluation.

Evaluate 256 fresh common seeds in 28 ordered cells: new Money/Engine × Thin complete 4×4 (16 cells); each of the four profiles against its old version in both seats (8); and four old mirrors (4). Total 7,168 games. All have no leader powers or Worship and identical starting decks. Runs use all available CPUs inside Nix with a dynamic work queue.

Report the eight direct new-versus-old shares separately by seat. Also compare each new arm with the old mirror in the same seat on paired seeds, holding the opponent fixed. Report the new full 4×4 and each row's best response, with no seat/strategy pooling. Bootstrap intervals adjust separately over the eight direct comparisons, eight paired changes and sixteen new matrix cells.

Historical defaults remain available as v14BaseProfiles; modern baseProfiles use evaluation: shuffle-3. New policy definitions live in sampled.ts.

## Results

New strategy win share against its own v14 counterpart; each seat is a separate 256-game cell.

| Strategy | New as P1 | New as P2 |
| --- | ---: | ---: |
| Money | 47.07% | 35.94% |
| Money + Thin | 47.46% | 34.57% |
| Engine | 0.00% | 0.00% |
| Engine + Thin | 0.00% | 0.00% |

The full [evaluation report](../shuffle-three-evaluation-v1/report.md) gives adjusted uncertainty and paired changes against fixed old opponents. The [pilot](../shuffle-three-pilot-v1/report.md) is excluded. Unanimous outcomes receive nonzero uncertainty bounds, rather than a degenerate bootstrap interval.

New four-by-four, P1 shares:

| P1 / P2 | Money | Money + Thin | Engine | Engine + Thin |
| --- | ---: | ---: | ---: | ---: |
| Money | 51.56% | 51.56% | 100.00% | 100.00% |
| Money + Thin | 51.56% | 51.56% | 100.00% | 100.00% |
| Engine | 0.00% | 0.00% | 54.30% | 53.91% |
| Engine + Thin | 0.00% | 0.00% | 50.00% | 50.98% |

## What the Engine built

Each row is P1 new versus P2 old of the same parent/Thin profile, with no pooled cells.

| Profile | Full-deck draw turns | Full-deck rate | Drachmas acquired/game | Talents acquired/game | Acropolises acquired/game | Harbor Pilots acquired/game |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Engine | 1603 / 5660 | 28.32% | 0.00 | 0.00 | 0.00 | 3.52 |
| Engine + Thin | 1445 / 5461 | 26.46% | 0.00 | 0.00 | 0.00 | 3.31 |

Against the same fixed old opponent, P1 old Engine completed its deck on 2 / 4,677 turns (0.043%); P1 new Engine did so on 1,603 / 5,660 turns (28.32%). The corresponding Thin rates were 31 / 4,395 (0.71%) and 1,445 / 5,461 (26.46%). These descriptive rates include opening and late scoring turns.

The sampler builds much more effective draw chains, but pure draw volume does not reward adding money. With no further purchases inside the three-turn projection, a Treasure cannot fund a later draw purchase in the model. Cheap cantrips and draw/discard cards can increase the counted metric while producing insufficient spending power. Engine's failure therefore exposes a mismatch between the chosen objective and winning the game; it is not evidence that whole-deck engines with adequate payload cannot compete.

In the new Money+Thin versus new Money cell, Money+Thin trashed zero cards across all 256 games. Identical Money/Thin matrix entries do not show that effective thinning is useless; this short projection did not select a thinning build.

Money's result should be read as the combined requested controller change: three-turn finite samples replace the old one-hand estimator and its analytic shortcuts; the old Treasure epsilon preference is removed; Action/discard continuation is shared with Engine. This experiment does not isolate those components individually. There is no claim that the new Money estimator is stronger merely because it samples more turns.

P2 Money's paired regression is −13.67 pp (adjusted interval −22.85 to −4.88); Money+Thin is −11.72 pp (−21.29 to −2.34). Their P1 changes are inconclusive. The v14 endgame validation is historical evidence for v14 parents; retaining the same endgame trait does not extend its earlier regression guard to these new objectives.

The requested implementation is retained as the modern base profile, with exact old profiles available through v14BaseProfiles. A reasonable next Engine objective would reward reliable full-deck access subject to useful spending power, or reward usable scoring opportunities after the deck is drawn. That is a further metric change, not something secretly added to this draw-only trial.

## Verification

131 simulation tests passed (10,318 assertions); strict TypeScript and Svelte checks passed with zero errors/warnings. Old profiles reproduce all 16 saved v14 matchup traces exactly. Tests cover pure-Treasure sampling, actual rather than printed draws, sequential cleanup/reshuffles, shared metric extraction, public-information invariance, Thin continuation, safe endings and candidate insertion coupling. All 56 saved pilot/evaluation traces replay exactly, and every game's ending inventory was audited.
