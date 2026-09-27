# Invitation ribbon curve editor

Run `bun run dev:curve-editor` from the repository after `bun install`, then open http://127.0.0.1:5194. Stop an older editor on that port first if one is running.

The editor uses the game's scroll artwork and font. Drag gold anchors and blue handles, or enter their coordinates. Moving an anchor also moves its adjoining handles. Arrow keys nudge the selected point; Shift increases the step from 1 to 10 units.

**Move whole curve** translates all points together using X/Y shifts or the arrow buttons. Positive X moves right; positive Y moves down. Undo and redo cover edits and translations.

Hide the guides to judge the lettering and check the phone, desktop, and 4K previews. Font size and position along the path are adjustable. **Copy values** exports the path, font size, centering offset, and all control points. Changes persist in this browser's local storage; **Reset** restores the approved curve included in the editor.

Apply the exported path to the invitation SVG in `src/routes/play/+page.svelte`, along with its font size and `startOffset` if changed. The editor does not modify source files. Regenerate and compare the affected E2E screenshot baselines before publishing an updated curve.
