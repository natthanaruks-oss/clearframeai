# ClearFrame AI v0.1.5 — Detail Compare

Scope remains intentionally narrow: make images clearer with Cloudflare Images ESRGAN only.

## Quality-first pipeline

1. Read source dimensions.
2. Build an AI master:
   - source longest side < 1200px → request 4x ESRGAN master
   - otherwise → request 2x ESRGAN master
3. Never enlarge beyond the AI master.
4. If requested output is smaller than the AI master, downsample after the AI pass.
5. Apply conservative sharpen only after downsampling.
6. Preserve color: no automatic brightness, contrast or saturation changes.
7. Output quality:
   - JPG 95
   - WebP 95
   - PNG without explicit quality (avoid PNG8 palette conversion)
8. No `compression=fast`.

## Limits

This is still ESRGAN upscaling, not a true motion-deblur or refocus model. Severe motion blur, out-of-focus content, or missing text may not be recoverable.

## Deployment rule

Cloudflare API token + account ID only. No `wrangler login`, OAuth, browser approval, Cloudflare Dashboard setup or Cloudflare Access.

## Production verification

The patch installer verifies:
- local syntax/tests
- Wrangler dry-run
- active Cloudflare API token
- production health version 0.1.4
- JPG/PNG/WebP signatures
- AI master and quality-policy response headers
- production version remains correct after smoke tests

## v0.1.5 Detail Compare

Image engine is unchanged from v0.1.4.

Comparison UX:
- Fit for composition
- 100% for true 1:1 pixel review
- 200% for edge/halo inspection
- synchronized pan because Before/After share the same transform
- Center reset
- Hold Before flick comparison
- slider remains available
