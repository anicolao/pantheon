# Engine construction review (strategy v14)

Reviewed source: 45797be17934b315e6b76eaebfc131a2edb0bf44. This is a diagnosis of existing behavior, not a policy change or a new balance trial. The evidence uses the 512-seed validation-1 cells with P1 Engine or Engine+Thin versus P2 Money, all with turn-2, no leaders/Worship.

## What it builds

Engine scores each candidate against an optimistic whole-deck capacity estimate. It adds all nonterminal draw, allocates terminal slots to highest-draw Actions, then measures shortfall against deck size plus a two-card reliability margin. A current-turn shortfall with spare Actions can add another three cards to that target and increase the weight on marginal coverage by 25%.

An Action receives baseline utility 2, plus 6 per marginal coverage improvement, 2 per previously stranded draw recovered, payload and a starter-probability bonus. Starter reliability is only the probability of opening any Action-preserving draw card. It does not estimate the probability of sustaining the chain or drawing the whole deck.

Treasure uses a separate scale: Talent scores 9; Drachma starts at 6.5 and declines with total owned Treasure value above 10. These scores do not use marginal whole-deck coverage, expected turn income or time to engine completion. Engine+Thin adds objective-based tool value and evaluates removals against coverage/reliability, with a safeguard preserving existing cycle income up to $8.

The shared endgame trait controls late point priority. This review leaves it unchanged.

## Confirmed acquisition trap

For a base starting deck plus one Council of Sages, with no spare Actions at the buy phase:

| Candidate | Cost | Heuristic utility |
| --- | ---: | ---: |
| Another Council | 4 | -10.00 |
| Harbor Pilot | 3 | 5.33 |
| Drachma | 3 | 6.50 |
| Sacred Academy | 5 | 11.33 |

Council is terminal +3 draw. Pilot is +1 card/+2 Actions. A second Council is rejected because the deck cannot play both. Pilot alone does not improve net coverage until another terminal draw card exists, so it loses to Drachma. The builder does not value the future Pilot/Council combination. The purchase-basket planner also computes different cards independently, rather than valuing their joint inventory effects.

This is a specific limitation of the one-acquisition evaluation, not proof that Pilot/Council is the best opening. It can prevent exploring a plausible engine route without an explicit named-card exception.

## Observed builds

Each column is its own 512-game ordered cell, P1 versus P2 Money. Acquisition counts and deck sizes are per-game means; full-deck rates use all turns in that same cell. These telemetry summaries do not pool strategies, opponents or seats.

| P1 metric | Engine | Engine+Thin |
| --- | ---: | ---: |
| Council acquisitions | 1.00 | 1.00 |
| Harbor Pilot acquisitions | 0.00 | 0.00 |
| Sacred Academy acquisitions | 4.11 | 3.28 |
| Drachma acquisitions | 4.21 | 4.06 |
| Talent acquisitions | 0.78 | 0.81 |
| Ending deck size | 27.91 | 23.81 |
| Full-deck draw turns | 1 / 9,315 (0.011%) | 48 / 9,203 (0.522%) |
| Turns ending Actions with spare Actions and unseen cards | 67.75% | 47.45% |
| First point acquisition, own turn | 9.54 | 9.68 |

These rates include opening and late scoring turns; they are not conditional measures of a completed engine. Nevertheless, near-zero successful full-deck turns across the games undermine the claim that these bots successfully realize their stated objective.

The saved seed-zero Engine trace buys Drachma, Drachma, Council, Drachma, then Academies on turns 5, 6 and 7. It eventually buys six Academies, a Talent, and points. This illustrative trace is consistent with the aggregate acquisitions: it builds around one terminal draw card and costly self-replacing draw, rather than expanding terminal capacity.

## Additional design weaknesses

1. **Draw and money use inconsistent objectives.** Actions are assessed for reducing draw shortfall, whereas Treasure bypasses that evaluation. Drachma can add deck burden even with enough theoretical cycle money; Academy can beat Talent without an estimate of which improves reliable $8 turns or completes the engine sooner.
2. **Capacity assumes accessibility.** It sums Actions across the entire deck and assumes support is available before terminal draw. An opening-starter bonus cannot capture stalls later in the chain. The current-turn spare-Action adjustment reacts to the last draw outcome, rather than a distribution over future turns.
3. **Thinning inherits those approximations.** A terminal trashing card competes with Council for the same Action slot. Capacity assigns the slot to draw, while tool planning approximates access and useful future removals. The observed failure with Thin is real, but this review does not isolate a causal effect for each approximation.
4. **Extra-buy value is crude.** It receives a small bonus only once nominal draw capacity covers the deck, with no forecast of whether the completed engine can afford and use the extra buys.

## Recommended next change

Use a shared deck evaluator for Engine acquisitions and thinning: estimate full-deck draw probability, fraction of deck reached and playable payload under legal Action sequencing. Use public inventory and sampled orders, with fixed common samples for comparing alternatives. Preserve whole-deck draw as the Engine objective; income and usable buys should ensure that the completed engine has useful payload.

Add a bounded lookahead over complementary acquisitions so a first step can earn credit for enabling a feasible subsequent purchase. Charge both buys, costs and expected delay; compare with direct draw, money and doing nothing. Derive complementary roles from card effects, not Council/Pilot names.

Validate construction behavior first (support-before-draw and draw-before-support fixtures, stall rates, completion timing, payload preservation), then change one policy component at a time against frozen current Money and Engine opponents on paired seeds. A hypothetical combo's superior capacity is not enough: it must improve achievable play before the opponent ends the game.

Reproduce the read-only diagnostic inside Nix from the repository root:

```sh
bun balance-results/engine-review-v14/probe.ts
```

The raw output is in evidence.log. No new simulated outcomes or win-rate improvement are claimed.
