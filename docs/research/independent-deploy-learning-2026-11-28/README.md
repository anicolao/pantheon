# Achilles learning independent Action-only Deploy

Status: training started; no improvement claimed yet. Treasure Deploy is deliberately not implemented in this experiment.

Two runs start from the accepted attempt-26 Achilles checkpoint, against the same seven frozen opponents used for the independent-Deploy rules comparison. The production game engine is unchanged from commit 2c6f1a611. Each run trains for 4,194,304 decisions, saves eight checkpoints, screens on 896 games, and confirms its selected candidate against the untrained incumbent on 3,584 separately seeded games. Evaluation uses raw split win share and paired seed-block confidence intervals. Both runs share evaluation seeds for fair comparison; selection across their final results would require a further untouched-seed audit before deployment.

The learner alone receives 37 additional public features: the first 32 ordered grants, total queue length, counts of grants of sizes 1/2/3, and total pending resolutions. Queues longer than 32 retain their aggregate totals, but the ordering of that suffix is not represented. Opponents retain their original observation and frozen actors. No legal action or rule is changed by this observation extension.

The 879-input actor and critic are migrated to 916 inputs by adding zero columns to their first-layer weights. All existing weights and biases are copied. The migration check found zero log-probability difference across 128 sampled observations. Both migrated incumbent screens produced 29.3527% win share and zero Nike market-card plays/worships on the same 896 games. These are initial baseline measurements, not training results.

- Standard: learning rate 0.0001, entropy coefficient 0.003, unchanged initial logits.
- Exploratory: learning rate 0.00005, entropy coefficient 0.01, initial logits scaled by 0.7 to encourage exploration.
- Both retain the prior training reward: terminal win/tie/loss +1/0/-1 plus 0.5 times clipped score margin; gamma and GAE lambda are 1. Evaluation has no shaping.
- Both use 16 parallel environments through the flake's `rl` shell, separate training/evaluation environments, and replay verification. Evaluation records Nike market-card plays and worship counts, so wins can be checked against actual mechanic usage.

Artifacts are under `balance-diagnostics/independent-deploy-learning-20261128/{standard,exploratory}`. Each contains protocol/source hashes, the frozen field, migration verification, incumbent checkpoint, periodic checkpoints, screens, status, and (on completion) confirmation results and an exported research actor. These new-schema actors are not yet supported by the deployed runtime and are not automatically promoted.

Logs:
- `/tmp/pantheon-deploy-learning-standard.log`
- `/tmp/pantheon-deploy-learning-exploratory.log`

Launch using `scripts/rl/expansion/train_deploy.py --field balance-diagnostics/independent-deploy-20261128/field.json --output NEW_DIRECTORY --prefix UNIQUE_PREFIX`, inside `nix develop /tmp/pantheon-design-nix#rl --command python ...`. The exploratory run additionally uses `--temperature .7 --lr .00005 --entropy .01`. Existing output directories are refused. Retained checkpoints permit a deliberate recovery; do not overwrite or mix old-rules campaign artifacts.

Validation: nine observation/environment tests passed, including long-queue totals and ordering distinctions; Svelte/type checking passed without errors or warnings. Both live runs passed migration checks and completed their incumbent screens before training began.
