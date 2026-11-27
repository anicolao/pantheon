# Eight-leader RL campaign: final results

All eight leaders have completed the sequential curriculum and final consolidation.
The frozen models then played **28,000 heads-up games**: all 28 distinct pairings,
500 fresh seeds each, with both starting orders. Self-matchups are excluded.

## Findings

- **Melia leads the field (78.7% average share)**, followed by **Nereon (72.5%)**.
  Their direct matchup is effectively even: Nereon 49.8%, approximate 95% CI 45.4–54.1%.
- **Theseus is the strongest new-house model (56.8%)**. It beats five of seven
  opponents, including Thaleia (57.2%) and Doreios (56.1%), but loses to Nereon
  (42.6%) and especially Melia (22.3%). Doreios's slightly higher average (57.4%)
  does not mean it beats Theseus directly.
- **Thaleia is competitive overall (52.2%)**, but has losing matchups against
  the other three original leaders and Theseus.
- **Achilles (33.0%), Echo (25.8%), and Perseus (23.7%) remain behind**. Achilles
  beats Echo and Perseus; Echo–Perseus is inconclusive at 48.6% for Echo
  (44.2–53.0%). The new models are trained, but this study does not show that all
  leaders are equally competitive.
- Starting players received **51.9%** of win credit despite equal-turn rules.
  Both starts are included in every seed block, so this does not favor a leader
  in the matrix.

## Protocol and validation

The Echo pilot was completed first. Theseus/Hermes, Achilles/Nike, and Perseus/Hades
were then introduced in that order. Each introduction bootstrapped the new leader
from 512 heuristic games, then trained every introduced leader for two frozen-field
PPO rounds. A final uniform-opponent round included all eight. There are **50 audited
learner-round comparisons**, each with 131,072 PPO decisions, 128 screening games
per candidate checkpoint, and 384 separate confirmation games for both incumbent
and selection. Screening alone selected checkpoints; confirmation and final matrix
results never changed the selection. All actors and critics use two 128-unit tanh
hidden layers; the expansion schema has 879 inputs and 1,174 masked action slots.
Policies receive public information plus their own hand, not opponent hands or
hidden deck order. No planner was used.

All dependencies came from `flake.nix#rl`. Frozen opponent manifests, source hashes,
seeds, actor/critic ZIP checkpoints, actor JSON exports, selections, evaluations,
and all final compressed game histories remain under
`balance-diagnostics/eight-house-league-v2/`. The final field is
`consolidation/selected-field.json`. The preceding Echo pilot and imported bootstrap
are preserved separately under `balance-diagnostics/echo-rl-v2/` and
`balance-diagnostics/expansion-league-v1-bootstrap/`.

Every final game passed the simulation's replay check. A separate audit reconstructed
**all 28,000 saved event histories again**, checking the reported results table,
seed, leaders, first seat, finished phase, equal-turn flag, scores, turn counts,
win shares and full standings. All eight exported actors exactly match their
saved checkpoint tensors. Gameplay sources and Nix dependencies match the recorded
stage hashes. See [completion-audit.json](completion-audit.json),
[analysis.json](analysis.json), and [TRAINING.md](TRAINING.md).

One Theseus training trajectory stalled after approximately 240 turns per player.
Its full replay was retained. Training thereafter used an explicit 5,000-command
trajectory horizon, zero reward, and standard time-limit value bootstrapping at
the next learner decision. The failed learner was restarted on the same seeds;
completed learners were preserved. Exactly one such training truncation occurred
in the completed staged campaign. **No evaluation game was truncated, omitted,
or assigned an artificial outcome.** A separate earlier campaign start failed on
seed length and was retained; its fixed-length hash replacement is documented in
the runner README.

## Limits and next experiments

These are results for one frozen neural-policy field, not intrinsic leader balance
or strength against humans or deployed planner bots. Opponents are deterministic
at evaluation time. The earlier-introduced leaders received more curriculum rounds:
Theseus seven, Achilles five, Perseus three, in addition to differing inherited
experience for the original leaders and Echo. Thus weak results can reflect
training budget, bootstrap quality, representation or exploration as well as rules.
The confirmation results include both improvements and regressions; those were
retained rather than selecting retrospectively on test performance.

The reported intervals treat each two-start seed block as the independent unit.
They are conservative, approximate pointwise Wilson intervals for fractional win
credit, not simultaneous guarantees across all matchups or uncertainty across
independent training runs. Close aggregate rankings should not be overinterpreted.

A useful next experiment would give Echo, Achilles and Perseus matched additional
training budgets and stronger imitation teachers, retain this final field as frozen
opponents, and evaluate on a new seed namespace. The current matrix must remain
an untouched baseline rather than becoming a checkpoint-selection set.

## Full matrix and matchup intervals

28,000 replay-verified games; 500 fresh seeds per pairing, each with both starting orders. Entries are row-leader win share (ties count as half).

| Leader | Thaleia | Nereon | Melia | Doreios | Echo | Theseus | Achilles | Perseus |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Thaleia | — | 28.6% | 43.5% | 37.2% | 62.3% | 42.8% | 71.0% | 79.8% |
| Nereon | 71.4% | — | 49.8% | 65.8% | 87.2% | 57.4% | 88.3% | 87.8% |
| Melia | 56.5% | 50.2% | — | 80.6% | 94.9% | 77.7% | 93.7% | 97.2% |
| Doreios | 62.7% | 34.2% | 19.4% | — | 85.7% | 43.9% | 77.7% | 78.0% |
| Echo | 37.7% | 12.8% | 5.1% | 14.3% | — | 24.1% | 37.6% | 48.6% |
| Theseus | 57.2% | 42.6% | 22.3% | 56.1% | 75.8% | — | 65.7% | 77.7% |
| Achilles | 29.0% | 11.7% | 6.3% | 22.3% | 62.4% | 34.3% | — | 65.2% |
| Perseus | 20.2% | 12.3% | 2.8% | 22.1% | 51.4% | 22.3% | 34.8% | — |

## Matchup uncertainty

| Pairing | First leader’s share | Approx. 95% CI | W / T / L | Mean turns |
|---|---:|---:|---:|---:|
| Echo vs Thaleia | 37.7% | 33.6–42.0% | 345 / 64 / 591 | 17.1 |
| Echo vs Nereon | 12.8% | 10.1–16.0% | 105 / 45 / 850 | 16.3 |
| Echo vs Melia | 5.1% | 3.5–7.4% | 43 / 16 / 941 | 14.9 |
| Echo vs Doreios | 14.3% | 11.5–17.7% | 123 / 41 / 836 | 16.1 |
| Echo vs Theseus | 24.1% | 20.6–28.1% | 156 / 171 / 673 | 15.2 |
| Echo vs Achilles | 37.6% | 33.5–41.9% | 265 / 222 / 513 | 17.8 |
| Echo vs Perseus | 48.6% | 44.2–53.0% | 390 / 192 / 418 | 17.9 |
| Thaleia vs Nereon | 28.6% | 24.9–32.8% | 245 / 83 / 672 | 15.1 |
| Thaleia vs Melia | 43.5% | 39.2–47.9% | 374 / 122 / 504 | 12.3 |
| Thaleia vs Doreios | 37.2% | 33.1–41.6% | 339 / 67 / 594 | 14.4 |
| Thaleia vs Theseus | 42.8% | 38.5–47.1% | 361 / 133 / 506 | 14.0 |
| Thaleia vs Achilles | 71.0% | 66.9–74.8% | 664 / 92 / 244 | 16.6 |
| Thaleia vs Perseus | 79.8% | 76.1–83.1% | 764 / 68 / 168 | 16.3 |
| Nereon vs Melia | 49.8% | 45.4–54.1% | 443 / 109 / 448 | 11.6 |
| Nereon vs Doreios | 65.8% | 61.5–69.8% | 617 / 81 / 302 | 13.3 |
| Nereon vs Theseus | 57.4% | 53.0–61.7% | 483 / 182 / 335 | 13.1 |
| Nereon vs Achilles | 88.3% | 85.2–90.9% | 852 / 63 / 85 | 16.0 |
| Nereon vs Perseus | 87.8% | 84.6–90.3% | 845 / 65 / 90 | 15.6 |
| Melia vs Doreios | 80.6% | 76.9–83.8% | 736 / 140 / 124 | 12.0 |
| Melia vs Theseus | 77.7% | 73.8–81.1% | 738 / 78 / 184 | 12.2 |
| Melia vs Achilles | 93.7% | 91.2–95.5% | 923 / 27 / 50 | 13.8 |
| Melia vs Perseus | 97.2% | 95.3–98.3% | 966 / 11 / 23 | 13.5 |
| Doreios vs Theseus | 43.9% | 39.6–48.2% | 363 / 151 / 486 | 12.9 |
| Doreios vs Achilles | 77.7% | 73.8–81.1% | 736 / 82 / 182 | 15.5 |
| Doreios vs Perseus | 78.0% | 74.1–81.4% | 759 / 41 / 200 | 14.4 |
| Theseus vs Achilles | 65.7% | 61.4–69.7% | 547 / 220 / 233 | 14.0 |
| Theseus vs Perseus | 77.7% | 73.8–81.1% | 679 / 196 / 125 | 13.5 |
| Achilles vs Perseus | 65.2% | 61.0–69.3% | 544 / 217 / 239 | 16.7 |

## Interpretation

Average share against the seven equally weighted opponents: Melia 78.7%, Nereon 72.5%, Doreios 57.4%, Theseus 56.8%, Thaleia 52.2%, Achilles 33.0%, Echo 25.8%, Perseus 23.7%.
Across the balanced pairings, the starting player took 51.9% of win credit.

Intervals account for the two starts sharing a game seed, but not variation across independent training runs. They are descriptive pointwise intervals, not simultaneous guarantees across 28 comparisons. These results measure this frozen trained field under current expansion rules; they do not establish intrinsic leader balance or strength against humans. Final matrix games were not used to select checkpoints.
