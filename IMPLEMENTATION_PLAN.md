# Pantheon: Bloodlines — implementation plan

The [accepted UX design](UX_DESIGN.md) is the visual target. The [card set](MVP_CARDSET.md) is the rules authority. Implement permanent production components and real, authorized game commands. Every step ends with a user-visible result, behavioral E2E coverage, exact screenshot baselines and an explicit comparison with its concept paintings.

## Completion contract for every step

- Build the whole stated interaction, including keyboard/touch input, validation, pending/rejected states, accessible names, reduced motion and return/focus behavior. No inert controls, fake data, screenshot-as-interface, placeholder art, alternative rendering fallback or “coming soon” UI in the new surface.
- Use approved card components and assets. Generate shipping scene/control layers from the accepted paintings where needed. Render titles, labels, resource values and card rules as live accessible content; decorative environment artwork contains no counterfeit controls.
- Compare actual phone, desktop and 4K screenshots with the identified painting. Record differences in framing, proportions, hierarchy, material, card placement and control reach. Correct visible regressions before recording baselines. Pixel-perfect comparison to a generative painting is not the test: **the reviewed real UI becomes the zero-pixel regression baseline**.
- Use the shared `TestStepHelper` for photographed user-story steps; `maxDiffPixels: 0`, `threshold: 0`, retries 0. No masks, normalization, tolerance exceptions or automatic baseline acceptance. Test real Firebase emulators, deterministic game fixtures, image/font readiness and settled animations. See the detailed contract in `UX_DESIGN.md`.
- Keep the game shell within the viewport; 44px minimum targets and no intersecting active hit regions. Test any named scroll/paging region at both ends. Keep card overflow auditing. Assert player-facing copy excludes implementation terminology.
- Exercise public and private views in separate contexts. Acknowledged commands, idempotent retry and authorization are part of a feature, not follow-up hardening.
- Commit reviewed macOS/Linux baselines and an illustrated story README; run comparison mode, required backend checks and CI. Update the PR with the actual implementation and fidelity evidence.

The sequence is a development/review sequence, not a succession of altered game rules. Later commands are not advertised as working until implemented. The existing setup, gallery and rules remain real navigation destinations while their own visual milestones are developed; they are not alternate renderers for the new sanctuary. Full-match availability requires steps 3–7 together. No restricted substitute card set or simulated opponent is introduced to make unfinished play appear complete.

## 1. Enter the sanctuary and return to a table

**Visible result:** the root opens the finished full-screen title scene from painting **01**, with the approved Thaleia, Temple and Acropolis cards on the near table, live Play/Learn controls, and Continue only for an existing table belonging to the current player. The gallery remains at `/gallery/`.

**Complete implementation:** separate landscape/portrait environment layers, sculpted reusable controls, accessible wordmark, live layered cards, responsive composition and a finite arrival transition. Play enters the existing real gathering flow; Learn opens the existing complete rules. Persist a return pointer only after an acknowledged join/create, verify membership before offering Continue, and return without creating a second seat. Missing/unavailable return targets must never manufacture a game or expose a raw service error. Do not change any game rules.

**E2E:** `002-sanctuary`: first visit without Continue, keyboard focus, Play navigation, create a real table then return and Continue to the same seat, Learn navigation, stale/foreign target rejection, portrait/desktop/4K containment, assets/card fit, normal/reduced motion. Retain existing setup/gallery/rules tests.

**Fidelity review:** compare the sanctuary painting with actual captures: statue/Acropolis framing, gold title, blue primary control, restrained secondary controls, near-edge real cards and portrait recomposition. Evidence lives beside the story. This is the first review boundary; redesigned gathering is step 2.

## 2. Gather friends at the table

**Visible result:** painting **02**, invitation/full-table **22** and the relevant **15** recovery states replace the existing setup presentation. Names occupy real seats around the table; invitations and capacity behave correctly.

**Complete implementation:** visible five-letter codes, joining by code from Play, owner-only live capacity changes that preserve occupied seats, player-count seals, accessible name entry, live seat arrival, host/guest states, invitation copying with an explicit selectable invitation when clipboard access is unavailable, return to sanctuary and specific full/missing invitation messaging. Use existing event-backed creation/joining; enforce final-seat races and no duplicate membership. Remove all technical/milestone copy from this surface. Draft entry is exposed with step 3 when it can really run.

**E2E:** extend existing gathering story 001: 2/3/4 seats, supply scaling, two-client joins by code or invitation, validation, clipboard outcomes, code collisions, owner/guest capacity permissions, capacity/arrival race, identity restoration, full/invalid invite, exact screenshots and seat-motion ordering.

**Fidelity review:** occupied/empty medallions, table perspective, seat-count placement, invitation seal and mobile thumb reach; no form-page panel composition.

## 3. Choose a bloodline and receive a private hand

**Visible result:** painting **03** flows into the dealt **04** table. Each player has their selected leader, corresponding Temple and private five-card hand; only chosen gods occupy the shared altar area.

**Complete implementation:** authoritative first-player draw once, reverse draft order, unique leader claim, observer waiting state, all four leader/Temple links and shared events. Implement private deck/shuffle/deal projection and authorization now; never put hidden hands, deck order or shuffle seeds in public events. Deal exact starting inventory separately from supply. Persist/replay draft and deal, including interrupted choices.

**E2E:** stories 003–004: all player counts, all leaders, order/claim races, no redeal on return, exact inventory and counters, public backs/counts versus owner faces. Assert hidden data is absent from other clients' network responses, DOM and accessibility tree.

**Fidelity review:** selected hero scale and actual landscape leader card, linked event/Temple, seat transfer and private hand composition on all sizes. The hand uses real card faces and disjoint hit regions.

## 4. Play Actions and resolve every printed choice

**Visible result:** painting **04** becomes an interactive Action phase, with real card inspection **07**, optional trash **09**, gain **10**, reveal **11** and mandatory discard **20**.

**Complete implementation:** authoritative Action command, spend then resolve in order, all twelve Action cards and four Temples, first-matching leader triggers, optional Doreios, draw/shuffle rules, legal hand selection, gains and destinations, conditional reveal and public trash. Complete all branches, including zero/empty/partial cases. Add phase-preserving choice state and idempotent recovery. Never replace an unimplemented effect with a no-op. Card inspection is functional for every visible zone.

**E2E:** stories 005, 009–011 and 014: every card and leader branch, draw-before-discard, just-drawn target, no-effect leader trigger, no self-trash from play, cost ceilings and cheaper gains, no eligible supply, correct public/private reveal, keyboard/touch choice and large-hand paging.

**Fidelity review:** selected-card elevation, hand → play travel, source/effect focus, operation icon, destination glow and focused mobile choice. Live rules stay complete at inspection size.

## 5. Play wealth and purchase cards

**Visible result:** Treasures **05**, supply **06** and purchase detail **07** form a complete economy flow.

**Complete implementation:** individual Treasure play, explicit play-all, retained Treasures, forward-only phase transitions, all 18 supply piles, filtering without changing availability, actual costs, multiple Buys, cost-0 Buy, empty/unaffordable reasons and discard destination. Confirmation only when advancing forfeits a meaningful legal option. Exact pile/counter updates and command retry behavior are required.

**E2E:** stories 006–007: individual/batch Treasure totals, no Action cost, no backward phase, leaving Treasures, inspect versus buy, zero-cost payment, multiple purchases, overspend/empty rejection, live stock distinct from physical N/M, observer sees purchase once.

**Fidelity review:** no shopping-page grid; inset card piles, near-hand continuity, selected pile and real destination, usable Basics/Actions selector and readable mobile expanded card.

## 6. Worship any shared god

**Visible result:** painting **08** lets a player invoke the shared gods and resolve all standard/favored effects through the same finished choice surfaces.

**Complete implementation:** one Worship plus Coin payment, no Buy; availability between fully resolved effects in any phase before cleanup; exact Devotion from Actions currently in play; Favored replaces Standard; repeated same god; every Athena/Poseidon/Demeter/Ares effect. No refund for inability to gain. Temple and leader finish before another command. Keep original phase.

**E2E:** stories 008/010: Devotion 0/1/2+, no leader contribution, another bloodline's god, insufficient resource rejection, repeat use, Athena limits 3/5 topdeck, Trial +1/+3, Demeter summed/zero-cost/optional branches and unconditional Buy, empty Drachma favored Buy.

**Fidelity review:** altar/card focus, actual contributing Actions connected to the god, distinct active-effect label, cost placement and a reachable mobile Worship control without additional prose panels.

## 7. Finish turns and complete a match

**Visible result:** decision **21**, handoff **12** and victory **14** complete the playable v0.1 game.

**Complete implementation:** meaningful remaining-option confirmation, cleanup/discard/clear/draw, ending checks after cleanup, next-player reset, both ending conditions, all owned Territory scoring, fewer-turn/shared ties and immutable finished table. Play again creates a new table. No final round or hidden rule adjustment. Enable ordinary complete-match play only when steps 3–7 are all implemented.

**E2E:** stories 012/015 plus one complete multi-client game through real commands. Verify decline/confirm, no early end at zero Buys, no cleanup Worship, no repeated draw after retry, both pile endings, starting Hamlets/trash scoring, all ties and 2/3/4 players, persistent final results.

**Fidelity review:** calm readable confirmation, named turn handoff, laurel/portrait hierarchy, exact score arithmetic and responsive results that show every player.

## 8. Read the whole public table

**Visible result:** observer play **12**, Chronicle/public trays **13** and complete inspection make other players' decisions easy to follow without losing one's own context.

**Complete implementation:** public activity with actor/card/source/destination/resource result, ordered one-time animation from committed events, retained history and New moves affordance, public discard/trash/play inspection and deck counts. Preserve tray position as remote moves arrive. Earlier steps already animate their own operations; this step completes cross-player choreography and historical browsing without rewriting rules.

**E2E:** stories 013–014: two clients through all movement classes, hidden draws as backs, normal/reduced-motion equivalence, reader-position preservation, offscreen zone anchors, no forced navigation, large/empty piles and exactly-once motion after reconnect.

**Fidelity review:** portrait active ring, clear travel path, restrained persistent message and game-native tray; no feed of diagnostics or timestamps.

## 9. Share the public table privately

**Visible result:** painting **16** on a shared display, with each player using the normal private **04** controller.

**Complete implementation:** host-issued/revocable read-only display capability, public projection only, distinct viewing and joining invitations, no private payload or command authority, 4K and portrait display layouts. Joining a shared view never consumes a seat. No hidden-hand toggle over a private payload.

**E2E:** story 017: player/viewer contexts, unauthorized reads/commands, revocation, common backs for every hand, private draws only to owner, controller interruption, public display continuing without seat consumption.

**Fidelity review:** all seats fit the shared table, active player remains obvious, public cards large enough at 4K and no turn command on the public screen.

## 10. Learn, explore and manage the view in-world

**Visible result:** illustrated codex **17**, collection **18** and game menu **19** complete the reference experience.

**Complete implementation:** actual rules/card content in the codex/shelf composition, chapter/search/filter navigation, all thirty cards and three backs, copy selection, printing, context-preserving return and local motion setting. Integrate the shared navigation style where it best serves reading. Multiplayer menu never pauses opponents. No purchase action in the collection.

**E2E:** story 018 and retained detailed gallery/rules tests: all content reachable and legible, sticky chapters/paging, full inspector, keyboard focus, print/back formats, return to current valid state if play advanced. Motion preference survives navigation.

**Fidelity review:** readable book/shelf materials and actual card imagery, generous expanded card, clear Back to table, no website masthead inside play.

## 11. Recover throughout a complete game

**Visible result:** interruption **15** and unavailable **22** remain understandable at every game boundary.

**Complete implementation:** complete cross-phase recovery coverage: pending command before/after acknowledgement, draft/choice/cleanup interruption, stale revisions, seat access changes, unavailable invitations and public-view revocation. Earlier steps must already handle their own failures; this step verifies the whole connected match and removes any inconsistent recovery presentation. Never silently replace a game, seat or deck.

**E2E:** story 016 spanning complete-game states: idempotent retry, restore exact pending choice or latest turn, no animation backlog, no private leak, no raw service copy, correct offline/error screenshots through the shared helper. Backend authorization/race/replay checks and full zero-pixel suite pass.

**Fidelity review:** both desktop and mobile keep recognizable table context under the same quiet seal; all error paths provide a real gameplay recovery action.

## Review evidence and acceptance

Each milestone adds a `FIDELITY.md` beside its E2E story: links to concept(s), actual phone/desktop/4K screenshots, a short visual comparison, and the named behavioral checks. A side-by-side human review answers “does this look like the accepted game?”; exact app snapshots answer “did it change after review?” Both are required.

Do not mark a step accepted because snapshots were generated or CI passed. Implementation-complete means checks pass and the PR contains concrete fidelity evidence; visual acceptance remains the reviewer's decision. Steps 1 and 2 are implemented. Step 1’s sanctuary fidelity was accepted; step 2’s gathering is submitted for review with evidence in `tests/e2e/001-game-setup/FIDELITY.md`. Steps 3–11 remain planned.
