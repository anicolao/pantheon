# Audit: does Engine prioritize two early Councils?

Not reliably. The rules implement +2 Actions, but the purchasing heuristic does not adapt its valuations to the rule variant. It prefers the first Council of Sages but can delay the second for redundant Action support or other purchases. The previous comparison did not test a policy deliberately prioritizing two early Councils.

## Code behavior

In `scripts/balance/strategy.ts`, Thaleia's Council utility is `9.5 - 2 * owned`: 9.5 for the first and 7.5 for the second. A first Seed Keeper scores 8. Harbor Pilot scores 9 when total terminal Actions exceed owned Pilots plus a hard-coded 1 for Thaleia. Owning one Council and one Seed Keeper satisfies that condition, even under +2 Actions. The bot then prefers a $3 Pilot to a second $4 Council while holding $4. Sacred Academy scores 10 initially and can displace Council when $5 is available.

These are heuristic utility scores, not prices. The public bot observation does not include the rule variant or leader trigger amount; the utility rules therefore do not adjust to the proposed extra Action. The three training presets do not search these card priorities or a Council-first opening. The bot does correctly prioritize playing Council first when Thaleia's trigger is unused, but that does not repair acquisition priorities.

## Audit of all 1,200 +2 Actions Engine evaluation games

Every game was rerun from its recorded seed, lineup and profiles; every complete result matched the archived result exactly. The generated events were then replayed to inspect Coins immediately before each purchase. Counts are descriptive and include correlated games sharing seed blocks.

| Interpretation | Eligible games | First two both Council | Proportion |
| --- | ---: | ---: | ---: |
| First two purchased cards that cost $4 | 945 | 793 | 83.9% |
| First two purchases made with exactly $4 available | 1,048 | 435 | 41.5% |
| First two purchases made with at least $4 available | 1,200 | 275 | 22.9% |

Eligibility requires at least two purchases meeting the row's condition. These are purchase decisions, not every turn on which the player could have reached $4: Worship may consume Coins before buying. The first interpretation excludes a $3 Harbor Pilot bought with $4, so it can conceal delays in buying the second Council.

Among games with two exactly-$4 purchase decisions, the most frequent sequence is Council → Harbor Pilot (449 games), followed by Council → Council (435 games). A recorded example, evaluation seed 1 against Nereon with Thaleia in turn position 1, buys Council on personal turn 2, Harbor Pilot with $4 on turn 4, and the second Council on turn 7.

This is principally an opening/prioritization problem, not universal failure to acquire Councils. Whole-game acquisition telemetry shows 1,188/1,200 games (99%) eventually acquire at least two Councils, counting purchases and gains. Counts by total Councils acquired are: 0: 1 game; 1: 11; 2: 854; 3: 305; 4: 27; 5: 2. Acquiring two eventually does not establish that the early draw engine was built efficiently.

## Consequence for the balance interpretation

The earlier low win shares and unused-Action totals describe this fixed heuristic. They do not establish that +2 Actions is weak when paired with a deliberately chosen Council-first strategy. In particular, the bot can spend money buying Action support that the rule already supplies, then end turns with unused Actions. A Council-first policy and rule-aware Action-support priorities need their own comparison before judging that strategic hypothesis. This audit changes no policy or rules and does not rerun strategy selection.

[council-audit.json](council-audit.json) contains counts, purchase-sequence patterns and the full example. Original results and provenance remain in [README.md](README.md).
