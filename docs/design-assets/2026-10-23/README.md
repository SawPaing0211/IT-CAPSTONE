# Forge.Dev asset production — review workspace

**24 October status:** visual feedback is recorded in [APPROVAL_AND_VERIFICATION.md](C:/Users/Christian/forge-dev/docs/design-assets/2026-10-23/APPROVAL_AND_VERIFICATION.md); earlier "owner review pending" wording below is historical. Technical integration remains pending. [Fresh file/mapping checks and next proof findings](C:/Users/Christian/forge-dev/docs/design-assets/2026-10-23/DESIGN_PREPARATION_REVIEW_2026-10-24.md) cover the 34 unchanged masters/exports, earned/locked small-size matrix, phone copy, sample contrast and motion gates. No existing proof/artwork/application was edited in that pass.

Date: 23 October 2026, Asia/Manila. Designer: Codex/ChatGPT. Application implementation: Claude.

Status: candidate batch complete and ready for owner visual review. No new individual medal or landing asset is approved for integration. The concept board and Pack02 dashboard art already have their documented approval; that does not automatically approve newly generated derivatives/designs. `ASSET_MANIFEST.json` is authoritative for selected filenames and checksums.

Open `REVIEW.html` directly in a local browser: 15 earned/locked pairs, 72/56/48px samples, transparency-grid switch, landing composition/layers and a motion proof with pause/reduced-motion controls. This file uses relative image paths and no API calls. Browser playback/mobile acceptance is unverified because automated access to the local server timed out. Optional serving: `node serve-review.mjs`, then `http://127.0.0.1:5410/` (only binds loopback).

## Scope

Create 14 semantic achievement medals plus a generic fallback, with earned and locked transparent PNG variants (30 files). The design manifest records exact keys, names and proposed center motifs. Motifs illustrate existing definitions; they do not define earning rules. Use real names as adjacent HTML labels, never baked demo names.

- Approved concept: `../../design-references/2026-10-23/achievement-medal-approved-concept.png`.
- Exact semantic mapping source: ARTWORK_MAPPING.md in `../../ui-handoff/ForgeDev_Simple_Adventure_Achievements_Batch.zip`; inventory: `../../ui-handoff/ACHIEVEMENT_INVENTORY.md`.
- Files: `medals/<semantic-id>--earned.png` and `medals/<semantic-id>--locked.png`; the selected fallback pair has `-v2` before `.png`. The earlier fallback star candidate remains for provenance and is not selected.
- Gold/violet earned; cool slate/silver with subdued violet locked. Same silhouette, canvas and visual weight per pair. Real alpha, no checkerboard baked in, no text/status controls in images.
- Review at 72px desktop, 56px mobile and 48px toast, on actual dark surfaces. Preserve master PNGs; optimized derivatives only after approval. Do not overwrite the existing preview.

## Landing reference gate

The approved landing is separate from the dashboard: four-person anime party overlooking a moonlit valley, adventure setting and violet cave. Pack02 README explicitly says not to replace it with the dashboard walking-party cave asset. The owner has now supplied the exact flattened reference, inspected and saved at `../../design-references/2026-10-23/landing-party-approved-reference.png`. Maintain readable copy space on the left; all text, navigation and buttons are actual interface elements, not raster assets. Approved motion is slow clouds/mist, restrained crystal glints and sparse fireflies, with a stable party. No cloak motion without suitable separate layers. Include pause and reduced-motion support.

After inspection, determine the actual animation layers and common canvas from the approved composition. Export matching registered layers with transparent edges and a composited review proof, record origins/anchors, occlusion and safe motion bounds, and provide a static reduced-motion composition. A few raster layers are not a character walk cycle or a rig; do not claim that capability or invent motion before the planned animation is confirmed. Preserve all four characters in approved responsive crops. No application integration during asset authoring.

## Generation, verification and review

Use built-in image_gen (available in this session), one request per individual asset/state. Store prompts, original output paths, local copies and provenance. No CLI/API fallback was authorized or used. Image generation provides raster assets; exact pixel registration and transparency must be inspected rather than assumed.

All 30 selected medal PNGs were generated and visually inspected. Read-only alpha inspection confirms 1254 × 1254 canvases, real transparent pixels and zero meaningful border pixels (alpha > 8); pair silhouette bounds differ by at most five source pixels. Low-alpha edge noise may exist below this threshold; no pixel cleanup was applied. These are not bit-identical masks. Landing source layers share 1672 × 941 canvases; the selected foreground uses the documented static registration transform in the proof. `ASSET_QA.json` records dimensions, alpha counts, bounds, bytes and SHA-256, including superseded candidates.

Imagegen raster generation was available and used; no API/CLI fallback, PSD layer recovery, rigging or character walk-cycle capability was used. Glints and fireflies are simple procedural effects in the review proof, not additional raster files. Browser playback, actual-size legibility, responsive mobile composition, screen-reader behavior, optimization and performance remain pending review. Package approved assets only after concrete owner approval identifies them; the current archive is a review package.

## Claude integration boundary

Continue the integrity implementation from the consolidated brief. Do not integrate assets from this folder until an approved manifest/package is supplied. After asset approval, exact semantic mapping selects assets; missing/unsupported/new definitions use medal-fallback. Historical unsupported earned awards remain visible; an unearned unavailable achievement is not presented as an attainable locked goal. State labels and accessibility remain HTML, independent of artwork.
