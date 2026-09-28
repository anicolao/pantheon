# Thin v3 behavior diagnostic

Thin now evaluates removal and replacement by their effect on future spending reliability, retained VP and current-turn income. It considers joint trash subsets, preserves the last useful trasher, allows removal of exhausted tools, scores acquisitions by remaining work, and prioritizes useful thinning during play. The full model, constants and limitations are in [the design reference](https://github.com/anicolao/pantheon/blob/97a8db9/BOT_STRATEGIES.md#thin-strategy-version-3).

This is a small execution/behavior diagnostic, not a retrained balance comparison. It uses preset 0 in both versions, three new seed blocks, all 12 ordered heads-up leader lineups, both focal positions, Treasure and Engine opponents, and standard/+2A rules. Both rules are pooled below. Each version/opponent row contains 144 games; there are 576 games total. Only three distinct seeds are used, so the many lineup rotations are not independent evidence. No confidence or significance claim is made.

| Opponent | Thin victory share, old → new | Mean cards trashed, old → new | Mean final deck size, old → new |
| --- | ---: | ---: | ---: |
| Treasure | 15.3% → 26.4% | 11.18 → 8.85 | 25.2 → 31.3 |
| Engine | 12.8% → 14.9% | 10.47 → 8.13 | 24.2 → 29.1 |

Thinning is not the same as maximizing trash count or minimizing deck size. The new policy removes fewer cards and retains more income. Seed Keeper acquisitions fall from 499 to 282 against Treasure and from 454 to 249 against Engine (totals over 144 games each). The new policy also removes spent Forge/Seed Keeper copies and other obsolete Actions. Gains in this small sample do not establish general strength; Thin still loses most matchups, and its remaining ordinary purchase preferences and shared Worship scheduler remain heuristic.

The income model approximates Action reach and payload, the pile-pressure horizon is not a learned forecast, and future purchases/upgrades are not searched. Trashing-tool work estimates can overestimate jointly removable future cards even though actual hand removals are checked jointly. VP is an explicit cost, not an unconditional ban on trashing scoring cards. These assumptions are documented for further design review; no leader buff/nerf recommendation is based on this diagnostic.

Validation: all 576 games completed without failures; 54 simulation tests passed (7,365 assertions), including 11 Thin behavioral tests. Strict TypeScript checks passed, and application checks reported zero errors/warnings. Forty-eight first-block games without Thin from the Engine v2 archive reproduced their complete results exactly. There were no production-rule or UI changes, so backend/browser tests were not rerun for this change. All commands ran inside Nix.

[Diagnostic metadata and aggregates](diagnostic.json) and [all compressed results](games.jsonl.gz) record both versions. Current source: `97a8db96518daa0f1e1e1b9903a9ff95398624b0`; previous source: `96285c268f7b685b1c271fe99b43f95a4703871c`. Both use the same unchanged Engine v2 and other opposing policy implementations. Each result preserves seed, block, lineup, focal position, variant, profiles and metrics; rerun with `runExperiment` at the corresponding source commit to reproduce it. The namespace is `thin-design-v1:diagnostic:0..2`, disjoint from the earlier balance studies. No parameters were selected from these outcomes.

A fresh balance study must retrain profiles and counter selections under strategy version 3. Earlier archived comparisons remain results of their recorded source versions.
