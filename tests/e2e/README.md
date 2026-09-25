# Browser test conventions

Keep the gallery/rules regression tests, and put new gameplay user stories in numbered directories with their illustrated README and screenshots. Use `TestStepHelper` for each documented story step: describe the player's outcome and provide named verifications of observable behavior.

- Exercise the real Firebase client against isolated Auth/Firestore emulators. Do not replace persistence or authentication with browser mocks.
- Wait for acknowledged state, loaded fonts/images, and completed animations. Avoid fixed sleeps, random visible identifiers, and timestamps in screenshots.
- Compare screenshots with `maxDiffPixels: 0` and `threshold: 0`. No per-test overrides, masks, image normalization, or automatic baseline updates in verification CI.
- Setup screens must fit the viewport with zero geometric overflow or overlapping controls. The gallery and rules are scrolling documents with separate containment checks.
- Keep retries at zero. Fix the implementation or test synchronization when a regression fails; do not make the assertion looser.
- Generate new baselines explicitly, inspect the images, commit the platform-specific files, and run comparison mode afterward. Linux generation uses the workflow's `update_snapshots` input and never publishes the app.

`001-game-setup` documents anonymous sign-in, two-player creation/join/restoration, and also tests four-player supply and motion preferences. Its two scenarios run at phone, desktop, and 4K sizes. Backend tests separately enforce immutable events, replay, authorization, and the race for the final seat.
