# Thaleia against selected leader-specific counters

Training selects the lowest Thaleia victory share among 13 counter configurations for each of her five frozen profiles, then selects her highest such minimum. Selection is separate for each rival and rule. Fresh evaluation seeds never select strategies. Ties retain candidate order. This is a pure-strategy search within these bots, not optimal play or a mixed-strategy equilibrium.

Primary intervals bootstrap paired turn orders by seed block (20,000 resamples), with Bonferroni adjustment across six selected victory shares and three adapted-policy differences. Victory shares split tied wins. Failed games exclude the entire affected seed block. Diagnostic rows are descriptive.

| Rival | Rule | Thaleia strategy | Selected counter | Thaleia victory share | Adjusted interval | Complete blocks |
| --- | --- | --- | --- | ---: | --- | ---: |
| nereon | standard | engine | treasure-0 | 38.5% | 32.1% to 45.1% | 200 |
| nereon | thaleia-draw | engine | treasure-0 | 64.8% | 58.3% to 70.9% | 200 |
| melia | standard | engine | engine-1 | 37.8% | 31.5% to 44.4% | 200 |
| melia | thaleia-draw | worship | engine-1 | 68.8% | 62.7% to 74.6% | 200 |
| doreios | standard | engine | treasure-0 | 28.7% | 23.0% to 34.8% | 200 |
| doreios | thaleia-draw | race | treasure-0 | 66.5% | 60.4% to 72.8% | 200 |

## Change with both sides reselected

These differences include adaptation by both players; they do not isolate the card effect with fixed policies.

| Rival | Proposed − current | Adjusted interval | Complete blocks |
| --- | ---: | --- | ---: |
| nereon | +26.3 pp | +19.9 pp to +32.9 pp | 200 |
| melia | +31.0 pp | +23.9 pp to +38.1 pp | 200 |
| doreios | +37.8 pp | +30.8 pp to +44.9 pp | 200 |

## Every Thaleia family against its trained counter (descriptive)

| Rival | Rule | Thaleia strategy | Counter | Training share | Held-out share | Complete games |
| --- | --- | --- | --- | ---: | ---: | ---: |
| nereon | standard | treasure | treasure-0 | 21.3% | 25.6% | 400 |
| nereon | standard | engine (selected) | treasure-0 | 34.4% | 38.5% | 400 |
| nereon | standard | thin | treasure-0 | 5.6% | 14.4% | 400 |
| nereon | standard | worship | treasure-0 | 22.5% | 25.8% | 400 |
| nereon | standard | race | treasure-0 | 25.6% | 33.6% | 400 |
| nereon | thaleia-draw | treasure | treasure-0 | 50.0% | 56.0% | 400 |
| nereon | thaleia-draw | engine (selected) | treasure-0 | 72.5% | 64.8% | 400 |
| nereon | thaleia-draw | thin | treasure-0 | 35.6% | 36.1% | 400 |
| nereon | thaleia-draw | worship | treasure-0 | 56.9% | 58.0% | 400 |
| nereon | thaleia-draw | race | treasure-0 | 68.8% | 75.6% | 400 |
| melia | standard | treasure | engine-0 | 19.4% | 21.1% | 400 |
| melia | standard | engine (selected) | engine-1 | 33.1% | 37.8% | 400 |
| melia | standard | thin | treasure-0 | 7.5% | 13.4% | 400 |
| melia | standard | worship | engine-1 | 30.6% | 30.1% | 400 |
| melia | standard | race | engine-0 | 31.3% | 28.4% | 400 |
| melia | thaleia-draw | treasure | treasure-0 | 50.0% | 50.0% | 400 |
| melia | thaleia-draw | engine | engine-1 | 52.5% | 64.5% | 400 |
| melia | thaleia-draw | thin | engine-1 | 33.1% | 40.5% | 400 |
| melia | thaleia-draw | worship (selected) | engine-1 | 72.5% | 68.8% | 400 |
| melia | thaleia-draw | race | engine-1 | 70.6% | 74.9% | 400 |
| doreios | standard | treasure | treasure-0 | 19.4% | 20.3% | 400 |
| doreios | standard | engine (selected) | treasure-0 | 31.9% | 28.7% | 400 |
| doreios | standard | thin | treasure-0 | 8.1% | 10.6% | 400 |
| doreios | standard | worship | treasure-0 | 7.5% | 11.1% | 400 |
| doreios | standard | race | treasure-0 | 27.5% | 25.8% | 400 |
| doreios | thaleia-draw | treasure | treasure-0 | 53.1% | 53.9% | 400 |
| doreios | thaleia-draw | engine | treasure-0 | 52.5% | 56.3% | 400 |
| doreios | thaleia-draw | thin | treasure-0 | 43.8% | 29.0% | 400 |
| doreios | thaleia-draw | worship | treasure-0 | 34.4% | 33.9% | 400 |
| doreios | thaleia-draw | race (selected) | treasure-0 | 59.4% | 66.5% | 400 |
