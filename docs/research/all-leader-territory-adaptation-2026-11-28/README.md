# All-leader adaptation after Territory Deploy

The user requested that every model retrain after the current Achilles trials finish, followed by a before/after comparison once everyone can exploit the new rules.

## Sequence

1. Wait for both current Territory-Deploy Achilles trials to finish. Select the run using its screening score, not its confirmation score. Use its candidate only if it passed its predeclared improvement gate; otherwise preserve its starting checkpoint.
2. Snapshot the original eight actors/checkpoints and the resulting post-Achilles field. Original 879-feature checkpoints are zero-padded to the 916-feature Deploy-queue schema with a policy-equivalence check. Frozen original actors retain their existing inference schema.
3. Train **every leader**, including Achilles, for 4,194,304 learner decisions against the same post-Achilles field. Run two jobs concurrently, eight training workers per job. Save eight checkpoints per leader; select on 896 games and confirm on 3,584 separate games. A candidate replaces its incumbent only when the paired improvement interval is strictly positive. Each leader gets equal training opportunity, regardless of its previous rank. This is one synchronous adaptation generation, not an indefinitely changing opponent league.
4. Evaluate three matrices under the **same new engine rules** and identical untouched seeds: original field; post-Achilles/pre-adaptation field; adapted field. Each matrix contains all 28 unordered leader pairings, with 512 games per pairing, balanced across seats (14,336 games per matrix; no mirror matches). Save all game results and paired matchup-change intervals.
5. Compare each old and retained/adapted policy against the **same final opponent field**, on 3,584 matched games per policy. These individual audits distinguish improvement from a redistribution of wins. A complete field always averages 50%; its average is not an improvement metric.

Final comparisons are heads-up, not four-player. Ties split win credit. Intervals are descriptive and not multiplicity-adjusted claims that all eight improved. Incumbents are retained where learning did not pass the gate. No automatic deployment.

## Execution and recovery

The orchestrator is `scripts/rl/expansion/adapt_all.py`. It writes source hashes and frozen actor hashes, refuses source drift, fails on interrupted upstream trials, and records failures without dropping games. Completed leader jobs/evaluation files can be resumed with `--resume`; interrupted training restarts from its incumbent in a fresh directory while preserving the interrupted checkpoints. Existing Achilles jobs and their source files are unchanged.

Outputs: `balance-diagnostics/all-leader-territory-adaptation-20261128/`.
Log: `/tmp/pantheon-all-leader-adaptation.log`.
Final artifacts: `REPORT.md`, `result.json`, before/after manifests, per-leader checkpoints and all evaluated rows.

Launch through the project flake (the `/tmp/pantheon-design-nix` directory is the existing exact flake/lock copy used to avoid copying research artifacts into the Nix store):

```sh
nix develop /tmp/pantheon-design-nix#rl --command python scripts/rl/expansion/adapt_all.py \
  --output balance-diagnostics/all-leader-territory-adaptation-20261128 \
  --pending balance-diagnostics/territory-deploy-learning-20261128 \
  --field balance-diagnostics/treasure-deploy-20261128/field.json
```

## Validation

The transport smoke test completed and replay-verified two games for each of all eight learners, exercising legacy and queue-aware opponents and checkpoint conversion. Svelte/type checking passed. A tiny non-Achilles end-to-end training smoke test separately exercises checkpoint selection, confirmation and actor export; its data is never used for model selection in this study.

## Increased utilization

`accelerate.py` changes only job scheduling. It suspends the original dispatcher process (not its active training children), starts the remaining leader jobs, and fills idle capacity with the already-declared matrix evaluations. All training commands, worker counts, checkpoint selection, source hashes, opponents and seeds remain unchanged. No running training is restarted. Evaluation results are written atomically to the original cache paths; the original dispatcher resumes to build the original reports once the caches are complete.

The live cap is `concurrency.json` in the output directory. It was raised from two to four, five, and finally six simultaneous jobs after observing spare CPU capacity. Each job retains eight simulation workers. `acceleration-status.json` records active jobs, remaining tasks and the original dispatcher PID; `acceleration-failure.json` records errors. Logs are `/tmp/pantheon-all-adapt-accelerator.log` and per-job `parallel-*.log` files. On a handled failure, the accelerator drains its own launched jobs before resuming the original dispatcher, preventing duplicate training or partially written caches.

The initial four-job sample raised total host utilization from approximately 45–50% to 80–83%; five jobs measured 89–92%, and six jobs measured approximately 90–94% with no additional swap-ins or swap-outs during sampling. The first parallel matchup completed 512 unique replay-verified games, balanced 256 per starting seat. Other projects are left untouched.
