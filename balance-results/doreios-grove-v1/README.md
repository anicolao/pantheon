# Doreios Recruit–Grove v1

Experimental NDZUF-inspired policy; production Bot selection is unchanged.

100 identical seeds per policy, 50 starts per side, against unchanged MM v3/Melia.
This is a new Doreios seed schedule, not the earlier historical 100-game sample.
All 300 games replayed to identical final states; no exclusions. Policy frozen before evaluation.

| Policy | Wins | Ties | Losses | Tie-split share |
|---|---:|---:|---:|---:|
| Recruit–Grove | 19 | 10 | 71 | 24% |
| Money | 26 | 7 | 67 | 29.5% |
| Classic Engine | 31 | 6 | 63 | 34% |

Paired approximate 95% intervals for share differences:
- Grove minus Money: -5.5 percentage points [-15.1, +4.1].
- Grove minus Classic: -10 points [-20.1, +0.1].

The policy gains Harvest Feasts without a count cap. Action support can take priority;
one Council is eligible after three Feasts if supported. In the late game, point gains
take priority. It buys the first Grove, up to two Talents, repeat Academies, one Recruit,
and Pilot support. Hamlet-first free thinning preserves the current purchase threshold.
Selective Ares worship upgrades early junk or produces more immediate points than buying alone.
Endgame checks reject endings already behind on visible scores; they do not predict
hidden opponent final hands or guarantee a win after an equal-turn reply.

Seven focused tests passed; Svelte check reported zero errors/warnings.
Raw per-game archives are ignored; grove-replays.json.gz retains all three policies.
Protocol, source hashes, seed schedule, telemetry and confidence intervals accompany this report.
