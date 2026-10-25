# Doreios RL pilot

An isolated research harness. No production bots, rules, or UI are changed.

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
