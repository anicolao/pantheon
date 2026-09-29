# Balance decisions: explicit strategy responses

For each Player 1 strategy, display each legal Player 2 response separately. Do not pool leader choices, strategies, presets or turn orders into a headline victory share. Statistics summarize repeated seeded games within one specified cell only. Player 1 means first in turn order; Player 2 means second.

Identify Player 2's strongest response by maximizing Player 2's victory share (equivalently minimizing Player 1's), rather than selecting the cell closest to 50%. Player 1's strongest initial choice maximizes that row's worst-case outcome. Report the actual selected cells and their uncertainty, not a uniform-strategy average. A roughly fair available response and a roughly fair optimal response are different requirements: a rational player may prefer another response that wins more often. When leader selection is part of the choice, retain it explicitly in the row/column definition.

Keep two questions distinct: whether correct responses yield roughly 50/50 outcomes, and whether multiple strategies remain competitive. A fair Engine mirror can coexist with Engine dominating Big Money; that would support a fair mirror but not strategic diversity. Bot results describe the implemented policies, not proven optimal play.

For every matrix, document who starts, exact deck/supply/rule conditions, strategy profiles, seed counts, ties and failures. Report confidence intervals per cell. Never score failed games as losses. Historical averaged studies remain archived for provenance, but their averages are not the current balance decision criterion.

## First base-game trial

Use Treasure v8 (all-card income EV, $0.035 near-tie preference and corrected scoring) and Engine, with the identical default preset `candidates[0]` on both sides: scoringAt 3, engineCopies 3 (unused by Engine), moneyFloor 7, worshipMargin 0.5 (irrelevant without Worship). No profile search or retraining is performed, and no preset averaging occurs.

Disable all leader triggers and Worship. Retain six Obols, three Hamlets and one zero-VP Action Temple per player. Normalize both Temples to the same card identity and remove all Temple effects; printed type, cost and VP are preserved. The bots and reducer both know the altered effects. Leader labels are placeholders and must not affect decisions. Supply, ordinary Action effects, game endings and the fewer-turns tiebreak remain standard.

Run 1,000 fresh seeds in each of the four ordered strategy cells (4,000 games). Reuse each seed across cells to match starting conditions, without combining the cells. Report Player 1 victory share (a split tie contributes one half) with wins, split ties and losses separately. Bootstrap the 1,000 seeds within each cell and adjust intervals over the four cells. Show Player 2's response for each row and the strongest pure-strategy initial choice. Do not infer an optimal game-theoretic result beyond these fixed bot profiles.

## Orthogonal thinning trial

Cross the same two base-game families with an explicit thinning on/off decision. Keep four distinct row/column profiles: Big Money, Big Money + Thin, Engine, Engine + Thin. Big Money thinning targets income per initial draw; Engine thinning targets executable whole-deck draw while retaining scoring payload. The off profiles disable optional trashing and tool investment bonuses; the old Engine had shared legacy thinning, so this is a new controlled comparison rather than relabeling the prior 2×2.

Freeze the default parameters and policy implementation before running 1,000 fresh seeds per ordered cell (16,000 games), using namespace `base-thinning-v1:evaluation`. Reuse each seed across the sixteen cells, never pool them. Report raw wins/ties/losses, 16-cell-adjusted bootstrap intervals, each row's observed strongest response, and the concrete selected cell. Include per-cell thinning and full-deck-draw diagnostics. Use all available CPUs inside Nix. No tuning against trial results.

## Orthogonal Race trial

Cross parent strategy (Big Money / Engine), thinning (off / on), and Race (off / on). Keep all eight profiles explicit in both axes; fixed default parameters and no training. Race means earlier middle/top-tier scoring plus a three-turn investment cap; the [policy reference](BOT_STRATEGIES.md#orthogonal-race-v10) specifies it before evaluation.

Run 1,000 fresh seeds per ordered cell (64,000 games), namespace `base-race-v1:evaluation`, with the same seed in every cell and all available CPUs. Preserve the base-game no-leader/no-Worship/inert-Temple conditions. Do not pool profiles or turn orders. Report every cell, raw counts, 64-cell-adjusted bootstrap intervals, the observed best response to each row and the concrete selected cell. Include scoring timing and thinning/draw diagnostics per cell. Freeze policy before evaluation and do not tune against outcomes.
