# Doreios RL iteration 2

The learner recovered to approximately Classic Engine performance on this test sample.
The clear improvement came from imitation and learner-state expert labels; this run
does not establish an additional benefit from RL. Production bots remain unchanged.

## Changes and protocol

Source commit: 2d9df445. Same frozen MM v3/Melia opponent and production game rules.
- 1,024 Classic Engine demonstration games, including losses.
- Two DAgger rounds of 256 games each, querying Classic Engine on learner-visited states.
  Expert actions were executed with probability 0.5 then 0.2; remaining moves came from
  the learner. Expert preview queries do not mutate the teacher memory.
- 276,368 supervised decisions in total; a 128x128 actor and critic, versus v1's 64x64.
- Twenty initial supervised epochs and ten epochs per DAgger round.
- PPO with KL(current || frozen best imitation), coefficient 1.0; learning rate 0.00003.
- 524,288 RL decisions, 3,111 completed training games, eight workers, CPU-only.
- Terminal win/tie/loss rewards only, no extra strategic action restrictions.

The smoke namespace was rl-doreios-v2; the main experiment used the distinct prefix
rl-doreios-v2-pilot. Imitation, each DAgger round, training, validation and testing had
separate namespaces. No v1 final test seeds were reused. One learner seed (1702).

Best imitation was dagger-2 (23.63% validation share). Validation selected ppo-524288
(25.98% share) before the fresh final test. Earlier PPO checkpoints scored 25–25.59%.
No checkpoint collapsed as in v1. Final selection was not changed using test results.

## Fresh matched test

1,000 seeds per policy, 500 starts per seat. All 4,000 games replay-verified.

| Policy | Wins | Ties | Losses | Tie-adjusted share |
|---|---:|---:|---:|---:|
| Classic Engine through action interface | 249 | 54 | 697 | 27.60% |
| Original v1 imitation, retested | 83 | 44 | 873 | 10.50% |
| Improved imitation (dagger-2) | 242 | 59 | 699 | 27.15% |
| Selected anchored PPO | 238 | 69 | 693 | 27.25% |

Paired approximate 95% confidence intervals for share differences:
- Improved imitation versus v1: +16.65 percentage points [13.81, 19.49].
- PPO versus improved imitation: +0.10 points [-1.36, 1.56].
- PPO versus Classic Engine: -0.35 points [-2.84, 2.14].

These are intervals over game seeds, not independent training runs. Similar observed
performance does not prove equivalence. Multiple changes were bundled, so this is not
an ablation that isolates architecture, data volume, DAgger, learning rate or KL anchoring.
Classic Engine uses the same card-type interface; canonical instance selection can
change exact seeded trajectories relative to its native instance selection.

## Timing, validation and artifacts

Full run: 474.04 seconds (7.9 minutes). RL and periodic validation: 133.89 seconds.
Seven environment tests passed (9,630 assertions). The anchor unit test verifies zero
KL at initialization, positive KL after drift, a restoring gradient, frozen reference
parameters, and zero probability for illegal moves. Type checking passed.
Supervised observations are finite and every stored expert label is mask-legal.

All checkpoints, the compressed supervised dataset, per-game test/validation outcomes,
source hashes, protocol, selection and logs are retained with checksums. Model ZIPs
contain inference weights; continued anchored training must restore the reference
from dagger-2, rather than freeze the current PPO checkpoint as a new reference.

## Recommended next step

Replicate across independent learner seeds, then test a controlled relaxation of the
anchor or longer training. Keep the current imitation model as the stable baseline.
Use a new final test namespace for any iteration informed by these results. We have
repaired the collapse, but have not demonstrated that RL improves on the expert.
