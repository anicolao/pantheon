# Paired balance evidence

Stage: discovery. Positive differences favor baseline access. Each pair uses the same setup seed, lineup and seats. Profiles are frozen across arms. One declared restriction changes. Effects measure reliance of these frozen policies, not intrinsic card/event strength or an optimized rule change.

Primary comparison family: 3 player-count × restriction cells, declared before play. Intervals bootstrap whole seed blocks (20,000 resamples); adjusted intervals use Bonferroni alpha = 0.05 / 3. These are approximate bootstrap intervals. Seed blocks with either arm failing are excluded as a whole from that cell; any such exclusion blocks a positive evidence classification. Low exposure (<10%) and fewer than 20 blocks remain inconclusive. No equivalence claim is made.

| Players | Restriction | Blocks | Pairs | Excluded blocks | Baseline exposure | Baseline − restricted | 95% interval | Family-adjusted interval | Assessment |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |
| 2 | leader-trigger:doreios:focal | 20 | 1080 | 0 | 100.0% | 16.1 pp | 13.1 pp to 19.5 pp | 12.5 pp to 20.5 pp | discovery signal |
| 2 | event:counsel-of-olympus:focal | 20 | 2160 | 0 | 64.4% | -1.0 pp | -3.2 pp to 1.1 pp | -3.7 pp to 1.5 pp | inconclusive |
| 2 | card:sacred-academy:focal | 20 | 4320 | 0 | 65.3% | 4.1 pp | 3.0 pp to 5.3 pp | 2.7 pp to 5.6 pp | inconclusive |

## Policy robustness (descriptive)

These subgroup means are diagnostics, not additional confirmatory claims. They help identify effects that depend on one bot family or opponent; no rule recommendation is automatic.

| Players | Restriction | Focal policy | Opponent policy | Complete pairs | Baseline − restricted |
| --- | --- | --- | --- | ---: | ---: |
| 2 | event:counsel-of-olympus:focal | treasure | treasure | 240 | 0.0 pp |
| 2 | card:sacred-academy:focal | treasure | treasure | 480 | 0.0 pp |
| 2 | event:counsel-of-olympus:focal | treasure | engine | 240 | 0.0 pp |
| 2 | card:sacred-academy:focal | treasure | engine | 480 | 0.0 pp |
| 2 | event:counsel-of-olympus:focal | treasure | worship | 240 | 0.0 pp |
| 2 | card:sacred-academy:focal | treasure | worship | 480 | 0.0 pp |
| 2 | event:counsel-of-olympus:focal | engine | treasure | 240 | -3.8 pp |
| 2 | card:sacred-academy:focal | engine | treasure | 480 | 2.1 pp |
| 2 | event:counsel-of-olympus:focal | engine | engine | 240 | -3.8 pp |
| 2 | card:sacred-academy:focal | engine | engine | 480 | 0.7 pp |
| 2 | event:counsel-of-olympus:focal | engine | worship | 240 | -4.6 pp |
| 2 | card:sacred-academy:focal | engine | worship | 480 | 4.7 pp |
| 2 | event:counsel-of-olympus:focal | worship | treasure | 240 | 3.3 pp |
| 2 | card:sacred-academy:focal | worship | treasure | 480 | 9.4 pp |
| 2 | event:counsel-of-olympus:focal | worship | engine | 240 | -1.3 pp |
| 2 | card:sacred-academy:focal | worship | engine | 480 | 6.8 pp |
| 2 | event:counsel-of-olympus:focal | worship | worship | 240 | 0.6 pp |
| 2 | card:sacred-academy:focal | worship | worship | 480 | 13.6 pp |
| 2 | leader-trigger:doreios:focal | treasure | treasure | 120 | 22.5 pp |
| 2 | leader-trigger:doreios:focal | treasure | engine | 120 | 33.3 pp |
| 2 | leader-trigger:doreios:focal | treasure | worship | 120 | 34.6 pp |
| 2 | leader-trigger:doreios:focal | engine | treasure | 120 | 8.3 pp |
| 2 | leader-trigger:doreios:focal | engine | engine | 120 | 7.5 pp |
| 2 | leader-trigger:doreios:focal | engine | worship | 120 | 12.1 pp |
| 2 | leader-trigger:doreios:focal | worship | treasure | 120 | 10.0 pp |
| 2 | leader-trigger:doreios:focal | worship | engine | 120 | 7.9 pp |
| 2 | leader-trigger:doreios:focal | worship | worship | 120 | 8.3 pp |

Before changing rules: examine the mixed-policy league and replay mechanisms, retune restricted strategies with equal budgets, test targeted counterplay, and conduct human playtests. A supported effect here is conditional evidence, not a confirmed balance defect.
