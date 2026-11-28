# Territory Deploy experiment

## Rule

A Territory in hand can consume the oldest pending Deploy grant. It enters play once and draws one card per activation (Deploy 3 draws three). It spends no Actions, preserves the phase, keeps its scoring value, and grants neither Devotion nor Action-only leader triggers. It uses the existing play/resolution/draw movements. Ordinary draw, shuffle and undo-barrier rules apply. Without a grant, Territories cannot be played. Play All Treasures still plays only Treasures. Echo eligibility is unchanged.

The web and tabletop hand controls, bot legal-action masks, replay protocol, and Firestore event validation support `territory/deployed`. The pre-existing Territory play slots become legal; the action vocabulary and 916-feature learner schema have not changed.

## Starting point and frozen field

Start both runs from `balance-diagnostics/treasure-deploy-learning-20261128/exploratory/ppo-8.zip`. Under the previous Action/Treasure rule it confirmed 34.4029% on 3,584 games, versus the old model's 27.4135% (+6.9894pp, paired 95% CI +5.4453 to +8.5335pp). The result is archived here.

Opponents remain the exact seven actors from `balance-diagnostics/treasure-deploy-20261128/field.json`. All players use the new rule; none of the opponent weights are trained. Initial policy copying preserves all 916 features and has zero log-probability difference.

## Initial screening

On 896 new, seat-paired games, the unchanged starting checkpoint scores **54.4085%** (seed-block Wilson 95% interval **49.7785–58.9635%**). It deploys Territories 4,725 times, drawing 6,376 cards. This is encouraging but does not yet establish a greater-than-50% result. It is not a same-seed estimate of the rule's effect relative to the earlier 34.40% result.

An independent 3,584-game confirmation of this starting checkpoint is running via `confirm-initial.py`. It uses the same predeclared confirmation namespace as the training runs; it is not an additional independent replication of their eventual incumbent result.

## Training

Two runs, each 8,388,608 learner decisions, eight saved checkpoints, 896-game screening and 3,584-game confirmation:

- Standard: learning rate 0.0001, entropy 0.003.
- Exploratory: learning rate 0.00005, entropy 0.01, initial logits scaled by 0.7.

Both retain the existing terminal outcome plus training-only clipped score-margin reward. Checkpoint selection uses screening only. The trainer's acceptance flag tests improvement over the starting checkpoint; the user's separate target is win share over 50%, with its confirmation interval reported explicitly. No confirmation outcomes are used to choose checkpoints.

Protocols here contain full arguments, frozen actor hashes and training source hashes. Outputs/checkpoints live in `balance-diagnostics/territory-deploy-learning-20261128/{standard,exploratory}`. Logs: `/tmp/pantheon-territory-{standard,exploratory}.log`; initial confirmation: `/tmp/pantheon-territory-initial-confirm.log`.

## Validation and deployment

135 backend tests passed under the Nix-provided Firestore emulator, followed by a new authenticated Territory Deploy test (also passed). That test verifies legal persistence, wrong-player rejection, retry idempotency, replay and the draw's undo barrier. Engine tests cover repeated draws, all phases, FIFO consumption, reshuffling, legal masks and rejection without a grant. The targeted RL/playable tests also passed; Svelte checking reports zero errors/warnings. No browser E2E or visual validation claimed.

Rules and code are local. No models or Firestore rules have been deployed. Training and confirmation results are pending at the time of this report.
