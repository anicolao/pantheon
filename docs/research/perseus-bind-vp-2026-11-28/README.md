# Perseus: Bind 2 and Stillness VP income

## Rules tested

- Perseus grants Bind 2 after resolving his first Hades Action each turn.
- Stillness of the Underworld costs 2 Coins and 1 Worship.
- Standard: Bind 1; earn the bound Territory's VP in Coins.
- Favoured: Bind 2; earn each bound Territory's VP in Coins.
- Confirmed payouts: Hamlet 1, Polis 3, Acropolis 6. The user clarified Hamlet should match its actual 1 VP rather than the initially proposed 2 Coins.
- There is no unconditional coin bonus. Declining a Bind or finding no eligible card pays nothing. The leader trigger and other Bind cards do not earn these worship payouts.

## Comparison

Use the deployed adapted field from `balance-diagnostics/all-leader-territory-adaptation-20261128/after-field.json`. Hold all weights fixed, including Perseus. Reuse the exact 3,584 games in `perseus-new-audit.json`, balanced across seven opponents and both seats. Prefix `all-adapt-final-20261128:perseus`, namespace `audit`.

The old-rule baseline is 27.0647% win share. The baseline audit seeds are now explicitly development evidence. The paired rule comparison applies the new rules to everyone; it measures the combined rule change, not isolated contributions from each modification. Every game must pass full replay verification, with no dropped games.

`compare.py` reproduces the comparison and writes `comparison.json` plus before/after rows and hashes to `balance-diagnostics/perseus-bind-vp-20261128/`. Log: `/tmp/pantheon-perseus-bind-comparison.log`.

## Learning

Two independent 4,194,304-decision runs begin from the deployed Perseus checkpoint, with all seven opponent models frozen. Each uses 16 workers and eight saved checkpoints. Standard uses learning rate 0.0001 and entropy 0.003; exploratory uses learning rate 0.00005, entropy 0.01 and initial logits scaled by 0.7. Reward and architecture are unchanged.

Select checkpoints using 896 screening games; compare each selected candidate to its starting model on 3,584 separate confirmation games. Both runs use the same fresh `perseus-bind-vp-eval-v1` evaluation prefix. Improvement acceptance requires the paired 95% lower bound to exceed zero. This learning comparison is distinct from the fixed-policy old/new rule comparison.

Outputs/checkpoints: `balance-diagnostics/perseus-bind-vp-20261128/{standard,exploratory}`. Logs: `/tmp/pantheon-perseus-bind-{standard,exploratory}.log`. Protocols record source and actor hashes. Dependencies come from the project's Nix flake.

## Validation and publication

118 targeted tests pass, including full production-driver games with all eight deployed policies. Typechecking has zero errors/warnings. The tests cover exact VP payouts, favoured sequential payouts, skipped and empty choices, payment eligibility, public resource changes, undo, and a once-per-turn Bind 2 leader trigger without coin income.

This is a local experiment. The PR preview remains on the previously deployed rules and models. No trained results or improvement are claimed until evaluation completes.

## Fixed-policy results

All 3,584 matched games replay-verified. Perseus improves from **27.0647% to 37.6814%**, a paired **+10.6166 percentage points** (95% CI **+9.0195 to +12.2138pp**). The positive change appears against all seven frozen opponents. These intervals are descriptive; no multiple-comparison adjustment is applied to individual matchups.

| Opponent | Before | New rules |
|---|---:|---:|
| Achilles | 28.32% | 35.84% |
| Doreios | 40.23% | 53.61% |
| Echo | 30.76% | 37.79% |
| Melia | 3.42% | 6.74% |
| Nereon | 23.24% | 43.75% |
| Thaleia | 23.73% | 40.62% |
| Theseus | 39.75% | 45.41% |

The retraining runs are still active. Their initial screening share under the new rules is 37.9464% on 896 fresh games, consistent with the fixed-policy comparison. No trained improvement is claimed yet. The deployed PR preview remains unchanged.


## Completed learning and playtest deployment

Both runs finished 4,194,304 decisions and passed their paired improvement gates on 3,584 confirmation games. The unchanged checkpoint scores 37.4581% under the new rules on this separate confirmation set.

- Standard checkpoint `ppo-7`: **52.5949%** (win-share 95% interval **50.2799–54.8988%**), paired gain **+15.1367pp** (95% CI **+13.3415 to +16.9320pp**).
- Exploratory checkpoint `ppo-6`: **49.4699%**, paired gain **+12.0117pp** (95% CI **+10.3329 to +13.6905pp**).

The user requested deployment and a stop on further training. Deploy the standard checkpoint, retaining the other seven already-shipped adapted models. Its actor hash is `104e4cdc4e4ab44e0835162bff79bc4c93f2f0109568e61b7393b3250dd26247`. Full-field retraining under these rules is explicitly deferred until the user requests it. No further training jobs are queued.

The sections above describe the earlier local-only experimental stage; this section records the subsequent deployment authorization and selected checkpoint. The prior full-field matrix used the old Perseus rules and must not be presented as a matrix for this deployment.
