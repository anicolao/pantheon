# E2E Testing Guide — Pantheon: Bloodlines

This is the testing contract for every user story and screenshot in this repository.

Our Playwright E2E stories are the primary evidence that people can play the game through its real interface. Each story must also produce an illustrated walkthrough that a reviewer can follow without reading the test code or opening a trace.

The test, its assertions, its screenshots, and its generated documentation describe the **same sequence of player actions**. A passing final screenshot does not prove the intervening experience.

## 1. Philosophy: playable stories and zero-pixel tolerance

The [card set](MVP_CARDSET.md) defines the rules. The [UX design](UX_DESIGN.md) defines the intended experience and screen compositions. The [implementation plan](IMPLEMENTATION_PLAN.md) defines delivery milestones. Tests must demonstrate those promises through observable play.

- **Zero-pixel tolerance:** `maxDiffPixels: 0`, `threshold: 0`, and test retries `0`.
- **Real implementation:** use the production SvelteKit UI, anonymous authentication, and isolated Firestore/Auth emulators. No mock game service, replacement renderer, or test-only gameplay controls.
- **Determinism:** fix the initial seed, names, and visible game code. Execute the same explicit decisions on every run.
- **Complete journeys:** show how the player reaches a decision, understands the available choices, acts, and sees the consequence.
- **Human visual review:** compare the implementation with the accepted paintings before accepting application baselines. Exact comparison to an existing baseline cannot establish fidelity to the design.

Do not mask regions, normalize screenshots, hide controls for captures, loosen thresholds, or regenerate baselines merely to turn a failure green. Software rendering reduces variability; it does not make different operating systems pixel-identical. Keep reviewed macOS and Linux baselines separately.

## 2. One directory per illustrated story

Tests live under `tests/e2e/`, grouped by feature. Each illustrated test owns a separate generated story directory and screenshot namespace. A feature suite may contain several journeys; it must not collapse them into one README documenting only the first test.

```text
tests/e2e/
├── helpers/                         # Shared fixture, steps, clipping audit
└── 005-economy/
    ├── economy.spec.ts              # Real player journey
    ├── economy.integration.spec.ts  # Explicit recorded-history scenarios
    ├── README.md                    # Index of generated stories
    ├── FIDELITY.md                  # Human comparison with accepted design
    ├── stories/<story>/README.md    # Generated only after the story passes
    └── screenshots/<story>/         # Reviewed viewport/platform baselines
```

Use a player goal as the title: “Buy an Action and play it on a later turn.” Introduce the players, starting circumstances, and expected outcome. Write step descriptions in gameplay language: “Ariadne chooses Oracle’s Acolyte,” not “dispatch purchase command.”

Materially different branches need their own illustrated journeys: cancel an optional choice, complete it, recover from interruption, or encounter an unavailable purchase. Small data variations may share a scenario when their meaning and visible path are the same. Each documented variant still needs unique output ownership; parallel tests must never overwrite another story’s README or images.

The existing gallery, rules, print, and card-overflow checks remain useful regression coverage. They do not replace gameplay stories.

## 3. The unified step pattern

Use `TestStepHelper` for every meaningful player-visible step. Never hand-manage screenshot counters, filenames, Markdown image links, or a separate prose walkthrough.

A step consists of:

1. A named player action, performed through the real UI.
2. Named behavioral assertions explaining its visible result.
3. Explicit readiness checks and layout checks.
4. An exact screenshot of that result, added to the generated story.

Capture the opening state before the first decision. Thereafter, capture each new decision surface and each committed result. Opening an inspector, choosing a target, seeing confirmation, cancelling, and returning to play are separate visible steps when they matter to the journey. Filling a name can be grouped with submitting it; unrelated navigation, purchases, and turn changes cannot.

**The screenshot must show what its caption claims.** “Play an Obol” shows the played Obol and resulting Coins, not the hand before play. “Inspect the card” shows the full inspector, not just a selected pile. “Theseus receives the turn” shows Theseus’s active controls, not only Ariadne’s waiting view.

An example using the repository’s current helper API, after both players have reached the table through documented UI steps:

```ts
const steps = new TestStepHelper(
  ariadne, testInfo, 'Buy an Action and play it on a later turn'
);

await ariadne.getByRole('button', { name: 'To Treasures', exact: true }).click();
await steps.step('treasure-phase', 'Ariadne can play wealth from her hand', [
  {
    spec: 'The turn advances to Treasures without playing an Action.',
    check: async () => {
      await expect(ariadne.locator('.turn-marker')).toContainText('Treasures');
      await expect(ariadne.getByRole('button', {
        name: 'Play all Treasures', exact: true
      })).toBeEnabled();
    }
  }
]);

// Continue with photographed play, purchase, and handoff steps.
// The shared test fixture generates the complete narrative after success.
```

This example assumes the fixed starting hand has no Actions, so there is no optional-Action confirmation. A story with that confirmation must photograph and resolve it explicitly. Do not use a helper that silently accepts whichever dialog happens to appear.

Import `test` and `expect` from `helpers/fixtures`, not directly from Playwright, for illustrated stories. The fixture writes one complete README only after the test passes. All helpers in that test share an ordered step sequence. Use the step’s view options (`page`, `player`, and expected `status`) for observer and recovery captures; `document: true` identifies a scrolling reference page. Every generated step links phone, desktop, and 4K images. Do not write a competing README from a second helper or test.

## 4. Show the flow, not just its checkpoints

Use this as the minimum storyboard for the buying-and-playing journey. Each numbered row represents a photographed step; split rows further where the UI presents another meaningful choice.

| Step | Action and visible result |
| --- | --- |
| 1 | Open the sanctuary and choose Play; show the gathering choices. |
| 2 | Ariadne creates a two-player table; show her seat and displayed game code. |
| 3 | Theseus enters that code through Join a game; show the found table before joining. |
| 4 | Theseus joins; show both occupied seats and who can begin. |
| 5 | Begin; show the draft and whose choice it is. |
| 6 | Inspect and choose each leader in draft order; show the selected leader and the next player’s choice. |
| 7 | Finish the draft; show Ariadne’s actual no-Action starting hand, active turn, and Theseus’s waiting view. |
| 8 | Advance to Treasures; show the available Treasure controls. |
| 9 | Inspect an Obol; show its readable face and Play affordance. |
| 10 | Play it; show hand → play, the exact Coin increase, and the public result for Theseus. |
| 11 | Explicitly play the remaining Treasures; show the resulting play area and Coin total. |
| 12 | Advance to Buys and open Supply; show actual stock, Coins, and Buys. |
| 13 | Open Actions and select Oracle’s Acolyte; show the selected pile, price, and purchase destination. |
| 14 | Open its full inspector; show readable rules and a working return control. |
| 15 | Return and buy; show the exact payment, reduced stock, discard increase, and Theseus’s public purchase result. |
| 16 | Return to the table and end the turn; show cleanup, Ariadne’s new hand, and Theseus’s active turn. |
| 17 | Take the intervening turns through visible controls; document their decisions and handoffs, including any confirmation. |
| 18 | On the predetermined later turn, show the purchased copy in Ariadne’s hand. |
| 19 | Inspect and play that copy; show its effect, any leader reward or choice, and the resulting table from both relevant viewpoints. |

Use a fixed seed and explicit planned turns to make this a short, reproducible journey. Do not loop until the desired card appears, query hidden state to choose moves, or fast-forward the middle of the story without documenting it. Reusable UI helpers may reduce code repetition, but must emit the same readable steps.

Keep interruption testing as a separate story. A dropped acknowledgement in the middle of the ordinary purchase journey obscures the normal experience. Its own walkthrough should show the pending/interrupted state, recovery action, and the once-only purchase result.

## 5. Real setup and deterministic replay

Pantheon uses trusted clients. The initial seed and immutable event stream let every client deterministically replay the game. Firestore provides synchronization and access/write constraints; there is no authoritative game server to substitute in tests.

For an end-to-end player journey:

- Create and join through the UI with distinct authenticated browser contexts. Draft, play, choose, buy, and end turns through the same controls people use.
- Fix entropy at the test boundary. Choose the seed before the run; do not search for a favorable hand during the story or modify a hand after dealing.
- Emulator cleanup may remove that story’s previous table before it begins. It must not inject seats, commands, deck contents, resources, or a ready-made projection to skip the journey.
- Follow visible turn ownership and visible cards. The production reducer must not act as the test’s player or compute the expected answer to its own assertions.
- Read-only event inspection may corroborate once-only commits, physical card identity, or replay after the visible assertions. It cannot replace them or drive the next move using hidden information.

The current `actionTable()` helper constructs a legal event history and writes it directly into the emulator. That is useful for focused effect/integration coverage, but it is **not evidence that a player can reach that state through the interface**. Label such setup honestly and keep it separate from the illustrated end-to-end journey. Reducer tests should continue to exhaustively verify rules and boundary cases.

## 6. Multiplayer perspectives are part of the story

Name the actor and viewpoint at every step. Use separate browser contexts, not two tabs sharing an identity. Show the other player’s screen whenever a move changes what that player needs to understand: joining, drafting, public play, reveal, purchase, and turn handoff.

Assert both sides of each relevant transition:

- The actor sees the correct choices, resource changes, physical card, and destination.
- The observer sees the actor’s name, public card/result, correct counts, and turn ownership without being navigated away from their own task.
- An inactive player cannot issue active-turn commands.
- Opponent hand faces and hidden deck order are absent from the rendered DOM and accessibility tree. Hidden draws use backs.

This is presentation privacy, not secrecy from a trusted participant inspecting the shared stream. Do not claim stronger privacy than the architecture supplies.

Observer assertions buried in code are insufficient when observer comprehension is the feature. Include the observer screenshot in the generated narrative, with a clear viewpoint label.

## 7. Assertions, timing, motion, and layout

Assert exact visible values, not just existence: phase, active player, Actions/Coins/Buys/Worship, pile counts, selection count, legal targets, destination, and enabled/disabled controls. Explain an unavailable action in player-facing language. Prefer roles and accessible names; use stable card identifiers where physical-copy identity matters.

**Hard deadline: 2,000 ms.** Every action, navigation, assertion, readiness wait, animation completion, and screenshot operation must finish within 2,000 ms. Readiness, animation completion, clipping checks, capture, and pixel comparison share one 2,000 ms capture deadline; they do not receive successive fresh budgets. No larger timeout, retry, or special allowance for 4K, CI, image decoding, or slow machines is permitted. Optimize the implementation or test harness when it misses the deadline.

Never use `waitForTimeout`, sleeps, arbitrary frame counts as elapsed-time delays, or `networkidle` instead of the required UI state. A complete journey contains many bounded operations; its total runtime is not a single operation. Build/server startup is infrastructure, not a reason to extend an interaction or capture deadline.

Before a stable screenshot, the shared helper must verify the step’s intended readiness state, loaded fonts, decoded artwork, and settled finite animations. Include CSS background artwork in readiness handling. Recovery stories must capture their expected pending/offline state instead of always waiting for `synced` and thereby skipping the experience being tested.

Stable captures use reduced motion. Separate normal-motion stories must verify visible source → destination, ordered effects, private backs, once-only movement, and the same final state under reduced motion. Counting animation API calls alone does not prove that a movement is visible or understandable. For a mid-flight capture, control the animation clock; do not sleep and hope to catch it.

Every screenshot must check component and text bounds, including clipping by ancestors and overflow on both axes, before capture. Any clipped component fails the story at phone, desktop, or 4K resolution; a passing screenshot at another size does not excuse it. The game shell must fit these viewports without page scrolling or overlapping active hit regions. Preserve 44px minimum targets. Painted card fans may overlap; their selection targets may not. Inspect bounded trays and hand pages at both ends and with keyboard focus on each item. Rules and gallery pages intentionally scroll and need their own document/containment checks, not blanket exclusions from layout testing.

## 8. Configuration and visual review

Keep Chromium software rendering, complete compositor frames, and lossless PNG capture. Retain DOM/network traces on failure; disable their duplicate screencast images because the illustrated steps already capture the player views. The shared helper uses Chromium’s fast PNG encoding and native decoding, then compares every RGBA byte without changing any pixels. A mismatch retains Playwright’s image-diff report. Explicit baseline generation writes the captured PNG; it is never a verification pass. Run one browser worker so simultaneous 4K rendering cannot consume another capture’s budget. Keep DPR 1, `en-CA` locale, `America/Toronto` timezone, and these projects:

| Project | Viewport |
| --- | --- |
| Phone | 393 × 852 |
| Desktop | 1440 × 1000 |
| Tabletop | 3840 × 2160 |

Every core journey runs at all three sizes. A 4K player view is not evidence of the separately planned shared-display experience. Give viewport-specific behavior its own assertions; do not skip a failing viewport to obtain a green run.

For each new or changed step, `FIDELITY.md` links the applicable UX painting and the real captures. Review composition, card scale and readability, controls, materials, source/destination placement, and mobile reach. Record intentional differences. Baselines are screenshots of the reviewed implementation, never generated paintings used as the interface.

## 9. Run, review, and accept

From the repository root:

```sh
bun run check
bun run test:backend
bun run test:e2e
```

The test scripts launch the isolated emulators; Playwright builds and serves the production app. Do not run backend cleanup tests concurrently with browser stories against the same emulator data.

When an intentional visual change requires new baselines:

1. Run `bun run test:e2e:update` explicitly.
2. Read the generated story from start to finish. Check that every important action, choice, result, and viewpoint is represented.
3. Inspect the actual images and diffs, and compare with the accepted UX paintings. Fix incorrect rendering or synchronization before accepting anything.
4. Generate and review Linux captures with the workflow’s `update_snapshots` input. Generation runs never deploy. Focused manual `story_filter` runs are diagnostics, not full PR acceptance.
5. Run comparison mode against the reviewed baselines. Generation success alone is insufficient.
6. When the change is approved for submission, commit the story, generated documentation, fidelity review, and platform baselines together. Require the complete CI comparison and deployment checks.



## 10. Review checklist

- Every meaningful choice and result appears in the generated sequence with the correct caption and player viewpoint.
- Ordinary journeys use real UI setup and a fixed, explicit plan; injected-history integration and recovery coverage are labelled separately.
- No hidden-state reads choose moves, no silent confirmation helpers skip decisions, and no fast-forward loop hides intervening turns.
- Every capture fails on clipped components or text at any of the three resolutions.
- Readiness, animation completion, clipping audit, lossless capture, and exact comparison finish within one 2,000 ms deadline. No timeout exceptions or retries.
- Reviewed platform baselines pass comparison mode, and fidelity evidence identifies the applicable accepted paintings.

A reviewer must be able to read the generated walkthrough, understand what each player did and saw, compare it with the intended design, and see those exact screens and outcomes pass against the real implementation.
