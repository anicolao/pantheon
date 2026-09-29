# Two-purchase planning: implementation and first comparison

The one-card acquisition boundary is corrected: weak-alone complementary pairs are evaluated as feasible plans. **The first game trial does not demonstrate a competitive improvement.** Money is near 50% against v18; Engine has lower observed shares. All adjusted paired-change intervals include zero. The implementation is available through `pairBaseProfiles` / `purchasePlanner: "pair"`; `baseProfiles` retains v18 pending stronger evidence. No objective or rule tuning followed the result.

## What changed

Both Money and Engine exhaustively retain each legal economic first buy (and pass) through all follow-up targets. The continuation pays actual Coins and Buys, checks remaining supply and restrictions, and plays intervening production-rule turns with cleanup and reshuffles. It may buy its target now if a Buy and cash remain, or during the next two turns. No other future purchase is assumed. Scoring/endgame priorities and gain/trash controllers remain unchanged. Pure-resource dominance is preserved only after every first buy has been evaluated.

Each fixed follow-up policy is scored across eight common search shuffles. One continuation per first choice is compared on eight disjoint investment shuffles. No plan chooses its target with knowledge of a sample's hidden order. Known hand, play and discard are preserved; only unknown order is sampled. The bot executes the first buy and replans at the next decision.

Score = two investment turns plus the resulting deck's existing three-turn fresh-shuffle score. Money still scores Coins; Engine still scores Coins + 8 × unique-card coverage × min(1, Coins / top point-card cost), per turn. The Engine objective remains an income/draw hybrid.

## Focused validation

The [complement fixture](complement-fixture.json) has three Drachmas, six Hamlets and one Council of Sages, with $4 available. Other acquisitions are restricted to isolate the support/draw choice. The old single-card Engine score is 21.083 without buying, 19.762 with Harbor Pilot, and 20.459 with Council: both additions look harmful alone. All nine first/follow-up combinations survive evaluation. The selected Council → Harbor continuation scores 36.945 on the investment validation bank, versus 35.318 for passing now and buying Council later. Both acquisition orders are explicitly explored. These are objective units, not expected VP or win percentages.

Additional tests verify unaffordable and exhausted follow-ups add no phantom value; same-turn follow-ups consume cash and a Buy; redundant Actions lose to income; hidden draw-order changes do not change observations; known discard timing is retained; dominance runs after all pairs; and old Money/Engine reproduce saved v18 games exactly.

## Comparison

896 completed games, 32 identical seeds per ordered cell, no failures. No leader powers or Worship; identical six-Obol/three-Hamlet/inert-Temple starts. Sixteen new matrix cells, eight direct v18 comparisons, four old mirrors. No pooling of strategy, opponent or seat. The run used 16 workers and took 29.18 minutes. Uneven seed-shard runtimes left idle CPUs near the end.

New win shares against the corresponding v18 bot (half credit for ties):

| New strategy | As P1 | As P2 |
| --- | ---: | ---: |
| Money | 48.44% | 46.88% |
| Money + Thin | 48.44% | 46.88% |
| Engine | 39.06% | 37.50% |
| Engine + Thin | 39.06% | 37.50% |

Before/after against the same fixed v18 opponent, using exactly the same seed blocks. “Before” is that profile's v18 mirror; it is not the failed v15 sampler. These small empirical mirrors need not be 50/50.

| Strategy | P1 before | P1 after | P2 before | P2 after |
| --- | ---: | ---: | ---: | ---: |
| Money | 37.50% | 48.44% | 62.50% | 46.88% |
| Money + Thin | 37.50% | 48.44% | 62.50% | 46.88% |
| Engine | 62.50% | 39.06% | 37.50% | 37.50% |
| Engine + Thin | 62.50% | 39.06% | 37.50% | 37.50% |

The [full report](report.md) gives 20,000-resample seed-bootstrap intervals, adjusted across the eight seat-specific direct comparisons or paired changes (and 16 matrix cells). This is a screen: no superiority, noninferiority or equivalence claim is supported. Engine's observed P1 change is −23.44 percentage points, but its adjusted interval is −51.56 to +3.13 points.

## New 4×4: P1 win shares

| P1 / P2 | M | MT | E | ET |
| --- | ---: | ---: | ---: | ---: |
| M | 57.81% | 57.81% | 62.50% | 59.38% |
| MT | 57.81% | 57.81% | 62.50% | 59.38% |
| E | 43.75% | 43.75% | 48.44% | 50.00% |
| ET | 43.75% | 43.75% | 48.44% | 50.00% |

M = Money; E = Engine; T = Thin. All percentages describe the exact row/column matchup. The observed best-response pairing is M (or MT) versus M (or MT), at 57.81% P1; rankings are provisional at this sample size.

## Construction findings

Against the same old Engine opponent, P1 Engine changes from 0.031 to 0.188 Harbor Pilot purchases per game, but Council purchases fall from 1.563 to 1.125 and Talents from 2.344 to 1.656. Academy rises from 1.781 to 2.156 and Harvest Feast from 0.594 to 1.594. This describes a shift toward support and cycling with less treasure payload; it does not establish which purchases caused the lower win share.

Whole-deck draws remain exceptional: new E as P1 versus old E records 1 across 564 turns, compared with 0 across 563 old-mirror P1 turns. New E as P2 versus old E records 0 across 534 turns. Thin is still rarely used: new MT has no trashes in either direct comparison; new ET as P1 against old ET has none, and new ET as P2 against old ET trashes four cards across 32 games. Identical direct win shares for Thin do not mean every trajectory is identical.

Every matrix cell's acquisitions, trashes, whole-deck draws, turns, scores and deck sizes remain separately available in [cells.json](cells.json). This is not yet a reliable whole-deck Engine or evidence about leader balance.

## Remaining limitations

- Only two purchases and two intervening turns; combinations needing more acquisitions or longer funding are outside the search.
- The continuation target is fixed across samples and has no adaptive fallback. The real bot replans, so actual follow-through can differ.
- Opponent acquisitions and Worship are not simulated. Own acquisitions and effects update supply through the real reducer.
- Fresh-shuffle terminal evaluation approximates eventual deck performance, not the exact time newly bought cards will become accessible after the investment window.
- Eight investment samples can misrank close plans. Terminal evaluation uses the old fixed bank, not a separate terminal holdout.
- The unchanged Engine metric rewards funded coverage rather than directly predicting wins or insisting on full-deck construction.
- Exhaustive pairs are costly, with a long runtime tail. More granular scheduling and evaluator profiling would improve future trials.

## Reproduction and evidence

Game behavior was frozen at `67fa8a20c28ff9f2e3e3dc2f46a4195e484a600f`. The later publication change only makes the candidate explicit and keeps v18 as the default; the trial runner still selects the identical candidate profiles. An initial incomplete run was discarded before analysis to preserve resource dominance after exhaustive evaluation; see [PROTOCOL.md](PROTOCOL.md).

Run inside the pinned Nix development shell, from a clean committed tree and with a fresh output path:

```sh
bun scripts/balance-purchase-study.ts balance-runs/purchase-pair-repeat 32 evaluation
bun scripts/balance-purchase-report.ts balance-runs/purchase-pair-repeat
bun scripts/balance-audit-replays.ts balance-runs/purchase-pair-repeat
```

Validation: 149 simulation tests / 10,388 assertions; 34 tooling tests / 3,418 assertions; strict TypeScript; Svelte 0 errors / 0 warnings. All 896 ending inventories, scores, winner shares and seed schedules audited. All 28 saved traces replayed, including every final inventory and tiebreak outcome. The manifest, all 16 compressed result shards, all 28 replays, per-cell data, fixture, test logs and checksums are archived here.
