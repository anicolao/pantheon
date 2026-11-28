# Weakest-first expansion training

This run is ongoing. Do not treat its current checkpoints or adaptive rankings as a final held-out result.

The starting field is the exact eight-house field deployed on PR #25. Each attempt trains only the lowest-ranked leader, freezes its seven opponents, saves four checkpoints, and selects on 448 screening games. Promotion requires a positive lower bound on a paired approximate 95% interval over 1,792 separate games, versus both the incumbent and the original leader model. Reranking uses 224 games per pair; near-ties are uncertain. The final audit will compare all four new leaders against their originals on untouched seeds and run a fresh 28,000-game matrix.

The original terminal-only training recipe plateaued on Achilles. Retained experiments include transfer initialization, 256-wide networks, softened logits, purchase priors, and heuristic probes. Starting at attempt 19, training includes a terminal score-margin bonus (up to ±0.5); evaluation remains raw win share. Starting at attempt 23, half the training games face the nearest rival, while screening/confirmation retain uniformly rotated opponents. Starting at attempt 24, continuation uses the best screened PPO checkpoint rather than the last checkpoint. All changes and interrupted runs are recorded under the artifact directory.

Runtime dependencies come from the repository flake. The exact flake/lock copy at /tmp/pantheon-design-nix avoids copying large research artifacts into the Nix store. The active runner and all checkpoints are in balance-diagnostics/weakest-eight-house-20261128; status.json, progress.json, and protocol/recovery files record the state. Logs are at /tmp/pantheon-weakest-league.log. Production/deployed weights are unchanged.
