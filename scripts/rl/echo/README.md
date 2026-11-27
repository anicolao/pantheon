# Echo/Zeus: first expansion RL stage

This research-only pipeline trains one new house at a time. Every game has Echo
and three original leaders. The omitted original leader rotates, with all four
starting positions per seed block. Hermes, Nike and Hades cards cannot enter the
market. No production weights or bot choices are replaced.

Dependencies are declared in the repository `flake.nix`, locked by `flake.lock`.
Use `nix develop .#rl`; no pip installation or external Python environment is needed.
For a large checkout, a temporary directory containing **exact copies** of these
two files can be used as the flake path to avoid copying research artifacts into
the Nix store. The training code and artifacts remain in this repository.

```sh
nix develop .#rl --command python scripts/rl/echo/train.py \
  --output balance-diagnostics/echo-rl-v2 --prefix echo-rl-20261127-v2 \
  --workers 16 --imitation-games 512 --epochs 20 \
  --steps 131072 --screen-games 96 --test-games 384
```

Five separate 128×128 tanh actor/critic networks are trained. Echo starts from a
simple, explicitly heuristic teacher. The four original actors transfer their
shipped weights: a 171-feature compatibility prefix retains their existing
logits, new feature columns start at zero, and new action rows use the PPO
initializer. Critics start fresh. `verify_transfer.py <run>` checks the original
logits and the exported Bun runtime against Torch before PPO.

The additional features include public discard/play piles, public card inventories,
leader identities, resource counts, and Echo choice metadata. No hidden card order,
shuffle seed, or opponent hand identities enter a model observation. Total owned
inventories are publicly reconstructible from starting cards, gains and trash;
borrowed cards retain their actual owner. Echo actions distinguish opponents and
card types, including the legal empty-discard deck fallback. Masks encode legality,
not strategy. Invalid actions, replay mismatches and the 5,000-command guard abort
an experiment; no games are silently omitted.

After bootstrapping, all five opponents are frozen for the complete first PPO
round. Each learner gets two 65,536-decision stages. Terminal reward is
`2 * win_share - 1`, gamma 1, with no intermediate reward. This pilot isolates the
new rules/schema; it does not add a new speed-of-winning reward experiment.

Imitation, training, screening and final testing have disjoint seed namespaces.
BC and the two PPO checkpoints compete on screening share; earlier checkpoints
break ties. Final test results never select models. Test seeds are matched between
baseline and selected candidate and balanced by starting position. Approximate
Wilson intervals use independent four-seat seed blocks, not individual games.
Per-leader shares come from separate matched comparisons against the frozen field;
they must **not** be added as if they were a single tournament.

Each run saves the protocol, source hashes, checkpoint ZIPs, exported actors,
opponent hashes, per-game evaluations and selections. `selected-field.json` is a
research field, not approval to deploy. A later round should freeze that field,
retain older opponents, and measure direct cross-play before promotion.

Validation:

```sh
nix develop . --command bun test tests/tooling/echo-rl.test.ts
nix develop .#rl --command python scripts/rl/echo/verify_transfer.py <run>
```

The learner clears its cached observation before each training segment because
screening resets the shared simulator. The exploratory v1 run is invalidated in
its artifact directory; v2 is the first full pilot eligible for reporting.
