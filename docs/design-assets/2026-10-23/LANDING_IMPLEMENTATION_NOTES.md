# Landing artwork and motion handoff — pending visual approval

Exact reference: `../../design-references/2026-10-23/landing-party-approved-reference.png`, supplied by the owner and visually inspected. Its UI text and buttons are reference content; render navigation, wordmark, headings, buttons and footer as semantic HTML. No account/self-registration feature is created by the reference CTA; preserve assigned-account sign-in behavior.

## Assets and stack

All generated landing layers use the same 1672 × 941 source canvas. Verify against `ASSET_QA.json` when delivered. Maintain one aspect-ratio-controlled scene wrapper and one common coordinate transform/crop; do not object-fit each layer independently.

1. `landing/landing-background-plate.png` — opaque night landscape, moon, valley, distant waterfalls/lake and violet cave. Text/UI and party were removed. Static. Inpainted background is a generated interpretation behind previously occluded areas, not recovered original pixels.
2. `landing/landing-clouds.png` — independent transparent cloud bank; review proof opacity .13, slow horizontal drift up to 1.5% over 100 seconds, alternate. The plate retains static sky clouds; this layer adds subtle motion, not an exact decomposition of every original cloud.
3. `landing/landing-mist.png` — transparent valley atmosphere; review proof opacity .12, drift up to 1% over 75 seconds, alternate. Keep behind the party and away from copy. No blanket blur filter over text or scene.
4. `landing/landing-party-foreground-v2.png` — four stable adventurers, cloaks, cliff and nearest crystals on alpha. The first extraction enlarged/moved the party and is retained as `landing-party-foreground.png` for provenance only; do not integrate it. v2 is the selected review candidate; the proof uses a STATIC scale(.9), origin right bottom, to better match reference placement. This registration is a review proposal, not a claim of pixel-identical extraction.
5. Crystal glints — use sparse small procedural light points anchored to actual crystal tips after final crop approval; proof includes three illustrative anchors at (81%,34%), (87%,31%), (94%,76%). No large pulsing glow or whole-image movement. These simple effects require no generated raster sprite.
6. Fireflies — approximately six tiny procedural points in the right/lower scene, maximum movement about 6px, slow varying opacity. Keep off text, avoid repetitive synchronized blinking. The proof's anchors are visual-review starting points, not finalized animation coordinates.

The party must not bob, slide, scale dynamically, walk or sway. There are no independent cloak layers, rigs or frames. No cloak movement is authorized with these assets. Built-in imagegen produced raster layers, not layered PSD source or a character animation rig.

## Interaction and accessibility contract

- One visible keyboard-accessible Pause/Resume animation control affects clouds, mist, glints and fireflies together; retain its accessible state. Freeze current decorative motion on pause, with no catch-up jump. Pause when the document is hidden/offscreen.
- Respect prefers-reduced-motion on initial render and when it changes. Static base and stable party remain visible; decorative movement is absent. Do not wait for JavaScript before suppressing motion. A manual reduced-motion proof checkbox is provided in REVIEW.html, separately from the OS preference.
- No autoplay audio, flashing, parallax, cursor-follow effects or scrolling hijack. Motion must never move interface copy or intercept pointer/focus input. Decorative image layers should not duplicate spoken page text.
- On narrow screens preserve all four people. Prefer a separately composed art region above/below live copy rather than cover-cropping a desktop scene until people disappear. Responsive landing integration remains pending; the fitted gallery proof is not mobile acceptance evidence.
- Preserve the calm dark copy area at left. Verify contrast on rendered overlays and all CTA/focus states during later integration. Do not use a full-page screenshot as the implementation.

## Review and package boundary

REVIEW.html is a standalone local visual proof in documentation, with actual HTML copy and pause/reduced-motion controls. It is not connected to the application and makes no API calls. It can be opened directly; optional `node serve-review.mjs` binds only 127.0.0.1:5410. Automated in-app browser access to that local server timed out in this session; browser playback, pause behavior, mobile layout and performance remain unverified until exercised successfully.

Master PNGs are deliberately unoptimized review sources. Do not import all masters into the production bundle. After owner approval, create measured responsive WebP/PNG derivatives while preserving alpha and approved registration; record dimensions, bytes and checksums. Keep the existing Simple Adventure dashboard Pack02 assets and 130px phone hero untouched. Return connected screenshots and motion/reduced-motion evidence for independent review before production rollout.
