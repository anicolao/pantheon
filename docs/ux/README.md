# Gameplay design artifacts

Read [UX_DESIGN.md](../../UX_DESIGN.md) for the complete screen pairs, interactions and future E2E acceptance stories.

- `screens.ts`: 28 design fixtures and shared HTML/CSS presentation. No Firebase calls and no application routes.
- `manifest.json`: generated screen inventory, content and behavior notes.
- `cards/*.webp`: documentation-only captures of all 30 approved production `CardFace` definitions at the two-player inventory setting. Original art/frames/icons remain in `static/assets`; no new card art is introduced.
- `mockups/*-{desktop,mobile}.png`: 56 viewport captures, 1440×1000 and 393×852. These are design illustrations, **not** Playwright regression baselines.
- `render.ts`: repeatable capture tool. Checks image decoding, HTTP failures, root containment and control text overflow. It is not a gameplay test or a substitute for visual review.

From the repository root, with dependencies and Playwright Chromium installed:

```sh
bun run dev
# In another terminal:
bun docs/ux/render.ts
```

The generator reads the local approved gallery on port 5193, isolates each card in a single-column capture layout, and renders documentation through a temporary localhost-only server on port 5197. It does not change the app or game state. Set `CATALOG_URL` to another running catalog root if necessary. The temporary server closes when generation finishes.

For layout-only iterations using the committed card captures:

```sh
bun docs/ux/render.ts --screens-only
```

Fonts come from the repository’s pinned Fontsource packages. Captures are made at DPR 1 with reduced motion. Regeneration is intentional and may change pixels with browser/platform/font updates; unlike future gameplay E2E snapshots, these images are not a cross-platform acceptance baseline.

The screen manifest’s actions/signifiers/transitions are mirrored in the main document. If editing those fields, update the corresponding document section as well. App components should be reused when implementing this design; this standalone presentation is a review tool, not an alternative card renderer or production component library.
