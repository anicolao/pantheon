# Pantheon RL experiments

Research training and evaluation harness. The early experiments below were isolated
pilots; the four leader-specific champions now also have exported production actors.
Running a research experiment does not replace those actors.

Use the project's Nix dev shell. Create a Python venv and install requirements.lock
inside it; run python scripts/rl/train.py --output <new-directory> from that environment.
Bun must also be on PATH. The reference run uses Python 3.14 on Apple ARM, CPU-only,
eight simulator workers, and one Torch compute thread in the learner.

The agent sees count vectors for its hand, play, discard, owned cards and supply,
public resources, scores, phase, events, choice metadata and draw counts. It never
receives shuffle seeds, hidden card order, opponent hands or simulation state.
The finite action vocabulary covers individual plays, play-all treasures, all supply
purchases/gains, worship, phase advance, end turn, and zero/one/two-card selections.
Duplicate card instances are interchangeable and mapped to the first available copy.
Masks enforce legality only, with no strategic restrictions.

Classic Engine demonstrations (including losses) initialize a 64x64 MLP through
12 epochs of cross-entropy training. Maskable PPO then learns against frozen MM/Melia.
Only terminal win/tie/loss rewards (+1/0/-1) are used. Training is stochastic;
evaluation uses deterministic argmax. Gamma is 1, so early and late wins have
the same terminal reward. GAE, PPO clipping, entropy, and other settings are in train.py.

Separate seed namespaces cover imitation, training, validation, and final testing.
Four fixed training checkpoints and the imitation checkpoint compete on validation
share; the winner is frozen before final test results are inspected. Test compares
Classic Engine, imitation and the selected model on 1,000 identical seeds, balanced
between starting seats. Every final test game is replay-verified. Exceptions or
5000-command episodes abort the run, rather than being silently excluded.

This is one learner seed and one fixed opponent, not a claim of general strength.
Confidence intervals cover game-seed variation, not variation between training runs.

## Iteration 2

Run train_v2.py for expanded imitation, two rounds of learner-state expert labeling
(DAgger), and KL-anchored PPO. Use a unique --seed-prefix for each experiment; smoke
runs must not share the main experiment's prefix. Defaults use rl-doreios-v2-pilot.
The frozen imitation reference is excluded from checkpoint ZIPs, so resuming training
requires explicitly restoring that original reference. Inference needs no teacher.
The anchored update is derived from sb3-contrib 2.9.0; its MIT license is retained in
LICENSE.sb3-contrib. Run test_anchor.py plus the Bun environment tests before training.

## Iteration 3

Config-driven `continue_training.py` supports checkpointed continuations, optional
KL anchoring, logit softening, and episodically neutral potential shaping.
`evaluate_checkpoints.py` compares policies on matched seeds; `resolve_plateau.py`
applies the predeclared independent promotion rule. The completed campaign and
selected model are in `balance-results/doreios-rl-v3/README.md` and `champion.zip`.
Its final tie-adjusted share against fixed MM/Melia is 64.3% over 2,000 games.
Five follow-up directions and an enlarged independent exploration comparison did
not establish a further gain. All models remain available for later research.

## Independent Nereon and Thaleia models

The completed `balance-results/leader-rl-v1/README.md` campaign starts new networks
from the strongest available leader-specific teachers: Money for Nereon and Classic
Engine for Thaleia. No Doreios weights are transferred. Fresh 4,000-game final tests
against unchanged MM/Melia yield 63.4% outright wins for Nereon, 62.0% for the prior
Doreios champion, and 54.9% for Thaleia; all lower 95% win bounds exceed 50%.

The `Game`/`vector` and continuation/evaluation configs now accept `leader` and
`teacher`, retaining Doreios/Classic defaults for older experiments. Use
`imitate_leader.py` for fresh imitation, `collect_independent.py` for reproducible
independent expert collection, and `evaluate_teacher.py` for whole-game heuristic
workers. Leader-specific model ZIPs and manifests live under that campaign root.

## Four-leader league pilot

`balance-results/league-rl-v1/protocol.json` freezes a two-round heads-up experiment.
Each leader trains for 524,288 decisions per round, with checkpoints every 262,144.
Opponents are frozen for the entire round: 50% current champions, 25% historical
actors, and 25% native heuristics. Adjacent episodes use the same opponent with
opposite starting seats. They have distinct game seeds; candidate/incumbent
comparisons use exactly matched seeds.

The initial actors retain the independent 128×128 networks of the four shipped
champions. `setup_league.py` initializes the manifests and checksummed actors;
it refuses to overwrite an existing experiment. `league_round.py` selects on
screening seeds, then applies the preregistered fresh-confirmation gates.
`advance_league.py` freezes approved champions and constructs the next round.
A rejected candidate may continue training, but does not become an opponent
champion. No rules, masks, native heuristic decisions, or reward functions change.

Native Money is evaluated separately because its expensive search can stall
synchronous rollouts. `evaluate_independent.py` assigns whole games to workers,
saves each completed game atomically, and verifies every replay. Its results
were checked against the synchronous evaluator on identical seeds. It resumes
saved rows only when checkpoint and manifest identities still match.

After round-one guards finish, `finish_league_pilot.py` runs round two and the
frozen final evaluation. `setup_league_final.py` preregisters six cross-play
pairings and an additional MM retention audit. `report_league.py` checks seed
coverage, seat balance, opponent and checkpoint hashes, replay verification,
and result summaries before producing `report.txt` and `summary.json`.
Production weights remain unchanged pending pilot review.

Use the Nix shell and locked Python environment for all commands. Two jobs with
eight workers each fit the reference machine. `run_jobs.py` preserves job logs and
stops on failure; it intentionally refuses to overwrite an existing run log.
For an interrupted independent evaluation, invoke that evaluator directly with
the original config to reuse its `.progress` rows. Do not remove slow games or
alter the promotion thresholds after seeing results.
