# Effective sampled strategies (v16)

Status: candidate implementation tested; exploratory screening pending.

Every economic candidate still receives the same 64 fresh-shuffle, three-turn production-rule evaluation. Both parent strategies share cash-aware Action/discard play. Income beyond what the available Buys can spend on top-tier scoring is not rewarded. The sampler records actual unique-card coverage and couples the Engine coverage bonus to usable income, so draw alone cannot justify ignoring payload.

Three frozen candidate metrics are screened:
- income: usable coins; Engine adds 4 × income-backed coverage.
- balanced: usable coins + half the top-point cost per affordable top-point purchase; Engine adds 8 × income-backed coverage.
- reliable: usable coins + the full top-point cost per affordable top-point purchase; Engine adds 12 × income-backed coverage.

Income-backed coverage is the fraction of the starting deck's distinct cards actually drawn in a turn, multiplied by min(1, coins / top-point cost). These quantities are summed over three turns and averaged across samples. Opening draws count; repeated draws do not inflate coverage. Money uses only the spending metric; Engine adds the coverage metric.

Resource-only cards receive a common effect-based dominance check after sampling, not a Treasure epsilon bonus. In the base game, a same-or-cheaper card with at least as much money, net Action capacity and Buys, and strictly more of one resource (or lower cost), dominates its alternative. Cards with draw, discard, gains, trashing or other effects are not pruned this way; standard leader games disable the shortcut because triggers can change the comparison.

The previous v15 sampler and all v14 controls remain exact historical implementations. Shared endgame scoring remains unchanged. The three-turn projection still makes no further purchases: first test whether usable spending and reliable scoring metrics solve the observed failures before adding a bounded future-buy model.

Screen 16 fresh common seeds across all three policies: each complete new 4×4, each parent/Thin profile against its v14 counterpart in both seats, and Engine variants against old Money in both seats, plus shared old controls. Select provisionally, then validate on fresh seeds without metric retuning. No pooling of policies, parents, Thin, opponents or seats.

## Screen 2: sampling coverage

The first 16-seed screen completes 1,472 games without failures. Engine's income-backed metrics recover strongly against old Engine, but Money's P2 shares remain concerning. The screen is too small to choose a policy.

Keep balanced and reliable weights fixed and test stratified sampling on 32 fresh seeds per ordered cell. Every cyclic rotation of eight uniformly shuffled orders is played for three turns, so every card occupies every opening position. This remains sampling for all card types and changes sample coverage rather than switching to analytic Treasure evaluation. Pure-Treasure opening means are now exact through stratification, with later turns still played through production rules. Missing samplingMethod retains the original random sampler for source-pinned historical profiles.
