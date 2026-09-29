# Shared endgame scoring study

Status: exploratory screens complete; fresh-seed validation planned below. No common default has been promoted.

## Policy extraction

Engine's point/Talent scoring values and late Action-investment discount live in [the shared endgame module](../../scripts/balance/end-game.ts), along with Money's historical point eligibility. The base objectives remain income per draw and executable whole-deck draw. Explicit policy selection is independent of Thin and parent family. Historical boolean controls reproduce the earlier policies, including Engine's existing endgame behavior; historical does not mean a bot with no scoring logic.

New policies remove the parent's discretionary lower-point rule. Safe endings, mandatory gains, multi-buy continuations and the existing top-tier scoring opportunity remain protected. Ordinary gains share scoring; thinning upgrades preserve their joint before/after objective. The module accepts the parent's economic valuation rather than checking its family. The controller normalizes Money income to the old Engine utility scale only for weighted heuristic candidates.

## Explored choices

- Extracted Engine rule: legacy point/Talent values, three-turn threshold and 0.35 Action-investment factor.
- Hard one-, two- and three-turn scoring triggers.
- Redraw probability thresholds of 25%, 50% and 75%.
- Smooth reuse-based interpolation of the Engine scoring/investment curve.
- A 25% redraw trigger using observed supply depletion as the ending forecast.
- Economic payback: immediate VP versus expected marginal future income after shuffle delay, converted at the top-point VP/Coin ratio.

Redraw uses remaining draw-pile count, public owned-card count and the current plus previous three turns' draw throughput. It does not inspect hidden order. Topdeck gains do not incur discard-pile delay. The shuffle-pool model and ending forecast are approximations. Tests include the forty-card/eight-draw example and the contrasting case immediately before a shuffle.

The tempo forecast uses three own-turn intervals of observed supply depletion, weak rate floors and a twelve-turn cap. It also changes the horizon available to thinning/investment. This coupling is consequential: both tempo-based candidates produce large regressions with Thin, and some games take minutes because the tool planner projects many more future conversions. They are rejected as common defaults; their results remain archived.

## Exploratory evidence

All runs have no leader powers or Worship, identical starting decks with inert Temples, fixed default parameters and both seats. No parents, Thin settings, opponents or seats are pooled.

| Stage | Candidates | Seeds per ordered cell | Games |
| --- | --- | ---: | ---: |
| [Screen 1](../shared-endgame-screen-v1/README.md) | Engine, turn 1/2/3, redraw 25/50/75 | 32 | 19,968 |
| [Screen 2](../shared-endgame-screen-v2/README.md) | Turn 2, redraw 25, smooth redraw value | 128 | 38,912 |
| [Screen 3](../shared-endgame-screen-v3/README.md) | Redraw tempo, economic payback | 64 | 14,336 |

Each candidate crosses both parents and Thin settings against eight fixed historical/old-overlay opponents in both seats, plus its own complete 4×4 matrix. The primary comparator is the stronger existing behavior from earlier screens: Money with the old two-turn overlay; Engine with its historical scoring. Comparisons against the other control are supplementary.

The aggressive redraw thresholds and three-turn hard switch are unsuitable. The smooth scoring rule improves many Engine matchups but loses ground for Money. Tempo and payback lose heavily with Thin: for example, Engine + Thin with payback versus second-player Engine + old overlay loses 45.31 percentage points relative to historical Engine + Thin in screen 3 (adjusted interval −67.97 to −21.09 pp).

Turn 2 and redraw 25 remain plausible. In screen 2, their weakest observed per-parent cases are not established regressions; detailed estimates and adjusted intervals are retained in each report. These are screening findings, not proof of noninferiority.

The [earlier Engine 4×4 screen](../base-engine-endgame-v1/README.md) is also archived. It shows why comparing only with Money's old behavior would be misleading: Engine already had useful ending logic.

## Frozen validation plan

Validate turn-2 and redraw-25 on 512 fresh common seeds per ordered cell, namespace shared-endgame-v1:validation-1, with the same frozen profiles and no outcome-driven tuning. This is 224 ordered cells and 114,688 games.

There are 192 primary paired comparisons: two policies × four parent/Thin profiles × twelve fixed opponents × two seats. Each candidate is compared with the appropriate stronger control. Bonferroni-adjusted seed-bootstrap intervals cover both selected policies; each cell remains separate. The four same-policy opponents are included alongside eight historical/overlay references.

A loss of five percentage points is considered materially important. Examine each paired effect and its uncertainty; absence of statistical significance is not proof of noninferiority. Do not promote a universal default if the evidence shows a material tradeoff or leaves a concerning regression unresolved. A single policy cannot be claimed optimal for every possible deck, leader or opponent from this base-game study.

All available CPUs run inside Nix. Queued batches of at most four seed blocks reduce idle tails. Memoization changes preserve the income calculation and avoid clearing the whole cache at capacity. Candidate definitions remain frozen during validation.

Reproduce inside Nix: bun scripts/balance-endgame-study.ts balance-runs/shared-endgame-validation-v1 512 validation-1 turn-2,redraw-25. Regenerate per-cell evidence: bun scripts/balance-endgame-report.ts balance-results/shared-endgame-validation-v1.

## Focused follow-up, frozen before play

Validation 1 completed all 114,688 games with zero failures. Turn-2 remains the strongest common candidate. The redraw candidate has a concerning second-seat Money mirror comparison (−5.66 pp relative to the old overlay), so it is not promoted.

We tightened the initial intervals to reserve half the error budget, using 100,000 resamples and multiplier two (384 effective primary tests). The 17 turn-2 comparisons whose lower bound remains below −5 pp are listed in followup-plan.json. Test each on 4,096 fresh seeds in validation-2, with the candidate unchanged. This requires 30 distinct ordered cells and 122880 games. The new intervals also reserve half the error budget (twice the focused comparison count). This independent, conditional family and the initial conservative family allow a combined nominal 95% guard, subject to bootstrap approximation. The aim is to rule out losses larger than five percentage points in every tested context, not claim strict improvement in every game or optimality against arbitrary opponents.

Reproduce inside Nix: bun scripts/balance-endgame-study.ts balance-runs/shared-endgame-validation-v2 4096 validation-2 turn-2 balance-results/shared-endgame-v1/followup-plan.json. Analyze with bun scripts/balance-endgame-report.ts balance-results/shared-endgame-validation-v2 2.
