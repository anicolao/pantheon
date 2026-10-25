# Doreios reinforcement-learning pilot v1

Outcome: the pipeline works, but this learner does not improve on Classic Engine.
Production bots are unchanged. Source: commit 7f027d1c; dependencies and protocol are pinned alongside the harness.

## Budget and timing

- Eight simulator workers, CPU-only small 64x64 network.
- Imitation target: 256 Classic Engine games; 47,680 observed decisions, 12 training epochs.
- PPO: 524,288 decisions and 2,405 completed games against frozen MM v3/Melia.
- Training and periodic validation: approximately 100 seconds.
- Full run including imitation and final replay-verified testing: 238.53 seconds.
- This is much faster than the earlier whole-study extrapolation; MM-only training avoids expensive Money-policy search and per-training-game replay verification.

## Validation and test

Validation seeds were disjoint from imitation/training/test seeds. BC (imitation) scored
18 wins / 5 ties / 105 losses on 128 validation games (16.02% tie-adjusted share).
All four PPO checkpoints scored 0 wins / 0 ties / 128 losses. Therefore the selection
rule retained BC before inspecting test results. PPO was not subsequently selected or
retuned using final test results.

On 1,000 identical fresh test seeds, with 500 starts per seat:

| Policy | Wins | Ties | Losses | Tie-adjusted share |
|---|---:|---:|---:|---:|
| Classic Engine through the action interface | 248 | 52 | 700 | 27.40% |
| Imitation / selected checkpoint | 101 | 33 | 866 | 11.75% |

Difference: -15.65 percentage points; paired approximate 95% CI [-18.61, -12.69].
Every test game replayed to the identical final state. The selected and BC test files
refer to the same 1,000 games, not independent repetitions. Classic uses the same
card-type action interface; equivalent instances are canonicalized to the first copy,
which can change exact seeded trajectories relative to its native instance selection.

## Diagnosis

A deterministic replay of validation seed 0 matched the recorded validation results.
BC reached 21 points versus MM's 26. The final PPO checkpoint reached 0 versus 48:
it bought eight Harbor Pilots and eight Seed Keepers, repeatedly trashed those cards,
and failed to build income or points. This is concrete policy collapse; the evidence
does not establish the precise optimizer cause. Sparse terminal rewards and loss of
the imitation policy are plausible contributors, not proven diagnoses.

The six environment tests cover mask-enabled command legality across four complete
games, exact replay, finite observations, hidden-card/instance-ID invariance, and
repeated-type two-card selections. All passed (9,616 assertions); type checking passed.

## Next experiment

Improve and validate imitation strength first, then constrain PPO updates toward the
teacher (or initially learn only strategic decisions while retaining reliable play
mechanics). Use a new final test seed namespace for any follow-up tuned using these
results. More compute alone is not justified by this run. Multiple learner seeds and
other opponents remain necessary before claiming a general improvement.

Checkpoints, dependency lock, source hashes, full per-game result rows, training log,
selection record and sample failure action trace are retained. No training games were
silently dropped; a command error or safety-limit episode would abort the run.
