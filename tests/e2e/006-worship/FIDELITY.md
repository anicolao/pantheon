# Worship fidelity review

Reference: [accepted Worship painting 08](../../../docs/ux/concepts/08-worship.png), with the [gain](../../../docs/ux/concepts/10-gain.png) and [offering](../../../docs/ux/concepts/09-card-choice.png) compositions for choices.

| View | Implemented altar |
| --- | --- |
| Desktop | [Athena Favored](screenshots/athena-rewards-two-matching-actions-with-a-five-cost-topdeck-gain/004-favored-desktop-darwin.png) |
| Phone | [Athena Favored](screenshots/athena-rewards-two-matching-actions-with-a-five-cost-topdeck-gain/004-favored-phone-darwin.png) |
| 4K | [Athena Favored](screenshots/athena-rewards-two-matching-actions-with-a-five-cost-topdeck-gain/004-favored-tabletop-4k-darwin.png) |
| Crowded phone altar | [Four shared gods, three Devotion, contributor paging](screenshots/four-shared-gods-and-three-devotion-remain-readable-with-paged-contributing-cards/004-three-devotion-phone-darwin.png) |

The central event floats over the blue-draped altar, with matching Actions below it, other shared gods at the edge, and a sculpted resource rail and committing control near the bottom. The separate portrait environment recomposes the columns, night skyline, altar, and foreground for a phone. Actual catalog frames, rule icons, counters, and controls are used throughout. Live blue threads connect the contributing card group to the event; two lit pips and the exact Devotion count identify favor independently of color.

Compared with the painting, the approved event cards retain their full landscape frame and both printed effects. A short live line names only the active effect. The UI also shows the full Worship payment beside the committing control; the Coin cost remains on the real event card. The common environment is shared by all four gods. The selected event and the actual contributing Actions determine the god and Devotion, rather than the surrounding statue decoration.

For a large play area, two contributing cards appear at once with explicit previous/next controls and an exact total. On a phone, three alternative gods form a compact row. This replaces shrinking all contributors and controls to fit. Inspection enlarges any event or contributor without paying; Escape/Return restores the prior context. A resolved choice returns focus to the altar, and re-entering a table restores any pending paid choice.

A committed Worship flashes the selected event for 450 ms in normal motion; resource payment and the public result come from the acknowledged event stream. The repeated-Poseidon story verifies two flashes for two Worship commands even when an acknowledgement is interrupted. Reduced motion removes the flash while preserving the same result. Public outcomes show the actual gained card and discard/topdeck destination; private draws stay hidden from the observer.

[All illustrated stories](README.md) contain inline desktop/phone captures and expandable 4K captures. The ordinary journey starts at a real gathering and draft. Later-turn branch scenarios are explicitly labeled recorded-history integration tests and use the same legal history on all three form factors. Backend tests cover costs, phases, Devotion 0/1/2/3, no leader contribution or trigger, no refunds, optional and empty-hand branches, restricted Action gains, combined costs, and retry/replay semantics.

Clipping and overlapping-control audits run before every capture on every form factor. Pixel comparisons use zero tolerance; readiness, assets, animations, layout, capture, and comparison share the existing 2,000 ms deadline. These captures are implementation evidence for review, not a claim of visual acceptance.
