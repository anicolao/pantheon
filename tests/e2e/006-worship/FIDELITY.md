# Worship fidelity review

Reference: [accepted Worship painting 08](../../../docs/ux/concepts/08-worship.png), with the [gain](../../../docs/ux/concepts/10-gain.png) and [offering](../../../docs/ux/concepts/09-card-choice.png) compositions for choices.

| View | Implemented altar |
| --- | --- |
| Desktop | [Athena Favored](screenshots/athena-rewards-two-matching-actions-with-a-five-cost-topdeck-gain/004-favored-desktop-darwin.png) |
| Phone | [Athena Favored](screenshots/athena-rewards-two-matching-actions-with-a-five-cost-topdeck-gain/004-favored-phone-darwin.png) |
| 4K | [Athena Favored](screenshots/athena-rewards-two-matching-actions-with-a-five-cost-topdeck-gain/004-favored-tabletop-4k-darwin.png) |
| Crowded phone altar | [Four shared gods, three Devotion, vertical coverflow](screenshots/four-shared-gods-and-three-devotion-remain-readable-in-the-vertical-coverflow/004-three-devotion-phone-darwin.png) |

The user's approved table iteration replaces the separate altar and paged choices from the original painting. The actual landscape worship card flies from the sidebar to the central table; its controls sit on the card. The supply remains above it and becomes the filtered offer when a choice is needed. Completion returns the card to its sidebar slot, then closes the phone drawer. The phone Athena screenshot and desktop four-god stack were inspected, including the Linux stack: the card retains both printed effects, the favor/Devotion line is readable, and the controls fit on its illustration side.

The original ornate frames, resource iconography, sculpted controls, and table artwork remain. Played cards stay in the public play area rather than being duplicated in a contributor carousel. Three- and four-god sidebars use the vertical coverflow; each tilted card remains present, and the available height determines its angle. The turn counters remain in their permanent rail, including the phone top bar.

The repeated-Poseidon story observes the actual return animation and both remote altar flashes, including an interrupted HTTP acknowledgement. A matching server-confirmed event completes the UI command promptly even if the SDK still retries that response. Public outcomes show the gained card and its discard/topdeck destination; private draws remain hidden from observers. Browsing an eligible market is part of the shared event stream and may add Chronicle entries before the chosen card is gained.

[All illustrated stories](README.md) contain inline desktop/phone captures and expandable 4K captures. The ordinary journey starts at a real gathering and draft. Later-turn branch scenarios are explicitly labeled recorded-history integration tests and use the same legal history on all three form factors. Backend tests cover costs, phases, Devotion 0/1/2/3, no leader contribution or trigger, no refunds, optional and empty-hand branches, restricted Action gains, combined costs, and retry/replay semantics.

Clipping and overlapping-control audits run before every capture on every form factor. Pixel comparisons use zero tolerance; readiness, assets, animations, layout, capture, and comparison share the existing 2,000 ms deadline. These captures are implementation evidence for review, not a claim of visual acceptance.
