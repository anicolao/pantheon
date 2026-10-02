# Shared bot seats fidelity review

Bot invitations extend the existing Invite friends overlay. Strategy selection and Invite bot use the existing palette, controls, and focused dialog; no separate gameplay layout is introduced. The decorative invitation seal is omitted when manual clipboard fallback needs the space. Table details lets the host automate their own seat for an all-bot game.

After the draft, bots occupy the same portrait seats, take turns through the same public chronicle, and use the same supply as human guests. The host's own automated turn is labelled “Your bot’s turn.” The existing card fan, artwork, and action controls remain the ordinary multiplayer table.

The illustrated story fixes only entropy, uses real Auth/Firestore emulators, and exercises UI invitation, random legal leader selection, a human turn, a committed bot turn, and refresh recovery. Screenshots retain exact pixel comparison, clipping checks, and the two-second capture deadline. Phone, desktop, and 4K captures were reviewed; Linux captures are generated in the pinned ARM64 CI renderer rather than copied from macOS.

The bot turn also runs with normal motion. An observer checks the first painted frame after each played/gained card's flight: the destination cards must be opaque while it is still the bot's turn. This regression fails without the presentation wait. The host now waits for the whole move, including consecutive draw/cleanup batches, before asking for the next bot command. Reduced motion still advances directly.

- [Phone invitation](screenshots/invite-an-engine-bot-to-the-real-table-and-take-turns-together/001-invite-phone-darwin.png)
- [Desktop shared game](screenshots/invite-an-engine-bot-to-the-real-table-and-take-turns-together/004-playing-desktop-darwin.png)
