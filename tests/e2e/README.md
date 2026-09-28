# Browser stories

[E2E_GUIDE.md](../../E2E_GUIDE.md) defines the required testing contract: real player journeys, explicit choices, one ordered illustrated narrative across player viewpoints, zero pixel tolerance, and a hard 2,000 ms deadline for every operation. Readiness, animation completion, clipping checks, capture, and comparison share one deadline.

The shared fixture writes each passing story’s illustrated README. Every capture audits components, text, clipping ancestors, and active controls at phone, desktop, and 4K sizes. Rules and gallery pages scroll; game screens must fit. Deliberately clipped examples exercise the audit at every size.

- [Gathering, invitations, and recovery](001-game-setup/README.md)
- [Sanctuary and returning to a table](002-sanctuary/README.md)
- [Bloodline choices and private hands](003-bloodline/README.md)
- [Recorded-history Action effect scenarios](004-actions/README.md)
- [Buying, passing turns, drawing, and playing the purchased copy](005-economy/README.md)

- [Worship, Devotion, offerings, and topdeck gains](006-worship/README.md)
- [Cleanup, handoff, final scores, and playing again](007-match/README.md)

Recorded-history integration scenarios are labeled in their documentation. They supplement the ordinary UI journeys. Backend tests verify the event reducer and authorization separately.

Regenerate baselines explicitly, inspect them, and run comparison mode afterward. Linux generation uses the workflow’s `update_snapshots` input and cannot publish the app. PR verification runs the complete suite without snapshot updates, retries, masks, or tolerance exceptions.

Catalog render evidence:

- [Card faces](stories/all-30-v0-1-cards-render-complete-rules-and-generated-artwork/README.md)
- [Three back families](stories/copy-totals-follow-setup-and-three-back-families-keep-deck-identity-hidden/README.md)
- [Tabletop scale](stories/tabletop-view-preserves-every-card-and-print-uses-physical-card-dimensions/README.md)
