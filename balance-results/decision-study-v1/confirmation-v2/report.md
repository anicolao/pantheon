# Paired balance evidence

Stage: confirmation. Positive differences favor baseline access. Each pair uses the same setup seed, lineup and seats. Profiles are frozen across arms. One declared restriction changes. Effects measure reliance of these frozen policies, not intrinsic card/event strength or an optimized rule change.

Primary comparison family: 3 player-count × restriction cells, declared before play. Intervals bootstrap whole seed blocks (20,000 resamples); adjusted intervals use Bonferroni alpha = 0.05 / 3. These are approximate bootstrap intervals. Seed blocks with either arm failing are excluded as a whole from that cell; any such exclusion blocks a positive evidence classification. Low exposure (<10%) and fewer than 200 blocks remain inconclusive. No equivalence claim is made.

| Players | Restriction | Blocks | Pairs | Excluded blocks | Baseline exposure | Baseline − restricted | 95% interval | Family-adjusted interval | Assessment |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |
| 2 | leader-trigger:doreios:focal | 200 | 10800 | 0 | 100.0% | 16.6 pp | 15.3 pp to 17.9 pp | 15.0 pp to 18.2 pp | supported policy-dependent benefit |
| 2 | event:counsel-of-olympus:focal | 200 | 21600 | 0 | 64.4% | -1.7 pp | -2.3 pp to -1.0 pp | -2.4 pp to -0.9 pp | inconclusive |
| 2 | card:sacred-academy:focal | 200 | 43200 | 0 | 65.5% | 5.0 pp | 4.6 pp to 5.4 pp | 4.5 pp to 5.5 pp | inconclusive |

## Policy robustness (descriptive)

These subgroup means are diagnostics, not additional confirmatory claims. They help identify effects that depend on one bot family or opponent; no rule recommendation is automatic.

| Players | Restriction | Focal policy | Opponent policy | Complete pairs | Baseline − restricted |
| --- | --- | --- | --- | ---: | ---: |
| 2 | event:counsel-of-olympus:focal | treasure | treasure | 2400 | 0.0 pp |
| 2 | card:sacred-academy:focal | treasure | treasure | 4800 | 0.0 pp |
| 2 | event:counsel-of-olympus:focal | treasure | engine | 2400 | 0.0 pp |
| 2 | card:sacred-academy:focal | treasure | engine | 4800 | 0.0 pp |
| 2 | event:counsel-of-olympus:focal | treasure | worship | 2400 | 0.0 pp |
| 2 | card:sacred-academy:focal | treasure | worship | 4800 | 0.0 pp |
| 2 | event:counsel-of-olympus:focal | engine | treasure | 2400 | -1.4 pp |
| 2 | card:sacred-academy:focal | engine | treasure | 4800 | 3.1 pp |
| 2 | event:counsel-of-olympus:focal | engine | engine | 2400 | -6.4 pp |
| 2 | card:sacred-academy:focal | engine | engine | 4800 | 2.9 pp |
| 2 | event:counsel-of-olympus:focal | engine | worship | 2400 | -8.1 pp |
| 2 | card:sacred-academy:focal | engine | worship | 4800 | 3.7 pp |
| 2 | event:counsel-of-olympus:focal | worship | treasure | 2400 | 1.9 pp |
| 2 | card:sacred-academy:focal | worship | treasure | 4800 | 9.0 pp |
| 2 | event:counsel-of-olympus:focal | worship | engine | 2400 | 0.3 pp |
| 2 | card:sacred-academy:focal | worship | engine | 4800 | 11.0 pp |
| 2 | event:counsel-of-olympus:focal | worship | worship | 2400 | -1.3 pp |
| 2 | card:sacred-academy:focal | worship | worship | 4800 | 15.3 pp |
| 2 | leader-trigger:doreios:focal | treasure | treasure | 1200 | 26.5 pp |
| 2 | leader-trigger:doreios:focal | treasure | engine | 1200 | 36.6 pp |
| 2 | leader-trigger:doreios:focal | treasure | worship | 1200 | 32.9 pp |
| 2 | leader-trigger:doreios:focal | engine | treasure | 1200 | 7.0 pp |
| 2 | leader-trigger:doreios:focal | engine | engine | 1200 | 5.8 pp |
| 2 | leader-trigger:doreios:focal | engine | worship | 1200 | 9.6 pp |
| 2 | leader-trigger:doreios:focal | worship | treasure | 1200 | 8.4 pp |
| 2 | leader-trigger:doreios:focal | worship | engine | 1200 | 7.7 pp |
| 2 | leader-trigger:doreios:focal | worship | worship | 1200 | 15.1 pp |

Before changing rules: examine the mixed-policy league and replay mechanisms, retune restricted strategies with equal budgets, test targeted counterplay, and conduct human playtests. A supported effect here is conditional evidence, not a confirmed balance defect.
