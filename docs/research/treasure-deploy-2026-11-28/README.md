# Independent Action-or-Treasure Deploy

Deploy now consumes the oldest independent grant when either an Action or a Treasure is played. A deployed Treasure produces its coins N times, remains one physical card, does not spend an Action, and leaves the phase unchanged. It remains a Treasure, without Action-only leader triggers or Action Devotion. Play All uses existing hand order, consuming one grant per Treasure while grants remain; subsequent normal Treasures use normal phase rules. Echo-borrowed Treasures also consume a grant. Worship alone does not consume one.

Web/tabletop eligibility glows include Treasures. Automatic phase advance waits while an eligible Deploy target remains. The production animation resolution events represent repeated Treasure payouts. Unit tests cover single/bulk plays, mixed FIFO grants, all three phases, cleanup, Echo ownership, undo, and automatic phase transitions.

## Fixed-weight rule comparison

7,000 paired games per ruleset, 1,000 per opponent, identical seeds, frozen actor/checkpoint hashes, both starting seats. The prior Action-only results are retained at `balance-diagnostics/independent-deploy-20261128/after`; new results/replays are at `balance-diagnostics/treasure-deploy-20261128/fixed-policy`. All 14,000 games finished and replay-verified under their own rulesets, with none excluded.

Achilles's mean split win share fell from **29.9143% to 28.1643%**: **−1.75 percentage points**, paired approximate 95% CI **[−2.130, −1.370] pp**. Against Perseus it fell from **55.05% to 42.60%** (−12.45 pp); other matchup changes were small. The rule is available to all players, so stronger existing use of Nike by opponents can outweigh the immediate benefit to this Achilles policy. This measures untrained policies, not the new training outcome.

## Matched retraining pilot: running

Two fresh runs use the same attempt-26 Achilles checkpoint, frozen seven-opponent field, queue-aware 916-feature architecture, migration, training seeds, optimizer settings, and 4,194,304-decision budgets as the prior Action-only pilot. The only gameplay difference is Treasure eligibility/phase behavior. The public queue representation remains the ordered first 32 grants plus full aggregate counts. The starting migration has zero extra-feature weights; the new rule can change the starting actor's behavior through game observations even though its weights are unchanged.

Standard: learning rate 0.0001, entropy 0.003, original initial logits. Exploratory: learning rate 0.00005, entropy 0.01, initial logits ×0.7. Both use the prior terminal outcome plus training-only clipped score-margin reward. Eight checkpoints per run are screened on 896 games. Each selected candidate is independently compared with its untrained incumbent on 3,584 separate paired games, requiring a positive lower 95% bound for provisional acceptance. A new evaluation namespace avoids reusing the previous pilot's confirmation games. A later choice between runs needs its own untouched audit before deployment.

Evaluations record Nike market-card plays, Nike worships, and direct Treasure Deploy counts, resolutions, and bonus coins. Direct counts cover single and Play All commands; borrowed Echo Treasures are excluded from these diagnostic counters. In the shared initial 896-game screen, the incumbent scored 27.7344%, made 2 Nike market-card plays and 0 Nike worships, and received 9 bonus coins from Treasure Deploy. Those are baseline observations, not learned improvements.

Artifacts: `balance-diagnostics/treasure-deploy-learning-20261128/{standard,exploratory}`. Each contains immutable source/field protocols, migration verification, checkpoints, screens, status and final results when complete. Logs: `/tmp/pantheon-treasure-learning-standard.log` and `/tmp/pantheon-treasure-learning-exploratory.log`.

Command: run `scripts/rl/expansion/train_deploy.py` in the flake's `rl` shell with `--field balance-diagnostics/treasure-deploy-20261128/field.json`, a fresh `--output`, `--prefix independent-deploy-learning-standard-v1` (or `independent-deploy-learning-exploratory-v1`), `--eval-prefix treasure-deploy-learner-eval-v1`, and `--ruleset independent-action-or-treasure-deploy`. Exploratory additionally uses `--temperature .7 --lr .00005 --entropy .01`. Existing output directories are refused.

Validation: 107 engine/observation regressions plus 3 playable-actor tests passed; Svelte/type checking passed. No game rules besides this Deploy extension, card costs, leader trigger amounts, or deployed model weights were changed. Neither the rule nor new weights have been deployed by this work.
