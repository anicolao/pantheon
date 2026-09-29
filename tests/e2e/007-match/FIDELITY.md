# Turn completion and victory fidelity review

References: [decision 21](../../../docs/ux/concepts/21-end-turn.png), [handoff 12](../../../docs/ux/concepts/12-opponent.png), and [victory 14](../../../docs/ux/concepts/14-victory.png).

| View | Actual implementation |
| --- | --- |
| Desktop victory | [Two empires and Territory arithmetic](screenshots/2-empires-finish-at-the-last-acropolis/001-results-desktop-darwin.png) |
| Phone victory | [Stacked portraits and reachable controls](screenshots/2-empires-finish-at-the-last-acropolis/001-results-phone-darwin.png) |
| Four-player phone | [Every empire visible](screenshots/4-empires-finish-with-shared-victory/004-results-phone-darwin.png) |
| Four-player 4K | [Shared victory](screenshots/4-empires-finish-with-shared-victory/004-results-tabletop-4k-darwin.png) |
| Phone decision | [Keep playing Treasures](../005-economy/screenshots/retain-treasures-deliberately-and-spend-multiple-buys-including-a-zero-cost-card/000-leave-treasures-phone-darwin.png) |

The victory scene retains the painting’s moonlit temple, warm gold light, framed leader portraits, prominent scores, and Territory breakdown. Separate generated landscape and portrait environments support the live composition. Gold laurel frames expose approved catalog character art through transparent windows; player names and victory-point icons remain live. Selecting an empire changes its actual Territory arithmetic, and selecting a Territory opens its complete card.

Two portraits stack on a phone; three or four use a compact two-column arrangement. Desktop and 4K place them in one row. Every player stays visible without scrolling. The implementation retains full approved Territory frames instead of the painting’s cropped illustrations, includes explicit turn counts for the tie rule, and shows the exact ending condition. The restrained blue score panel is a live layout with a gold border. Play again and View chronicle use the shared sculpted controls. Return to table makes the completed board available without allowing further play.

The decision seal uses generated dark marble and laurel decoration over the visible table. Its remaining-option reminder, resource icons, and Keep playing/advance controls are live. Phone controls stack to preserve touch targets. The table remains clear beneath a dark overlay. A Worship-only reminder is shown when ending would forfeit an affordable invocation, even after the last Buy; advancing from Actions does not forfeit Worship and does not warn about it.

Handoff uses the existing named active-turn marker and private hand composition. Cleanup moves the active player’s hand/play cards to discard, draws once, and resets the next player’s counters. Final cleanup clears resources and opens the victory scene with a finite 450 ms arrival; reduced motion removes that arrival. Step 8 now supplies ordered movement choreography and a shared public tray. The finished Chronicle presents one command at a time, with paged effects, so its first and last entries fit the same audited viewport. See the [public-table fidelity review](../008-public-table/FIDELITY.md) for the updated tray captures.

The [illustrated stories](README.md) cover normal and interrupted cleanup, no early ending at zero Buys, both endings, fewer-turn/shared ties, persistent results, card inspection with restored focus, both ends of the Chronicle, and a distinct new gathering that leaves the old match intact. Complete authenticated games supplement these UI journeys; recorded final-turn histories are labeled explicitly.

Every capture audits clipped components, text, and overlapping controls at phone, desktop, and 4K sizes. Readiness, settled animations, layout, capture, and exact comparison share the unchanged 2,000 ms budget. These images are evidence for visual review, not a claim of acceptance.
