# Event-sourced play: milestone 1

This milestone provides anonymous sign-in and a shared setup room at `/play/`. A host chooses 2–4 seats and shares an invitation. Joining players appear in every connected browser. Reloading restores the same anonymous identity and replays the stored events. It stops before leader drafting: no cards have been shuffled or dealt, and there is no turn engine yet.

## Events and consistency

`games/{id}/events/{sequence}` is the append-only source of game history. Version 1 supports `game/created`, `player/joined`, and `table/resized`. Each event has a schema version, integer sequence, authenticated actor UID, display name, player count, and server timestamp. Replay is a pure function ordered by sequence, never by client clocks. Invalid versions, gaps, duplicates, and illegal joins fail visibly.

New tables use five uppercase letters as their invitation code. Allocation retries collisions atomically, including collisions with the creator’s own tables. New creation events carry a stable creation token; a pending creation retains its code and token through a connection failure, so retrying recovers the same table. Existing long invitation links still resolve; new creation never emits those IDs. Players can enter a four- or five-letter code from Play, with lowercase input normalized to uppercase.

The owner can change capacity between two and four in Table details. A resize records the owner’s original name, preserves membership, and cannot remove occupied seats. Guests see the new seats and supply immediately. Repeating the current capacity is a no-op. Event sequence counts all events, independently of the number of players.

The room document contains only an owner, member UIDs, capacity, and revision. This is a transaction coordination record, not the rendered game state. A Firestore transaction appends the next event and advances that record atomically. Concurrent joins retry against the updated revision; a full table rejects another join. A repeated join by an existing member is a no-op. The UI renders acknowledged events and distinguishes connecting, syncing, synced, and error states.

Firestore rules bind the actor to anonymous auth, enforce capacity and membership transitions, require the event and room update together, and deny event updates/deletion. Setup metadata can be read by a signed-in visitor with an invitation; event history is member-only and room listing is denied. The rules tests include adversarial writes and concurrent joins.

All data in this milestone is public setup information. Future private hands and deck order must live behind per-player authorization or a trusted command processor; do not add secrets to this shared stream. Anonymous identity persists in this browser, not across devices or cleared storage.

## Activity and motion

Committed joins add a seat with a short entrance transition and a named activity message. The message remains after the animation, is announced through a polite live region, and is usable without motion. Reduced-motion preferences remove the transition. Later gameplay should emit explicit activity records with actor, card, source, destination, and result so animations explain what another player did. Animation completion must never determine game state; reconnect/replay must reconstruct the same state without replaying an entire historical animation queue.

## Next milestones

1. Choose first player and perform reverse-order unique leader drafting; derive available god events and Temples.
2. Create private starting decks and shuffle/deal through an authoritative service, with public hand/deck counts and per-player private views.
3. Implement turn commands and legal event transitions, including Actions, Treasures, Buys, Worship, and cleanup.
4. Animate card movement and resource changes from committed events; add reconnect, simultaneous-command, and complete-game stories.

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
