# Three independent RL competitors to MM

All three saved models exceed 50% outright wins against unchanged MM v3/Melia, including the lower endpoint of each model's 95% Wilson interval. Each frozen model played 4,000 fresh games, balanced 2,000 in each starting seat. Ties do not count as wins.

| Leader | Wins | Ties | Losses | Outright win rate | 95% Wilson CI | Tie-adjusted share |
|---|---:|---:|---:|---:|---:|---:|
| Nereon | 2,536 | 340 | 1,124 | **63.4%** | 61.9–64.9% | 67.65% |
| Doreios | 2,481 | 204 | 1,315 | **62.0%** | 60.5–63.5% | 64.58% |
| Thaleia | 2,196 | 325 | 1,479 | **54.9%** | 53.4–56.4% | 58.96% |

These are heads-up results against one fixed opponent, with equal turns and the temples associated with each leader matchup. They do not establish general multiplayer strength or an intrinsic ranking of the leaders. Intervals quantify game-seed uncertainty, not uncertainty across training runs. The Nereon/Doreios intervals overlap; their point-estimate ordering should not be treated as established superiority.

## Models

- [Nereon champion](nereon/champion.zip): fresh Money imitation, then unrestricted RL; selected lineage 2,621,440 RL decisions.
- [Thaleia champion](thaleia/champion.zip): fresh Classic Engine imitation, then unrestricted RL; selected lineage 2,097,152 RL decisions.
- [Doreios champion](doreios/champion.zip): exact copy of the previously selected Doreios model; selected lineage 2,621,440 RL decisions. Its earlier campaign is documented in `../doreios-rl-v3/README.md`.

Each directory contains `champion.json` with provenance and a SHA-256 checksum. The three policies have different actor parameter hashes, verified in `summary.json`. Nereon and Thaleia were independently initialized random networks; neither used Doreios weights. These remain research checkpoints, not new selectable production UI bots.

Each policy uses a 128×128 tanh actor/critic, 171 public/player-known observation features, and 349 masked command slots. The model receives no hidden deck order, opponent hand, shuffle seed, or card-instance IDs. Masks enforce legality only. All gameplay decisions are learned, including action/treasure plays, buys, worship, selections, and ending turns.

## Choosing the imitation teachers

The existing Thaleia opening experiments favored unchanged Classic Engine: 307 wins/1,000 versus 305 for the Acolyte opening and 302 for passing at $1. Other 100-game opening variants also trailed their matched Classic baseline. The fresh 1,024-game Classic baseline won 309 games (30.2%).

Nereon's earlier experiments left Money and original Fleet v1 as the leading candidates. A fresh matched 1,024-game comparison gave Money 339 wins and 45 ties (33.1% wins; 35.3% share), versus Fleet's 316 wins and 71 ties (30.9% wins; 34.3% share). We chose Money by the preregistered wins-first criterion. The margin does not establish statistical superiority; `teacher-selection.json` includes the paired interval. Fleet v1 was restored as a research-only teacher from commit `3247fea1`, changing import paths only.

Both new models used 1,024 complete expert games plus two 256-game DAgger rounds, including losses. DAgger asks the teacher about learner-visited states without modifying teacher memory. Thaleia used 272,512 supervised decisions; Nereon used 132,920. Checkpoint selection prioritizes outright wins, then tie-adjusted share.

Money's expensive endgame search made synchronized teacher evaluation inefficient. Its first evaluation was restarted on exactly the same full seed schedule using independent whole-game workers, without inspecting or excluding outcomes. The independent evaluator matched the synchronous evaluator exactly on an eight-game parity check. Independent collection workers use separate fixed RNG seeds so scheduling cannot alter their trajectories. A unit test verifies reproducibility and label legality for both expert and mixed collection.

## Thaleia refinement

Imitation checkpoint screening improved from 82/512 wins (16.0%) to 128/512 (25.0%) after expert corrections. The latter checkpoint initialized unrestricted Maskable PPO: no imitation penalty, gamma/lambda 1, learning rate 0.0001, entropy coefficient 0.003, and 1,024-step rollouts per worker.

| Added RL decisions | Screening wins / 512 |
|---:|---:|
| 524,288 | 181 (35.4%) |
| 1,048,576 | 198 (38.7%) |
| 1,572,864 | 223 (43.6%) |
| 2,097,152 | 276 (53.9%) |

Independent confirmation gave 548/1,024 wins (53.5%; 95% CI 50.5–56.6%), versus 221 wins for its imitation checkpoint on those same seeds. The policy was then frozen before the final 4,000-game test.

## Nereon refinement

The selected Money imitation checkpoint won 169/512 screening games (33.0%). Initial unrestricted RL peaked at 237/512 wins (46.3%) after 1,048,576 decisions; continuing to 2,097,152 did not improve it.

Two independent continuations started from that peak. The exploration run raised entropy to 0.01 and softened initial logits by 0.7. The faster-update run raised the learning rate to 0.0003 while retaining entropy 0.003. Both reset their optimizer and used fresh training namespaces and learner RNG seeds. This is a successful adaptive search, not a controlled attribution of every gain solely to learning rate.

| Added continuation decisions | Exploration wins / 512 | Faster-update wins / 512 |
|---:|---:|---:|
| 524,288 | 226 (44.1%) | 292 (57.0%) |
| 1,048,576 | 228 (44.5%) | 293 (57.2%) |
| 1,572,864 | 296 (57.8%) | **310 (60.5%)** |
| 2,097,152 | 296 (57.8%) | 299 (58.4%) |

The first faster-update checkpoint won 599/1,024 fresh confirmation games (58.5%; CI 55.5–61.5%), establishing an incumbent. Before the remaining comparison, we required a positive paired 95% lower bound on outright-win improvement to replace it.

The best later screening checkpoint, faster-update at 1,572,864, then won 656/1,024 fresh matched games versus the incumbent's 625. Its +3.03 percentage-point advantage had a paired approximate 95% interval of +0.36 to +5.70 points. It was promoted, frozen, and passed the final 4,000-game test. All earlier checkpoints remain available.

The two new leader campaigns consumed **8,388,608 RL decisions across 96,032 completed training games**, plus 3,072 imitation/DAgger games. Nereon's three runs account for 6,291,456 decisions/81,479 games; Thaleia accounts for 2,097,152 decisions/14,553 games. Aggregate research compute differs from the selected checkpoint lineages above. The older Doreios campaign is additional prior work.

## Observed play

Separate 16-seed behavioral audits replay each chosen action sequence. They are illustrative, not universal rules or additional selection data.

- **Nereon:** roughly one Sea Trade, Harvest Feast, and Merchant Fleet purchase per game in the sample, plus Talents and victory cards. Compared with its early RL checkpoint on the same audit seeds, the selected policy removed 30 Hamlets instead of none, purchased far fewer Drachmas, and bought fewer Fleets/Feasts overall. It used Demeter 15 times and Poseidon six times. It finished with seven Drachmas across the sample despite purchasing only one, so automatic worship gains matter too.
- **Thaleia:** Hamlet thinning, Councils/Talents, selective draw support, and Acropolises. Athena gains included Sacred Academy, Merchant Fleet, and Harbor Pilot. The sample recorded 24 Demeter and 17 Athena worships.
- **Doreios:** a money-oriented policy with selective Council/draw support and Ares Hamlet upgrades. The sample recorded 18 Ares and four Demeter worships, 46 Hamlets trashed, and 59 Acropolis purchases.

The audit's `gains` field counts explicit gain-choice commands, not automatic gains; final owned-card counts include both. Aggregate purchase counts alone do not establish purchase timing.

## Validation and limits

All **12,000 final games replayed to identical complete game states**. Verification checks exact seed coverage, 2,000 games per starting seat, reward/outcome agreement, actual evaluated model hashes, distinct actor weights, and unchanged production game/bot source hashes. There are no excluded final games.

| Leader | First-seat wins | Second-seat wins |
|---|---:|---:|
| Nereon | 66.90% | 59.90% |
| Doreios | 66.25% | 57.80% |
| Thaleia | 58.25% | 51.55% |

Final games use `rl-leaders-v1-final:test:0..3999`. Demonstrations, DAgger, training, screening, confirmation, and audits use separate namespaces. Each model was frozen before its final results were inspected. Screening was reused for tuning and is not an unbiased performance estimate. The successful models meet the requested threshold; these runs do not claim that Nereon or Thaleia reached their ultimate learning ceiling.

Ten environment tests passed with 13,725 assertions, covering legal masks, hidden-information invariance, repeated-card selections, teacher-memory purity, and replay. The Money full-game test legitimately needs longer than the original five-second unit-test limit because it executes bounded endgame search; its timeout is 60 seconds, with no sleeps or skipped assertions. An eight-game Doreios parity check reproduces the old harness exactly. Independent collector tests and type checking also passed.

Equivalent card instances are mapped to a canonical copy for both models and teachers. This can change seeded trajectories compared with older native-bot studies that selected different equivalent IDs; comparisons within this harness are consistent. Earlier human or native-bot samples should not be treated as matched tests of these models.

## Reproduction

Use the project's Nix development shell and Python environment pinned by `scripts/rl/requirements.lock`. The run used an identical copy of the project's `flake.nix` and `flake.lock` under `/tmp/pantheon-nix-env` to avoid copying this large repository into the Nix store for each invocation. Python was 3.14, Torch CPU-only with one compute thread per learner, and eight simulation workers per run on a 16-logical-CPU Apple ARM machine.

- `scripts/rl/imitate_leader.py <config>` starts a new independently initialized model.
- `scripts/rl/continue_training.py <config>` resumes saved weights and writes staged checkpoints.
- `scripts/rl/evaluate_checkpoints.py <config>` evaluates a policy. Use an archived final config with a new output directory; existing completed results cannot be overwritten.
- `scripts/rl/evaluate_teacher.py <config>` evaluates expensive heuristic teachers without a per-step synchronization barrier.
- `scripts/rl/summarize_leaders.py balance-results/leader-rl-v1` verifies the final artifacts and regenerates the combined statistics.

Inference uses `AnchoredPPO.load(path, device="cpu")` and deterministic masked prediction. Pass the matching leader/teacher configuration to the bridge; inference itself does not call the teacher. `SHA256SUMS` covers the saved campaign artifacts. All work is on `experiment/doreios-rl-pilot`; no production bot defaults, game rules, UI, or deployment were changed.
