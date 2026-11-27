# Sequential expansion league and final heads-up matrix

All dependencies are in `flake.nix#rl`. The production bots are unchanged.

The Echo pilot is frozen first. `import_echo.py` maps its actor and critic tensors
into the full 879-input / 1,174-action vocabulary, preserving every old feature
and action identity and checking both networks numerically. Future houses have
vocabulary slots, but cannot appear in an earlier curriculum’s leaders or market.

The sequence is Theseus/Hermes, Achilles/Nike, Perseus/Hades. Each stage introduces
only that house, bootstraps its new 128×128 policy by imitation, then runs two
frozen-opponent PPO rounds for **every** introduced leader. The second round thus
includes the first round’s learned new-house policy. Original policies and critics
continue from the prior selected checkpoints rather than restarting from scratch.

The new stages train heads-up to match the final question. Existing leaders spend
half their matches against the newest leader and half against other introduced
leaders. The newest leader faces all existing leaders. Starting positions alternate
on the same seed, and the twelve Action piles follow the production setup rules.
Before all houses are introduced, seeds are rejected **only** when random filler
houses include an unintroduced house; no draws, decisions or outcomes are examined.
At eight houses, no such rejection occurs. Every match uses unmodified production
reducers, and every result is replay-verified. Bad actions and episode guards abort;
there is no dropped-game fallback or strategic action masking.

After introducing all eight, one consolidation round uses uniformly rotated
opponents. All training then stops before the final matrix. Each round saves the
incumbent plus two PPO checkpoints, selects on 128 screening games, and reports
384 separate held-out games for both incumbent and selection. Fresh namespaces
separate imitation, training, screening, confirmation and the final matrix. Rewards
are terminal win/tie/loss (+1/0/−1), gamma 1; there is no intermediate shaping.
The rollout observation cache is reset after evaluation and before learning.

The final matrix contains 1,000 games per unordered pair: 500 fresh seeds × both
starting positions, totaling 28,000 games. Rows and reverse columns are complements,
not redundant additional games. All eight actors are frozen and checksummed. Full
compressed replays are saved atomically. A matrix interrupted mid-run resumes only
with the identical protocol. Approximate pointwise intervals treat each paired
seed as the independent unit. They do not claim family-wise significance across
28 comparisons or uncertainty across independent training initializations.

```sh
nix develop .#rl --command python scripts/rl/expansion/import_echo.py \
  balance-diagnostics/echo-rl-v2 balance-diagnostics/expansion-league-v1-bootstrap
nix develop .#rl --command python scripts/rl/expansion/campaign.py \
  --bootstrap balance-diagnostics/expansion-league-v1-bootstrap/field.json \
  --output balance-diagnostics/eight-house-league-v2 --workers 16
```

An exact copy of this repository’s flake and lock in a small temporary directory
may be used as the Nix entry point to avoid copying large research artifacts into
the Nix store. No ad-hoc Python packages or external environments are required.

`status.json` records the current stage. Per-stage logs, source hashes, frozen
fields, selections and checkpoints remain on disk. Partial training stages stop
for explicit recovery rather than overwriting progress. Matrix failure similarly
stops the campaign; no completion is reported without all 28 matchups.

Campaign v1 stopped before completing training because its descriptive seed
namespace exceeded the production seed length. Campaign v2 stores the descriptive
identity in results and uses a fixed-length SHA-256-derived game seed; paired
starting orders still use the same game seed. The failed start is retained.
