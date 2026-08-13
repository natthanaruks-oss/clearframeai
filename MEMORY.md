# MEMORY.md

## 2026-08-06 — Project Start

### What happened

Created ClearFrame AI MVP v0.1 as a Cloudflare Worker + Images binding application.

### Why

The fastest credible path is to use an existing AI upscaler rather than train a new model. Cloudflare Images currently exposes `upscale: "generate"` using ESRGAN and fits the user's API-token-only deployment policy.

### Decisions

- Web/PWA, not native Android
- No OAuth, login, Cloud database or image history
- No image persistence in MVP
- Cloudflare API-token-only deployment
- Conservative Natural mode is default
- Face mode is not marketed as dedicated face restoration
- Local fallback must be labeled “not AI”
- Original image remains the source of truth

### Next time

1. Deploy and capture evidence from `/api/health`.
2. Test actual AI output using a controlled image set.
3. Compare Natural/Clear/Maximum for artifacts.
4. Add dedicated model only if benchmark proves a real gap.
5. Add batch and monetization only after quality and cost are measured.

## 2026-08-06 — v0.1.1 Output Formats

### What happened

Added selectable JPG, PNG and WebP output while keeping the product scope limited to image clarity only. Added dynamic MIME/extension handling, transparent output for PNG/WebP, white background for JPG, result file size, reset flow and cache-version update.

### Why

Users need common downloadable formats, and a hardcoded WebP output creates friction outside web workflows.

### Verification

Static syntax and project checks cover all three formats and critical frontend/API hooks. Production deployment and real-image output still require execution in the user's Cloudflare account.


## 2026-08-06 — v0.1.2 Color Fidelity

### What happened

Production output looked too similar in Fit view and some colors shifted.

### Decision

Remove automatic color adjustments, reduce secondary sharpening, increase lossy output quality, and add synchronized 100%/200% Pixel Detail inspection.

### Rule

Image clarity changes must not alter contrast, saturation, brightness or gamma unless the user explicitly opts in.


## 2026-08-13 — v0.1.3 Clean Studio UI

### What changed

Redesigned the production interface around a compact studio layout while keeping the v0.1.2 enhancement engine unchanged.

### Why

The previous page used too much vertical space and exposed secondary information too prominently. The new layout gives the preview visual priority and keeps Pixel Detail opt-in.

### Guardrail

Do not add new image features as part of UI cleanup. Engine benchmarking remains a separate workstream.
