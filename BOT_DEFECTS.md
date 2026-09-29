# Bot defect correction ledger — version 10

This ledger distinguishes concrete decision defects from unavoidable uncertainty and deliberate benchmark restrictions. “Corrected” means implementation plus a targeted behavioral check or the specified shared regression coverage; it does not certify perfect play.

| Previously identified defect | Correction | Evidence |
| --- | --- | --- |
| Treasure used a fixed money/points list, excluded Actions and ignored scoring dilution | All-card expected hand-income evaluation, post-purchase $8 scoring gate, per-buy recomputation and cash-oriented Action play | `money.test.ts`; policy v5 |
| The v5 income floor repeatedly rejected affordable top-value points | Exempt the highest printed VP tier from the $8 income floor while retaining safe endings and all-card EV investment | `money.test.ts`; [21,600-game fixed-profile test](balance-results/treasure-scoring-v6/README.md) |
| Alphabetical ties and small sampled EV advantages selected Bronze Recruit over Drachma | Prefer a Treasure within $0.035 of maximum economic EV (v7 used $0.10); this is a broad preference, not a dominance proof | `money.test.ts`; [v8 test](balance-results/treasure-epsilon-v8/README.md): Bronze becomes rare; win-rate differences remain inconclusive |
| Engine purchases ignored whole-deck draw and actual trigger capacity | Generic draw deficit, actual leader effects, support only when useful, opening reliability and shortfall feedback | `engine.test.ts`; variant capacity test in `planning.test.ts` |
| Static Action scores/copy limits persisted in other families | Replaced study Action table with effect-based capacity and family objectives | All-family capacity test; source has no named Action score switch |
| Conditional reveal Coins were omitted from generic payload estimates | Value the conditional income using public Territory density, without next-card access | Conditional reveal regression |
| Terminal payload overvalued despite insufficient Actions | Discount by executable Action capacity relative to terminal demand | Capacity/play regression coverage; model remains approximate |
| Thin play priority omitted leader Coins/trashing; Engine priority omitted leader trashing | Include actual trigger payload and value the available trash opportunity after printed resources | Nereon/Doreios payload regression in `planning.test.ts` |
| Nonterminal ordering could strand useful Actions or penalize a terminal when no support existed | Use actual effects; strand penalty requires available Action support | Engine sequencing tests |
| Thin optimized trash count/classes rather than deck quality | Joint income/VP/horizon evaluation, tool retirement and replacement search | `thin.test.ts` |
| Tool demand summed mutually incompatible hypothetical removals | Recompute after each positive marginal hypothetical removal | Joint-removal tests and source review |
| Benchmark could cross its income floor by trashing several Obols | Update retained money across the complete subset | Benchmark multi-trash test |
| Owned-card retention used the value of another copy | Remove/restore marginal retention; sequential inventory updates for offerings | Engine retention test; shared controller review |
| Mandatory discards ignored current playability and spending | Separate current-turn discard evaluation | All-family forced-discard test |
| Worship acquisition did not plan total Devotion | Marginal probability of two matching played Actions and event improvement | Devotion saturation test |
| Worship could spend before a playable Favored setup | Bounded search of known legal Action sequences before spending | Favored-path and blocked-terminal tests |
| Worship ignored unplayed money/multiple displaced Buys | Compare complete purchase baskets with available known Treasure income | Basket tests and retained-offering regression |
| Topdeck timing was only a fixed phase bonus | Check known draw and remaining Action capacity | Topdeck timing test |
| Race/shared ending logic could choose a known losing last pile | Ending-safe purchase and gain planning | All-family losing-ending and gain tests |
| Ending logic ignored turn-count tiebreaks | Score at cleanup using completed-turn counts | Tiebreak test |
| Ending logic missed winning multi-buy sequences | Bounded purchase-quantity search with ending masks and VP alternatives | Multi-buy win and basket tests |
| Scoring transition ignored third-pile danger and opposing income | Public horizon includes both | Horizon test |
| Profiles trained against too narrow a population for an all-strategy claim | Matrix training crosses all five reference families, all rivals and both seats | Matrix schedule/budget checks |

## Orthogonal thinning (v9)

Big Money and Engine now support an explicit independent thinning switch. Enabled thinning uses the parent's income-per-draw or executable whole-deck-draw objective; disabled thinning receives no removal investment bonus and declines optional trashing. Historical omitted-field profiles retain their previous behavior. See [the design](BOT_STRATEGIES.md#orthogonal-thinning-for-money-and-engine-v9) and [the sixteen-cell trial](balance-results/base-thinning-v1/README.md).

During pre-result review, the new tool projection was found to reuse a guaranteed current-turn ending bonus in a speculative future state. Future projections now stop before such endings; actual winning conversions retain their priority. A regression checks both sides. The interrupted run was discarded and the full trial restarted from the corrected commit.

## Orthogonal Race (v10)

Race is now a separate profile modifier for early scoring and shorter investment time, compatible with either parent and thinning on/off. Race-off profiles reproduce saved games from every previous 4×4 matchup exactly. Tests cover all 64 combinations, mandatory/restricted gains, safe endings, complete multi-buy rescues, and the lost Race scoring opportunity during thinning. Declining cheap points preserves actual supply counts; it does not fabricate empty piles.

The [64,000-game trial](balance-results/base-race-v1/README.md) shows that this fixed early-scoring policy is weak. Buying points earlier at the expense of income is not treated as a solved strategy or a demonstrated balance defect. No policy retuning followed this result.

## Deliberate limits retained

Plain Treasure retains the all-card economy model, corrected scoring and $0.035 near-tie preference. It still skips Worship and uses a one-hand income horizon. The v9 thinning option adds a bounded, approximate future-removal forecast; it does not add general multi-turn search. Its sampled EV and greedy Action order are approximations. Legacy Draw remains a fixed-list historical baseline and is not one of the five study families.

Unknown draws, approximate income/Devotion/accessibility, fixed utility weights, finite known-hand search, separable basket utilities and a heuristic game horizon remain disclosed model assumptions. We have improved the concrete failure modes they caused, not solved optimal hidden-information play. The bots do not perform arbitrary multi-turn opponent search, strategic drafting or mixed-strategy equilibrium search. Mandatory losing choices can be unavoidable. These limits must remain visible when interpreting the matrix.

Behavioral regression sources: [planning](tests/simulation/planning.test.ts), [Engine](tests/simulation/engine.test.ts), [Thin](tests/simulation/thin.test.ts), [shared study behavior](tests/simulation/study.test.ts), [matrix schedule](tests/simulation/matrix.test.ts). The full design and constants are in [BOT_STRATEGIES.md](BOT_STRATEGIES.md).
