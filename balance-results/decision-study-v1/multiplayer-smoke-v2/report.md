# Paired balance evidence

Stage: discovery. Positive differences favor baseline access. Each pair uses the same setup seed, lineup and seats. Profiles are frozen across arms. One declared restriction changes. Effects measure reliance of these frozen policies, not intrinsic card/event strength or an optimized rule change.

Primary comparison family: 6 player-count × restriction cells, declared before play. Intervals bootstrap whole seed blocks (20,000 resamples); adjusted intervals use Bonferroni alpha = 0.05 / 6. These are approximate bootstrap intervals. Seed blocks with either arm failing are excluded as a whole from that cell; any such exclusion blocks a positive evidence classification. Low exposure (<10%) and fewer than 20 blocks remain inconclusive. No equivalence claim is made.

| Players | Restriction | Blocks | Pairs | Excluded blocks | Baseline exposure | Baseline − restricted | 95% interval | Family-adjusted interval | Assessment |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |
| 3 | leader-trigger:doreios:focal | 1 | 72 | 0 | 100.0% | 0.0 pp | insufficient blocks | insufficient blocks | inconclusive |
| 3 | event:counsel-of-olympus:focal | 1 | 216 | 0 | 98.1% | 5.3 pp | insufficient blocks | insufficient blocks | inconclusive |
| 3 | card:sacred-academy:focal | 1 | 288 | 0 | 100.0% | 9.4 pp | insufficient blocks | insufficient blocks | inconclusive |
| 4 | leader-trigger:doreios:focal | 1 | 96 | 0 | 100.0% | 0.3 pp | insufficient blocks | insufficient blocks | inconclusive |
| 4 | event:counsel-of-olympus:focal | 1 | 384 | 0 | 100.0% | 7.7 pp | insufficient blocks | insufficient blocks | inconclusive |
| 4 | card:sacred-academy:focal | 1 | 384 | 0 | 100.0% | 13.4 pp | insufficient blocks | insufficient blocks | inconclusive |

## Policy robustness (descriptive)

These subgroup means are diagnostics, not additional confirmatory claims. They help identify effects that depend on one bot family or opponent; no rule recommendation is automatic.

| Players | Restriction | Focal policy | Opponent policy | Complete pairs | Baseline − restricted |
| --- | --- | --- | --- | ---: | ---: |
| 3 | event:counsel-of-olympus:focal | engine | engine | 54 | 4.6 pp |
| 3 | card:sacred-academy:focal | engine | engine | 72 | 7.6 pp |
| 3 | event:counsel-of-olympus:focal | engine | worship | 54 | 3.7 pp |
| 3 | card:sacred-academy:focal | engine | worship | 72 | 0.7 pp |
| 3 | event:counsel-of-olympus:focal | worship | engine | 54 | 8.3 pp |
| 3 | card:sacred-academy:focal | worship | engine | 72 | 13.9 pp |
| 3 | event:counsel-of-olympus:focal | worship | worship | 54 | 4.6 pp |
| 3 | card:sacred-academy:focal | worship | worship | 72 | 15.3 pp |
| 3 | leader-trigger:doreios:focal | engine | engine | 18 | 0.0 pp |
| 3 | leader-trigger:doreios:focal | engine | worship | 18 | -5.6 pp |
| 3 | leader-trigger:doreios:focal | worship | engine | 18 | 0.0 pp |
| 3 | leader-trigger:doreios:focal | worship | worship | 18 | 5.6 pp |
| 4 | event:counsel-of-olympus:focal | engine | engine | 96 | 2.1 pp |
| 4 | card:sacred-academy:focal | engine | engine | 96 | 16.7 pp |
| 4 | leader-trigger:doreios:focal | engine | engine | 24 | 0.0 pp |
| 4 | event:counsel-of-olympus:focal | engine | worship | 96 | 5.7 pp |
| 4 | card:sacred-academy:focal | engine | worship | 96 | 14.1 pp |
| 4 | leader-trigger:doreios:focal | engine | worship | 24 | 4.2 pp |
| 4 | event:counsel-of-olympus:focal | worship | engine | 96 | 9.4 pp |
| 4 | card:sacred-academy:focal | worship | engine | 96 | 9.4 pp |
| 4 | leader-trigger:doreios:focal | worship | engine | 24 | 0.0 pp |
| 4 | event:counsel-of-olympus:focal | worship | worship | 96 | 13.5 pp |
| 4 | card:sacred-academy:focal | worship | worship | 96 | 13.5 pp |
| 4 | leader-trigger:doreios:focal | worship | worship | 24 | -2.8 pp |

Before changing rules: examine the mixed-policy league and replay mechanisms, retune restricted strategies with equal budgets, test targeted counterplay, and conduct human playtests. A supported effect here is conditional evidence, not a confirmed balance defect.
