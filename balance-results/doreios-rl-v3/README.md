# Doreios RL iteration 3: practical plateau

The selected Doreios policy scores 64.3% against fixed MM v3/Melia on 2,000 untouched, matched games, compared with 30.0% for Classic Engine and 27.6% for the previous RL model. Share counts a tie as half a win. Every final game was replay-verified; both starting seats have 1,000 games per policy.

| Policy | Wins | Ties | Losses | Share | Approximate 95% share CI |
|---|---:|---:|---:|---:|---:|
| Saved champion | 1,228 | 116 | 656 | 64.3% | 62.27–66.33% |
| Classic Engine | 544 | 112 | 1,344 | 30.0% | 28.06–31.94% |
| Previous RL | 488 | 128 | 1,384 | 27.6% | 25.72–29.48% |

Champion minus Classic: +34.3 percentage points, paired approximate 95% CI +31.91 to +36.69. Champion minus previous RL: +36.7 points, CI +34.33 to +39.07. Champion share by starting seat is 69.65% first and 58.95% second. Raw `winCI95` in evaluator results concerns outright wins, not tie-adjusted share; the latter intervals are in `verification.json`.

## What improved

Eleven training runs completed 12,582,912 decisions and 99,386 games, saving intermediate model ZIPs, configurations, source hashes, progress, and per-game evaluation rows. The selected lineage contains 2,621,440 RL decisions including its v2 ancestor; aggregate experiment compute should not be confused with that lineage.

The breakthrough combined full-episode advantage credit (GAE lambda 1), a larger rollout, and removal of the imitation KL penalty. Four initial 524,288-step trials scored 33.59% (relaxed anchor), 31.35% (long credit with weak anchor), 50.88% (long credit without anchor), and 32.23% (long credit with strong anchor) on screening. These trials change several settings together, so they do not isolate one cause. Independent 1,024-game confirmation put the unrestricted policy at 46.58%, versus Classic at 27.93%.

Two independently seeded 2,097,152-step continuations improved further. Their screening peaks were 66.70% and 63.48%; both declined afterward. The earlier peak from continuation A, `extend-free-a/checkpoint-1572864.zip`, became the incumbent. Separate confirmation of continuation B's peak scored 61.52%, versus Classic at 28.52%.

A 16-seed behavioral audit suggests the incumbent learned mostly money: Hamlet removal, selective Ares upgrades to Drachmas, Talents, roughly one Council of Sages, selective draw, then Acropolis purchases. Relative to the earlier unrestricted policy, the same audit showed fewer Drachma and Polis purchases, more Acropolises, and more Ares upgrades. It did not trash Obols in this sample. These are observations, not hard-coded rules or universal claims.

## Why stop here

Five directions continued from the incumbent: lower learning rate, broader exploration (higher entropy and softened initial logits), score-potential shaping, twice as much ordinary continuation, and lower-entropy shorter-credit fine-tuning. Together they consumed another 6,291,456 decisions. Potential shaping preserves the exact episodic terminal reward and is disabled during evaluation.

Each direction's best screening checkpoint faced the incumbent on 1,024 new matched seeds. The promotion rule, written before outcomes, required a positive lower endpoint of a paired approximate 99% interval (five comparisons, Bonferroni-style threshold).

| Direction | Confirmation share difference | Paired 99% CI, percentage points |
|---|---:|---:|
| Lower learning rate | −0.29 pp | −3.18 to +2.60 |
| Broader exploration | +2.00 pp | −2.07 to +6.07 |
| Potential shaping | −0.68 pp | −3.92 to +2.55 |
| Longer continuation | +0.15 pp | −2.91 to +3.20 |
| Greedy fine-tuning | −0.24 pp | −3.35 to +2.86 |

None qualified. Because exploration still suggested a possible gain, it received an additional 8,000 entirely fresh matched games against the incumbent. Its advantage shrank to +0.78 points, paired 99% CI −0.65 to +2.21. It again failed the predeclared promotion rule. We retain the incumbent and all challenger checkpoints.

This is a practical plateau for the tested architecture, optimizer family, observation/action representation, and fixed opponent, not proof of optimality. Small improvements remain possible. A larger next research step would change the representation, learning algorithm, or opponent curriculum, with another untouched evaluation set.

## Integrity and reproduction

Training, screening, confirmation, behavioral audits, enlarged confirmation, and final testing use distinct seed namespaces. The final benchmark used `rl-doreios-v3-final:test:0..1999`; its outcomes were not inspected until the independent enlarged confirmation completed. No final result guided training or checkpoint selection. Screening was reused for tuning and is not an unbiased strength estimate. Confidence intervals quantify game-seed uncertainty, not training-run uncertainty or strength against other opponents/leaders/player counts.

All gameplay uses the production reducer and unchanged MM. The 171-feature observation excludes hidden deck order, opponent hands, shuffle seeds, and instance IDs. All 349 actions are subject only to legality masks. Equivalent instances map to the first matching copy; Classic is evaluated through the same interface. That canonicalization can change exact seeded trajectories versus a native bot's instance-ID choices, so earlier native-bot experiments are not directly interchangeable.

Seven environment tests passed with 9,630 assertions, including legal-mask execution, full replay, hidden-information invariance, and expert-label memory purity. Two anchor/exploration tests and the potential-reward test passed. Type checking reported zero errors or warnings. Archived logs include Python subprocess resource warnings in the potential test; assertions passed. Final verification checked 6,000 replay flags, exact seed coverage, balanced seats, and reward/outcome agreement. The 16,000 enlarged-confirmation rows also have exact seed coverage and balanced seats.

Use the project's Nix environment and the pinned dependencies in `scripts/rl/requirements.lock`. Evaluation is reproducible with `scripts/rl/evaluate_checkpoints.py` and the saved config, choosing a new output directory because existing results are protected against overwriting. `scripts/rl/continue_training.py` resumes from saved ZIPs using a config. Inference uses deterministic masked `AnchoredPPO` prediction and requires no teacher.

`champion.json` identifies the model, source checkpoint, runtime lock, and protocols. `champion.zip` is an exact copy of the selected checkpoint. `SHA256SUMS` covers the campaign artifacts. No production bot or UI was changed; this research is committed locally on `experiment/doreios-rl-pilot`.
