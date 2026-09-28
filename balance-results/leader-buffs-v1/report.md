# Thaleia against selected leader-specific counters

Rules: thaleia-draw → leader-buffs. Evaluation seeds are deliberately reused from the prior study. This is an exploratory same-seed comparison, not independent confirmation. Training and evaluation remain disjoint. Strategy selection uses training only.

Training selects the lowest Thaleia victory share among 13 counter configurations for each of her five frozen profiles, then selects her highest such minimum. Selection is separate for each rival and rule. Evaluation seeds never select strategies. Ties retain candidate order. This is a pure-strategy search within these bots, not optimal play or a mixed-strategy equilibrium.

Primary intervals bootstrap paired turn orders by seed block (20,000 resamples), with Bonferroni adjustment across six selected victory shares and three adapted-policy differences. Victory shares split tied wins. Failed games exclude the entire affected seed block. Diagnostic rows are descriptive.

| Rival | Rule | Thaleia strategy | Selected counter | Thaleia victory share | Adjusted interval | Complete blocks |
| --- | --- | --- | --- | ---: | --- | ---: |
| nereon | thaleia-draw | engine | treasure-0 | 64.8% | 58.3% to 70.9% | 200 |
| nereon | leader-buffs | race | engine-1 | 33.9% | 27.5% to 40.5% | 200 |
| melia | thaleia-draw | worship | engine-1 | 68.8% | 62.7% to 74.6% | 200 |
| melia | leader-buffs | race | engine-0 | 31.9% | 26.1% to 38.0% | 200 |
| doreios | thaleia-draw | race | treasure-0 | 66.5% | 60.4% to 72.8% | 200 |
| doreios | leader-buffs | race | treasure-0 | 66.5% | 60.4% to 72.8% | 200 |

## Change with both sides reselected

These differences include adaptation by both players; they do not isolate the card effect with fixed policies.

| Rival | Proposed − current | Adjusted interval | Complete blocks |
| --- | ---: | --- | ---: |
| nereon | -30.9 pp | -39.6 pp to -22.0 pp | 200 |
| melia | -36.9 pp | -44.8 pp to -29.1 pp | 200 |
| doreios | +0.0 pp | +0.0 pp to +0.0 pp | 200 |

## Every Thaleia family against its trained counter (descriptive)

| Rival | Rule | Thaleia strategy | Counter | Training share | Held-out share | Complete games |
| --- | --- | --- | --- | ---: | ---: | ---: |
| nereon | thaleia-draw | treasure | treasure-0 | 50.0% | 56.0% | 400 |
| nereon | thaleia-draw | engine (selected) | treasure-0 | 72.5% | 64.8% | 400 |
| nereon | thaleia-draw | thin | treasure-0 | 35.6% | 36.1% | 400 |
| nereon | thaleia-draw | worship | treasure-0 | 56.9% | 58.0% | 400 |
| nereon | thaleia-draw | race | treasure-0 | 68.8% | 75.6% | 400 |
| nereon | leader-buffs | treasure | engine-1 | 27.5% | 30.3% | 400 |
| nereon | leader-buffs | engine | engine-1 | 27.5% | 25.0% | 400 |
| nereon | leader-buffs | thin | engine-1 | 10.0% | 6.9% | 400 |
| nereon | leader-buffs | worship | engine-1 | 22.5% | 18.4% | 400 |
| nereon | leader-buffs | race (selected) | engine-1 | 35.6% | 33.9% | 400 |
| melia | thaleia-draw | treasure | treasure-0 | 50.0% | 50.0% | 400 |
| melia | thaleia-draw | engine | engine-1 | 52.5% | 64.5% | 400 |
| melia | thaleia-draw | thin | engine-1 | 33.1% | 40.5% | 400 |
| melia | thaleia-draw | worship (selected) | engine-1 | 72.5% | 68.8% | 400 |
| melia | thaleia-draw | race | engine-1 | 70.6% | 74.9% | 400 |
| melia | leader-buffs | treasure | engine-0 | 11.3% | 28.4% | 400 |
| melia | leader-buffs | engine | engine-1 | 17.5% | 24.3% | 400 |
| melia | leader-buffs | thin | engine-1 | 8.8% | 11.5% | 400 |
| melia | leader-buffs | worship | engine-1 | 21.3% | 22.6% | 400 |
| melia | leader-buffs | race (selected) | engine-0 | 25.6% | 31.9% | 400 |
| doreios | thaleia-draw | treasure | treasure-0 | 53.1% | 53.9% | 400 |
| doreios | thaleia-draw | engine | treasure-0 | 52.5% | 56.3% | 400 |
| doreios | thaleia-draw | thin | treasure-0 | 43.8% | 29.0% | 400 |
| doreios | thaleia-draw | worship | treasure-0 | 34.4% | 33.9% | 400 |
| doreios | thaleia-draw | race (selected) | treasure-0 | 59.4% | 66.5% | 400 |
| doreios | leader-buffs | treasure | treasure-0 | 53.1% | 53.9% | 400 |
| doreios | leader-buffs | engine | treasure-0 | 52.5% | 56.3% | 400 |
| doreios | leader-buffs | thin | treasure-0 | 43.8% | 29.0% | 400 |
| doreios | leader-buffs | worship | treasure-0 | 34.4% | 33.9% | 400 |
| doreios | leader-buffs | race (selected) | treasure-0 | 59.4% | 66.5% | 400 |
