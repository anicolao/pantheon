# Event-sourced play: trusted client replay

Anonymous sign-in and a shared event stream connect 2–4 players at `/play/`. The host begins after every seat is filled. Trusted clients deterministically draw the first player, draft unique leaders in reverse turn order, and shuffle/deal the exact starting decks. Reloading restores the same identity, choices, order and hand. All twelve Actions and four Temples now resolve through replayable client commands, including persistent choices and first-matching leader triggers.

## Events and consistency

`games/{id}/events/{sequence}` is the append-only source of game history. Schema version 1 supports `game/created`, `player/joined`, `table/resized`, `draft/started`, `leader/chosen`, `action/played`, and `choice/resolved`. Play events additionally carry reducer version 1 and a stable command ID. The start event records one seed; a claim records only the chosen leader. Each event has a schema version, integer sequence, authenticated actor UID, display name, player count, and server timestamp. Replay is a pure function ordered by sequence, never by client clocks. Invalid versions, gaps, duplicates, and illegal joins fail visibly.

New tables use five uppercase letters as their invitation code. Allocation retries collisions atomically, including collisions with the creator’s own tables. New creation events carry a stable creation token; a pending creation retains its code and token through a connection failure, so retrying recovers the same table. Existing long invitation links still resolve; new creation never emits those IDs. Players can enter a four- or five-letter code from Play, with lowercase input normalized to uppercase.

The owner can change capacity between two and four in Table details. A resize records the owner’s original name, preserves membership, and cannot remove occupied seats. Guests see the new seats and supply immediately. Repeating the current capacity is a no-op. Event sequence counts all events, independently of the number of players.

The room document contains an owner, member UIDs, capacity, phase, and revision. This is a transaction coordination record, not the rendered game state. A Firestore transaction appends the next event and advances that record atomically. Concurrent joins retry against the updated revision; a full table rejects another join. A repeated join by an existing member is a no-op. The UI renders acknowledged events and distinguishes connecting, syncing, synced, and error states.

Firestore rules bind the actor to anonymous auth, enforce capacity and membership transitions, require the event and room update together, and deny event updates/deletion. Setup metadata can be read by a signed-in visitor with an invitation; event history is member-only and room listing is denied. The rules tests include adversarial writes and concurrent joins.

Every member receives the same seed and events and can reconstruct the complete game state. This is a trusted-client game, with no trusted game backend, cloud function, or private projection service. “Private hand” means only the owner’s view renders its faces; it does not imply secrecy from a participant inspecting the stream. Anonymous identity persists in this browser, not across devices or cleared storage.

Reducer v1 uses FNV-1a to hash a seed string and xorshift32 as its PRNG. Fisher–Yates shuffles a copied inventory. Named random streams (`:first-player` and `:starting-deck:{seat}`) keep setup independent of anonymous UIDs and unrelated random calls. The first-player index rotates the clockwise join order; the draft is its reverse. The final leader claim derives the deal once: six Obols, three Hamlets, one matching Temple, hand five/deck five, empty discard/play. Physical copies are assigned by stable seat, outside supply stock. Replaying produces the same cards, order and copy identifiers. Any change to this algorithm requires a new reducer version.

The room’s phase coordinates start/claim transactions and locks seating after Begin. Clients validate the replayed stream before appending. Rules enforce authenticated membership, immutable events, host-only start, full capacity at start, and atomic revision/phase updates. They intentionally do not duplicate the game reducer. Stable command IDs prevent duplicate starts or claims after a lost response; concurrent claims retry against the new revision.

## Actions and persistent decisions

An `action/played` event identifies a physical hand copy. The reducer spends one Action, moves that copy to play, and runs its ordered effect queue. A first matching leader appends its own effect after the card. A pending choice records its source, kind, eligible count/cost limit, and a deterministic choice ID. `choice/resolved` supplies that ID and physical hand IDs (or a supply ID for a gain). Invalid, duplicate, stale, out-of-turn and non-hand selections are rejected before mutation. Optional trash permits zero; mandatory discard cannot be skipped. Empty mandatory effects finish without presenting an impossible choice.

The remaining queue, choice, counters, supply and card zones are derived from the events. No partially resolved projection is stored separately. A reconnect reconstructs the same decision; a stable command ID reconciles a lost acknowledgement without playing, drawing or gaining twice. Client repositories reuse acknowledged immutable event prefixes and read only a missing suffix; each append still reads the live room revision inside the transaction. A sequence gap or invalid version prevents replay.

Each exhausted-deck shuffle uses `:reshuffle:{seat}:{shuffleNumber}`. Only discard joins the new deck. Gained copies use the next physical supply identifier and reduce the live pile count independently of printed N/M. Reveals record their public face and actual discard/topdeck destination; hidden draws render backs for other players. The leader opportunity is consumed when triggered, even if its optional trash is declined.

The player-facing economy uses `phase/advanced`, `treasure/played`, `treasures/played`, `card/bought`, and `turn/ended`. Play-all is one atomic command that plays the currently held Treasures in hand order. Purchases spend exact Coins and one Buy, including cost zero, and gain to discard. Phase departure asks for confirmation only when a legal play or purchase remains. Cleanup discards the hand and play area, draws five through the seeded shuffle, resets resources and leader usage, counts the turn and passes control. Ending checks run after cleanup; final totals include every owned Territory and use fewer-turn/shared ties. No commands can advance a finished game. These are the same commands used by recorded integration preludes; there is no production test mode. Worship remains milestone 6.

## Activity and motion

Committed joins add a seat with a short entrance transition and a named activity message. The message remains after the animation, is announced through a polite live region, and is usable without motion. Reduced-motion preferences remove the transition. Action gameplay emits explicit activity records with actor, card, source, destination, and result so animations explain what another player did. Animation completion must never determine game state; reconnect/replay must reconstruct the same state without replaying an entire historical animation queue.

## Next milestones

1. Add Worship and all standard/favored event effects.
2. Complete full-match acceptance and the dedicated victory composition using the same seeded random streams.
3. Extend public activity animations, endings, shared display and recovery stories.

## Local and hosted configuration

Use Node 24, Bun 1.3.10, and Java 21+. `nix develop` supplies Bun and Java. Copy `.env.example` to `.env.local`, then run `bun run emulators` and `bun run dev` in separate terminals. The isolated demo project uses Auth port 9293 and Firestore port 8193; it cannot reach a production database. `bun run verify` starts and stops its own emulators; stop manually running emulators first.

The hosted preview uses the dedicated Firebase project [`pantheon-preview-anicolao`](https://console.firebase.google.com/project/pantheon-preview-anicolao/overview), available through the `preview` alias in `.firebaserc`. Its default Firestore database is in Toronto (`northamerica-northeast2`), and its web app is named **Pantheon PR previews**. Anonymous authentication is declared in `firebase.json`; the deployed database uses this repository’s `firestore.rules`.

The project, web app, database, authentication provider, and rules were provisioned using the Firebase CLI. To redeploy authentication and rules after an authorized change:

```sh
bunx firebase deploy --only auth,firestore:rules --project preview
```

The GitHub repository variables `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, and `VITE_FIREBASE_APP_ID` contain the web-app configuration returned by `firebase apps:sdkconfig`. CI embeds them when publishing the static app. They are public configuration values, not service-account credentials. Configured builds share this preview backend; individual tables have separate event streams. Local development and automated tests continue to use the isolated `demo-pantheon` emulators.

CI publishes the web client but does not deploy cloud rules or authentication configuration. A build without Firebase variables displays an explicit unavailable message. After changing repository variables, rebuild the PR preview to embed the new configuration.

Implementation references: [Firebase anonymous authentication](https://firebase.google.com/docs/auth/web/anonymous-auth), [transaction validation with getAfter](https://firebase.google.com/docs/firestore/security/rules-conditions), and [Firestore rules emulator testing](https://firebase.google.com/docs/firestore/security/test-rules-emulator). Jaipur informed the event repository and user-story test structure; Pantheon adds transaction-enforced setup transitions and strictly zero-pixel screenshot comparison.
