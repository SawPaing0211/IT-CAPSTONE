# Native-resolution lossless exports — technical result

23 October 2026. Visual direction accepted; final integration acceptance pending.

- Selected exports: 34 (30 medal state variants and four landing raster layers).
- Source PNG total: 50,331,059 bytes. Export WebP total: 32,600,330 bytes. Reduction: 35.23%.
- Every export retains its original dimensions. Decoded alpha and visible RGB values compare exactly against the reviewed master. RGB hidden under completely transparent pixels may differ; it cannot affect rendering. Masters were checked by hash before and after conversion and were not modified.
- Source tools: bundled sharp 0.35.5 and libwebp 1.6.0. No project dependencies installed or application code imported.
- See `LOSSLESS_EXPORT_MANIFEST.json` for individual paths, byte sizes, hashes and comparison results, and `export-lossless.mjs` for reproducible conversion/verification. The script refuses to overwrite an export folder.
- `REVIEW_LOSSLESS.html` displays the exports using the same standalone review layout, with all 84 image references checked present and inline JavaScript syntax checked. No browser-rendering or animation test is implied by those static checks.

These native-resolution files are an intermediate export set, not a final mobile/performance package. Size-specific derivatives, rendered small-medal review, responsive landing review, accessibility and motion acceptance remain pending as listed in `APPROVAL_AND_VERIFICATION.md`. Claude should continue integrity work without integrating this intermediate set.

The earlier review ZIP remains unchanged. This technical follow-up does not authorize commits, deployment, live migrations, historical reconciliation or XP corrections.
