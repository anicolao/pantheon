# Generated game concept art

[UX_DESIGN.md](../../UX_DESIGN.md) defines the proposed full-screen game experience, interactions, animation and future exact-pixel E2E stories.

The previous HTML/CSS mockup renderer and its screenshot set have been removed. These replacements are raster concept paintings produced with the **built-in image generation tool**, guided by approved project assets. They are visual-direction proposals, not a working app or executable screenshot baselines.

- `concepts/`: 21 paired desktop/mobile concept plates plus separate desktop and mobile main-table paintings: 22 screen families, 44 views.
- `references/`: approved catalog face captures supplied to generation. These are reference inputs, not replacements for the live layered card renderer.
- `prompts.json`: generation prompts, reference roles/paths and selected output filenames. The first table exploration established the material direction; later prompts and targeted edits corrected card identity drift.

Keep the actual catalog art, card proportions, rules, copy identifiers and iconography when implementing. Generated miniature lettering, numbers and occasional simplifications are not canonical. The exact rules remain in `MVP_CARDSET.md`; production card components remain the source of truth. Do not extract a generated card face from a scene and ship it as a replacement asset.

All player-facing copy must speak to the game, with no descriptions of storage, authentication or implementation. Technical requirements belong in the engineering/test sections of the design document.

To iterate, use the recorded prompt and actual reference images with the built-in image generation tool, inspect the result, then copy the selected file into `concepts/`. There is no HTML screenshot regeneration command. Exact image regeneration is not guaranteed. The original selected outputs remain in the generation workspace; every image linked by this repository is committed here.
